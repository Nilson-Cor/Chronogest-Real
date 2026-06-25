import { Module }                from '@nestjs/common';
import { MigracionController }  from './migracion.controller';
import { MigracionService }     from './migracion.service';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports:     [NotificacionesModule],
  controllers: [MigracionController],
  providers:   [MigracionService],
})
export class MigracionModule {}
