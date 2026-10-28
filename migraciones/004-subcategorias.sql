-- 004 · Subcategorías (categorías dentro de categorías)
--
-- Añade `parent_id` a `seccion` para permitir jerarquía. Los productos siguen
-- asignándose a la sección/subcategoría final en `producto.seccion_id`.
--

ALTER TABLE seccion
  ADD COLUMN IF NOT EXISTS parent_id integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'seccion'::regclass
       AND conname = 'fk_seccion_padre'
  ) THEN
    ALTER TABLE seccion
      ADD CONSTRAINT fk_seccion_padre
      FOREIGN KEY (parent_id) REFERENCES seccion (id) ON DELETE SET NULL;
  END IF;
END $$;

-- Permitir mismo nombre bajo diferente padre
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'seccion'::regclass
       AND conname = 'uq_seccion_negocio_nombre'
  ) THEN
    ALTER TABLE seccion DROP CONSTRAINT uq_seccion_negocio_nombre;
  END IF;
END $$;

ALTER TABLE seccion
  ADD CONSTRAINT uq_seccion_negocio_nombre_parent UNIQUE (negocio, nombre, parent_id);

-- Índice para búsquedas por padre
CREATE INDEX IF NOT EXISTS idx_seccion_parent_id ON seccion (parent_id);
