-- 002-B · Variante de 002-adc.sql: **primero desplegar, migrar después**.
--
-- Solo hace falta este archivo si el código nuevo se desplegó ANTES de poder
-- ejecutar `002-adc.sql`. En ese caso, al arrancar, `synchronize`:
--   · creó una tabla `producto` VACÍA y la rellenó con la semilla del catálogo
--     inicial (los datos reales siguen en `dulce`, que es desconocida para él
--     y por eso no la borra — comprobado en RdbmsSchemaBuilder),
--   · y movió la FK de `encargo` para que apunte a esa tabla de semilla.
--
-- Esta variante no borra nada: aparta la tabla de semilla y deja la real donde
-- tiene que estar. Para comprobar cuál es cuál:
--   SELECT count(*) FROM producto;   -- 4 filas con los nombres de data/ofertas.ts → semilla
--
-- Aviso: mientras no se migre, la web enseña la semilla y no el catálogo real.

-- 1 · Apartar la tabla de semilla (no se borra por si acaso).
ALTER TABLE producto RENAME TO producto_semilla_despliegue_previo;

-- 2 · Los datos reales pasan a llamarse `producto`.
ALTER TABLE dulce RENAME TO producto;

-- 3 · Columnas (idempotentes, igual que en el archivo principal).
ALTER TABLE producto
  ADD COLUMN IF NOT EXISTS moneda varchar(8) NOT NULL DEFAULT 'CUP';

ALTER TABLE producto
  ADD COLUMN IF NOT EXISTS negocio varchar(16) NOT NULL DEFAULT 'delys';

ALTER TABLE pedido
  ADD COLUMN IF NOT EXISTS negocio varchar(16) NOT NULL DEFAULT 'delys';

-- 4 · La FK seguía a la tabla de semilla (renombrada en el paso 1): se suelta y
--     se vuelve a montar contra la tabla real, con el RESTRICT que pide la
--     entidad. Bloques defensivos: solo actúan si hace falta.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'encargo'::regclass
       AND contype = 'f'
       AND conname = 'FK_076eddea4df066f1958df261fa8'
  ) THEN
    ALTER TABLE encargo DROP CONSTRAINT FK_076eddea4df066f1958df261fa8;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'encargo'::regclass
       AND contype = 'f'
       AND conname = 'FK_076eddea4df066f1958df261fa8'
  ) THEN
    ALTER TABLE encargo
      ADD CONSTRAINT FK_076eddea4df066f1958df261fa8
      FOREIGN KEY (dulce_id) REFERENCES producto(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 5 · La tabla de semilla ya no hace falta. Se deja escrita la orden (con su
--     contenido guardado en la migración 001/002 y en el respaldo), pero NO se
--     ejecuta sola: borrar es irreversible y aquí no se borra nada.
-- DROP TABLE producto_semilla_despliegue_previo;
