import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Subcategorías: una sección puede colgar de otra sección del mismo negocio.
 *
 * `padre_id` es una FK a `seccion.id`, nullable. `NULL` = categoría principal;
 * con valor = subcategoría. No hay una columna de profundidad: el servicio
 * garantiza un solo nivel (el padre tiene que ser principal), que es lo que
 * necesitan el panel y la tienda.
 *
 * Todo con `IF NOT EXISTS` / comprobación de `pg_constraint` para que sea
 * idempotente: si el esquema ya se tocó a mano, el arranque no falla.
 */
export class Subcategorias1791900000020 implements MigrationInterface {
  name = 'Subcategorias1791900000020';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "seccion" ADD COLUMN IF NOT EXISTS "padre_id" integer`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_seccion_padre_id" ON "seccion" ("padre_id")`,
    );
    await queryRunner.query(`
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
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "seccion" DROP CONSTRAINT IF EXISTS "FK_seccion_padre"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_seccion_padre_id"`);
    await queryRunner.query(
      `ALTER TABLE "seccion" DROP COLUMN IF EXISTS "padre_id"`,
    );
  }
}
