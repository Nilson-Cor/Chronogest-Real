import { Module } from '@nestjs/common';
import { PermisoController } from './infrastructure/controllers/permisos.controller';
import { PermisoService } from './application/services/permisos.service';
import { ServicioController } from 'src/servicios/infrastructure/controllers/servicio.controller';
import { ServiciosModule } from 'src/servicios/servicios.module';
import { CommonModule } from '../common/common.module';


@Module({
    imports: [CommonModule, ServiciosModule],
    controllers: [PermisoController],
    providers: [ServicioController, PermisoService],

})
export class PermisosModule { }
