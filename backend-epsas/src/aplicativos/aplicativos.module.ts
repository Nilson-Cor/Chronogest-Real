import { Module } from '@nestjs/common';
import { aplicativosController } from './infrastructure/controllers/aplicativos.controller';
import { aplicativosService } from './application/services/aplicativos.service';
import { CommonModule } from '../common/common.module';


@Module({
    imports: [CommonModule],
    controllers: [aplicativosController],
    providers: [aplicativosService],
    exports: [aplicativosService]
})
export class AplicativosModule { }
