import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class LoginDto {
    @IsString()
    @IsOptional()
    login?: string;

    @IsString()
    @IsOptional()
    identifier?: string;

    @IsString()
    @IsNotEmpty({ message: 'La contraseña es obligatoria' })
    @MinLength(4)
    password: string;
}
