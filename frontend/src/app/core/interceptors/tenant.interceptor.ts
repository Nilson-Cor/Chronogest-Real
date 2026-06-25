import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TenantService } from '../services/tenant.service';

/**
 * Adjunta el header x-centro-tenant a cada request hacia el backend, para
 * que CentroTenantMiddleware resuelva el Centro de Formación correcto.
 */
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const tenant = inject(TenantService);
  req = req.clone({
    setHeaders: { 'x-centro-tenant': tenant.slug },
  });
  return next(req);
};
