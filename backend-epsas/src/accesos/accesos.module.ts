import { Module } from '@nestjs/common';
import { accesoService  } from './application/services/accesos.service';
import { AccesosController } from './infrastructure/controllers/accesos.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [AccesosController],
  providers: [accesoService ],
  exports: [accesoService ]
})
export class AccesosModule {}
