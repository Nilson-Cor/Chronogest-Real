import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class CreateSedeDto {
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    nombre: string;

    @IsString({ message: 'El centro de formación debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'El centro de formación es obligatorio' })
    centroFormacionId: string;
}
