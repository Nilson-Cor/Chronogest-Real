import { Module } from '@nestjs/common';
import { SedeService } from './application/services/sede.service';
import { SedeController } from './infrastructure/controllers/sede.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [SedeController],
  providers: [SedeService],
  exports: [SedeService],
})
export class SedeModule { }
