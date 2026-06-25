import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { LucideAngularModule } from 'lucide-angular';
import { SearchableSelectComponent, SSOption } from '../../../shared/components/searchable-select.component';
import { ToastService } from '../../../core/services/toast.service';


@Component({
  selector: 'app-admin-usuarios',
  imports: [FormsModule, LucideAngularModule, SearchableSelectComponent],
  template: `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
      <div><h2>Usuarios del Sistema</h2><p class="text-muted text-sm">Gestiona todos los usuarios por rol</p></div>
    </div>

    <!-- Tabs -->
    <div class="user-tabs mt-4">
      @for (t of tabs; track t.key) {
      <button [class.active]="activeTab() === t.key"
              (click)="switchTab(t.key)">
        <lucide-icon [name]="t.icon" [size]="15" style="vertical-align:middle;margin-right:5px"></lucide-icon>
        {{ t.label }}
      </button>
      }
    </div>

    <!-- Instructores -->
    @if (activeTab() === 'instructores') {
    <div class="card mt-4 table-wrap">
      <!-- Search bar -->
      <div class="table-search-bar">
        <div class="tbl-search-wrap">
          <lucide-icon name="search" [size]="14" class="tbl-search-icon"></lucide-icon>
          <input class="tbl-search-input"
                 type="text"
                 placeholder="Buscar por nombre, documento, correo..."
                 [value]="searchDisplay"
                 (input)="onSearch($any($event.target).value)">
          @if (searchDisplay) {
            <button class="tbl-search-clear" (click)="clearSearch()">
              <lucide-icon name="x" [size]="12"></lucide-icon>
            </button>
          }
        </div>
        <span class="tbl-results-count">{{ filteredInstructores().length }} resultado{{ filteredInstructores().length !== 1 ? 's' : '' }}</span>
      </div>

      <table class="data-table">
        <thead><tr>
          <th>Nombre</th><th>Documento</th><th>Cargo</th>
          <th>Estado</th><th>Municipio</th><th>Es Líder</th><th>Área que Lidera</th><th>Transversal</th>
        </tr></thead>
        <tbody>
          @for (i of filteredInstructores(); track i.id) {
          <tr>
            <td>
              <div class="flex items-center gap-2">
                <div class="mini-avatar">{{ i.nombre[0] }}{{ i.apellido?.[0] ?? '' }}</div>
                <div>
                  <div style="font-weight:600">{{ i.nombre }} {{ i.apellido }}</div>
                  <div class="text-xs text-muted">{{ i.correo }}</div>
                </div>
              </div>
            </td>
            <td>{{ i.tipoDoc }} {{ i.numDoc }}</td>
            <td>Instructor</td>
            <td>
              <span class="status-badge" [class.status-active]="i.sesionActiva" [class.status-inactive]="!i.sesionActiva">
                <span class="status-dot"></span>
                {{ i.sesionActiva ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td>{{ i.municipio ?? '—' }}</td>
            <td>
              <label class="toggle-switch">
                <input type="checkbox" [checked]="i.esLider"
                       (change)="toggleLider(i, $event)">
                <span class="slider"></span>
              </label>
            </td>
            <td>
              @if (i.esLider) {
              <div style="min-width:140px">
                <app-ss [options]="areasOpts()" placeholder="Sin área"
                        [ngModel]="i.areaLiderada"
                        (ngModelChange)="setArea(i, $event)"></app-ss>
              </div>
              } @else { <span>—</span> }
            </td>
            <td>
              <label class="toggle-switch" title="Puede cubrir clases transversales">
                <input type="checkbox" [checked]="i.esTransversal"
                       (change)="toggleTransversal(i, $event)">
                <span class="slider"></span>
              </label>
            </td>
          </tr>
          }
          @empty {
          <tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:24px;">
            No se encontraron instructores
          </td></tr>
          }
        </tbody>
      </table>
    </div>
    }

    <!-- Aprendices -->
    @if (activeTab() === 'aprendices') {
    <div class="card mt-4 table-wrap">
      <!-- Search bar -->
      <div class="table-search-bar">
        <div class="tbl-search-wrap">
          <lucide-icon name="search" [size]="14" class="tbl-search-icon"></lucide-icon>
          <input class="tbl-search-input"
                 type="text"
                 placeholder="Buscar por nombre, documento, ficha, correo..."
                 [value]="searchDisplay"
                 (input)="onSearch($any($event.target).value)">
          @if (searchDisplay) {
            <button class="tbl-search-clear" (click)="clearSearch()">
              <lucide-icon name="x" [size]="12"></lucide-icon>
            </button>
          }
        </div>
        <span class="tbl-results-count">{{ filteredAprendices().length }} resultado{{ filteredAprendices().length !== 1 ? 's' : '' }}</span>
      </div>

      <table class="data-table">
        <thead><tr>
          <th>Nombre</th><th>Documento</th><th>Correo</th>
          <th>Ficha</th><th>Municipio</th><th>Estado</th>
        </tr></thead>
        <tbody>
          @for (a of filteredAprendices(); track a.id) {
          <tr>
            <td>
              <div class="flex items-center gap-2">
                <div class="mini-avatar">{{ a.nombre[0] }}{{ a.apellido?.[0] ?? '' }}</div>
                <div>
                  <div style="font-weight:600">{{ a.nombre }} {{ a.apellido }}</div>
                </div>
              </div>
            </td>
            <td>{{ a.tipoDoc }} {{ a.numDoc }}</td>
            <td class="text-xs text-muted">{{ a.correo || '—' }}</td>
            <td>
              @if (a.ficha) {
              <span class="badge active">{{ a.ficha.codigo }} — {{ a.ficha.programa }}</span>
              } @else { <span>—</span> }
            </td>
            <td>{{ a.municipio ?? '—' }}</td>
            <td>
              <span class="status-badge" [class.status-active]="a.sesionActiva" [class.status-inactive]="!a.sesionActiva">
                <span class="status-dot"></span>
                {{ a.sesionActiva ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
          </tr>
          }
          @empty {
          <tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:24px;">
            No se encontraron aprendices
          </td></tr>
          }
        </tbody>
      </table>
    </div>
    }

    <!-- Administradores -->
    @if (activeTab() === 'administradores') {
    <div class="card mt-4 table-wrap">
      <!-- Search bar -->
      <div class="table-search-bar">
        <div class="tbl-search-wrap">
          <lucide-icon name="search" [size]="14" class="tbl-search-icon"></lucide-icon>
          <input class="tbl-search-input"
                 type="text"
                 placeholder="Buscar por nombre, documento, correo..."
                 [value]="searchDisplay"
                 (input)="onSearch($any($event.target).value)">
          @if (searchDisplay) {
            <button class="tbl-search-clear" (click)="clearSearch()">
              <lucide-icon name="x" [size]="12"></lucide-icon>
            </button>
          }
        </div>
        <span class="tbl-results-count">{{ filteredAdmins().length }} resultado{{ filteredAdmins().length !== 1 ? 's' : '' }}</span>
      </div>

      <table class="data-table">
        <thead><tr>
          <th>Nombre</th><th>Documento</th><th>Correo</th><th>Estado</th>
        </tr></thead>
        <tbody>
          @for (a of filteredAdmins(); track a.id) {
          <tr>
            <td>
              <div class="flex items-center gap-2">
                <div class="mini-avatar" style="background: var(--red, #dc2626)">{{ a.nombre[0] }}{{ a.apellido?.[0] ?? '' }}</div>
                <div>
                  <div style="font-weight:600">{{ a.nombre }} {{ a.apellido }}</div>
                </div>
              </div>
            </td>
            <td>{{ a.tipoDoc }} {{ a.numDoc }}</td>
            <td class="text-xs text-muted">{{ a.correo || '—' }}</td>
            <td>
              <span class="status-badge" [class.status-active]="a.sesionActiva" [class.status-inactive]="!a.sesionActiva">
                <span class="status-dot"></span>
                {{ a.sesionActiva ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
          </tr>
          }
          @empty {
          <tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:24px;">
            No se encontraron administradores
          </td></tr>
          }
        </tbody>
      </table>
    </div>
    }
  `,
  styles: [`
    /* ── Per-tab search bar (inside card) ───────────────────── */
    .table-search-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px 10px 16px;
      border-bottom: 1px solid var(--border);
      gap: 12px;
    }
    .tbl-search-wrap {
      display: flex; align-items: center; gap: 8px;
      background: var(--bg); border: 1.5px solid var(--border);
      border-radius: 8px; padding: 6px 12px;
      flex: 1; max-width: 420px; transition: border-color .15s;
    }
    .tbl-search-wrap:focus-within { border-color: var(--navy); }
    .tbl-search-icon { color: var(--text-muted); flex-shrink: 0; }
    .tbl-search-input {
      border: none; outline: none; background: transparent;
      font-size: 13px; color: var(--text); flex: 1; min-width: 0;
    }
    .tbl-search-input::placeholder { color: var(--text-muted); }
    .tbl-search-clear {
      background: none; border: none; cursor: pointer;
      color: var(--text-muted); display: flex; align-items: center;
      padding: 2px; border-radius: 4px; flex-shrink: 0;
      transition: color .15s;
    }
    .tbl-search-clear:hover { color: var(--text); }
    .tbl-results-count {
      font-size: 12px; color: var(--text-muted); white-space: nowrap; flex-shrink: 0;
    }

    /* ── Tabs ───────────────────────────────────────────────── */
    .user-tabs {
      display: flex; border-bottom: 2px solid var(--border); gap: 0;
    }
    .user-tabs button {
      padding: 10px 20px; font-size: 14px; font-weight: 600; background: transparent;
      border: none; border-bottom: 2px solid transparent; margin-bottom: -2px;
      cursor: pointer; color: var(--text-muted); transition: all .15s;
    }
    .user-tabs button.active { color: var(--navy); border-bottom-color: var(--navy); }

    /* ── Avatars & toggles ──────────────────────────────────── */
    .mini-avatar {
      width: 32px; height: 32px; border-radius: 50%; background: var(--navy);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .toggle-switch { position: relative; display: inline-block; width: 40px; height: 22px; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute; cursor: pointer; inset: 0; background: #d1d5db;
      border-radius: 22px; transition: .15s;
    }
    .slider::before {
      content: ''; position: absolute; height: 16px; width: 16px;
      left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: .15s;
    }
    input:checked + .slider { background: #2563eb; }
    input:checked + .slider::before { transform: translateX(18px); }

    /* ── Status badges ──────────────────────────────────────── */
    .status-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
    }
    .status-badge.status-active  { background: #dcfce7; color: #166534; }
    .status-badge.status-inactive { background: #f3f4f6; color: #6b7280; }
    .status-dot {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    }
    .status-active .status-dot  { background: #16a34a; }
    .status-inactive .status-dot { background: #9ca3af; }
  `],
})
export class AdminUsuariosComponent implements OnInit, OnDestroy {
  areas = signal<any[]>([]);

