import { IsNotEmpty, IsString, MaxLength, IsInt } from 'class-validator';

export class CreateMunicipioDto {
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    @MaxLength(60, { message: 'El nombre no puede exceder 60 caracteres' })
    nombre: string;

    @IsString({ message: 'El departamento debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'El departamento es obligatorio' })
    departamentoId: string;
}
