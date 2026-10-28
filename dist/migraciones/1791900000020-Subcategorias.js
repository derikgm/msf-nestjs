export class Subcategorias1791900000020 {
    name = 'Subcategorias1791900000020';
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "seccion" ADD COLUMN IF NOT EXISTS "padre_id" integer`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_seccion_padre_id" ON "seccion" ("padre_id")`);
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
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "seccion" DROP CONSTRAINT IF EXISTS "FK_seccion_padre"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_seccion_padre_id"`);
        await queryRunner.query(`ALTER TABLE "seccion" DROP COLUMN IF EXISTS "padre_id"`);
    }
}
//# sourceMappingURL=1791900000020-Subcategorias.js.map