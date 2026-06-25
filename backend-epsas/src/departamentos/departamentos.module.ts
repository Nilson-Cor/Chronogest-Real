import { Module } from '@nestjs/common';
import { DepartamentosService } from './application/services/departamentos.service';
import { DepartamentosController } from './infrastructure/controllers/departamentos.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [DepartamentosController],
  providers: [DepartamentosService],
  exports: [DepartamentosService],
})
export class DepartamentosModule { }
