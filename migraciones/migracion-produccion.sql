-- MIGRACIÓN DE PRODUCCIÓN · previa al deploy de `develop` a `test_deploy`
--
-- ESTE ARCHIVO ES PARA LA BASE DE PRODUCCIÓN (Supabase), NO para la local.
-- Se ejecuta ANTES de hacer el merge/push que dispara el deploy de Wasmer.
--
-- Qué hace, en dos pasadas:
--   1 · `002-adc.sql`: renombra `dulce` → `producto` CONSERVANDO los datos
--       reales (hoy la producción corre la versión pre-ADC, con la tabla
--       `dulce`), añade las columnas `moneda` y `negocio` (las dos con
--       `DEFAULT`, así rellenan los productos que ya existen) y deja la FK de
--       `encargo` en `ON DELETE RESTRICT`.
--       → Si se le ocurre ejecutar esto DESPUÉS del deploy, `synchronize` ya
--         habrá creado una `producto` vacía y este script se parará con un
--         mensaje claro (habría que usar 002-adc-despues-del-despliegue.sql).
--   2 · `003-secciones.sql`: crea la tabla `seccion` (con `id serial`, igual
--       que la crea `synchronize` en el código nuevo, para que no intente
--       rehacerla al arrancar), añade `producto.seccion_id` con su FK y mete
--       los productos que hoy no tienen sección en la de `dulces` de su negocio.
--
-- Cómo ejecutarla: pegar TODO el contenido en el SQL editor de Supabase
-- (Dashboard → SQL Editor → New query) y pulsar Run. También sirve vía psql:
--   psql "$DATABASE_URL_DE_PRODUCCION" -f migraciones/migracion-produccion.sql
--
-- Verificaciones después de correr (todo debe estar ok):
--   SELECT count(*) FROM producto;          -- los dulces reales (no 0, no la semilla)
--   SELECT id, nombre, negocio FROM producto;
--   SELECT id, nombre, negocio FROM seccion;          -- una fila 'dulces' por negocio
--   SELECT p.nombre, s.nombre AS seccion FROM producto p
--     LEFT JOIN seccion s ON s.id = p.seccion_id;
--
-- Idempotente: si algo ya está hecho no se toca; se puede correr de nuevo sin
-- romper nada. No borra ninguna fila.
--
-- ────────────────────────────────────────────────────────────────────────────
-- PASO 1 · 002-adc.sql (renombrado y columnas compartidas)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.producto') IS NOT NULL THEN
    RAISE EXCEPTION
      'Ya existe la tabla "producto". O esta migración ya se ejecutó (no hay nada que hacer), '
      'o el código nuevo se desplegó antes (en cuyo caso "producto" es una tabla de semilla '
      'creada por synchronize y hay que usar 002-adc-despues-del-despliegue.sql).';
  END IF;

  IF to_regclass('public.dulce') IS NULL THEN
    RAISE EXCEPTION 'No existe la tabla "dulce": nada que renombrar.';
  END IF;
END $$;

ALTER TABLE dulce RENAME TO producto;

ALTER TABLE producto
  ADD COLUMN IF NOT EXISTS moneda varchar(8) NOT NULL DEFAULT 'CUP';

ALTER TABLE producto
  ADD COLUMN IF NOT EXISTS negocio varchar(16) NOT NULL DEFAULT 'delys';

ALTER TABLE pedido
  ADD COLUMN IF NOT EXISTS negocio varchar(16) NOT NULL DEFAULT 'delys';

DO $$
DECLARE
  nombre_del_fk text;
BEGIN
  -- La FK la crea TypeORM con el nombre entre comillas (o sea, con mayusculas
  -- conservadas) o el esquema viejo con minusculas: se busca por nombre sin
  -- importar las mayusculas y se suelta con %I para no romper el quoting.
  SELECT conname INTO nombre_del_fk
    FROM pg_constraint
   WHERE conrelid = 'encargo'::regclass
     AND contype = 'f'
     AND lower(conname) = lower('FK_076eddea4df066f1958df261fa8')
     AND pg_get_constraintdef(oid) LIKE '%ON DELETE CASCADE%';

  IF nombre_del_fk IS NOT NULL THEN
    EXECUTE format('ALTER TABLE encargo DROP CONSTRAINT %I', nombre_del_fk);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'encargo'::regclass
       AND contype = 'f'
       AND lower(conname) = lower('FK_076eddea4df066f1958df261fa8')
  ) THEN
    ALTER TABLE encargo
      ADD CONSTRAINT "FK_076eddea4df066f1958df261fa8"
      FOREIGN KEY (dulce_id) REFERENCES producto(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- PASO 2 · 003-secciones.sql (secciones del catálogo)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seccion (
  id serial PRIMARY KEY,
  nombre varchar(60) NOT NULL,
  negocio varchar(16) NOT NULL DEFAULT 'delys',
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_seccion_negocio_nombre UNIQUE (negocio, nombre)
);

ALTER TABLE producto
  ADD COLUMN IF NOT EXISTS seccion_id integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'producto'::regclass
       AND contype = 'f'
  ) THEN
    ALTER TABLE producto
      ADD CONSTRAINT fk_producto_seccion
      FOREIGN KEY (seccion_id) REFERENCES seccion (id);
  END IF;
END $$;

INSERT INTO seccion (nombre, negocio)
SELECT 'dulces', negocio
  FROM (SELECT DISTINCT negocio FROM producto WHERE seccion_id IS NULL) s
ON CONFLICT (negocio, nombre) DO NOTHING;

UPDATE producto p
SET seccion_id = sec.id
FROM seccion sec
WHERE p.seccion_id IS NULL
  AND sec.nombre = 'dulces'
  AND sec.negocio = p.negocio;

-- ────────────────────────────────────────────────────────────────────────────
-- Fin. Si todo terminó sin errores, avísale a quien haga el deploy para que el
-- merge + push de `develop` → `test_deploy` se haga de forma segura.
-- ────────────────────────────────────────────────────────────────────────────