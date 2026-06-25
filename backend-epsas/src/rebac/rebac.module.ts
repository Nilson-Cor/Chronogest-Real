import { Module } from '@nestjs/common';
import { RebacGuard } from './rebac.guard';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [RebacGuard],
  exports: [RebacGuard],
})
export class RebacModule {}
