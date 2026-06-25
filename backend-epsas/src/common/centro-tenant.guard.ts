import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { CentroTenantContextService } from './centro-tenant-context.service';

/**
 * CentroTenantGuard
 *
 * Verifica que el centroSlug del JWT coincida con el Centro de Formación
 * (tenant) resuelto por CentroTenantMiddleware para el request actual.
 * Evita que un token emitido para un Centro de Formación se use contra
 * otro (p. ej. token de "huila" usado en "antioquia.localhost").
 *
 * No reemplaza ni modifica TenantGuard (src/tenant/), que sigue resolviendo
 * el aplicativoId del JWT (multi-app SSO) — un concepto distinto.
 */
@Injectable()
export class CentroTenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    if (!CentroTenantContextService.hasContext()) {
      return true;
    }

    const currentSlug = CentroTenantContextService.getSlug();
    const request = context.switchToHttp().getRequest();
    const tokenSlug = request.user?.centroSlug;

    if (tokenSlug && tokenSlug !== currentSlug) {
      throw new ForbiddenException('Token no pertenece a este Centro de Formación');
    }

    return true;
  }
}
