import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { EstadoCurso } from '../../infrastructure/persistence/curso.entity';

export class CreateCursoDto {
    @IsOptional()
    @IsString({ message: 'El código debe ser texto' })
    codigo?: string;

    /** Alias de codigo — usado por el módulo de migración (= ID FICHA del Excel) */
    @IsOptional()
    @IsString()
    idFicha?: string;

    @IsOptional()
    @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida (YYYY-MM-DD)' })
    fechaInicio?: string;

    /** Alias de fechaInicio — usado por el módulo de migración */
    @IsOptional()
    @IsString()
    fechaInicioFicha?: string;

    @IsOptional()
    @IsDateString({}, { message: 'La fecha fin debe ser una fecha válida (YYYY-MM-DD)' })
    fechaFin?: string;

    @IsOptional()
    @IsDateString({}, { message: 'La fecha fin lectiva debe ser una fecha válida (YYYY-MM-DD)' })
    finLectiva?: string;

    /** Alias de finLectiva — usado por el módulo de migración */
    @IsOptional()

    @IsString()
    fechaFinLectiva?: string;

    @IsOptional()

    @IsString({ message: 'El área debe ser una cadena de texto' })
    areaId?: string;

    @IsOptional()
    @IsString({ message: 'El programa debe ser una cadena de texto' })
    programaId?: string;

    /** Nombre del programa — el backend hace el upsert automáticamente */
    @IsOptional()

    @IsString()
    nombrePrograma?: string;

    @IsOptional()
    @IsString({ message: 'El líder debe ser una cadena de texto' })
    liderId?: string;

    @IsOptional()
    @IsEnum(EstadoCurso, { message: 'El estado debe ser activo, terminado o cancelado' })
    estado?: EstadoCurso;

    @IsOptional()
    @IsString({ message: 'El ambiente debe ser una cadena de texto' })
    ambienteId?: string;

    /** Campos informativos adicionales del migrador (ignorados en BD) */
    @IsOptional()
    @IsString()
    nivel?: string;

    @IsOptional()
    @IsString()
    estadoCurso?: string;

    @IsOptional()
    @IsString()
    sede?: string;

}