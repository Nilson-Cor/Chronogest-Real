import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateAreaDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsOptional()
  @IsString({ message: 'La sede debe ser una cadena de texto' })
  sedeId?: string;

  @IsOptional()
  @IsString({ message: 'El líder debe ser una cadena de texto' })
  liderId?: string;
}
