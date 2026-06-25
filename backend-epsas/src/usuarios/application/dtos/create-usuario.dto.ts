import { IsNotEmpty, IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateUsuarioDto {
    @IsString({ message: 'El id persona debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'El id persona es obligatorio' })
    personaId: string;

    @IsString({ message: 'El id aplicativo debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'El id aplicativo es obligatorio' })
    aplicativoId: string;

    @IsOptional()
    @IsString({ message: 'El estado debe ser texto' })
    estado?: string;
}