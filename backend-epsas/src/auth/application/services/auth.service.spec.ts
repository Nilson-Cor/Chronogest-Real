import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';

jest.mock('bcrypt');

/**
 * Repos falsos indexados por clase de entidad — cada llamada a
 * `dataSource.getRepository(Entity)` en AuthService recibe siempre el mismo
 * mock por entidad, así los tests pueden configurar/inspeccionar cada uno.
 */
function crearDataSourceFalsa() {
  const repos = new Map<any, any>();
  const repoDe = (entidad: any) => {
    if (!repos.has(entidad)) {
      repos.set(entidad, {
        findOne: jest.fn(),
        find: jest.fn().mockResolvedValue([]),
        save: jest.fn((x: any) => Promise.resolve(x)),
        create: jest.fn((x: any) => x),
      });
    }
    return repos.get(entidad);
  };
  return {
    getRepository: jest.fn((entidad: any) => repoDe(entidad)),
    _repos: repos,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: { sign: jest.Mock };
  let centroTenantRepo: { obtenerTodos: jest.Mock };
  let centroDataSourceFactory: { getEpsasDataSource: jest.Mock; getHorariosDataSource: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    jwtService = { sign: jest.fn().mockReturnValue('token-firmado') };
    centroTenantRepo = { obtenerTodos: jest.fn() };
    centroDataSourceFactory = {
      getEpsasDataSource: jest.fn(),
      getHorariosDataSource: jest.fn(),
    };
    service = new AuthService(jwtService as any, centroTenantRepo as any, centroDataSourceFactory as any);
  });

  describe('login()', () => {
    const credencialValida = {
      login: 'user@sena.edu.co',
      password: 'hash-guardado',
      usuario: {
        idUsuario: 'usuario-1',
        aplicativo: { idAplicativo: 'app-1' },
        persona: { idPersona: 'persona-1', nombre: 'Ana', apellido: 'Pérez', cargo: 'instructor' },
      },
      rol: { idRol: 'rol-1' },
    };

    it('inicia sesión, firma el JWT y guarda el Acceso UNA sola vez', async () => {
      const ds = crearDataSourceFalsa();
      jest.spyOn(CentroTenantContextService, 'getEpsasDataSource').mockReturnValue(ds as any);
      jest.spyOn(CentroTenantContextService, 'getSlug').mockReturnValue('sena-medellin');

      const CredencialClass = require('../../../credenciales/infrastructure/persistence/credencial.entity').Credencial;
      const MatriculaClass = require('../../../matriculas/infrastructure/persistence/matricula.entity').Matricula;
      const AccesoClass = require('../../../accesos/infrastructure/persistence/acceso.entity').Acceso;

      ds.getRepository(CredencialClass).findOne.mockResolvedValue(credencialValida);
      ds.getRepository(MatriculaClass).find.mockResolvedValue([]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const resultado = await service.login({ login: 'user@sena.edu.co', password: 'plano' } as any);

      expect(resultado.access_token).toBe('token-firmado');
      expect(resultado.user.id).toBe('persona-1');
      expect(jwtService.sign).toHaveBeenCalledTimes(1);

      // Regresión: antes de la corrección, el Acceso se guardaba dos veces
      // (una síncrona + una encolada vía BullMQ, ambas insertando la misma fila).
      expect(ds.getRepository(AccesoClass).save).toHaveBeenCalledTimes(1);
    });

    it('rechaza credenciales inexistentes', async () => {
      const ds = crearDataSourceFalsa();
      jest.spyOn(CentroTenantContextService, 'getEpsasDataSource').mockReturnValue(ds as any);
      const CredencialClass = require('../../../credenciales/infrastructure/persistence/credencial.entity').Credencial;
      ds.getRepository(CredencialClass).findOne.mockResolvedValue(null);

      await expect(
        service.login({ login: 'no-existe@sena.edu.co', password: 'x' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza contraseña incorrecta', async () => {
      const ds = crearDataSourceFalsa();
      jest.spyOn(CentroTenantContextService, 'getEpsasDataSource').mockReturnValue(ds as any);
      const CredencialClass = require('../../../credenciales/infrastructure/persistence/credencial.entity').Credencial;
      ds.getRepository(CredencialClass).findOne.mockResolvedValue(credencialValida);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ login: 'user@sena.edu.co', password: 'incorrecta' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('loginAuto()', () => {
    const CredencialClass = require('../../../credenciales/infrastructure/persistence/credencial.entity').Credencial;
    const MatriculaClass = require('../../../matriculas/infrastructure/persistence/matricula.entity').Matricula;

    function tenantDataSource(credencial: any) {
      const ds = crearDataSourceFalsa();
      ds.getRepository(CredencialClass).findOne.mockResolvedValue(credencial);
      ds.getRepository(MatriculaClass).find.mockResolvedValue([]);
      return ds;
    }

    it('prueba cada tenant activo y entra al que tiene la credencial correcta', async () => {
      const credencialTenantB = {
        login: 'mismo-login@sena.edu.co',
        password: 'hash-b',
        usuario: { idUsuario: 'u-b', aplicativo: { idAplicativo: 'app-b' }, persona: { idPersona: 'p-b', cargo: 'admin' } },
        rol: { idRol: 'rol-b' },
      };

      const dsA = tenantDataSource({ ...credencialTenantB, password: 'hash-a-no-coincide' }); // mismo login, password de otro tenant
      const dsB = tenantDataSource(credencialTenantB);

      centroTenantRepo.obtenerTodos.mockResolvedValue([
        { slug: 'tenant-inactivo', estado: 'inactivo' },
        { slug: 'tenant-a', estado: 'activo' },
        { slug: 'tenant-b', estado: 'activo' },
      ]);
      centroDataSourceFactory.getEpsasDataSource.mockImplementation((slug: string) =>
        slug === 'tenant-a' ? Promise.resolve(dsA) : Promise.resolve(dsB),
      );
      centroDataSourceFactory.getHorariosDataSource.mockResolvedValue({} as any);

      let slugActivo = '';
      jest.spyOn(CentroTenantContextService, 'run').mockImplementation((slug: any, epsas: any, _h: any, cb: any) => {
        slugActivo = slug;
        return cb();
      });
      jest.spyOn(CentroTenantContextService, 'getEpsasDataSource').mockImplementation(() =>
        slugActivo === 'tenant-a' ? (dsA as any) : (dsB as any),
      );
      jest.spyOn(CentroTenantContextService, 'getSlug').mockImplementation(() => slugActivo);

      (bcrypt.compare as jest.Mock).mockImplementation((plano: string, hash: string) =>
        Promise.resolve(hash === 'hash-b'),
      );

      const resultado = await service.loginAuto({ login: 'mismo-login@sena.edu.co', password: 'plano' } as any);

      expect(resultado.centroSlug).toBe('tenant-b');
      // El tenant inactivo nunca debió consultarse
      expect(centroDataSourceFactory.getEpsasDataSource).not.toHaveBeenCalledWith('tenant-inactivo');
    });

    it('lanza credenciales inválidas si ningún tenant activo coincide', async () => {
      centroTenantRepo.obtenerTodos.mockResolvedValue([{ slug: 'tenant-a', estado: 'activo' }]);
      const dsA = tenantDataSource(null);
      centroDataSourceFactory.getEpsasDataSource.mockResolvedValue(dsA as any);
      centroDataSourceFactory.getHorariosDataSource.mockResolvedValue({} as any);

      await expect(
        service.loginAuto({ login: 'no-existe@sena.edu.co', password: 'x' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
