<<<<<<< HEAD
-- 004 · Subcategorías (categorías dentro de categorías)
--
-- Añade `parent_id` a `seccion` para permitir jerarquía. Los productos siguen
-- asignándose a la sección/subcategoría final en `producto.seccion_id`.
--

ALTER TABLE seccion
  ADD COLUMN IF NOT EXISTS parent_id integer;
=======
-- 004 · Subcategorías
--
-- Una sección puede colgar de otra sección del mismo negocio:
--   padre_id NULL  -> categoría principal
--   padre_id val   -> subcategoría de esa categoría
--
-- Un solo nivel (el padre debe ser principal) lo garantiza el servidor al
-- crear/editar, no la base. Idempotente: se puede aplicar más de una vez.

ALTER TABLE "seccion" ADD COLUMN IF NOT EXISTS "padre_id" integer;

CREATE INDEX IF NOT EXISTS "IDX_seccion_padre_id" ON "seccion" ("padre_id");
>>>>>>> 43cf044449fb9ac857216ec0873e0285760ccb13

DO $$
BEGIN
  IF NOT EXISTS (
<<<<<<< HEAD
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'seccion'::regclass
       AND conname = 'fk_seccion_padre'
  ) THEN
    ALTER TABLE seccion
      ADD CONSTRAINT fk_seccion_padre
      FOREIGN KEY (parent_id) REFERENCES seccion (id) ON DELETE SET NULL;
  END IF;
END $$;

-- Permitir mismo nombre bajo diferente padre, pero mantener unicidad por nombre
-- en raíz? El requisito pide poder tener subcategorías; la entidad ahora usa
-- UNIQUE(negocio, nombre, parent_id). Actualizamos el constraint si existe.
DO $$
BEGIN
  -- Intentar eliminar constraint antiguo si existe con ese nombre
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
=======
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_seccion_padre'
  ) THEN
    ALTER TABLE "seccion"
      ADD CONSTRAINT "FK_seccion_padre"
      FOREIGN KEY ("padre_id") REFERENCES "seccion" ("id")
      ON DELETE NO ACTION;
  END IF;
END $$;
>>>>>>> 43cf044449fb9ac857216ec0873e0285760ccb13
