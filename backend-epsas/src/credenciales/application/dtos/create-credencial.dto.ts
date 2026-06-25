import { IsNotEmpty, IsString, IsInt, MinLength } from 'class-validator';

export class CreateCredencialDto {
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    login: string;

    @IsString({ message: 'La contraseña debe ser texto' })
    @MinLength(5, { message: 'La contraseña debe tener al menos 5 caracteres' })
    @IsNotEmpty({ message: 'La contraseña es obligatoria' })
    password: string;

    @IsString({ message: 'El rol debe ser una cadena de texto' })
    rolId?: string;

    @IsString({ message: 'El usuario debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'El usuario es obligatorio' })
    usuarioId: string;
}