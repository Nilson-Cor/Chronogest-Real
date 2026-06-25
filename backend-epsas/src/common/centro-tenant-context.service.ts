import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { DataSource } from 'typeorm';

interface CentroTenantContext {
  slug: string;
  epsasDataSource: DataSource;
  horariosDataSource: DataSource;
}

/**
 * CentroTenantContextService
 *
 * Almacena el contexto del Centro de Formación (tenant) actual durante el
 * ciclo de vida de cada request, usando AsyncLocalStorage en lugar de
 * Scope.REQUEST (evita el costo de instanciar providers por request).
 *
 * No confundir con TenantService (src/tenant/) que maneja el aplicativoId
 * del JWT — un concepto de tenant distinto (multi-app SSO).
 */
@Injectable()
export class CentroTenantContextService {
  private static readonly storage = new AsyncLocalStorage<CentroTenantContext>();

  static run<T>(
    slug: string,
    epsasDataSource: DataSource,
    horariosDataSource: DataSource,
    callback: () => T,
  ): T {
    return CentroTenantContextService.storage.run(
      { slug, epsasDataSource, horariosDataSource },
      callback,
    );
  }

  static getSlug(): string {
    return CentroTenantContextService.getContextOrThrow().slug;
  }

  static getEpsasDataSource(): DataSource {
    return CentroTenantContextService.getContextOrThrow().epsasDataSource;
  }

  static getHorariosDataSource(): DataSource {
    return CentroTenantContextService.getContextOrThrow().horariosDataSource;
  }

  static hasContext(): boolean {
    return CentroTenantContextService.storage.getStore() !== undefined;
  }

  private static getContextOrThrow(): CentroTenantContext {
    const context = CentroTenantContextService.storage.getStore();
    if (!context) {
      throw new InternalServerErrorException('Sin contexto de Centro de Formación');
    }
    return context;
  }
}
