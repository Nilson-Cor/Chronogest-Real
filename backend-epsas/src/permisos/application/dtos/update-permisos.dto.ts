import { PartialType } from '@nestjs/mapped-types';
import { CreatePermisoDto } from './create-permisos.dto';

export class UpdatePermisoDto extends PartialType(CreatePermisoDto) { }
