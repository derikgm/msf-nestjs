-- 002 · ADC comparte las tablas (punto 6 de msf-app/todo.md)
--
-- Idempotente y **a prueba de orden**: no borra nada. Se puede ejecutar tantas
-- veces como haga falta, y si algo no encaja se para con un mensaje claro en
-- vez de estropear datos.
--
-- ORDEN RECOMENDADO: ejecutar esto y enseguida desplegar el código nuevo.
-- (Ver el final de este archivo y `002-adc-despues-del-despliegue.sql` para el
--  caso contrario: desplegar primero y migrar después.)
--
-- ────────────────────────────────────────────────────────────────────────────
-- 1 · Guardas. Si algo no encaja, esto revienta y no toca nada.
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

-- ────────────────────────────────────────────────────────────────────────────
-- 2 · `dulce` pasa a llamarse `producto`.
--
-- Es lo que pide el enunciado ("la tabla dulce no debería de llamarse dulce
-- sino producto, aunque los endpoints pueden seguir llamándose como estaban").
-- La FK `encargo.dulce_id → dulce(id)` la sigue Postgres sola al renombrar:
-- no hay que tocarla ni recalcular nada.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE dulce RENAME TO producto;

-- ────────────────────────────────────────────────────────────────────────────
-- 3 · Columnas. Las tres con `IF NOT EXISTS`, así que se puede ejecutar en
--     cualquier momento y con la base ya poblada.
--
--     `moneda` es el punto 5 (y su `DEFAULT 'CUP'` es el 5.1: rellena solo las
--     filas que ya existen). Si ya se ejecutó 001-moneda.sql, no hace nada.
--     `negocio` es lo que separa a Delys de ADC (y más adelante a Domus).
--     `varchar`, no enum: que pueda entrar otro negocio sin migrar nada.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE producto
  ADD COLUMN IF NOT EXISTS moneda varchar(8) NOT NULL DEFAULT 'CUP';

ALTER TABLE producto
  ADD COLUMN IF NOT EXISTS negocio varchar(16) NOT NULL DEFAULT 'delys';

ALTER TABLE pedido
  ADD COLUMN IF NOT EXISTS negocio varchar(16) NOT NULL DEFAULT 'delys';

-- ────────────────────────────────────────────────────────────────────────────
-- 4 · La FK de `encargo`, alineada con lo que dice la entidad.
--
-- Hoy en la base está en `ON DELETE CASCADE` mientras que `Encargo.dulce`
-- pide `RESTRICT` (con CASCADE, borrar un producto se lleva por delante los
-- renglones de los pedidos que lo pedían). `DELETE /delys/dulces/:id` y
-- `/adc/productos/:id` cuentan primero los pedidos que lo bloquean y responden
-- 409, así que el RESTRICT es la red de seguridad que documenta API.md.
--
-- Los dos bloques son defensivos: solo actúan si hace falta.
-- ────────────────────────────────────────────────────────────────────────────
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
-- Comprobaciones esperadas:
--   SELECT attname FROM pg_attribute
--    WHERE attrelid = 'producto'::regclass AND attnum > 0 AND NOT attisdropped;
--     → id, nombre, precio, imagen_url, imagen_bytes, moneda, negocio
--   SELECT id, nombre, moneda, negocio FROM producto;   -- todo en 'delys'
--   SELECT id, negocio FROM pedido;                     -- todo en 'delys'
--
-- Datos: ninguna fila se modifica ni se borra. Los que ya existían quedan en
-- negocio 'delys' (por el DEFAULT) y en moneda 'CUP' (idem).
-- ────────────────────────────────────────────────────────────────────────────
