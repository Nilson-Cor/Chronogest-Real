import { Module } from '@nestjs/common';
import { MatriculasService } from './application/services/matriculas.service';
import { MatriculasController } from './infrastructure/controllers/matriculas.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [MatriculasController],
  providers: [MatriculasService],
  exports: [MatriculasService],
})
export class MatriculasModule { }
