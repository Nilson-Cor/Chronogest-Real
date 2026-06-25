import { IsNotEmpty, IsString, IsInt, IsOptional } from 'class-validator';

export class CreateAplicativoDto {
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    nombre: string;

}