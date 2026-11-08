import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * El renglón de pedido recuerda **qué modelo** llevaron.
 *
 * Con los modelos de una publicación (ver `ModelosDeProducto1791900000030`) ya no
 * basta con `producto_id`: si piden la nevera de la publicación «Nevera No
 * Frost», el renglón tiene que decir si fue la de 240 L o la de 420 L. Y como el
 * catálogo se puede renombrar, cambiar de precio o vaciar, el pedido no puede
 * reconstruirse leyendo el catálogo el día de mañana: lleva escrita la frase con
 * la que se vendió y el precio unitario de aquel momento, como una factura.
 *
 * Las tres columnas son **nullables** a propósito: los renglones creados antes
 * de este cambio siguen ahí con su `dulce_id`, su `cantidad` y el `precio_total`
 * del pedido, y no hay forma honesta de rellenarlos (nadie sabe qué modelo fue).
 * Un cliente que lea el histórico tiene que poder distinguir «no se registró» de
 * «no llevaba modelo», así que no se pone un `NOT NULL` ni un backfill inventado.
 *
 * `modelo_id` es FK con `ON DELETE RESTRICT`, la misma decisión que `dulce_id`
 * en `encargo.entity.ts`: borrar el modelo dejaría al pedido nombrando algo que
 * ya no existe. `ModelosService.eliminar()` lo convierte en un `409` legible.
 *
 * Idempotente, en la línea de las migraciones anteriores: si el esquema ya se
 * tocó a mano o con `migraciones/006-modelo-en-el-encargo.sql`, el arranque no
 * falla.
 */
export class PedidoRecuerdaElModelo1791900000040 implements MigrationInterface {
  name = 'PedidoRecuerdaElModelo1791900000040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "encargo" ADD COLUMN IF NOT EXISTS "modelo_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "encargo" ADD COLUMN IF NOT EXISTS "nombre_vendido" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "encargo" ADD COLUMN IF NOT EXISTS "precio_vendido" numeric(12,2)`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_encargo_modelo'
        ) THEN
          ALTER TABLE "encargo"
            ADD CONSTRAINT "FK_encargo_modelo"
            FOREIGN KEY ("modelo_id") REFERENCES "producto_modelo" ("id")
            ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
  }

  /**
   * Reversible: se sueltan las tres columnas. La FK se va con su columna, pero
   * se quita primero por si el orden de las dependencias no está.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "encargo" DROP CONSTRAINT IF EXISTS "FK_encargo_modelo"`,
    );
    await queryRunner.query(`ALTER TABLE "encargo" DROP COLUMN IF EXISTS "precio_vendido"`);
    await queryRunner.query(`ALTER TABLE "encargo" DROP COLUMN IF EXISTS "nombre_vendido"`);
    await queryRunner.query(`ALTER TABLE "encargo" DROP COLUMN IF EXISTS "modelo_id"`);
  }
}
