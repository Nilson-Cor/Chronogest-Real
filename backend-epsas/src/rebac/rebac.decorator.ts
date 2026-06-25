import { SetMetadata } from '@nestjs/common';

export const SERVICIO_REQUERIDO_KEY = 'servicioRequerido';

/**
 * Declara qué servicio (por nombre) necesita tener permiso el usuario
 * para acceder al endpoint.
 *
 * El nombre debe coincidir con la columna `nombre` de la tabla `servicios`.
 *
 * Ejemplos de uso:
 *   @RequiereServicio('gestionar-usuarios')
 *   @Get()
 *   obtenerUsuarios() { ... }
 *
 *   @RequiereServicio('ver-reportes')
 *   @Get('reportes')
 *   obtenerReportes() { ... }
 */
export const RequiereServicio = (nombre: string) =>
  SetMetadata(SERVICIO_REQUERIDO_KEY, nombre);
