import { Module } from '@nestjs/common';
import { CursosService } from './application/services/cursos.service';
import { CursosController } from './infrastructure/controllers/cursos.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [CursosController],
  providers: [CursosService],
  exports: [CursosService],
})
export class CursosModule { }
