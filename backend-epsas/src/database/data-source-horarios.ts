import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

import { Horario } from '../horarios-cg/infrastructure/persistence/horario.entity';
import { Competencia } from '../horarios-cg/infrastructure/persistence/competencia.entity';
import { SolicitudCambio } from '../horarios-cg/infrastructure/persistence/solicitud-cambio.entity';
import { Evento } from '../horarios-cg/infrastructure/persistence/evento.entity';

export const HorariosDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.HORARIOS_DB_HOST ?? process.env.DB_HOST ?? 'localhost',
  port:     Number(process.env.HORARIOS_DB_PORT ?? process.env.DB_PORT ?? 5435),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.HORARIOS_DB_NAME ?? 'horarios_db',
  synchronize: false,
  logging: false,
  entities: [Horario, Competencia, SolicitudCambio, Evento],
  migrations: ['src/database/migrations-horarios/*.ts'],
  migrationsTableName: 'typeorm_migrations',
});
