import { PartialType } from '@nestjs/mapped-types';
import { CreateAplicativoDto } from './create-aplicativo.dto';

export class UpdateAplicativoDto extends PartialType(CreateAplicativoDto) { }
