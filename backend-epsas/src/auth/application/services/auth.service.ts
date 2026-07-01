import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import { Credencial } from '../../../credenciales/infrastructure/persistence/credencial.entity';
import { Usuario } from '../../../usuarios/infrastructure/persistence/usuario.entity';
import { Matricula } from '../../../matriculas/infrastructure/persistence/matricula.entity';
import { Acceso } from '../../../accesos/infrastructure/persistence/acceso.entity';
import { Persona } from '../../../personas/infrastructure/persistence/persona.entity';
import { Rol } from '../../../roles/infrastructure/persistence/rol.entity';
import { Aplicativo } from '../../../aplicativos/infrastructure/persistence/aplicativo.entity';
import { LoginDto } from '../dtos/login.dto';
import { RegisterDto } from '../dtos/register.dto';
import { CentroTenantContextService } from '../../../common/centro-tenant-context.service';
import { CentroTenantRepository } from '../../../centro-tenant-admin/infrastructure/persistence/centro-tenant.repository';
import { CentroDataSourceFactory } from '../../../database/centro-datasource.factory';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly centroTenantRepo: CentroTenantRepository,
    private readonly centroDataSourceFactory: CentroDataSourceFactory,
  ) {}

  private get credencialRepository(): Repository<Credencial> {
    return CentroTenantContextService.getEpsasDataSource().getRepository(Credencial);
  }

  private get usuarioRepository(): Repository<Usuario> {
    return CentroTenantContextService.getEpsasDataSource().getRepository(Usuario);
  }

  private get matriculaRepository(): Repository<Matricula> {
    return CentroTenantContextService.getEpsasDataSource().getRepository(Matricula);
  }

  private get accesoRepository(): Repository<Acceso> {
    return CentroTenantContextService.getEpsasDataSource().getRepository(Acceso);
  }

  private get personaRepository(): Repository<Persona> {
    return CentroTenantContextService.getEpsasDataSource().getRepository(Persona);
  }

  private get rolRepository(): Repository<Rol> {
    return CentroTenantContextService.getEpsasDataSource().getRepository(Rol);
  }

  private get aplicativoRepository(): Repository<Aplicativo> {
    return CentroTenantContextService.getEpsasDataSource().getRepository(Aplicativo);
  }

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    if (dto.personaId && dto.aplicativoId && dto.rolId) {
      const usuario = this.usuarioRepository.create({
        persona: { idPersona: dto.personaId } as any,
        aplicativo: { idAplicativo: dto.aplicativoId } as any,
      });
      const usuarioGuardado = await this.usuarioRepository.save(usuario);
      const credencial = new Credencial();
      credencial.login = dto.login ?? dto.correo ?? dto.personaId;
      credencial.password = hashedPassword;
      credencial.rol = { idRol: dto.rolId } as any;
      credencial.usuario = { idUsuario: usuarioGuardado.idUsuario } as any;
      await this.credencialRepository.save(credencial);
      return { message: 'Usuario registrado exitosamente', usuarioId: usuarioGuardado.idUsuario };
    }

    if (!dto.numDoc) throw new BadRequestException('El número de documento es obligatorio para el registro');
    if (!dto.nombre)  throw new BadRequestException('El nombre es obligatorio para el registro');

    const cargoMap: Record<string, string> = {
      admin: 'administrador', administrador: 'administrador',
      instructor: 'instructor', aprendiz: 'aprendiz',
    };
    const cargo = cargoMap[dto.rol ?? 'aprendiz'] ?? 'aprendiz';

    const persona = this.personaRepository.create({
      nombre: dto.nombre, apellido: dto.apellido, tipoDoc: dto.tipoDoc ?? 'CC',
      cedula: Number(dto.numDoc), correo: dto.correo,
      telefono: dto.telefono ? Number(dto.telefono) : (undefined as any),
      municipio: (dto.municipio || null) ? ({ idMunicipio: dto.municipio } as any) : null,
      genero: (dto.genero || null) as any, cargo: cargo as any,
      fichaId: (dto.fichaId || null) as any, estado: 'activo' as any,
    });
    const personaGuardada = await this.personaRepository.save(persona);

    const [aplicativo] = await this.aplicativoRepository.find({ take: 1 });
    if (!aplicativo) throw new BadRequestException('No hay aplicativos registrados en el sistema. Contacte al administrador.');

    const usuario = this.usuarioRepository.create({
      persona: { idPersona: personaGuardada.idPersona } as any,
      aplicativo: { idAplicativo: aplicativo.idAplicativo } as any,
    });
    const usuarioGuardado = await this.usuarioRepository.save(usuario);

    const rolNombre = dto.rol ?? 'aprendiz';
    const rol = await this.rolRepository.findOne({ where: { nombre: rolNombre, aplicativoId: aplicativo.idAplicativo } })
      ?? await this.rolRepository.findOne({ where: { nombre: cargo, aplicativoId: aplicativo.idAplicativo } });

    const credencial = new Credencial();
    credencial.login = dto.correo ?? dto.numDoc;
    credencial.password = hashedPassword;
    if (rol) credencial.rol = { idRol: rol.idRol } as any;
    credencial.usuario = { idUsuario: usuarioGuardado.idUsuario } as any;
    await this.credencialRepository.save(credencial);

    return { message: 'Usuario registrado exitosamente', usuarioId: usuarioGuardado.idUsuario };
  }

  private cargoToRol(cargo: string): string {
    if (cargo === 'administrador' || cargo === 'coordinador') return 'admin';
    if (cargo === 'instructor') return 'instructor';
    return 'aprendiz';
  }

  async login(dto: LoginDto, res?: Response) {
    const { login, password } = dto;

    const credencial = await this.credencialRepository.findOne({
      where: { login },
      relations: ['usuario', 'usuario.aplicativo', 'usuario.persona', 'rol'],
    });
    if (!credencial) throw new UnauthorizedException('Credenciales inválidas');

    const isValid = await bcrypt.compare(password, credencial.password);
    if (!isValid) throw new UnauthorizedException('Credenciales inválidas');
    if (!credencial.usuario) throw new UnauthorizedException('Credencial sin usuario asociado');

    const persona = credencial.usuario.persona;
    const personaId = persona?.idPersona;

    const matriculas = personaId
      ? await this.matriculaRepository.find({ where: { idPersona: personaId }, select: ['idMatricula', 'idCurso'] })
      : [];
    const matriculaIds = matriculas.map((m) => m.idMatricula);
    const fichaId = matriculas.length > 0 ? matriculas[0].idCurso : (persona as any)?.fichaId ?? null;
    const cargo = persona?.cargo ?? 'aprendiz';
    const rol = this.cargoToRol(String(cargo));

    const payload = {
      id: personaId, rol, nombre: persona?.nombre ?? '', apellido: (persona as any)?.apellido ?? '',
      correo: (persona as any)?.correo ?? '', esLider: (persona as any)?.esLider ?? false,
      areaLiderada: (persona as any)?.areaLiderada ?? null, esTransversal: (persona as any)?.esTransversal ?? false,
      fichaId, idUsuario: credencial.usuario.idUsuario, personaId, matriculaIds,
      login: credencial.login, aplicativoId: credencial.usuario.aplicativo?.idAplicativo,
      rolId: credencial.rol?.idRol, cargo,
      centroSlug: CentroTenantContextService.getSlug(),
    };

    const token = this.jwtService.sign(payload);

    if (res) {
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24,
      });
    }

    // Registro directo y síncrono del acceso — antes también se encolaba una
    // copia idéntica vía BullMQ (AccesoProcessor), lo que duplicaba la fila
    // en `accesos` en cada login. Se dejó solo esta vía porque es la que
    // garantiza que el registro exista de inmediato (usada por el indicador
    // "conectado" de /admin/centros-tenant).
    try {
      await this.accesoRepository.save(
        this.accesoRepository.create({ token, usuarioId: credencial.usuario.idUsuario, fechaIngreso: new Date(), estado: 'activo' as any }),
      );
    } catch (_) {}

    return {
      access_token: token, token,
      user: {
        id: personaId, rol, nombre: persona?.nombre ?? '', apellido: (persona as any)?.apellido ?? '',
        esLider: (persona as any)?.esLider ?? false, areaLiderada: (persona as any)?.areaLiderada ?? null,
        esTransversal: (persona as any)?.esTransversal ?? false, fichaId, cargo,
        idUsuario: credencial.usuario.idUsuario, aplicativoId: credencial.usuario.aplicativo?.idAplicativo,
      },
    };
  }

  /**
   * Login sin que el usuario tenga que conocer ni escribir el slug del
   * Centro de Formación: busca la credencial por `login` en cada tenant
   * activo y entra al primero donde exista Y la contraseña coincida.
   * Si el mismo correo/login existe en varios centros (ej. un correo
   * genérico de administrador reutilizado), se prueba la contraseña en
   * todos antes de declarar "credenciales inválidas" — no basta con
   * encontrar el login en el primer tenant para descartar los demás.
   * Pensado para usuarios finales no técnicos — el campo "Centro de
   * Formación" manual queda como opción avanzada/respaldo en la UI.
   */
  async loginAuto(dto: LoginDto, res?: Response): Promise<any> {
    const tenants = await this.centroTenantRepo.obtenerTodos();
    const activos = tenants.filter((t) => t.estado === 'activo');

    for (const tenant of activos) {
      let epsasDs;
      let horariosDs;
      try {
        epsasDs = await this.centroDataSourceFactory.getEpsasDataSource(tenant.slug);
        horariosDs = await this.centroDataSourceFactory.getHorariosDataSource(tenant.slug);
      } catch {
        continue; // tenant con base de datos inalcanzable — probar el siguiente
      }

      const credencial = await epsasDs.getRepository(Credencial).findOne({ where: { login: dto.login } });
      if (!credencial) continue;

      const passwordValida = await bcrypt.compare(dto.password, credencial.password);
      if (!passwordValida) continue; // mismo login en otro tenant — seguir probando

      return CentroTenantContextService.run(tenant.slug, epsasDs, horariosDs, async () => {
        const resultado = await this.login(dto, res);
        return { ...resultado, centroSlug: tenant.slug } as any;
      });
    }

    throw new UnauthorizedException('Credenciales inválidas');
  }

  async cambiarPassword(login: string, passwordActual: string, passwordNuevo: string): Promise<void> {
    const credencial = await this.credencialRepository.findOne({ where: { login } });
    if (!credencial) throw new UnauthorizedException('Usuario no encontrado');
    const valido = await bcrypt.compare(passwordActual, credencial.password);
    if (!valido) throw new UnauthorizedException('La contraseña actual es incorrecta');
    credencial.password = await bcrypt.hash(passwordNuevo, 10);
    await this.credencialRepository.save(credencial);
  }

  async validarToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const credencial = await this.credencialRepository.findOne({
        where: { login: payload.login },
        relations: ['usuario', 'usuario.persona', 'usuario.aplicativo', 'rol', 'rol.permisos', 'rol.permisos.servicio'],
      });
      if (!credencial) throw new UnauthorizedException('Token inválido');
      return {
        valido: true,
        usuario: {
          id: credencial.usuario.persona?.idPersona, idUsuario: credencial.usuario.idUsuario,
          login: credencial.login, persona: credencial.usuario.persona,
          aplicativo: credencial.usuario.aplicativo,
        },
        rol: credencial.rol,
        permisos: credencial.rol.permisos?.map((p) => ({ servicio: p.servicio?.nombre, url: p.servicio?.url })) ?? [],
      };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
