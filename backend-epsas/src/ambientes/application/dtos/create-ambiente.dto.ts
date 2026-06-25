import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateAmbienteDto {
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    nombre: string;

    @IsOptional()
    @IsString()
    sedeId?: string;

    @IsOptional()
    @IsString()
    municipioId?: string;

    @IsOptional()
    @IsString()
    areaId?: string;

    @IsOptional()
    @IsNumber()
    capacidad?: number;
}
