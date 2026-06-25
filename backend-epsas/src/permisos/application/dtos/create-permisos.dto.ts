import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreatePermisoDto {
    @IsString()
    @IsNotEmpty({ message: 'El usuarioId es obligatorio' })
    usuarioId: string;

    @IsOptional()
    @IsString()
    rolId?: string;

    @IsString()
    @IsNotEmpty({ message: 'El servicioId es obligatorio' })
    servicioId: string;
}
