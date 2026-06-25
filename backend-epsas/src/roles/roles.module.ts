import { Module } from '@nestjs/common';
import { rolController } from './infrastructure/controllers/roles.controller';
import { rolService } from './application/services/roles.service';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [CommonModule],
    controllers: [rolController],
    providers: [rolService],
    exports: [rolService]
})
export class RolesModule { }
