import { Injectable } from '@nestjs/common';

/**
 * TenantService — SIN Scope.REQUEST
 *
 * La estrategia correcta para multi-tenant con APP_GUARD es:
 * el guard escribe el aplicativoId directamente en request['tenantId'],
 * y este servicio ofrece helpers para leerlo desde cualquier lugar
 * que tenga acceso al request.
 *
 * Para acceder al tenant desde un controller: usar el decorador @TenantId()
 * Para acceder al tenant desde un service:    recibir tenantId como parámetro
 *                                              desde el controller.
 */
@Injectable()
export class TenantService {
  /**
   * Extrae el aplicativoId del objeto request.
   * Llamar desde un guard o interceptor que tenga el request.
   */
  extractTenantId(request: any): number | undefined {
    return request?.user?.aplicativoId;
  }
}
