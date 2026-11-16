export class PedidoRecuerdaElModelo1791900000040 {
    name = 'PedidoRecuerdaElModelo1791900000040';
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "encargo" ADD COLUMN IF NOT EXISTS "modelo_id" integer`);
        await queryRunner.query(`ALTER TABLE "encargo" ADD COLUMN IF NOT EXISTS "nombre_vendido" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "encargo" ADD COLUMN IF NOT EXISTS "precio_vendido" numeric(12,2)`);
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
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "encargo" DROP CONSTRAINT IF EXISTS "FK_encargo_modelo"`);
        await queryRunner.query(`ALTER TABLE "encargo" DROP COLUMN IF EXISTS "precio_vendido"`);
        await queryRunner.query(`ALTER TABLE "encargo" DROP COLUMN IF EXISTS "nombre_vendido"`);
        await queryRunner.query(`ALTER TABLE "encargo" DROP COLUMN IF EXISTS "modelo_id"`);
    }
}
//# sourceMappingURL=1791900000040-PedidoRecuerdaElModelo.js.map