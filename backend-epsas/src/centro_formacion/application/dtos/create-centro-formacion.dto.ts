import { IsNotEmpty, IsString, IsInt, IsOptional } from 'class-validator';

export class CreateCentroFormacionDto {
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    nombre: string;

    @IsString({ message: 'La dirección debe ser texto' })
    @IsOptional()
    direccion?: string;

    @IsString({ message: 'El municipio debe ser una cadena de texto' })
    @IsOptional()
    municipioId: string;
}
