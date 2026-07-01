import { MigrationInterface, QueryRunner } from "typeorm";

export class InitEpsas1782400343717 implements MigrationInterface {
    name = 'InitEpsas1782400343717'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Requerida por los DEFAULT uuid_generate_v4() de esta migración — no
        // viene habilitada por defecto en una base Postgres nueva.
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "programas" ("id_programa" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying NOT NULL, "tipo" character varying, CONSTRAINT "PK_f79ffc9efe1b731b5ab1dcd3c62" PRIMARY KEY ("id_programa"))`);
        await queryRunner.query(`CREATE TABLE "matriculas" ("idMatricula" uuid NOT NULL DEFAULT uuid_generate_v4(), "persona" uuid NOT NULL, "curso" uuid NOT NULL, "estado" character varying, "fecha_matricula" date, "avance" numeric(5,2) NOT NULL DEFAULT '0', CONSTRAINT "PK_ad9f70f1ae698c2da3252b2c9a7" PRIMARY KEY ("idMatricula"))`);
        await queryRunner.query(`CREATE TABLE "modulos" ("id_modulo" SERIAL NOT NULL, "aplicativo" uuid NOT NULL, "modulo" character varying(200) NOT NULL DEFAULT '', CONSTRAINT "PK_68ad50fa332064a72e31fcdf87a" PRIMARY KEY ("id_modulo"))`);
        await queryRunner.query(`CREATE TABLE "servicios" ("id_servicio" SERIAL NOT NULL, "nombre" character varying(200) NOT NULL DEFAULT '', "url" character varying(500), "modulo" integer NOT NULL, CONSTRAINT "PK_f07b149d3dd3cee237e2efe4922" PRIMARY KEY ("id_servicio"))`);
        await queryRunner.query(`CREATE TABLE "permisos" ("id_permiso" SERIAL NOT NULL, "usuario" uuid NOT NULL, "rol" uuid NOT NULL, "servicio" integer NOT NULL, CONSTRAINT "PK_76e2dbb965cd631705b6caaf698" PRIMARY KEY ("id_permiso"))`);
        await queryRunner.query(`CREATE TABLE "credenciales" ("id_credencial" uuid NOT NULL DEFAULT uuid_generate_v4(), "login" character varying NOT NULL, "password" character varying NOT NULL, "rol" uuid, "usuario" uuid, CONSTRAINT "PK_8ef31dc43daa3ca5c669004290b" PRIMARY KEY ("id_credencial"))`);
        await queryRunner.query(`CREATE TABLE "roles" ("id_rol" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(100) NOT NULL DEFAULT '', "aplicativo" uuid NOT NULL, CONSTRAINT "PK_25f8d4161f00a1dd1cbe5068695" PRIMARY KEY ("id_rol"))`);
        await queryRunner.query(`CREATE TABLE "aplicativos" ("idAplicativo" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(200) NOT NULL DEFAULT '', "pin_registro" character varying(20) NOT NULL DEFAULT '1234', CONSTRAINT "PK_1f312f4cca414e3b6bd36504fa0" PRIMARY KEY ("idAplicativo"))`);
        await queryRunner.query(`CREATE TABLE "accesos" ("idAcceso" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" text NOT NULL, "usuario" uuid NOT NULL, "fecha_ingreso" TIMESTAMP, "fecha_salida" TIMESTAMP, "estado" character varying NOT NULL DEFAULT 'activo', CONSTRAINT "PK_0723fbb17625d0c552e437adf50" PRIMARY KEY ("idAcceso"))`);
        await queryRunner.query(`CREATE TABLE "usuarios" ("idUsuario" uuid NOT NULL DEFAULT uuid_generate_v4(), "estado" character varying NOT NULL DEFAULT 'activo', "persona" uuid, "aplicativo" uuid, CONSTRAINT "PK_23e41f215fc91d01207123f74af" PRIMARY KEY ("idUsuario"))`);
        await queryRunner.query(`CREATE TABLE "personas" ("idPersona" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying NOT NULL, "apellido" character varying, "tipo_doc" character varying(10) DEFAULT 'CC', "cedula" bigint NOT NULL, "telefono" bigint, "direccion" character varying, "correo" character varying, "genero" character varying, "cargo" character varying, "estado" character varying NOT NULL DEFAULT 'activo', "es_lider" boolean NOT NULL DEFAULT false, "area_liderada" character varying, "es_transversal" boolean NOT NULL DEFAULT false, "foto_perfil" character varying(500), "ficha_id" uuid, "municipio" uuid, CONSTRAINT "UQ_e397742915cffdfe1b9db0da50b" UNIQUE ("cedula"), CONSTRAINT "PK_9ecd55bdaa6489d4e6f8cdc627d" PRIMARY KEY ("idPersona"))`);
        await queryRunner.query(`CREATE TABLE "cursos" ("idCurso" uuid NOT NULL DEFAULT uuid_generate_v4(), "codigo" character varying, "fecha_inicio" date, "fecha_fin" date, "fin_lectiva" date, "estado" character varying NOT NULL DEFAULT 'activo', "area" uuid, "programa" uuid, "lider" uuid, "ambiente" uuid, CONSTRAINT "PK_2aa8cfd20529f799b04746b74c4" PRIMARY KEY ("idCurso"))`);
        await queryRunner.query(`CREATE TABLE "areas" ("idArea" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying NOT NULL, "sede" integer, "lider_id" uuid, CONSTRAINT "PK_07710614dcbcc7b539e9344c03a" PRIMARY KEY ("idArea"))`);
        await queryRunner.query(`CREATE TABLE "ambientes" ("idAmbiente" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(100) NOT NULL, "tipo" character varying(100) DEFAULT 'Ambiente', "estado" character varying(50) DEFAULT 'activo', "capacidad" integer, "sede" integer, "municipio" uuid, "area" uuid, CONSTRAINT "PK_513c16dc47bc3d6c1f56b1b78a4" PRIMARY KEY ("idAmbiente"))`);
        await queryRunner.query(`CREATE TABLE "sedes" ("id_sede" SERIAL NOT NULL, "nombre" character varying NOT NULL, "centro_formacion" uuid NOT NULL, CONSTRAINT "PK_401bce17f4f7abe8670e9ece642" PRIMARY KEY ("id_sede"))`);
        await queryRunner.query(`CREATE TABLE "centro_formacion" ("idCentro" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(200) NOT NULL DEFAULT '', "direccion" text, "municipio" uuid, CONSTRAINT "PK_069ca9cc5e057af8b18550f6fb9" PRIMARY KEY ("idCentro"))`);
        await queryRunner.query(`CREATE TABLE "municipios" ("id_municipio" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(60) NOT NULL, "departamento" uuid NOT NULL, CONSTRAINT "PK_da5d86d82419fc6467cd4f3fa83" PRIMARY KEY ("id_municipio"))`);
        await queryRunner.query(`CREATE TABLE "departamentos" ("idDepartamento" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(100) NOT NULL DEFAULT '', CONSTRAINT "PK_3e58b9c017c27c10c316e6ba106" PRIMARY KEY ("idDepartamento"))`);
        await queryRunner.query(`CREATE TABLE "notificaciones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tipo" character varying(80) NOT NULL, "titulo" character varying(200) NOT NULL, "mensaje" text NOT NULL, "data" jsonb, "leida" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a9d32a419ff58b53a38b5ef85d4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "matriculas" ADD CONSTRAINT "FK_7eeb70196338055519f10b0c510" FOREIGN KEY ("persona") REFERENCES "personas"("idPersona") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "matriculas" ADD CONSTRAINT "FK_50e91259192972d01e12df803ee" FOREIGN KEY ("curso") REFERENCES "cursos"("idCurso") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "modulos" ADD CONSTRAINT "FK_0c9240ad285425d37900e28689a" FOREIGN KEY ("aplicativo") REFERENCES "aplicativos"("idAplicativo") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "servicios" ADD CONSTRAINT "FK_6c864cad5584b4dd84cb89d6fdb" FOREIGN KEY ("modulo") REFERENCES "modulos"("id_modulo") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "permisos" ADD CONSTRAINT "FK_64b9c005c375f3141ff915be048" FOREIGN KEY ("usuario") REFERENCES "usuarios"("idUsuario") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "permisos" ADD CONSTRAINT "FK_cf30fab01ee6a132bc78ad57c0b" FOREIGN KEY ("rol") REFERENCES "roles"("id_rol") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "permisos" ADD CONSTRAINT "FK_58463a54be1986f3332954a822d" FOREIGN KEY ("servicio") REFERENCES "servicios"("id_servicio") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "credenciales" ADD CONSTRAINT "FK_afb20d9336e818e6bde31de9813" FOREIGN KEY ("rol") REFERENCES "roles"("id_rol") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "credenciales" ADD CONSTRAINT "FK_77d2fc32169e355e28972937278" FOREIGN KEY ("usuario") REFERENCES "usuarios"("idUsuario") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "FK_e4569d982d80c9eabc87990e750" FOREIGN KEY ("aplicativo") REFERENCES "aplicativos"("idAplicativo") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "accesos" ADD CONSTRAINT "FK_477964c83da3784f76dafda87bb" FOREIGN KEY ("usuario") REFERENCES "usuarios"("idUsuario") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usuarios" ADD CONSTRAINT "FK_2068bc140ac2eb4d6f57cc2020f" FOREIGN KEY ("persona") REFERENCES "personas"("idPersona") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usuarios" ADD CONSTRAINT "FK_9d82250bf5134d24250729db296" FOREIGN KEY ("aplicativo") REFERENCES "aplicativos"("idAplicativo") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "personas" ADD CONSTRAINT "FK_3385efc0ca486f34c5aacae8aaf" FOREIGN KEY ("municipio") REFERENCES "municipios"("id_municipio") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "personas" ADD CONSTRAINT "FK_0470c4631312c3806ed45078a43" FOREIGN KEY ("ficha_id") REFERENCES "cursos"("idCurso") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cursos" ADD CONSTRAINT "FK_1568d0cbe8c0c3ea06dd327244f" FOREIGN KEY ("area") REFERENCES "areas"("idArea") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cursos" ADD CONSTRAINT "FK_238b076e38400d0fe79d88e91f4" FOREIGN KEY ("programa") REFERENCES "programas"("id_programa") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cursos" ADD CONSTRAINT "FK_f754d8f2fdc4624073104db95cc" FOREIGN KEY ("lider") REFERENCES "personas"("idPersona") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cursos" ADD CONSTRAINT "FK_85c6da9e4775aab47bb9f67a40f" FOREIGN KEY ("ambiente") REFERENCES "ambientes"("idAmbiente") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "areas" ADD CONSTRAINT "FK_ff14b8a72eee6df208dae624cc8" FOREIGN KEY ("sede") REFERENCES "sedes"("id_sede") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "areas" ADD CONSTRAINT "FK_2b3ff4c46d6d845311307982ff6" FOREIGN KEY ("lider_id") REFERENCES "personas"("idPersona") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ambientes" ADD CONSTRAINT "FK_064820ef72d883d8b2cf10e5279" FOREIGN KEY ("sede") REFERENCES "sedes"("id_sede") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ambientes" ADD CONSTRAINT "FK_21911be5bc2cd0583507732e125" FOREIGN KEY ("municipio") REFERENCES "municipios"("id_municipio") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ambientes" ADD CONSTRAINT "FK_b1bf2799ecf8380088db10d885d" FOREIGN KEY ("area") REFERENCES "areas"("idArea") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sedes" ADD CONSTRAINT "FK_ea7449d718fffbf40aedfe6c3ce" FOREIGN KEY ("centro_formacion") REFERENCES "centro_formacion"("idCentro") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "centro_formacion" ADD CONSTRAINT "FK_fe6dab734be12db8de3b386d396" FOREIGN KEY ("municipio") REFERENCES "municipios"("id_municipio") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "municipios" ADD CONSTRAINT "FK_12e515515bf27a6ef290f9e535b" FOREIGN KEY ("departamento") REFERENCES "departamentos"("idDepartamento") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "municipios" DROP CONSTRAINT "FK_12e515515bf27a6ef290f9e535b"`);
        await queryRunner.query(`ALTER TABLE "centro_formacion" DROP CONSTRAINT "FK_fe6dab734be12db8de3b386d396"`);
        await queryRunner.query(`ALTER TABLE "sedes" DROP CONSTRAINT "FK_ea7449d718fffbf40aedfe6c3ce"`);
        await queryRunner.query(`ALTER TABLE "ambientes" DROP CONSTRAINT "FK_b1bf2799ecf8380088db10d885d"`);
        await queryRunner.query(`ALTER TABLE "ambientes" DROP CONSTRAINT "FK_21911be5bc2cd0583507732e125"`);
        await queryRunner.query(`ALTER TABLE "ambientes" DROP CONSTRAINT "FK_064820ef72d883d8b2cf10e5279"`);
        await queryRunner.query(`ALTER TABLE "areas" DROP CONSTRAINT "FK_2b3ff4c46d6d845311307982ff6"`);
        await queryRunner.query(`ALTER TABLE "areas" DROP CONSTRAINT "FK_ff14b8a72eee6df208dae624cc8"`);
        await queryRunner.query(`ALTER TABLE "cursos" DROP CONSTRAINT "FK_85c6da9e4775aab47bb9f67a40f"`);
        await queryRunner.query(`ALTER TABLE "cursos" DROP CONSTRAINT "FK_f754d8f2fdc4624073104db95cc"`);
        await queryRunner.query(`ALTER TABLE "cursos" DROP CONSTRAINT "FK_238b076e38400d0fe79d88e91f4"`);
        await queryRunner.query(`ALTER TABLE "cursos" DROP CONSTRAINT "FK_1568d0cbe8c0c3ea06dd327244f"`);
        await queryRunner.query(`ALTER TABLE "personas" DROP CONSTRAINT "FK_0470c4631312c3806ed45078a43"`);
        await queryRunner.query(`ALTER TABLE "personas" DROP CONSTRAINT "FK_3385efc0ca486f34c5aacae8aaf"`);
        await queryRunner.query(`ALTER TABLE "usuarios" DROP CONSTRAINT "FK_9d82250bf5134d24250729db296"`);
        await queryRunner.query(`ALTER TABLE "usuarios" DROP CONSTRAINT "FK_2068bc140ac2eb4d6f57cc2020f"`);
        await queryRunner.query(`ALTER TABLE "accesos" DROP CONSTRAINT "FK_477964c83da3784f76dafda87bb"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_e4569d982d80c9eabc87990e750"`);
        await queryRunner.query(`ALTER TABLE "credenciales" DROP CONSTRAINT "FK_77d2fc32169e355e28972937278"`);
        await queryRunner.query(`ALTER TABLE "credenciales" DROP CONSTRAINT "FK_afb20d9336e818e6bde31de9813"`);
        await queryRunner.query(`ALTER TABLE "permisos" DROP CONSTRAINT "FK_58463a54be1986f3332954a822d"`);
        await queryRunner.query(`ALTER TABLE "permisos" DROP CONSTRAINT "FK_cf30fab01ee6a132bc78ad57c0b"`);
        await queryRunner.query(`ALTER TABLE "permisos" DROP CONSTRAINT "FK_64b9c005c375f3141ff915be048"`);
        await queryRunner.query(`ALTER TABLE "servicios" DROP CONSTRAINT "FK_6c864cad5584b4dd84cb89d6fdb"`);
        await queryRunner.query(`ALTER TABLE "modulos" DROP CONSTRAINT "FK_0c9240ad285425d37900e28689a"`);
        await queryRunner.query(`ALTER TABLE "matriculas" DROP CONSTRAINT "FK_50e91259192972d01e12df803ee"`);
        await queryRunner.query(`ALTER TABLE "matriculas" DROP CONSTRAINT "FK_7eeb70196338055519f10b0c510"`);
        await queryRunner.query(`DROP TABLE "notificaciones"`);
        await queryRunner.query(`DROP TABLE "departamentos"`);
        await queryRunner.query(`DROP TABLE "municipios"`);
        await queryRunner.query(`DROP TABLE "centro_formacion"`);
        await queryRunner.query(`DROP TABLE "sedes"`);
        await queryRunner.query(`DROP TABLE "ambientes"`);
        await queryRunner.query(`DROP TABLE "areas"`);
        await queryRunner.query(`DROP TABLE "cursos"`);
        await queryRunner.query(`DROP TABLE "personas"`);
        await queryRunner.query(`DROP TABLE "usuarios"`);
        await queryRunner.query(`DROP TABLE "accesos"`);
        await queryRunner.query(`DROP TABLE "aplicativos"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "credenciales"`);
        await queryRunner.query(`DROP TABLE "permisos"`);
        await queryRunner.query(`DROP TABLE "servicios"`);
        await queryRunner.query(`DROP TABLE "modulos"`);
        await queryRunner.query(`DROP TABLE "matriculas"`);
        await queryRunner.query(`DROP TABLE "programas"`);
    }

}
