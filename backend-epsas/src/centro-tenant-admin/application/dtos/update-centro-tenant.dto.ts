import { PartialType } from '@nestjs/mapped-types';
import { CreateCentroTenantDto } from './create-centro-tenant.dto';

export class UpdateCentroTenantDto extends PartialType(CreateCentroTenantDto) {}
