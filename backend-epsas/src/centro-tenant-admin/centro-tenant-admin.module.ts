import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { CentroTenant } from './infrastructure/entities/centro-tenant.entity';
import { RootUser } from './infrastructure/entities/root-user.entity';
import { CentroTenantRepository } from './infrastructure/persistence/centro-tenant.repository';
import { CentroTenantAdminService } from './application/services/centro-tenant-admin.service';
import { CentroTenantAdminController } from './infrastructure/controllers/centro-tenant-admin.controller';
import { CentroDataSourceFactory } from '../database/centro-datasource.factory';
import { RootAuthService } from './application/services/root-auth.service';
import { RootAuthController } from './infrastructure/controllers/root-auth.controller';
import { RootAuthGuard } from './infrastructure/guards/root-auth.guard';

@Module({
  imports: [
    // Conexión separada para MASTER_DB — no interfiere con la conexión por
    // defecto (epsas_db) ni con la conexión 'horarios' definidas en app.module.ts
    TypeOrmModule.forRootAsync({
      name: 'masterConnection',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        name: 'masterConnection',
        type: 'postgres',
        host: cfg.get<string>('MASTER_DB_HOST', 'localhost'),
        port: cfg.get<number>('MASTER_DB_PORT', 5435),
        username: cfg.get<string>('MASTER_DB_USER', 'postgres'),
        password: cfg.getOrThrow<string>('MASTER_DB_PASSWORD'),
        database: cfg.get<string>('MASTER_DB_NAME', 'chronogest_master_db'),
        synchronize: cfg.get<string>('NODE_ENV', 'development') !== 'production',
        logging: false,
        entities: [CentroTenant, RootUser],
      }),
    }),
    TypeOrmModule.forFeature([CentroTenant, RootUser], 'masterConnection'),
    // JWT exclusivo para RootUser — secreto distinto del JWT_SECRET de AuthModule
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.getOrThrow<string>('ROOT_JWT_SECRET'),
        signOptions: { expiresIn: '4h' },
      }),
    }),
  ],
  controllers: [CentroTenantAdminController, RootAuthController],
  providers: [
    CentroTenantRepository,
    CentroTenantAdminService,
    CentroDataSourceFactory,
    RootAuthService,
    RootAuthGuard,
  ],
  exports: [CentroTenantRepository, CentroTenantAdminService, CentroDataSourceFactory],
})
export class CentroTenantAdminModule {}
