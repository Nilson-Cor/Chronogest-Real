import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * RootAuthGuard
 *
 * Protege exclusivamente las rutas de CentroTenantAdminController.
 * Verifica un JWT firmado con ROOT_JWT_SECRET (distinto del JWT_SECRET de
 * AuthModule) para que un token de usuario normal jamás sea válido aquí,
 * y viceversa. No interactúa con JwtAuthGuard, TenantGuard, CentroTenantGuard
 * ni RebacGuard — es un sistema de autenticación totalmente separado.
 */
@Injectable()
export class RootAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token) throw new UnauthorizedException('Token de root no proporcionado');

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.ROOT_JWT_SECRET,
      });
      if (!payload?.isRoot) throw new UnauthorizedException('Token no es de un usuario root');
      request.rootUser = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token de root inválido o expirado');
    }
  }
}
