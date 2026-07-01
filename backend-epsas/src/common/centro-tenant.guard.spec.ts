import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CentroTenantGuard } from './centro-tenant.guard';
import { CentroTenantContextService } from './centro-tenant-context.service';

function contextoFalso(user: any) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

describe('CentroTenantGuard', () => {
  let reflector: Reflector;
  let guard: CentroTenantGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new CentroTenantGuard(reflector);
  });

  afterEach(() => jest.restoreAllMocks());

  it('permite el acceso en endpoints @Public()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    expect(guard.canActivate(contextoFalso({}))).toBe(true);
  });

  it('permite el acceso cuando no hay contexto de tenant resuelto (rutas admin/root)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jest.spyOn(CentroTenantContextService, 'hasContext').mockReturnValue(false);
    expect(guard.canActivate(contextoFalso({}))).toBe(true);
  });

  it('rechaza un token emitido para otro Centro de Formación', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jest.spyOn(CentroTenantContextService, 'hasContext').mockReturnValue(true);
    jest.spyOn(CentroTenantContextService, 'getSlug').mockReturnValue('sena-antioquia');

    const ctx = contextoFalso({ centroSlug: 'sena-huila' });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('permite el acceso cuando el token coincide con el tenant resuelto', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jest.spyOn(CentroTenantContextService, 'hasContext').mockReturnValue(true);
    jest.spyOn(CentroTenantContextService, 'getSlug').mockReturnValue('sena-antioquia');

    const ctx = contextoFalso({ centroSlug: 'sena-antioquia' });

    expect(guard.canActivate(ctx)).toBe(true);
  });
});
