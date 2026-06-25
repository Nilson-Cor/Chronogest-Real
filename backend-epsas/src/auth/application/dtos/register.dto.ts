import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
    @IsOptional() @IsString() nombre?: string;
    @IsOptional() @IsString() apellido?: string;
    @IsOptional() @IsString() tipoDoc?: string;
    @IsOptional() @IsString() numDoc?: string;
    @IsOptional() @IsString() correo?: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    password: string;

    @IsOptional() @IsString() telefono?: string;
    @IsOptional() @IsString() municipio?: string;
    @IsOptional() @IsString() genero?: string;
    @IsOptional() @IsString() fichaId?: string;
    @IsOptional() @IsString() rol?: string;

    // Modo legado (flujo heredado del ERP)
    @IsOptional() @IsString() login?: string;
    @IsOptional() @IsString() personaId?: string;
    @IsOptional() @IsString() aplicativoId?: string;
    @IsOptional() @IsString() rolId?: string;
}
