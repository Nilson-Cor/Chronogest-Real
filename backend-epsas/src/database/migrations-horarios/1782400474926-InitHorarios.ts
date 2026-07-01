import { MigrationInterface, QueryRunner } from "typeorm";

export class InitHorarios1782400474926 implements MigrationInterface {
    name = 'InitHorarios1782400474926'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Requerida por los DEFAULT uuid_generate_v4() de esta migración — no
        // viene habilitada por defecto en una base Postgres nueva.
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "competencias" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "asignacion_id" uuid NOT NULL, "instructor_id" uuid, "ficha_id" uuid, "nombre" character varying(300) NOT NULL, "resultados" jsonb, "fecha_inicio" date, "fecha_fin" date, "dias_clase" jsonb, "horas_requeridas" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5200c17b2042a1db2e495f3af37" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "asignacion_horarios" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "horario_id" uuid NOT NULL, "ficha_id" uuid, "ambiente_id" uuid, "instructor_id" uuid, "activo" boolean NOT NULL DEFAULT false, "ultima_activacion" TIMESTAMP WITH TIME ZONE, "minutos_retraso" integer NOT NULL DEFAULT '0', "motivo_finalizacion" text, "ubicacion_transversal_id" uuid, "ubicacion_transversal_nombre" character varying(150), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_05a71f036c10ef062b8134a4458" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "horarios" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "dia_semana" character varying NOT NULL, "jornada" character varying NOT NULL, "hora_inicio" TIME NOT NULL, "hora_fin" TIME NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c69b602fc8441125f1310a4858d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "solicitudes_cambio" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "instructor_id" uuid NOT NULL, "asignacion_id" uuid, "horario_propuesto" jsonb, "snapshot_actual" jsonb, "razon" text, "archivo_adjunto_url" text, "estado" character varying(20) NOT NULL DEFAULT 'pendiente', "respuesta_admin" text, "fecha" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6fb93ea91d790221552f1fbafbf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "eventos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(200) NOT NULL, "descripcion" text, "tipo" character varying(50), "fecha_inicio" date, "fecha_fin" date, "hora_inicio" TIME, "hora_fin" TIME, "lugar" character varying(100), "ubicacion_id" uuid, "fichas_participantes" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_40d4a3c6a4bfd24280cb97a509e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "competencias" ADD CONSTRAINT "FK_e461f9bbdf657b6c404c011326c" FOREIGN KEY ("asignacion_id") REFERENCES "asignacion_horarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "asignacion_horarios" ADD CONSTRAINT "FK_b9014f37f23d528e1c58fb29e27" FOREIGN KEY ("horario_id") REFERENCES "horarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "solicitudes_cambio" ADD CONSTRAINT "FK_2a1b7c4d3dda34e2c94cb828cd1" FOREIGN KEY ("asignacion_id") REFERENCES "asignacion_horarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "solicitudes_cambio" DROP CONSTRAINT "FK_2a1b7c4d3dda34e2c94cb828cd1"`);
        await queryRunner.query(`ALTER TABLE "asignacion_horarios" DROP CONSTRAINT "FK_b9014f37f23d528e1c58fb29e27"`);
        await queryRunner.query(`ALTER TABLE "competencias" DROP CONSTRAINT "FK_e461f9bbdf657b6c404c011326c"`);
        await queryRunner.query(`DROP TABLE "eventos"`);
        await queryRunner.query(`DROP TABLE "solicitudes_cambio"`);
        await queryRunner.query(`DROP TABLE "horarios"`);
        await queryRunner.query(`DROP TABLE "asignacion_horarios"`);
        await queryRunner.query(`DROP TABLE "competencias"`);
    }

}
