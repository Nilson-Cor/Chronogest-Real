import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateProgramaDto {
    @IsString()
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    nombre: string;

    @IsString()
    @IsOptional()
    tipo?: TipoAplicativo;
}

export enum TipoAplicativo {
  TECNOLOGO = 'tecnologo',
  TECNICO = 'tecnico',
  CURSO = 'curso',
  ESPECIALIZACION = 'especializacion',
  OPERARIO = 'operario',
}
