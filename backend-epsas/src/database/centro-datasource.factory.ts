import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CentroTenantAdminService } from '../centro-tenant-admin/application/services/centro-tenant-admin.service';

// Entidades — epsas_db (misma lista que la conexión por defecto en app.module.ts)
import { Departamento } from '../departamentos/infrastructure/persistence/departamento.entity';
import { Municipio } from '../municipios/infrastructure/persistence/municipio.entity';
import { CentroFormacion } from '../centro_formacion/infrastructure/persistence/centro-formacion.entity';
import { Sede } from '../sedes/infrastructure/persistence/sede.entity';
import { Ambiente } from '../ambientes/infrastructure/persistence/ambiente.entity';
import { Area } from '../areas/infrastructure/persistence/area.entity';
import { Programa } from '../programas/infrastructure/persistence/programa.entity';
import { Persona } from '../personas/infrastructure/persistence/persona.entity';
import { Curso } from '../cursos/infrastructure/persistence/curso.entity';
import { Matricula } from '../matriculas/infrastructure/persistence/matricula.entity';
import { Aplicativo } from '../aplicativos/infrastructure/persistence/aplicativo.entity';
import { Rol } from '../roles/infrastructure/persistence/rol.entity';
import { Modulo } from '../modulos/infrastructure/persistence/modulo.entity';
import { Servicio } from '../servicios/infrastructure/persistence/servicio.entity';
import { Usuario } from '../usuarios/infrastructure/persistence/usuario.entity';
import { Permiso } from '../permisos/infrastructure/persistence/permiso.entity';
import { Credencial } from '../credenciales/infrastructure/persistence/credencial.entity';
import { Acceso } from '../accesos/infrastructure/persistence/acceso.entity';
import { Notificacion } from '../notificaciones/infrastructure/persistence/notificacion.entity';

// Entidades — horarios_db (misma lista que la conexión 'horarios' en app.module.ts)
import { Horario } from '../horarios-cg/infrastructure/persistence/horario.entity';
import { AsignacionHorario } from '../horarios-cg/infrastructure/persistence/asignacion-horario.entity';
import { Competencia } from '../horarios-cg/infrastructure/persistence/competencia.entity';
import { SolicitudCambio } from '../horarios-cg/infrastructure/persistence/solicitud-cambio.entity';
import { Evento } from '../horarios-cg/infrastructure/persistence/evento.entity';

export const EPSAS_ENTITIES = [
  Departamento, Municipio, CentroFormacion, Sede, Ambiente,
  Area, Programa, Persona, Curso, Matricula, Aplicativo,
  Rol, Modulo, Servicio, Usuario, Permiso, Credencial, Acceso,
  Notificacion,
];

export const HORARIOS_ENTITIES = [Horario, AsignacionHorario, Competencia, SolicitudCambio, Evento];

const SLUG_MASTER_RESERVADO = 'master';

/**
 * Resuelve y cachea, por slug de Centro de Formación (tenant), las DataSources
 * de epsas_db y horarios_db. Cada tenant tiene sus propias bases de datos
 * físicas; este factory mantiene una única conexión inicializada por slug.
 */
@Injectable()
export class CentroDataSourceFactory {
  private readonly epsasDataSources = new Map<string, DataSource>();
  private readonly horariosDataSources = new Map<string, DataSource>();

  constructor(private readonly centroTenantAdminService: CentroTenantAdminService) {}

  async getEpsasDataSource(slug: string): Promise<DataSource> {
    this.validarSlug(slug);

    const existente = this.epsasDataSources.get(slug);
    if (existente) return existente;

    const tenant = await this.obtenerTenantActivo(slug);

    const dataSource = new DataSource({
      type: 'postgres',
      host: tenant.epsasDbHost ?? process.env.DB_HOST,
      port: tenant.epsasDbPort ?? parseInt(process.env.DB_PORT ?? '5435', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: tenant.epsasDbName,
      synchronize: process.env.NODE_ENV !== 'production',
      logging: false,
      entities: EPSAS_ENTITIES,
    });

    await dataSource.initialize();
    this.epsasDataSources.set(slug, dataSource);
    return dataSource;
  }

  async getHorariosDataSource(slug: string): Promise<DataSource> {
    this.validarSlug(slug);

    const existente = this.horariosDataSources.get(slug);
    if (existente) return existente;

    const tenant = await this.obtenerTenantActivo(slug);

    const dataSource = new DataSource({
      type: 'postgres',
      host: tenant.horariosDbHost ?? process.env.HORARIOS_DB_HOST ?? process.env.DB_HOST,
      port:
        tenant.horariosDbPort ??
        parseInt(process.env.HORARIOS_DB_PORT ?? process.env.DB_PORT ?? '5435', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: tenant.horariosDbName,
      synchronize: process.env.NODE_ENV !== 'production',
      logging: false,
      entities: HORARIOS_ENTITIES,
    });

    await dataSource.initialize();
    this.horariosDataSources.set(slug, dataSource);
    return dataSource;
  }

  async closeAll(): Promise<void> {
    const todas = [
      ...this.epsasDataSources.values(),
      ...this.horariosDataSources.values(),
    ];
    await Promise.all(
      todas.filter((ds) => ds.isInitialized).map((ds) => ds.destroy()),
    );
    this.epsasDataSources.clear();
    this.horariosDataSources.clear();
  }

  private validarSlug(slug: string): void {
    if (slug === SLUG_MASTER_RESERVADO) {
      throw new BadRequestException('El slug "master" está reservado y no puede usarse como tenant');
    }
  }

  private async obtenerTenantActivo(slug: string) {
    const tenant = await this.centroTenantAdminService.obtenerPorSlug(slug).catch(() => null);
    if (!tenant || tenant.estado !== 'activo') {
      throw new NotFoundException('Tenant no encontrado: ' + slug);
    }
    return tenant;
  }
}
