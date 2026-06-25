import { Module } from '@nestjs/common';
import { AreasService } from './application/services/areas.service';
import { AreasController } from './infrastructure/controllers/areas.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [AreasController],
  providers: [AreasService],
  exports: [AreasService],
})
export class AreasModule { }
