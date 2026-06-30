import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { RootApiService } from '../../core/services/root-api.service';

interface CentroForm {
  id?: string;
  nombre: string;
  slug: string;
  dominio: string;
  epsasDbName: string;
  epsasDbHost: string;
  epsasDbPort: number;
  horariosDbName: string;
  horariosDbHost: string;
  horariosDbPort: number;
  adminEmail: string;
}

interface AdminCreado {
  email: string;
  password: string;
  centroNombre: string;
}

function emptyForm(): CentroForm {
  return {
    nombre: '', slug: '', dominio: '',
    epsasDbName: 'epsas_db', epsasDbHost: 'postgres', epsasDbPort: 5432,
    horariosDbName: 'horarios_db', horariosDbHost: 'postgres', horariosDbPort: 5432,
    adminEmail: '',
  };
}

@Component({
  selector: 'app-root-centros',
  imports: [FormsModule, LucideAngularModule],
  template: `
    <div class="page-head">
      <div>
        <h2>Centros de Formación</h2>
        <p>Crea y administra los Centros de Formación (tenants) del sistema.</p>
      </div>
      <button class="btn btn-primary" (click)="abrirCrear()">
        <lucide-icon name="plus-circle" [size]="16"></lucide-icon> Nuevo Centro
      </button>
    </div>

    @if (error()) {
      <div class="error-banner mt-3">{{ error() }}</div>
    }

    <div class="card table-wrap mt-4">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Slug</th>
            <th>Dominio</th>
            <th>Estado</th>
            <th>Bases de datos</th>
            <th style="width:110px">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            <tr><td colspan="6" class="empty-cell">Cargando…</td></tr>
          } @else if (!centros().length) {
            <tr><td colspan="6" class="empty-cell">Sin centros de formación registrados.</td></tr>
          } @else {
            @for (c of centros(); track c.id) {
              <tr>
                <td><strong>{{ c.nombre }}</strong></td>
                <td><code>{{ c.slug }}</code></td>
                <td>{{ c.dominio }}</td>
                <td><span class="badge" [class.active]="c.estado === 'activo'" [class.inactive]="c.estado !== 'activo'">{{ c.estado }}</span></td>
                <td style="font-size:12px;color:var(--text-muted)">{{ c.epsasDbName }} · {{ c.horariosDbName }}</td>
                <td>
                  <div style="display:flex;gap:6px;">
                    <button class="btn-icon" title="Editar" (click)="abrirEditar(c)">
                      <lucide-icon name="pencil" [size]="14"></lucide-icon>
                    </button>
                    <button class="btn-icon" title="Eliminar" (click)="eliminar(c)">
                      <lucide-icon name="trash-2" [size]="14"></lucide-icon>
                    </button>
                  </div>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>

    @if (modalOpen()) {
      <div class="modal-overlay" (click)="modalOpen.set(false)">
        <div class="modal modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ form.id ? 'Editar Centro de Formación' : 'Nuevo Centro de Formación' }}</h3>
            <button class="btn-icon" (click)="modalOpen.set(false)"><lucide-icon name="x" [size]="18"></lucide-icon></button>
          </div>

          <div class="grid-2" style="gap:14px;">
            <div class="form-group">
              <label class="form-label">Nombre</label>
              <input class="form-control" [(ngModel)]="form.nombre" placeholder="Ej. SENA Regional Huila">
            </div>
            <div class="form-group">
              <label class="form-label">Slug</label>
              <input class="form-control" [(ngModel)]="form.slug" placeholder="huila" [disabled]="!!form.id">
            </div>
            <div class="form-group" style="grid-column:1 / -1;">
              <label class="form-label">Dominio / IP del servidor</label>
              <input class="form-control" [(ngModel)]="form.dominio" placeholder="192.168.1.105 o midominio.com">
            </div>
            @if (!form.id) {
              <div class="form-group" style="grid-column:1 / -1;">
                <label class="form-label">Correo del administrador inicial</label>
                <input class="form-control" [(ngModel)]="form.adminEmail" placeholder="Opcional — por defecto admin@{{ form.slug || 'slug' }}.local">
                <span class="form-hint">Se creará una cuenta de administrador en este tenant. La contraseña se genera automáticamente y solo se mostrará una vez al terminar.</span>
              </div>
            }
            <div class="form-group">
              <label class="form-label">Base de datos epsas — nombre</label>
              <input class="form-control" [(ngModel)]="form.epsasDbName">
            </div>
            <div class="form-group">
              <label class="form-label">Base de datos epsas — host</label>
              <input class="form-control" [(ngModel)]="form.epsasDbHost">
            </div>
            <div class="form-group">
              <label class="form-label">Base de datos horarios — nombre</label>
              <input class="form-control" [(ngModel)]="form.horariosDbName">
            </div>
            <div class="form-group">
              <label class="form-label">Base de datos horarios — host</label>
              <input class="form-control" [(ngModel)]="form.horariosDbHost">
            </div>
          </div>

          @if (formError()) { <div class="error-banner mt-3">{{ formError() }}</div> }

          <div class="btn-row mt-4">
            <button class="btn btn-outline" (click)="modalOpen.set(false)">Cancelar</button>
            <button class="btn btn-primary" [disabled]="saving()" (click)="guardar()">
              {{ form.id ? 'Guardar Cambios' : 'Crear Centro' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (adminCreado()) {
      <div class="modal-overlay">
        <div class="modal modal-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3><lucide-icon name="shield-check" [size]="18" style="vertical-align:-3px;margin-right:6px;"></lucide-icon>Centro creado correctamente</h3>
          </div>
          <p class="cred-intro">
            Cuenta de administrador creada para <strong>{{ adminCreado()!.centroNombre }}</strong>.
            Copia y entrega estas credenciales ahora — <strong>la contraseña no se volverá a mostrar</strong>.
          </p>
          <div class="cred-box">
            <div class="cred-row">
              <span class="cred-label">Correo</span>
              <code class="cred-value">{{ adminCreado()!.email }}</code>
            </div>
            <div class="cred-row">
              <span class="cred-label">Contraseña</span>
              <code class="cred-value">{{ adminCreado()!.password }}</code>
            </div>
          </div>
          @if (copiado()) { <span class="copiado-msg">Copiado al portapapeles</span> }
          <div class="btn-row mt-4">
            <button class="btn btn-outline" (click)="copiarCredenciales()">
              <lucide-icon name="copy" [size]="14"></lucide-icon> Copiar
            </button>
            <button class="btn btn-primary" (click)="adminCreado.set(null)">Entendido</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .page-head h2 { font-size: 1.3rem; color: var(--text); margin-bottom: 4px; }
    .page-head p { font-size: 13px; color: var(--text-muted); }
    .empty-cell { text-align: center; padding: 28px; color: var(--text-muted); font-size: 13px; }
    .error-banner { background: #fee2e2; color: #991b1b; border-radius: 8px; padding: 10px 14px; font-size: 13px; }
    .btn-row { display: flex; justify-content: flex-end; gap: 12px; }
    code { background: var(--surface2); padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    @media (max-width: 700px) { .grid-2 { grid-template-columns: 1fr; } }
    .form-hint { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 4px; }
    .cred-intro { font-size: 13.5px; color: var(--text); margin: 4px 0 14px; line-height: 1.5; }
    .cred-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
    .cred-row { display: flex; align-items: center; gap: 10px; }
    .cred-label { font-size: 12px; font-weight: 700; color: #166534; width: 90px; flex-shrink: 0; }
    .cred-value { background: #fff; border: 1px solid #d1fae5; padding: 6px 10px; border-radius: 6px; font-size: 13px; flex: 1; }
    .copiado-msg { display: block; margin-top: 8px; font-size: 12px; color: #166534; font-weight: 600; }
  `],
})
export class RootCentrosComponent implements OnInit {
  centros = signal<any[]>([]);
  loading = signal(false);
  error = signal('');
  saving = signal(false);
  formError = signal('');
  modalOpen = signal(false);
  adminCreado = signal<AdminCreado | null>(null);
  copiado = signal(false);
  form: CentroForm = emptyForm();

