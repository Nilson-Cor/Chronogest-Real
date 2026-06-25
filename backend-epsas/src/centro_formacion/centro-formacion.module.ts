import { Module } from '@nestjs/common';
import { CentroFormacionService } from './application/services/centro-formacion.service';
import { CentroFormacionController } from './infrastructure/controllers/centro-formacion.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [CentroFormacionController],
  providers: [CentroFormacionService],
  exports: [CentroFormacionService],
})
export class CentroFormacionModule { }
