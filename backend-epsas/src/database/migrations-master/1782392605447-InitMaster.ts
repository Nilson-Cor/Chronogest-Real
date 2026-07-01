import { MigrationInterface, QueryRunner } from "typeorm";

export class InitMaster1782392605447 implements MigrationInterface {
    name = 'InitMaster1782392605447'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Requerida por los DEFAULT uuid_generate_v4() de esta migración — no
        // viene habilitada por defecto en una base Postgres nueva.
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "centros_tenant" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(200) NOT NULL, "slug" character varying(100) NOT NULL, "dominio" character varying(200) NOT NULL, "estado" character varying(20) NOT NULL DEFAULT 'activo', "epsas_db_name" character varying(200) NOT NULL, "epsas_db_host" character varying(200), "epsas_db_port" integer NOT NULL DEFAULT '5435', "horarios_db_name" character varying(200) NOT NULL, "horarios_db_host" character varying(200), "horarios_db_port" integer NOT NULL DEFAULT '5435', "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5b8796bc468915961251837e53b" UNIQUE ("slug"), CONSTRAINT "PK_9c4a6fe1ca2eb76370d1d81fdcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "root_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(200) NOT NULL, "password" character varying(200) NOT NULL, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c203b53724f9a7a6d5f088e35e7" UNIQUE ("email"), CONSTRAINT "PK_490aa75f4afdf49267bc593ff87" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "root_users"`);
        await queryRunner.query(`DROP TABLE "centros_tenant"`);
    }

}
