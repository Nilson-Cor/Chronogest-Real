import { Injectable } from '@angular/core';

/**
 * Resuelve el slug del Centro de Formación (tenant) actual para que el
 * backend multi-tenant sepa contra qué base de datos operar.
 *
 * Mientras no exista selector de Centro de Formación en la UI, se usa
 * el slug por defecto ('default'), que en el backend apunta a las bases
 * de datos existentes (epsas_db/horarios_db) — el tenant histórico.
 */
@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly SLUG_KEY = 'cg_tenant_slug';
  private readonly DEFAULT_SLUG = 'default';

  get slug(): string {
    return localStorage.getItem(this.SLUG_KEY) ?? this.DEFAULT_SLUG;
  }

  setSlug(slug: string): void {
    localStorage.setItem(this.SLUG_KEY, slug);
  }
}
