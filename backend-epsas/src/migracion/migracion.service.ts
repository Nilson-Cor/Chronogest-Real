import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { NotificacionesService } from '../notificaciones/application/services/notificaciones.service';
import { CentroTenantContextService } from '../common/centro-tenant-context.service';

export interface ResumenMigracion {
  programas_insertados:    number;
  cursos_insertados:       number;
  cursos_actualizados:     number;
  personas_insertadas:     number;
  personas_actualizadas:   number;
  matriculas_insertadas:   number;
  matriculas_actualizadas: number;
  omitidas:                number;
  errores:                 number;
}

export interface EstadoMigracion {
  status: 'idle' | 'running' | 'completed' | 'error';
  startTime?: string;
  endTime?:   string;
  duracion?:  string;
  logs:       string[];
  resumen?:   ResumenMigracion;
  mensaje?:   string;
}

@Injectable()
export class MigracionService {
  private readonly logger = new Logger(MigracionService.name);
  private estado: EstadoMigracion = { status: 'idle', logs: [] };
  private proceso?: ChildProcess;

  /** Umbral de avance mínimo a usar al generar notificaciones post-migración. */
  private minAvance = 70;

  constructor(private readonly notificacionesService: NotificacionesService) {}

  /** Lanza el script Python en segundo plano y retorna inmediatamente. */
  iniciarMigracion(excelPath: string, minAvance = 70): EstadoMigracion {
    if (this.estado.status === 'running') {
      return { ...this.estado, mensaje: 'Ya hay una migración en curso.' };
    }

    this.minAvance = minAvance;

    this.estado = {
      status:    'running',
      startTime: new Date().toISOString(),
      logs:      ['Preparando migración…'],
    };

    const scriptPath = path.join(process.cwd(), 'scripts', 'migrate_aprendices.py');

    if (!fs.existsSync(scriptPath)) {
      this.estado.status  = 'error';
      this.estado.endTime = new Date().toISOString();
      this.estado.logs.push(`ERROR: script no encontrado en ${scriptPath}`);
      return this.estado;
    }

    // Captura el contexto del tenant ANTES de spawnear — el proceso hijo y sus
    // listeners (incluido el evento 'close', que dispara generarPostMigracion)
    // pueden ejecutarse mucho después de que termine este request HTTP.
    const slug = CentroTenantContextService.getSlug();
    const epsasDataSource = CentroTenantContextService.getEpsasDataSource();
    const horariosDataSource = CentroTenantContextService.getHorariosDataSource();
    const dbEnv = this.construirEnvDelTenant(epsasDataSource.options as PostgresConnectionOptions);

    CentroTenantContextService.run(slug, epsasDataSource, horariosDataSource, () => {
      // En Windows se intenta 'python', luego 'python3'
      this.lanzarProceso('python', scriptPath, excelPath, dbEnv);
    });

    return { ...this.estado, mensaje: 'Migración iniciada en segundo plano.' };
  }

  /** Construye las variables DB_* que leerá scripts/migrate_aprendices.py,
   *  apuntando a la epsas_db del tenant actual en vez de las del .env global. */
  private construirEnvDelTenant(options: PostgresConnectionOptions): NodeJS.ProcessEnv {
    return {
      ...process.env,
      DB_HOST: String(options.host ?? 'localhost'),
      DB_PORT: String(options.port ?? 5435),
      DB_NAME: String(options.database ?? ''),
      DB_USERNAME: String(options.username ?? 'postgres'),
      DB_PASSWORD: String(options.password ?? ''),
    };
  }

  private lanzarProceso(cmd: string, scriptPath: string, excelPath: string, dbEnv: NodeJS.ProcessEnv): void {
    this.logger.log(`Ejecutando: ${cmd} "${scriptPath}" --excel "${excelPath}"`);

    this.proceso = spawn(cmd, [scriptPath, '--excel', excelPath], {
      windowsHide: true,
      env: dbEnv,
    });

    const append = (data: Buffer) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      this.estado.logs.push(...lines);
      if (this.estado.logs.length > 1000) {
        this.estado.logs = this.estado.logs.slice(-1000);
      }
    };

    this.proceso.stdout?.on('data', append);
    this.proceso.stderr?.on('data', append);

    this.proceso.on('close', async (code) => {
      const ok = code === 0;
      this.estado.status  = ok ? 'completed' : 'error';
      this.estado.endTime = new Date().toISOString();
      this.estado.duracion = this.calcularDuracion();
      this.estado.resumen  = this.extractResumen();
      this.logger.log(`Migración finalizada — código ${code}`);

      // Generar notificaciones de aprendices habilitados solo si fue exitosa
      if (ok) {
        await this.notificacionesService.generarPostMigracion(this.minAvance);
      }
    });

    this.proceso.on('error', (err: NodeJS.ErrnoException) => {
      // Si 'python' no existe en Windows, reintenta con 'python3'
      if (err.code === 'ENOENT' && cmd === 'python') {
        this.logger.warn('python no encontrado, reintentando con python3…');
        this.lanzarProceso('python3', scriptPath, excelPath, dbEnv);
      } else {
        this.estado.status  = 'error';
        this.estado.endTime = new Date().toISOString();
        this.estado.logs.push(`ERROR al lanzar proceso: ${err.message}`);
      }
    });
  }

  /** Retorna el estado actual con los últimos 60 logs. */
  getEstado(): EstadoMigracion {
    return {
      ...this.estado,
      logs: this.estado.logs.slice(-60),
    };
  }

  /** Reinicia el estado para permitir una nueva migración. */
  resetear(): void {
    if (this.estado.status === 'running') return;
    this.estado = { status: 'idle', logs: [] };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private extractResumen(): ResumenMigracion {
    const log = this.estado.logs.join('\n');
    const n = (re: RegExp) => { const m = log.match(re); return m ? +m[1] : 0; };

    return {
      programas_insertados:    n(/Programas insertados\s*:\s*(\d+)/),
      cursos_insertados:       n(/Cursos insertados\s*:\s*(\d+)/),
      cursos_actualizados:     n(/Cursos actualizados\s*:\s*(\d+)/),
      personas_insertadas:     n(/Personas insertadas\s*:\s*(\d+)/),
      personas_actualizadas:   n(/Personas actualizadas\s*:\s*(\d+)/),
      matriculas_insertadas:   n(/ulas insertadas\s*:\s*(\d+)/),
      matriculas_actualizadas: n(/ulas actualizadas\s*:\s*(\d+)/),
      omitidas:                n(/Filas omitidas\s*:\s*(\d+)/),
      errores:                 n(/Errores\s*:\s*(\d+)/),
    };
  }

  private calcularDuracion(): string {
    if (!this.estado.startTime) return '';
    const ms = Date.now() - new Date(this.estado.startTime).getTime();
    const s  = Math.floor(ms / 1000);
    const m  = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  }
}
