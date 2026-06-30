import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CentroTenantRepository } from '../../infrastructure/persistence/centro-tenant.repository';
import { CentroTenant } from '../../infrastructure/entities/centro-tenant.entity';
import { CreateCentroTenantDto } from '../dtos/create-centro-tenant.dto';
import { UpdateCentroTenantDto } from '../dtos/update-centro-tenant.dto';
import { CentroFormacion } from '../../../centro_formacion/infrastructure/persistence/centro-formacion.entity';
import { Aplicativo } from '../../../aplicativos/infrastructure/persistence/aplicativo.entity';
import { Persona } from '../../../personas/infrastructure/persistence/persona.entity';
import { Usuario } from '../../../usuarios/infrastructure/persistence/usuario.entity';
import { Credencial } from '../../../credenciales/infrastructure/persistence/credencial.entity';
import { EPSAS_ENTITIES } from '../../../database/centro-datasource.factory';

export interface AdminInicialCreado {
  email: string;
  password: string;
}

@Injectable()
export class CentroTenantAdminService {
  private readonly logger = new Logger(CentroTenantAdminService.name);

  constructor(private readonly centroTenantRepo: CentroTenantRepository) {}

  // Crear un Centro de Formación (tenant)
  async crear(dto: CreateCentroTenantDto): Promise<{ centro: CentroTenant; adminInicial: AdminInicialCreado | null }> {
    const existente = await this.centroTenantRepo.obtenerPorSlug(dto.slug);
    if (existente) {
      throw new ConflictException(`Ya existe un Centro de Formación con el slug "${dto.slug}"`);
    }
    const centroTenant = this.centroTenantRepo.crear(dto);
    const guardado = await this.centroTenantRepo.guardar(centroTenant);
    const adminInicial = await this.sembrarEpsasDb(dto);
    return { centro: guardado, adminInicial };
  }

  /**
   * Siembra, en la propia epsas_db del tenant recien creado:
   *  1. El primer registro de "Centro de Formación" (estructura académica),
   *     para que la jerarquia Centro -> Sede -> Ambiente tenga un punto de
   *     partida sin pasos manuales.
   *  2. Un Aplicativo base (requerido por el flujo de registro/login).
   *  3. Un usuario administrador inicial con contraseña aleatoria segura,
   *     para que el root pueda entregarla y el cliente pueda entrar de
   *     inmediato a /login y administrar su propio tenant.
   *
   * Conexion directa y aislada (no via CentroDataSourceFactory) para evitar
   * una dependencia circular entre ambos servicios; best-effort: si la base
   * de datos del tenant aun no existe o no esta migrada, no bloquea la
   * creacion del tenant — solo se registra el error y no se devuelven
   * credenciales (adminInicial queda en null).
   */
  private async sembrarEpsasDb(dto: CreateCentroTenantDto): Promise<AdminInicialCreado | null> {
    const dataSource = new DataSource({
      type: 'postgres',
      host: dto.epsasDbHost ?? process.env.DB_HOST,
      port: dto.epsasDbPort ?? parseInt(process.env.DB_PORT ?? '5435', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: dto.epsasDbName,
      entities: EPSAS_ENTITIES,
    });

    try {
      await dataSource.initialize();

      // 1. Centro de Formación
      const centroFormacionRepo = dataSource.getRepository(CentroFormacion);
      if ((await centroFormacionRepo.count()) === 0) {
        await centroFormacionRepo.save(centroFormacionRepo.create({ nombre: dto.nombre }));
      }

      // 2. Aplicativo base
      const aplicativoRepo = dataSource.getRepository(Aplicativo);
      let aplicativo = await aplicativoRepo.findOne({ where: {} });
      if (!aplicativo) {
        aplicativo = await aplicativoRepo.save(aplicativoRepo.create({ nombre: dto.nombre }));
      }

      // 3. Usuario administrador inicial — solo si aun no existe ninguno
      const usuarioRepo = dataSource.getRepository(Usuario);
      const personaRepo = dataSource.getRepository(Persona);
      const credencialRepo = dataSource.getRepository(Credencial);

      const yaHayAdmin = await personaRepo.count({ where: { cargo: 'administrador' as any } });
      if (yaHayAdmin > 0) return null;

      const email = dto.adminEmail?.trim() || `admin@${dto.slug}.local`;
      const passwordPlano = this.generarPasswordSegura();
      const passwordHash = await bcrypt.hash(passwordPlano, 10);

      const persona = await personaRepo.save(personaRepo.create({
        nombre: 'Administrador',
        apellido: dto.nombre,
        cedula: this.generarCedulaPlaceholder(),
        correo: email,
        cargo: 'administrador' as any,
        estado: 'activo' as any,
      }));
      const usuario = await usuarioRepo.save(usuarioRepo.create({
        persona: { idPersona: persona.idPersona } as any,
        aplicativo: { idAplicativo: aplicativo.idAplicativo } as any,
      }));
      await credencialRepo.save(credencialRepo.create({
        login: email,
        password: passwordHash,
        usuario: { idUsuario: usuario.idUsuario } as any,
      }));

      return { email, password: passwordPlano };
    } catch (error) {
      this.logger.warn(
        `No se pudo sembrar epsas_db del tenant "${dto.slug}" (Centro de Formación / admin inicial): ${(error as Error).message}`,
      );
      return null;
    } finally {
      if (dataSource.isInitialized) await dataSource.destroy();
    }
  }

  /** Contraseña aleatoria criptográficamente segura (16 caracteres, base62). */
  private generarPasswordSegura(): string {
    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = crypto.randomBytes(16);
    return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
  }

  /** Cédula numérica única de relleno para el admin sembrado automáticamente. */
  private generarCedulaPlaceholder(): number {
    return Number(`9${Date.now()}`.slice(0, 15));
  }

  // Obtener todos los Centros de Formación
  async obtenerTodos(): Promise<CentroTenant[]> {
    return await this.centroTenantRepo.obtenerTodos();
  }

  // Obtener un Centro de Formación por UUID
  async obtenerPorId(id: string): Promise<CentroTenant> {
    const centroTenant = await this.centroTenantRepo.obtenerPorId(id);
    if (!centroTenant) {
      throw new NotFoundException(`Centro de Formación con ID ${id} no encontrado`);
    }
    return centroTenant;
  }

  // Obtener un Centro de Formación por slug (usado por CentroDataSourceFactory)
  async obtenerPorSlug(slug: string): Promise<CentroTenant> {
    const centroTenant = await this.centroTenantRepo.obtenerPorSlug(slug);
    if (!centroTenant) {
      throw new NotFoundException(`Centro de Formación con slug "${slug}" no encontrado`);
    }
    return centroTenant;
  }

  // Actualizar un Centro de Formación
  async actualizar(id: string, dto: UpdateCentroTenantDto): Promise<CentroTenant> {
    const centroTenant = await this.obtenerPorId(id);
    Object.assign(centroTenant, dto);
    return await this.centroTenantRepo.guardar(centroTenant);
  }

  // Eliminar definitivamente el registro del tenant (solo el routing en
  // master_db — no toca ni borra las bases de datos epsas_db/horarios_db
  // físicas que el tenant tenía asignadas, esas se conservan).
  async eliminar(id: string): Promise<{ mensaje: string }> {
    const centroTenant = await this.obtenerPorId(id);
    await this.centroTenantRepo.eliminar(centroTenant);
    return { mensaje: `Centro de Formación "${centroTenant.nombre}" eliminado correctamente` };
  }
}
