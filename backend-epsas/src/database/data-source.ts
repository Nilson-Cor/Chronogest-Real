import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

// Entidades epsas_db
import { Departamento } from '../departamentos/infrastructure/persistence/departamento.entity';
import { Municipio } from '../municipios/infrastructure/persistence/municipio.entity';
import { CentroFormacion } from '../centro_formacion/infrastructure/persistence/centro-formacion.entity';
import { Sede } from '../sedes/infrastructure/persistence/sede.entity';
import { Ambiente } from '../ambientes/infrastructure/persistence/ambiente.entity';
import { Area } from '../areas/infrastructure/persistence/area.entity';
import { Programa } from '../programas/infrastructure/persistence/programa.entity';
import { Persona } from '../personas/infrastructure/persistence/persona.entity';
import { Curso } from '../cursos/infrastructure/persistence/curso.entity';
import { Matricula } from '../matriculas/infrastructure/persistence/matricula.entity';
import { Aplicativo } from '../aplicativos/infrastructure/persistence/aplicativo.entity';
import { Rol } from '../roles/infrastructure/persistence/rol.entity';
import { Modulo } from '../modulos/infrastructure/persistence/modulo.entity';
import { Servicio } from '../servicios/infrastructure/persistence/servicio.entity';
import { Usuario } from '../usuarios/infrastructure/persistence/usuario.entity';
import { Permiso } from '../permisos/infrastructure/persistence/permiso.entity';
import { Credencial } from '../credenciales/infrastructure/persistence/credencial.entity';
import { Acceso } from '../accesos/infrastructure/persistence/acceso.entity';
import { Notificacion } from '../notificaciones/infrastructure/persistence/notificacion.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT ?? 5435),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME     ?? 'epsas_db',
  synchronize: false,
  logging: false,
  entities: [
    Departamento, Municipio, CentroFormacion, Sede, Ambiente, Area, Programa,
    Persona, Curso, Matricula, Aplicativo, Rol, Modulo, Servicio, Usuario,
    Permiso, Credencial, Acceso, Notificacion,
  ],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
});
