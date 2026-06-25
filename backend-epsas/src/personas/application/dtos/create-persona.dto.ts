import { IsNotEmpty, IsString, IsInt, IsOptional, IsEmail } from 'class-validator';

export class CreatePersonaDto {
    @IsString({ message: 'El nombre debe ser texto' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    nombre: string;

    @IsOptional()
    @IsString({ message: 'El apellido debe ser texto' })
    apellido?: string;

    @IsOptional()
    @IsInt({ message: 'la cedula debe ser un número' })
    cedula?: number;

    /** Alias de cedula — usado por el módulo de migración del frontend */
    @IsOptional()
    @IsString()
    numeroDocumento?: string;

    /** Tipo de documento — usado tanto en migración como en formulario */
    @IsOptional()
    @IsString()
    tipoDoc?: string;

    /** Alias de tipoDoc — usado por el módulo de migración */
    @IsOptional()
    @IsString()
    tipoDocumento?: string;

    @IsOptional()
    @IsInt({ message: 'El teléfono debe ser un número' })
    telefono?: number;

    @IsOptional()
    @IsString({ message: 'El municipio debe ser una cadena de texto' })
    municipioId?: string;

    @IsOptional()
    @IsString({ message: 'La dirección debe ser texto' })
    direccion?: string;

    @IsOptional()
    @IsString({ message: 'El correo debe ser texto' })
    correo?: string;

    @IsOptional()
    @IsString({ message: 'El género debe ser texto' })
    genero?: TipoGenero;

    @IsOptional()
    @IsString({ message: 'El cargo debe ser texto' })
    cargo?: TipoCargo;

    @IsOptional()
    @IsString({ message: 'El estado debe ser texto' })
    estado?: tipoEstado;

    @IsOptional()
    @IsString({ message: 'La ficha debe ser un UUID' })
    fichaId?: string;
}

export enum TipoGenero {
  FEMENINO = 'femenino',
  MASCULINO = 'masculino',
}
export enum TipoCargo {
  ADMINISTRADOR = 'administrador',
  INSTRUCTOR = 'instructor',
  APRENDIZ = 'aprendiz',
}
export enum tipoEstado {
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
}
