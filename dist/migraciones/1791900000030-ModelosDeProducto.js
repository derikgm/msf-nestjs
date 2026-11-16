export class ModelosDeProducto1791900000030 {
    name = 'ModelosDeProducto1791900000030';
    async up(queryRunner) {
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
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_producto_modelo_producto_id" ON "producto_modelo" ("producto_id")`);
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
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "producto_modelo" DROP CONSTRAINT IF EXISTS "FK_producto_modelo_producto"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_producto_modelo_producto_id"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "producto_modelo"`);
    }
}
//# sourceMappingURL=1791900000030-ModelosDeProducto.js.map