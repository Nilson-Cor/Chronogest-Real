import { Module } from '@nestjs/common';
import { PersonasService } from './application/services/personas.service';
import { PersonasController } from './infrastructure/controllers/personas.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [PersonasController],
  providers: [PersonasService],
  exports: [PersonasService],
})
export class PersonasModule { }
