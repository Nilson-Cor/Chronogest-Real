import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

function contextoFalso() {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('JwtAuthGuard', () => {
  let reflector: Reflector;
  let guard: JwtAuthGuard;
  let superCanActivate: jest.SpyInstance;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
    // JwtAuthGuard extiende AuthGuard('jwt') (mixin de Passport) — se espía
    // el canActivate heredado para no depender de la estrategia real.
    const prototipoPadre = Object.getPrototypeOf(JwtAuthGuard.prototype);
    superCanActivate = jest.spyOn(prototipoPadre, 'canActivate').mockReturnValue(true);
  });

  afterEach(() => jest.restoreAllMocks());

  it('permite el acceso sin validar JWT cuando el endpoint es @Public()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const resultado = guard.canActivate(contextoFalso());

    expect(resultado).toBe(true);
    expect(superCanActivate).not.toHaveBeenCalled();
  });

  it('delega en la validación JWT de Passport cuando el endpoint no es público', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    guard.canActivate(contextoFalso());

    expect(superCanActivate).toHaveBeenCalledTimes(1);
  });

  it('usa IS_PUBLIC_KEY como metadata key (no un valor hardcodeado en otro lado)', () => {
    const spy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    guard.canActivate(contextoFalso());
    expect(spy.mock.calls[0][0]).toBe(IS_PUBLIC_KEY);
  });
});
