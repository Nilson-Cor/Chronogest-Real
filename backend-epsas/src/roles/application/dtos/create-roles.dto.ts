import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class CreateRolDto {
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    nombre: string;

    @IsString({ message: 'El aplicativo debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'El aplicativo es obligatorio' })
    aplicativoId: string;

}