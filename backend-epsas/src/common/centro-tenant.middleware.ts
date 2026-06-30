import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CentroDataSourceFactory } from '../database/centro-datasource.factory';
import { CentroTenantContextService } from './centro-tenant-context.service';

const HOSTS_LOCALES = ['localhost', '127.0.0.1'];

// Rutas de administración global — viven en MASTER_DB, nunca en un tenant.
// Deben quedar exentas de la resolución por subdominio sin importar el host.
// Se comparan contra req.originalUrl (ver use()), que sí conserva el prefijo
// /api; se incluyen ambas variantes (con y sin /api) por seguridad.
const PREFIJOS_SIN_TENANT = [
  '/admin/centros-tenant', '/root/auth', '/auth/login-auto',
  '/api/admin/centros-tenant', '/api/root/auth', '/api/auth/login-auto',
];

/**
 * CentroTenantMiddleware
 *
 * Resuelve el slug del Centro de Formación (tenant) por header o subdominio,
 * inicializa sus DataSources (epsas_db y horarios_db) vía CentroDataSourceFactory,
 * y los publica en CentroTenantContextService para el resto del request.
 *
 * No confundir con TenantGuard (src/tenant/) — ese resuelve aplicativoId del
 * JWT, un concepto de tenant distinto (multi-app SSO) que no se toca aquí.
 */
@Injectable()
export class CentroTenantMiddleware implements NestMiddleware {
  constructor(private readonly centroDataSourceFactory: CentroDataSourceFactory) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // req.path/req.url llegan reescritos a "/" en este middleware de modulo
    // (Nest los monta en un sub-router para aplicar setGlobalPrefix), por eso
    // se usa req.originalUrl, que conserva la ruta completa real.
    const rutaReal = req.originalUrl.split('?')[0];
    if (PREFIJOS_SIN_TENANT.some((prefijo) => rutaReal.startsWith(prefijo))) {
      return next();
    }

    const slug = this.resolverSlug(req);

    if (!slug) {
      return next();
    }

    try {
      const [epsasDataSource, horariosDataSource] = await Promise.all([
        this.centroDataSourceFactory.getEpsasDataSource(slug),
        this.centroDataSourceFactory.getHorariosDataSource(slug),
      ]);

      CentroTenantContextService.run(slug, epsasDataSource, horariosDataSource, () => next());
    } catch (error) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: 'Centro de Formación no encontrado' });
        return;
      }
      res.status(500).json({ message: 'Error al conectar con el Centro de Formación' });
    }
  }

  private resolverSlug(req: Request): string | null {
    const headerSlug = req.header('x-centro-tenant');
    if (headerSlug) return headerSlug;

    // localhost/127.0.0.1 sin subdominio (acceso directo sin proxy) → sin tenant
    const hostname = req.hostname;
    if (HOSTS_LOCALES.includes(hostname)) {
      return null;
    }

    const [subdominio] = hostname.split('.');
    return subdominio || null;
  }
}
