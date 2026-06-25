import { Module } from '@nestjs/common';
import { ProgramasService } from './application/services/programas.service';
import { ProgramasController } from './infrastructure/controllers/programas.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [ProgramasController],
  providers: [ProgramasService],
  exports: [ProgramasService],
})
export class ProgramasModule { }