  constructor(private rootApi: RootApiService) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.loading.set(true);
    this.error.set('');
    this.rootApi.getCentros().subscribe({
      next: (list) => { this.centros.set(list ?? []); this.loading.set(false); },
      error: (e) => { this.error.set(e?.error?.message ?? 'Error al cargar los centros de formación'); this.loading.set(false); },
    });
  }

  abrirCrear() {
    this.form = emptyForm();
    this.formError.set('');
    this.modalOpen.set(true);
  }

  abrirEditar(c: any) {
    this.form = {
      id: c.id, nombre: c.nombre, slug: c.slug, dominio: c.dominio,
      epsasDbName: c.epsasDbName, epsasDbHost: c.epsasDbHost, epsasDbPort: c.epsasDbPort,
      horariosDbName: c.horariosDbName, horariosDbHost: c.horariosDbHost, horariosDbPort: c.horariosDbPort,
      adminEmail: '',
    };
    this.formError.set('');
    this.modalOpen.set(true);
  }

  guardar() {
    if (!this.form.nombre || !this.form.slug || !this.form.dominio || !this.form.epsasDbName || !this.form.horariosDbName) {
      this.formError.set('Completa nombre, slug, dominio y los nombres de las bases de datos.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    const { id, adminEmail, ...rest } = this.form;

    if (id) {
      this.rootApi.updateCentro(id, rest).subscribe({
        next: () => { this.saving.set(false); this.modalOpen.set(false); this.cargar(); },
        error: (e) => { this.saving.set(false); this.formError.set(e?.error?.message ?? 'No se pudo guardar el centro de formación'); },
      });
      return;
    }

    const dto = adminEmail?.trim() ? { ...rest, adminEmail: adminEmail.trim() } : rest;
    this.rootApi.createCentro(dto).subscribe({
      next: (res: any) => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.cargar();
        if (res?.adminInicial) {
          this.adminCreado.set({
            email: res.adminInicial.email,
            password: res.adminInicial.password,
            centroNombre: res?.centro?.nombre ?? this.form.nombre,
          });
        }
      },
      error: (e) => { this.saving.set(false); this.formError.set(e?.error?.message ?? 'No se pudo guardar el centro de formación'); },
    });
  }

  copiarCredenciales() {
    const c = this.adminCreado();
    if (!c) return;
    const texto = `Correo: ${c.email}\nContraseña: ${c.password}`;
    navigator.clipboard?.writeText(texto).then(() => {
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2500);
    });
  }

  eliminar(c: any) {
    if (!confirm(`¿Eliminar permanentemente el centro "${c.nombre}"? Esta acción no se puede deshacer (las bases de datos epsas_db/horarios_db asignadas NO se borran, solo el registro del tenant).`)) return;
    this.rootApi.deleteCentro(c.id).subscribe({
      next: () => this.cargar(),
      error: (e) => this.error.set(e?.error?.message ?? 'No se pudo eliminar el centro'),
    });
  }
}
