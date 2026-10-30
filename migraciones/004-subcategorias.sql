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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_seccion_padre'
  ) THEN
    ALTER TABLE "seccion"
      ADD CONSTRAINT "FK_seccion_padre"
      FOREIGN KEY ("padre_id") REFERENCES "seccion" ("id")
      ON DELETE NO ACTION;
  END IF;
END $$;
