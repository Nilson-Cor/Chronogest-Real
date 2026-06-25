import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Feature Modules
import { DepartamentosModule } from './departamentos/departamentos.module';
import { MunicipiosModule } from './municipios/municipios.module';
import { CentroFormacionModule } from './centro_formacion/centro-formacion.module';
import { SedeModule } from './sedes/sede.module';
import { AmbientesModule } from './ambientes/ambientes.module';
import { AreasModule } from './areas/areas.module';
import { ProgramasModule } from './programas/programas.module';
import { PersonasModule } from './personas/personas.module';
import { CursosModule } from './cursos/cursos.module';
import { MatriculasModule } from './matriculas/matriculas.module';
import { AplicativosModule } from './aplicativos/aplicativos.module';
import { RolesModule } from './roles/roles.module';
import { ModulosModule } from './modulos/modulos.module';
import { ServiciosModule } from './servicios/servicios.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PermisosModule } from './permisos/permisos.module';
import { CredencialesModule } from './credenciales/credenciales.module';
import { AccesosModule } from './accesos/accesos.module';
import { AuthModule } from './auth/auth.module';
import { MigracionModule } from './migracion/migracion.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { QueueModule } from './queue/queue.module';
import { TenantModule } from './tenant/tenant.module';
import { RebacModule } from './rebac/rebac.module';
import { HorariosCGModule } from './horarios-cg/horarios-cg.module';
import { FormativoModule } from './formativo/formativo.module';
import { UploadModule } from './upload/upload.module';
import { CentroTenantAdminModule } from './centro-tenant-admin/centro-tenant-admin.module';
import { CommonModule } from './common/common.module';
import { CentroTenantMiddleware } from './common/centro-tenant.middleware';

// Guards
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { TenantGuard } from './tenant/tenant.guard';
import { CentroTenantGuard } from './common/centro-tenant.guard';
import { RebacGuard } from './rebac/rebac.guard';

// Entities — epsas_db
import { Departamento } from './departamentos/infrastructure/persistence/departamento.entity';
import { Municipio } from './municipios/infrastructure/persistence/municipio.entity';
import { CentroFormacion } from './centro_formacion/infrastructure/persistence/centro-formacion.entity';
import { Sede } from './sedes/infrastructure/persistence/sede.entity';
import { Ambiente } from './ambientes/infrastructure/persistence/ambiente.entity';
import { Area } from './areas/infrastructure/persistence/area.entity';
import { Programa } from './programas/infrastructure/persistence/programa.entity';
import { Persona } from './personas/infrastructure/persistence/persona.entity';
import { Curso } from './cursos/infrastructure/persistence/curso.entity';
import { Matricula } from './matriculas/infrastructure/persistence/matricula.entity';
import { Aplicativo } from './aplicativos/infrastructure/persistence/aplicativo.entity';
import { Rol } from './roles/infrastructure/persistence/rol.entity';
import { Modulo } from './modulos/infrastructure/persistence/modulo.entity';
import { Servicio } from './servicios/infrastructure/persistence/servicio.entity';
import { Usuario } from './usuarios/infrastructure/persistence/usuario.entity';
import { Permiso } from './permisos/infrastructure/persistence/permiso.entity';
import { Credencial } from './credenciales/infrastructure/persistence/credencial.entity';
import { Acceso } from './accesos/infrastructure/persistence/acceso.entity';
import { Notificacion } from './notificaciones/infrastructure/persistence/notificacion.entity';

// Entities — horarios_db
import { Horario } from './horarios-cg/infrastructure/persistence/horario.entity';
import { AsignacionHorario } from './horarios-cg/infrastructure/persistence/asignacion-horario.entity';
import { Competencia } from './horarios-cg/infrastructure/persistence/competencia.entity';
import { SolicitudCambio } from './horarios-cg/infrastructure/persistence/solicitud-cambio.entity';
import { Evento } from './horarios-cg/infrastructure/persistence/evento.entity';
// ConfiguracionSistema eliminada — PIN en epsas_db.aplicativos.pin_registro

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Base de datos principal (epsas_db)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host:     cfg.get<string>('DB_HOST', 'localhost'),
        port:     cfg.get<number>('DB_PORT', 5435),
        username: cfg.get<string>('DB_USERNAME', 'postgres'),
        password: cfg.getOrThrow<string>('DB_PASSWORD'),
        database: cfg.get<string>('DB_NAME', 'epsas_db'),
        synchronize: cfg.get<string>('NODE_ENV', 'development') !== 'production',
        logging: false,
        entities: [
          Departamento, Municipio, CentroFormacion, Sede, Ambiente,
          Area, Programa, Persona, Curso, Matricula, Aplicativo,
          Rol, Modulo, Servicio, Usuario, Permiso, Credencial, Acceso,
          Notificacion,
        ],
      }),
    }),

    // Base de datos de horarios (horarios_db)
    TypeOrmModule.forRootAsync({
      name: 'horarios',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        name: 'horarios',
        type: 'postgres',
        host:     cfg.get<string>('HORARIOS_DB_HOST', cfg.get<string>('DB_HOST', 'localhost')),
        port:     cfg.get<number>('HORARIOS_DB_PORT', cfg.get<number>('DB_PORT', 5435)),
        username: cfg.get<string>('DB_USERNAME', 'postgres'),
        password: cfg.getOrThrow<string>('DB_PASSWORD'),
        database: cfg.get<string>('HORARIOS_DB_NAME', 'horarios_db'),
        synchronize: cfg.get<string>('NODE_ENV', 'development') !== 'production',
        logging: false,
        entities: [Horario, AsignacionHorario, Competencia, SolicitudCambio, Evento],
      }),
    }),

    // Módulos transversales
    QueueModule,
    TenantModule,
    RebacModule,

    // Módulos de dominio ERP
    DepartamentosModule,
    MunicipiosModule,
    CentroFormacionModule,
    SedeModule,
    AmbientesModule,
    AreasModule,
    ProgramasModule,
    PersonasModule,
    CursosModule,
    MatriculasModule,
    AplicativosModule,
    RolesModule,
    ModulosModule,
    ServiciosModule,
    UsuariosModule,
    PermisosModule,
    AccesosModule,
    CredencialesModule,
    AuthModule,
    MigracionModule,
    NotificacionesModule,

    // Módulos Chronogest
    HorariosCGModule,
    FormativoModule,
    UploadModule,

    // Administración de tenants (Centros de Formación) — MASTER_DB
    CentroTenantAdminModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: CentroTenantGuard },
    { provide: APP_GUARD, useClass: RebacGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CentroTenantMiddleware).forRoutes('*');
  }
}
