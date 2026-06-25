import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';

// Controllers
import { HorariosController } from './infrastructure/controllers/horarios.controller';
import { CompetenciasController } from './infrastructure/controllers/competencias.controller';
import { SolicitudesController } from './infrastructure/controllers/solicitudes.controller';
import { EventosController } from './infrastructure/controllers/eventos.controller';
import { ConfiguracionController } from './infrastructure/controllers/configuracion.controller';
import { NotificacionesCGController } from './infrastructure/controllers/notificaciones-cg.controller';
import { HorariosAdminController } from './infrastructure/controllers/horarios-admin.controller';
import { HorariosCompatController } from './infrastructure/controllers/horarios-compat.controller';

// Services
import { HorariosService } from './application/services/horarios.service';

@Module({
    imports: [CommonModule],
    controllers: [
        HorariosController,
        CompetenciasController,
        SolicitudesController,
        EventosController,
        ConfiguracionController,
        NotificacionesCGController,
        HorariosAdminController,
        HorariosCompatController,
    ],
    providers: [HorariosService],
    exports: [HorariosService],
})
export class HorariosCGModule {}
