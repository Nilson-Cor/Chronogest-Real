import { IsNotEmpty, IsString, IsInt, MinLength, MaxLength, IsOptional, IsDateString } from 'class-validator';

export class CreateAccesoDto {
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    @MaxLength(200, { message: 'El nombre no puede exceder 50 caracteres' })
    nombre: string;

    @IsInt({ message: 'El usuario debe ser un string' })
    @IsNotEmpty({ message: 'El usuario es obligatorio' })
    usuarioId: string;

    @IsOptional()
    @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida (YYYY-MM-DD)' })
    fechaIngreso?: string;

    @IsOptional()
    @IsDateString({}, { message: 'La fecha fin debe ser una fecha válida (YYYY-MM-DD)' })
    fechaSalida?: string;   
    
    @IsOptional()
    @IsString({ message: 'El estado debe ser texto' })
    estado?: tipoEstado;
}


export enum tipoEstado {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
}
