import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Punto 1: los productos del catálogo tienen una descripción larga opcional.
 *
 * `text` y nullable: los productos que ya existen se quedan sin descripción
 * (la vitrina enseña solo nombre, precio y moneda) y el panel la puede
 * rellenar o vaciar después.
 *
 * `IF NOT EXISTS` / `IF EXISTS` para que la migración sea idempotente: si la
 * columna ya se añadió a mano en algún entorno, el arranque no falla.
 */
export class DescripcionProducto1791900000010 implements MigrationInterface {
  name = 'DescripcionProducto1791900000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "producto" ADD COLUMN IF NOT EXISTS "descripcion" text`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "producto" DROP COLUMN IF EXISTS "descripcion"`,
    );
  }
}
