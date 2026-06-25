import { Module } from '@nestjs/common';
import { ServicioController } from './infrastructure/controllers/servicio.controller';
import { ServicioService } from './application/services/servicio.service';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [CommonModule],
    controllers: [ServicioController],
    providers: [ServicioService],
    exports: [ServicioService]
})
export class ServiciosModule { }
