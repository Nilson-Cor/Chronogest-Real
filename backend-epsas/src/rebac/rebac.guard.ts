import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { Permiso } from '../permisos/infrastructure/persistence/permiso.entity';
import { Credencial } from '../credenciales/infrastructure/persistence/credencial.entity';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { SERVICIO_REQUERIDO_KEY } from './rebac.decorator';
import { CentroTenantContextService } from '../common/centro-tenant-context.service';

/**
 * REBAC GUARD (Relationship-Based Access Control)
 *
 * Verifica que el usuario autenticado tenga permiso sobre el servicio
 * requerido a través de la cadena de relaciones:
 *
 *   Usuario → Credencial → Rol → Permiso → Servicio (url)
 *
 * Uso:
 *   1. Decorar el endpoint con @RequiereServicio('nombre-del-servicio')
 *   2. El guard consulta si ese usuario tiene un Permiso cuyo Servicio
 *      coincida con el nombre indicado.
 *
 * Registro global en app.module.ts (providers):
 *   { provide: APP_GUARD, useClass: RebacGuard }
 */
@Injectable()
export class RebacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  private get permisoRepository(): Repository<Permiso> {
    return CentroTenantContextService.getEpsasDataSource().getRepository(Permiso);
  }

  private get credencialRepository(): Repository<Credencial> {
    return CentroTenantContextService.getEpsasDataSource().getRepository(Credencial);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const servicioRequerido = this.reflector.getAllAndOverride<string>(
      SERVICIO_REQUERIDO_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si el endpoint no declara @RequiereServicio, solo valida que el usuario esté autenticado
    if (!servicioRequerido) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.idUsuario) throw new ForbiddenException('Usuario no autenticado');

    // Buscar credencial del usuario para obtener su rol
    const credencial = await this.credencialRepository.findOne({
      where: { usuario: { idUsuario: user.idUsuario } },
      relations: ['rol'],
    });

    if (!credencial?.rol) throw new ForbiddenException('El usuario no tiene rol asignado');

    // Verificar si el rol tiene permiso sobre el servicio requerido
    // Relación: Rol → Permiso → Servicio
    const tienePermiso = await this.permisoRepository
      .createQueryBuilder('permiso')
      .innerJoin('permiso.rol', 'rol')
      .innerJoin('permiso.servicio', 'servicio')
      .where('rol.idRol = :rolId', { rolId: credencial.rol.idRol })
      .andWhere('servicio.nombre = :nombre', { nombre: servicioRequerido })
      .getExists();

    if (!tienePermiso) {
      throw new ForbiddenException(
        `Sin permiso para acceder al servicio: ${servicioRequerido}`,
      );
    }

    return true;
  }
}
