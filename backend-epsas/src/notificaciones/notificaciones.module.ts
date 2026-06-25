import { Module } from '@nestjs/common';
import { NotificacionesService } from './application/services/notificaciones.service';
import { NotificacionesController } from './infrastructure/controllers/notificaciones.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
