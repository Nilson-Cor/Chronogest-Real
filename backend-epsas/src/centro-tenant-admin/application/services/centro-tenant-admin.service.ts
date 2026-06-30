import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
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
import { EPSAS_ENTITIES, HORARIOS_ENTITIES } from '../../../database/centro-datasource.factory';
import { InitEpsas1782400343717 } from '../../../database/migrations/1782400343717-InitEpsas';
import { InitHorarios1782400474926 } from '../../../database/migrations-horarios/1782400474926-InitHorarios';

export interface AdminInicialCreado {
  email: string;
  password: string;
}

interface ConexionBD {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
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

    // Las bases de datos se aprovisionan ANTES de guardar el tenant: si fallan,
    // no queda un registro de tenant "fantasma" apuntando a nada.
    try {
      await this.asegurarBaseDeDatos(dto.epsasDbName, { host: dto.epsasDbHost, port: dto.epsasDbPort });
      await this.asegurarBaseDeDatos(dto.horariosDbName, { host: dto.horariosDbHost, port: dto.horariosDbPort });
      await this.migrarBaseDeDatos(EPSAS_ENTITIES, [InitEpsas1782400343717], dto.epsasDbName, { host: dto.epsasDbHost, port: dto.epsasDbPort });
      await this.migrarBaseDeDatos(HORARIOS_ENTITIES, [InitHorarios1782400474926], dto.horariosDbName, { host: dto.horariosDbHost, port: dto.horariosDbPort });
    } catch (error) {
      this.logger.error(`No se pudieron aprovisionar las bases de datos del tenant "${dto.slug}": ${(error as Error).message}`);
      throw new BadRequestException(
        `No se pudieron crear/migrar las bases de datos (${dto.epsasDbName}, ${dto.horariosDbName}) en ${dto.epsasDbHost ?? 'el host configurado'}. Verifica el host/puerto y que el servidor Postgres sea accesible. Detalle: ${(error as Error).message}`,
      );
    }

    const centroTenant = this.centroTenantRepo.crear(dto);
    const guardado = await this.centroTenantRepo.guardar(centroTenant);
    const adminInicial = await this.sembrarEpsasDb(dto);
    return { centro: guardado, adminInicial };
  }

  /**
   * Crea la base de datos `nombre` en el servidor Postgres indicado, si aun
   * no existe. Se conecta a la base "postgres" del mismo servidor (no se
   * puede ejecutar CREATE DATABASE estando conectado a la base que se va a
   * crear) usando las credenciales administrativas del servidor.
   */
  private async asegurarBaseDeDatos(nombre: string, conexion: ConexionBD): Promise<void> {
    const admin = new DataSource({
      type: 'postgres',
      host: conexion.host ?? process.env.DB_HOST,
      port: conexion.port ?? parseInt(process.env.DB_PORT ?? '5435', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: 'postgres',
    });
    try {
      await admin.initialize();
      const existe = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [nombre]);
      if (!existe.length) {
        // El nombre de la base no admite placeholders parametrizados en DDL;
        // se valida primero contra el formato ya restringido del DTO (slug-like)
        // mas un identificador entre comillas dobles escapadas.
        await admin.query(`CREATE DATABASE "${nombre.replace(/"/g, '""')}"`);
      }
    } finally {
      if (admin.isInitialized) await admin.destroy();
    }
  }

  /** Ejecuta las migraciones iniciales sobre `nombre` si todavia no se han aplicado. */
  private async migrarBaseDeDatos(entities: any[], migrations: any[], nombre: string, conexion: ConexionBD): Promise<void> {
    const dataSource = new DataSource({
      type: 'postgres',
      host: conexion.host ?? process.env.DB_HOST,
      port: conexion.port ?? parseInt(process.env.DB_PORT ?? '5435', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: nombre,
      entities,
      migrations,
    });
    try {
      await dataSource.initialize();
      await dataSource.runMigrations();
    } finally {
      if (dataSource.isInitialized) await dataSource.destroy();
    }
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
   * una dependencia circular entre ambos servicios. Para cuando se llega aqui
   * la base ya fue creada y migrada en crear(), asi que un fallo aqui si se
   * registra como advertencia pero ya no debería ser por base inexistente.
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
