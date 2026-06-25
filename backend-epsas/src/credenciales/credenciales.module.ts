import { Module } from '@nestjs/common';
import { credencialController } from './infrastructure/controllers/credencial.controller';
import { credencialService } from './application/services/credencial.service';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [CommonModule],
    controllers: [credencialController],
    providers: [credencialService],
    exports: [credencialService]
})
export class CredencialesModule { }
