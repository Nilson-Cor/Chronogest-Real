import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RebacGuard } from './rebac.guard';
import { CentroTenantContextService } from '../common/centro-tenant-context.service';

function contextoFalso(user: any) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

/** Mock encadenable de QueryBuilder: innerJoin().innerJoin().where().andWhere().getExists() */
function queryBuilderQueRetorna(existe: boolean) {
  const qb: any = {};
  qb.innerJoin = jest.fn(() => qb);
  qb.where = jest.fn(() => qb);
  qb.andWhere = jest.fn(() => qb);
  qb.getExists = jest.fn().mockResolvedValue(existe);
  return qb;
}

describe('RebacGuard', () => {
  let reflector: Reflector;
  let guard: RebacGuard;
  let epsasDs: { getRepository: jest.Mock };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RebacGuard(reflector);
    epsasDs = { getRepository: jest.fn() };
    jest.spyOn(CentroTenantContextService, 'getEpsasDataSource').mockReturnValue(epsasDs as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it('permite el acceso en endpoints @Public()', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true); // IS_PUBLIC_KEY
    await expect(guard.canActivate(contextoFalso({}))).resolves.toBe(true);
  });

  it('sin @RequiereServicio, solo exige que haya un usuario autenticado', async () => {
    jest.spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false) // IS_PUBLIC_KEY
      .mockReturnValueOnce(undefined); // SERVICIO_REQUERIDO_KEY

    await expect(guard.canActivate(contextoFalso({ idUsuario: 'u-1' }))).resolves.toBe(true);
  });

  it('rechaza si no hay usuario en el request', async () => {
    jest.spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('horarios-admin');

    await expect(guard.canActivate(contextoFalso(undefined))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza si el usuario no tiene rol asignado', async () => {
    jest.spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('horarios-admin');

    const credencialRepo = { findOne: jest.fn().mockResolvedValue({ rol: null }) };
    epsasDs.getRepository.mockImplementation((entidad: any) =>
      entidad.name === 'Credencial' ? credencialRepo : queryBuilderQueRetorna(false),
    );

    await expect(
      guard.canActivate(contextoFalso({ idUsuario: 'u-1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permite el acceso cuando el rol tiene permiso sobre el servicio', async () => {
    jest.spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('horarios-admin');

    const credencialRepo = { findOne: jest.fn().mockResolvedValue({ rol: { idRol: 'rol-1' } }) };
    const qb = queryBuilderQueRetorna(true);
    const permisoRepo = { createQueryBuilder: jest.fn(() => qb) };
    epsasDs.getRepository.mockImplementation((entidad: any) =>
      entidad.name === 'Credencial' ? credencialRepo : permisoRepo,
    );

    await expect(guard.canActivate(contextoFalso({ idUsuario: 'u-1' }))).resolves.toBe(true);
  });

  it('rechaza cuando el rol NO tiene permiso sobre el servicio requerido', async () => {
    jest.spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('horarios-admin');

    const credencialRepo = { findOne: jest.fn().mockResolvedValue({ rol: { idRol: 'rol-1' } }) };
    const qb = queryBuilderQueRetorna(false);
    const permisoRepo = { createQueryBuilder: jest.fn(() => qb) };
    epsasDs.getRepository.mockImplementation((entidad: any) =>
      entidad.name === 'Credencial' ? credencialRepo : permisoRepo,
    );

    await expect(
      guard.canActivate(contextoFalso({ idUsuario: 'u-1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
