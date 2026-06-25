import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';

/**
 * TenantGuard
 *
 * Extrae el aplicativoId del JWT (request.user.aplicativoId) y lo
 * escribe en request['tenantId'] para que esté disponible en el
 * resto del ciclo de vida de la petición.
 *
 * No depende de TenantService ni de ningún repositorio, por lo que
 * funciona correctamente como APP_GUARD singleton.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si el token no tiene aplicativoId (tokens legacy), simplemente continúa
    if (user?.aplicativoId) {
      request['tenantId'] = user.aplicativoId;
    }
    return true;
  }
}
