import { Module } from '@nestjs/common';
import { ModuloController } from './infrastructure/controllers/modulo.controller';
import { ModuloService } from './application/services/modulos.service';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [CommonModule],
    controllers: [ModuloController],
    providers: [ModuloService],
    exports: [ModuloService]
})
export class ModulosModule { }
