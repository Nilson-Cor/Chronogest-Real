import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AccesoProcessor } from './processors/acceso.processor';
import { ACCESO_QUEUE } from './queue.constants'
import { CentroTenantAdminModule } from '../centro-tenant-admin/centro-tenant-admin.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }),
    }),
    BullModule.registerQueue({ name: ACCESO_QUEUE }),
    CentroTenantAdminModule,
  ],
  providers: [AccesoProcessor],
  exports: [BullModule],
})
export class QueueModule {}
