export class Inicial1791390744944 {
    name = 'Inicial1791390744944';
    async up(queryRunner) {
        if (await queryRunner.hasTable('producto'))
            return;
        await queryRunner.query(`CREATE TABLE "usuario" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "nombre" character varying(120) NOT NULL, "usuario" character varying(60) NOT NULL, "password_hash" character varying(200) NOT NULL, "rol" character varying(50) NOT NULL DEFAULT 'delys', "activo" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_9921cd8ed63a072b8f93ead80f0" UNIQUE ("usuario"), CONSTRAINT "PK_a56c58e5cabaa04fb2c98d2d7e2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "seccion" ("id" SERIAL NOT NULL, "nombre" character varying(60) NOT NULL, "negocio" character varying(16) NOT NULL DEFAULT 'delys', "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_44fe4c1d9062e9742fd8e13211e" UNIQUE ("negocio", "nombre"), CONSTRAINT "PK_c9d18156be44ddfd10a56612b4c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "producto" ("id" integer NOT NULL, "nombre" character varying(120) NOT NULL, "precio" numeric(12,2) NOT NULL, "imagen_url" character varying(500), "imagen_bytes" integer, "moneda" character varying(8) NOT NULL DEFAULT 'CUP', "negocio" character varying(16) NOT NULL DEFAULT 'delys', "seccion_id" integer, CONSTRAINT "PK_5be023b11909fe103e24c740c7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "pedido" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "precio_total" numeric(12,2) NOT NULL, "negocio" character varying(16) NOT NULL DEFAULT 'delys', "direccion" character varying(300), "telefono" character varying(40), "fecha" date, "notas" character varying(1000), CONSTRAINT "PK_af8d8b3d07fae559c37f56b3f43" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "encargo" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "cantidad" integer NOT NULL, "dulce_id" integer NOT NULL, "pedido_id" uuid NOT NULL, CONSTRAINT "PK_84f1d1d319a65f246ffe4ce3293" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "storage_quota" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "rol" character varying(50) NOT NULL, "bytes_usados" bigint NOT NULL DEFAULT '0', "limite_bytes" bigint NOT NULL DEFAULT '20971520', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_c6435edd64b2b873edd69a53c90" UNIQUE ("rol"), CONSTRAINT "PK_2da2f227656defdf39492278894" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "producto" ADD CONSTRAINT "FK_d640fc07a58161e881ba33a6bee" FOREIGN KEY ("seccion_id") REFERENCES "seccion"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "encargo" ADD CONSTRAINT "FK_076eddea4df066f1958df261fa8" FOREIGN KEY ("dulce_id") REFERENCES "producto"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "encargo" ADD CONSTRAINT "FK_18975805b4af00960f448f380d2" FOREIGN KEY ("pedido_id") REFERENCES "pedido"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }
    async down(_queryRunner) {
        return;
    }
}
//# sourceMappingURL=1791390744944-Inicial.js.map