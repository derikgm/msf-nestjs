import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Modelos de una publicación (la idea de Amazon): la misma nevera vendida en
 * 240 L, 340 L y 420 L, cada modelo con su precio, su foto y su ficha técnica.
 *
 * Tabla nueva `producto_modelo`, hija de `producto` por `producto_id` con
 * `ON DELETE CASCADE` (se borra la publicación, se borran sus modelos). No se
 * toca `producto`: una publicación sin modelos se vende exactamente igual que
 * hasta hoy, así que los datos heredados de Delys y ADC no cambian de forma ni
 * necesitan backfill.
 *
 * `atributos` es `jsonb` con default `'{}'`: los pares `Peso: 38 kg` los
 * escribe el dueño y la web los lista tal cual; no se ordena ni se filtra por
 * ellos (para eso está `precio`), así que no merecen una tabla aparte.
 *
 * Idempotente (todo con `IF NOT EXISTS` y comprobación de `pg_constraint`), en
 * la línea de `Subcategorias1791900000020`: si el esquema ya se tocó a mano o
 * con `migraciones/005-modelos-producto.sql`, el arranque no falla.
 */
export class ModelosDeProducto1791900000030 implements MigrationInterface {
  name = 'ModelosDeProducto1791900000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "producto_modelo" (
        "id" SERIAL NOT NULL,
        "producto_id" integer NOT NULL,
        "nombre" character varying(120) NOT NULL,
        "precio" numeric(12,2) NOT NULL,
        "moneda" character varying(8) NOT NULL DEFAULT 'CUP',
        "imagen_url" character varying(500),
        "imagen_bytes" integer,
        "atributos" jsonb NOT NULL DEFAULT '{}',
        "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_producto_modelo" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_producto_modelo_producto_nombre"
          UNIQUE ("producto_id", "nombre")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_producto_modelo_producto_id" ON "producto_modelo" ("producto_id")`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_producto_modelo_producto'
        ) THEN
          ALTER TABLE "producto_modelo"
            ADD CONSTRAINT "FK_producto_modelo_producto"
            FOREIGN KEY ("producto_id") REFERENCES "producto" ("id")
            ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  /**
   * Reversible: es una tabla nueva sin dependencias externas. El `DROP TABLE`
   * se lleva de paso el índice, el UNIQUE y la FK, así que van primero por
   * si acaso la tabla no llega a existir.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "producto_modelo" DROP CONSTRAINT IF EXISTS "FK_producto_modelo_producto"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_producto_modelo_producto_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "producto_modelo"`);
  }
}
