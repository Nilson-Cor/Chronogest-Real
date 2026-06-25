
import { IsNotEmpty, IsInt, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateMatriculaDto {
    /** UUID de la persona — requerido en modo normal */
    @IsString({ message: 'La persona debe ser una cadena de texto' })
    @IsOptional()
    persona?: string;

    /** UUID del curso — requerido en modo normal */
    @IsString({ message: 'El curso debe ser una cadena de texto' })
    @IsOptional()
    curso?: string;

    // ── Campos del módulo de migración (modo alternativo) ──────────────────
    /** Cédula del aprendiz — el backend resuelve el UUID internamente */
    @IsOptional()
    cedula?: number | string;

    /** Código de ficha (ID FICHA) — el backend resuelve el UUID del curso */
    @IsOptional()
    @IsString()
    fichaNumero?: string;

    /** Alias de fichaNumero */
    @IsOptional()
    @IsString()
    numeroDocumento?: string;

    // ── Campos informativos (guardados en log, no en la tabla) ─────────────
    @IsOptional() estado?: string;

    @IsOptional()
    @IsString()
    fechaMatricula?: string;

    /** Porcentaje de avance de ejecución del programa (0-100) */
    @IsOptional()
    @IsNumber()
    avance?: number;
    @IsOptional() promover?: number;
    @IsOptional() productiva?: number;
    @IsOptional() ingles?: number;
    @IsOptional() tecnico?: number;
    @IsOptional() totalRap?: number;
    @IsOptional() totPromover?: number;
    @IsOptional() totProductiva?: number;
    @IsOptional() totIngles?: number;
    @IsOptional() totTecnico?: number;
    @IsOptional() totalRaps?: number;
    @IsOptional() totalRapsPrograma?: number;
    @IsOptional() porcentajeEjecucion?: number;
    @IsOptional() fechaReporte?: string;

}
