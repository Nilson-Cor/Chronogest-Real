import { Module } from '@nestjs/common';
import { AmbientesService } from './application/services/ambientes.service';
import { AmbientesController } from './infrastructure/controllers/ambientes.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [AmbientesController],
  providers: [AmbientesService],
  exports: [AmbientesService],
})
export class AmbientesModule {}