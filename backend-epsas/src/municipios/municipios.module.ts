import { Module } from '@nestjs/common';
import { MunicipiosService } from './application/services/municipios.service';
import { MunicipiosController } from './infrastructure/controllers/municipios.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [MunicipiosController],
  providers: [MunicipiosService],
  exports: [MunicipiosService],
})
export class MunicipiosModule { }
