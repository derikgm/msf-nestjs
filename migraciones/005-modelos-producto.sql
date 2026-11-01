-- 005 · Modelos de una publicación
--
-- Lo de Amazon: una publicación («Nevera inverter») que se vende en varios
-- modelos —240 L, 340 L, 420 L— cada uno con su precio, su foto y su ficha.
--
--   producto        -> la publicación (nombre, descripción, sección, portada)
--   producto_modelo -> los modelos que se eligen en la web
--
-- `producto` no cambia: una publicación sin modelos se vende igual que hasta
-- hoy, así que no hay backfill. Es el espejo en SQL de la migración
-- `src/migraciones/1791900000030-ModelosDeProducto.ts`, que el servidor aplica
-- solo al arrancar (`migrationsRun: true`, `synchronize: false`). Sirve para
-- tocar producción a mano sin desplegar código nuevo: con `IF NOT EXISTS` da
-- igual si corre antes o después.
--
-- Idempotente: se puede aplicar más de una vez. No borra nada.

-- ────────────────────────────────────────────────────────────────────────────
-- 1 · La tabla, con el PK y el UNIQUE(producto_id, nombre) que pide la entidad.
--
-- `id serial` a propósito, igual que en `seccion` (ver 003): es lo que genera
-- `@PrimaryGeneratedColumn('increment')`, así no hay fricción si algún día
-- vuelve a mirarse el esquema con synchronize.
--
-- `atributos jsonb NOT NULL DEFAULT '{}'`: pares `etiqueta: valor` escritos por
-- el dueño ({ "Peso": "38 kg", "Potencia": "120 W" }). No se filtra ni se
-- ordena por ellos —para eso está `precio`—, así que no necesitan tabla aparte.
-- No hay columna `negocio`: el modelo hereda el de su publicación, y copiarlo
-- aquí permitiría un modelo de ADC colgado de un dulce de Delys.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS producto_modelo (
  id serial PRIMARY KEY,
  producto_id integer NOT NULL,
  nombre varchar(120) NOT NULL,
  precio numeric(12,2) NOT NULL,
  moneda varchar(8) NOT NULL DEFAULT 'CUP',
  imagen_url varchar(500),
  imagen_bytes integer,
  atributos jsonb NOT NULL DEFAULT '{}',
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_producto_modelo_producto_nombre UNIQUE (producto_id, nombre)
);

-- ────────────────────────────────────────────────────────────────────────────
-- 2 · Índice de la FK y la FK con CASCADE.
--
-- Postgres no indexa las columnas de las FK por sí solo; la web y el panel van
-- a buscar los modelos por publicación en cada visita, así que el índice va
-- aquí. `ON DELETE CASCADE`: si se borra la publicación se van sus modelos,
-- como los renglones de un combo con su combo (`delys_combo_dulces`, punto 3).
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_producto_modelo_producto_id
  ON producto_modelo (producto_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'producto_modelo'::regclass
       AND contype = 'f'
  ) THEN
    ALTER TABLE producto_modelo
      ADD CONSTRAINT fk_producto_modelo_producto
      FOREIGN KEY (producto_id) REFERENCES producto (id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- Comprobar (opcional): la tabla vacía está bien, los modelos se dan de alta
-- desde el panel cuando exista esa pantalla.
--
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'producto_modelo' ORDER BY ordinal_position;
--
-- Para volver atrás (SOLO si no hay modelos dados de alta):
--   DROP TABLE IF EXISTS producto_modelo;
-- ────────────────────────────────────────────────────────────────────────────
