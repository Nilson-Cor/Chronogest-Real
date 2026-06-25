import { Module } from '@nestjs/common';
import { CentroTenantContextService } from './centro-tenant-context.service';

@Module({
  providers: [CentroTenantContextService],
  exports: [CentroTenantContextService],
})
export class CommonModule {}
