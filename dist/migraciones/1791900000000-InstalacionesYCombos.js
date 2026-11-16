export class InstalacionesYCombos1791900000000 {
    name = 'InstalacionesYCombos1791900000000';
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "adc_instalaciones" ("id" SERIAL NOT NULL, "nombre_servicio" character varying(120) NOT NULL, "precio" numeric(12,2) NOT NULL, "moneda" character varying(8) NOT NULL DEFAULT 'CUP', "imagen_url" character varying(500), "imagen_bytes" integer, "descripcion" text array NOT NULL DEFAULT '{}', "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_adc_instalaciones" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "delys_combos" ("id" SERIAL NOT NULL, "nombre_combo" character varying(120) NOT NULL, "precio" numeric(12,2) NOT NULL, "moneda" character varying(8) NOT NULL DEFAULT 'CUP', "imagen_url" character varying(500), "imagen_bytes" integer, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_delys_combos" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "delys_combo_dulces" ("id" SERIAL NOT NULL, "nombre_dulce" character varying(120) NOT NULL, "cantidad" integer NOT NULL, "combo_id" integer NOT NULL, CONSTRAINT "PK_delys_combo_dulces" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "delys_combo_dulces" ADD CONSTRAINT "FK_delys_combo_dulces_combo" FOREIGN KEY ("combo_id") REFERENCES "delys_combos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "delys_combo_dulces"`);
        await queryRunner.query(`DROP TABLE "delys_combos"`);
        await queryRunner.query(`DROP TABLE "adc_instalaciones"`);
    }
}
//# sourceMappingURL=1791900000000-InstalacionesYCombos.js.map