  areasOpts = computed<SSOption[]>(() => [
    { value: '', label: 'Sin área' },
    ...this.areas().map(a => ({ value: a.nombre, label: a.nombre }))
  ]);

  tabs = [
    { key: 'instructores', icon: 'graduation-cap', label: 'Instructores' },
    { key: 'aprendices', icon: 'users', label: 'Aprendices' },
    { key: 'administradores', icon: 'shield', label: 'Administradores' },
  ];
  activeTab = signal('instructores');
  instructores = signal<any[]>([]);
  aprendices = signal<any[]>([]);
  admins = signal<any[]>([]);

  // ── Search (debounced) ──────────────────────────────────────
  searchDisplay = '';
  searchSig = signal('');
  private _searchTimer: any = null;

  onSearch(val: string) {
    this.searchDisplay = val;
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.searchSig.set(val.toLowerCase()), 200);
  }

  clearSearch() {
    this.searchDisplay = '';
    clearTimeout(this._searchTimer);
    this.searchSig.set('');
  }

  switchTab(key: string) {
    this.activeTab.set(key);
    this.clearSearch();
  }

  // ── Filtered lists ──────────────────────────────────────────
  filteredInstructores = computed(() => {
    const q = this.searchSig();
    if (!q) return this.instructores();
    return this.instructores().filter(i =>
      [i.nombre, i.apellido, i.numDoc, i.correo, i.municipio, i.areaLiderada]
        .some(v => String(v ?? '').toLowerCase().includes(q))
    );
  });

  filteredAprendices = computed(() => {
    const q = this.searchSig();
    if (!q) return this.aprendices();
    return this.aprendices().filter(a =>
      [a.nombre, a.apellido, a.numDoc, a.correo, a.municipio, a.ficha?.codigo, a.ficha?.programa]
        .some(v => String(v ?? '').toLowerCase().includes(q))
    );
  });

  filteredAdmins = computed(() => {
    const q = this.searchSig();
    if (!q) return this.admins();
    return this.admins().filter(a =>
      [a.nombre, a.apellido, a.numDoc, a.correo]
        .some(v => String(v ?? '').toLowerCase().includes(q))
    );
  });

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  private toast = inject(ToastService);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadAll();
    this.pollInterval = setInterval(() => this.loadAll(), 15000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    clearTimeout(this._searchTimer);
  }

  loadAll() {
    this.api.getInstructores().subscribe(i => this.instructores.set(i));
    this.api.getAprendices().subscribe(a => this.aprendices.set(a));
    this.api.getAdministradores().subscribe(a => this.admins.set(a));
    this.api.getAreas().subscribe(a => this.areas.set(a));
  }

  toggleLider(i: any, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.api.setInstructorLider(i.id, checked).subscribe({
      next: (updated) => {
        this.instructores.update(list => list.map(x => x.id === i.id ? { ...x, ...updated } : x));
        this.toast.success(
          checked ? 'Instructor Líder asignado' : 'Rol de Líder removido',
          checked
            ? `${i.nombre} fue designado como Instructor Líder.`
            : `${i.nombre} ya no tiene el rol de Instructor Líder.`,
        );
      },
      error: (e) => this.toast.error('Error al actualizar rol', e?.error?.message ?? 'No se pudo cambiar el estado de líder.'),
    });
  }

  setArea(i: any, area: string) {
    this.api.setInstructorLider(i.id, true, area).subscribe({
      next: (updated) => {
        this.instructores.update(list => list.map(x => x.id === i.id ? { ...x, ...updated } : x));
        this.toast.success('Área asignada', `El área "${area}" fue asignada al instructor líder.`);
      },
      error: (e) => this.toast.error('Error al asignar área', e?.error?.message ?? 'No se pudo asignar el área.'),
    });
  }

  toggleTransversal(i: any, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.api.setInstructorTransversal(i.id, checked).subscribe({
      next: (updated) => {
        this.instructores.update(list => list.map(x => x.id === i.id ? { ...x, ...updated } : x));
        this.toast.success(
          checked ? 'Instructor transversal activado' : 'Modo transversal desactivado',
          checked
            ? `${i.nombre} ahora puede cubrir cualquier clase del día.`
            : `${i.nombre} ya no tiene acceso transversal.`,
        );
      },
      error: (e) => this.toast.error('Error al actualizar', e?.error?.message ?? 'No se pudo cambiar el estado transversal.'),
    });
  }
}
