import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDepartamentoDto {
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres' })
    nombre: string;
}
