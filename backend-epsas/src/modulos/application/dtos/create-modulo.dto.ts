import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateModuloDto {
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    @MaxLength(200, { message: 'El nombre no puede exceder 200 caracteres' })
    nombre: string;

    @IsString({ message: 'El aplicativo debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'El aplicativo es obligatorio' })
    aplicativoId: string;
}
