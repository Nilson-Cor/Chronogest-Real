import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

import { CentroTenant } from '../centro-tenant-admin/infrastructure/entities/centro-tenant.entity';
import { RootUser } from '../centro-tenant-admin/infrastructure/entities/root-user.entity';

export const MasterDataSource = new DataSource({
  type: 'postgres',
  host: process.env.MASTER_DB_HOST ?? 'localhost',
  port: Number(process.env.MASTER_DB_PORT ?? 5435),
  username: process.env.MASTER_DB_USER ?? 'postgres',
  password: process.env.MASTER_DB_PASSWORD,
  database: process.env.MASTER_DB_NAME ?? 'chronogest_master_db',
  synchronize: false,
  logging: false,
  entities: [CentroTenant, RootUser],
  migrations: ['src/database/migrations-master/*.ts'],
  migrationsTableName: 'typeorm_migrations',
});
