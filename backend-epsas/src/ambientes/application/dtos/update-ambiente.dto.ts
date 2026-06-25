import { PartialType } from '@nestjs/mapped-types';
import { CreateAmbienteDto } from './create-ambiente.dto';

export class UpdateAmbienteDto extends PartialType(CreateAmbienteDto) { }
