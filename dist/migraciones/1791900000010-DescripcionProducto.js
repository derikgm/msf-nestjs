export class DescripcionProducto1791900000010 {
    name = 'DescripcionProducto1791900000010';
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "producto" ADD COLUMN IF NOT EXISTS "descripcion" text`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "producto" DROP COLUMN IF EXISTS "descripcion"`);
    }
}
//# sourceMappingURL=1791900000010-DescripcionProducto.js.map