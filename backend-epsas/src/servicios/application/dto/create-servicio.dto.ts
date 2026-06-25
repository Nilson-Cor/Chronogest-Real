import { IsNotEmpty, IsString, IsInt, MaxLength } from 'class-validator';

export class CreateServicioDto {
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    nombre: string;

    @IsString({ message: 'La url debe ser texto' })
    @MaxLength(200, { message: 'la url puede exceder 50 caracteres' })    
    @IsNotEmpty({ message: 'El url es obligatoria' })
    url: string;

    @IsString({ message: 'El modulo debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'El modulo es obligatorio' })
    moduloId: string;
}
