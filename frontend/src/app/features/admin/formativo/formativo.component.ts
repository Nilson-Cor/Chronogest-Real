import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { LucideAngularModule } from 'lucide-angular';
import { SearchableSelectComponent, SSOption } from '../../../shared/components/searchable-select.component';
import { ToastService } from '../../../core/services/toast.service';

type TabKey =
  | 'centros' | 'sedes' | 'departamentos' | 'municipios' | 'ambientes'
  | 'programas' | 'areas' | 'cursos' | 'matriculas'
  | 'personas' | 'aplicativos' | 'roles' | 'modulos'
  | 'servicios' | 'usuarios' | 'credenciales' | 'permisos' | 'accesos';

interface TabGroup { label: string; icon: string; tabs: TabKey[]; }

@Component({
  selector: 'app-admin-formativo',
  imports: [FormsModule, LucideAngularModule, SearchableSelectComponent],
  template: `
    <div>
      <h2>Proyecto Formativo — Base de Datos</h2>
      <p class="text-muted text-sm">CRUD completo de <code>proyecto_formativo_db</code> — {{ rows().length }} registros activos</p>
    </div>

    <!-- Grupos de tabs -->
    <div class="tab-groups mt-4">
      @for (g of tabGroups; track g.label) {
      <div class="tab-group-section">
        <div class="tab-group-label">
          <lucide-icon [name]="g.icon" [size]="13"></lucide-icon>
          {{ g.label }}
        </div>
        <div class="form-tabs">
          @for (t of g.tabs; track t) {
          <button [class.active]="activeTab() === t" (click)="switchTab(t)">
            {{ tabConfig[t].label }}
          </button>
          }
        </div>
      </div>
      }
    </div>

    <!-- Table card -->
    <div class="card mt-4">
      <div class="card-header">
        <div>
          <h3>{{ tabConfig[activeTab()].label }}</h3>
          <p class="text-muted text-xs">{{ tabConfig[activeTab()].desc ?? '' }}</p>
        </div>
        @if (activeTab() !== 'accesos' && activeTab() !== 'matriculas') {
        <div class="flex gap-2" style="align-items:center;">
          <button class="btn btn-blue" (click)="openModal()">
            <lucide-icon name="plus" [size]="14"></lucide-icon>
            Nuevo
          </button>
        </div>
        }
        @if (activeTab() === 'accesos') {
        <div class="flex gap-2" style="align-items:center;">
          <label class="text-xs text-muted" style="white-space:nowrap">Mostrar últimos</label>
          <select class="form-control" style="width:90px;padding:4px 8px;font-size:13px;"
                  [ngModel]="limitAccesos()"
                  (ngModelChange)="limitAccesos.set(+$event); loadTab()">
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="500">500</option>
          </select>
          <button class="btn btn-outline" style="padding:4px 10px;font-size:12px;" (click)="loadTab()">
            <lucide-icon name="refresh-cw" [size]="13"></lucide-icon>
          </button>
        </div>
        }
      </div>

      @if (error()) {
      <div class="alert-error">{{ error() }}</div>
      }

      @if (activeTab() !== 'accesos') {
      <div class="table-search-bar">
        <div class="tbl-search-wrap">
          <lucide-icon name="search" [size]="14" class="tbl-search-icon"></lucide-icon>
          <input class="tbl-search-input"
                 [ngModel]="searchDisplay"
                 (ngModelChange)="onSearch($event)"
                 placeholder="Buscar en {{ tabConfig[activeTab()].label }}...">
        </div>
        <span class="tbl-results-count">{{ filteredRows().length }} registro{{ filteredRows().length !== 1 ? 's' : '' }}</span>
      </div>
      }

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              @for (col of tabConfig[activeTab()].cols; track col.key) {
              <th>{{ col.label }}</th>
              }
              @if (activeTab() !== 'accesos') {
              <th style="width:90px">Acciones</th>
              }
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
            <tr><td [attr.colspan]="tabConfig[activeTab()].cols.length + 1" class="text-center p-8 text-muted">
              <lucide-icon name="loader" [size]="20" class="spin"></lucide-icon> Cargando...
            </td></tr>
            } @else if (filteredRows().length === 0) {
            <tr><td [attr.colspan]="tabConfig[activeTab()].cols.length + 1" class="text-center p-8 text-muted">
              Sin registros
            </td></tr>
            } @else {
            @for (row of filteredRows(); track row.id) {
            <tr class="data-row">
              @for (col of tabConfig[activeTab()].cols; track col.key) {
              <td>
                @if (activeTab() === 'personas' && col.key === 'estado') {
                  <label class="toggle-switch" title="Cambiar Estado">
                    <input type="checkbox" [checked]="row[col.key] === 'activo'" (change)="toggleEstadoPersona(row, $event)">
                    <span class="slider"></span>
                  </label>
                } @else if (col.badge) {
                  <span class="badge" [class.active]="['activo','activa'].includes(row[col.key])"
                        [class.inactive]="!['activo','activa'].includes(row[col.key])">
                    {{ row[col.key] }}
                  </span>
                } @else if (col.key === 'cargo') {
                  <span class="cargo-badge cargo-{{ row[col.key] }}">{{ row[col.key] }}</span>
                } @else {
                  <span [title]="row[col.key] ?? ''">{{ row[col.key] ?? '—' }}</span>
                }
              </td>
              }
              @if (activeTab() !== 'accesos') {
              <td>
                <div class="row-actions">
                  <button class="btn-icon-sm edit" (click)="openModal(row)" title="Editar">
                    <lucide-icon name="pencil" [size]="13"></lucide-icon>
                  </button>
                  <button class="btn-icon-sm del" (click)="deleteRow(row.id)" title="Eliminar">
                    <lucide-icon name="trash-2" [size]="13"></lucide-icon>
                  </button>
                </div>
              </td>
              }
            </tr>
            }
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    @if (modalOpen()) {
    <div class="modal-overlay" (click)="closeModal()">
      <div class="modal modal-lg" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ editingId() ? 'Editar' : 'Nuevo' }} — {{ tabConfig[activeTab()].label }}</h3>
          <button class="btn-icon" (click)="closeModal()">
            <lucide-icon name="x" [size]="18"></lucide-icon>
          </button>
        </div>

        <div class="modal-body">
          @if (modalError()) {
          <div class="alert-error mb-3">{{ modalError() }}</div>
          }

          <div class="form-grid">
          @for (f of tabConfig[activeTab()].fields; track f.key) {
            @if (f.hidden || (f.hiddenIf === 'cargo !== "aprendiz"' && formData['cargo'] !== 'aprendiz')) {
              <!-- Nada -->
            } @else {
            <div class="form-group" [class.span-2]="f.span2">
              <label class="form-label">{{ f.label }}{{ f.required ? ' *' : '' }}</label>

            @if (f.type === 'select') {
              <app-ss [options]="getSSOpts(f.opts!)"
                      placeholder="Seleccionar..."
                      [ngModel]="formData[f.key]"
                      (ngModelChange)="setField(f.key, $event)"></app-ss>
              <!-- Hint para cursos: el área debe seleccionarse antes del ambiente -->
              @if (activeTab() === 'cursos' && f.key === 'ambienteId' && !formData['areaId']) {
                <span class="field-hint">Selecciona primero el Área para ver los ambientes disponibles</span>
              }
            } @else if (f.type === 'date') {
              <input class="form-control" type="date" [(ngModel)]="formData[f.key]">
            } @else if (f.type === 'number') {
              <input class="form-control" type="number" [(ngModel)]="formData[f.key]" [placeholder]="f.label">
            } @else if (f.type === 'password') {
              <input class="form-control" type="password" [(ngModel)]="formData[f.key]"
                     [placeholder]="editingId() ? 'Dejar vacío para no cambiar' : f.label">
            } @else if (f.type?.startsWith('enum-')) {
              <app-ss [options]="getEnumOpts(f.type || '')"
                      placeholder="Seleccionar..."
                      [(ngModel)]="formData[f.key]"></app-ss>
            } @else if (f.type === 'multiselect') {
              <div class="multiselect-wrap form-control" style="height: auto; max-height: 150px; overflow-y: auto;">
                @for (opt of getOpts(f.opts!); track opt.id) {
                <label style="display:flex; align-items:center; gap:6px; margin-bottom:4px; font-size:13px; cursor:pointer;">
                  <input type="checkbox" [value]="opt.id"
                         [checked]="formData[f.key]?.includes(opt.id)"
                         (change)="toggleMulti(f.key, opt.id, $event)">
                  {{ opt.label }}
                </label>
                }
              </div>
            } @else {
              <input class="form-control" type="text" [(ngModel)]="formData[f.key]" [placeholder]="f.label">
            }
          </div>
          }
          }
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline" (click)="closeModal()">Cancelar</button>
          <button class="btn btn-blue" (click)="save()" [disabled]="saving()">
            {{ saving() ? 'Guardando...' : (editingId() ? 'Actualizar' : 'Crear') }}
          </button>
        </div>
      </div>
    </div>
    }
  `,
  styles: [`
    code { font-size: 11px; background: var(--surface2); padding: 2px 6px; border-radius: 4px; }

    /* Tab groups */
    .tab-groups { display: flex; flex-direction: column; gap: 8px; }
    .tab-group-section { background: var(--surface); border-radius: 10px; border: 1px solid var(--border); overflow: hidden; }
    .tab-group-label {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; font-size: 11px; font-weight: 700; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: .6px; background: var(--surface2);
      border-bottom: 1px solid var(--border);
    }
    .form-tabs {
      display: flex; gap: 0; flex-wrap: wrap;
    }
    .form-tabs button {
      padding: 8px 14px; font-size: 12px; font-weight: 600; background: transparent;
      border: none; border-bottom: 2px solid transparent;
      cursor: pointer; color: var(--text-muted); transition: all .15s; white-space: nowrap;
    }
    .form-tabs button.active { color: var(--navy); border-bottom-color: var(--navy); background: rgba(30,58,138,.05); }
    .form-tabs button:hover:not(.active) { background: var(--surface2); color: var(--text); }

    /* Card */
    .card-header {
      display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;
      padding: 16px 20px; border-bottom: 1px solid var(--border);
    }
    .card-header h3 { font-size: 15px; color: var(--text); }

    /* Barra de búsqueda integrada en la tabla */
    .table-search-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 16px; border-bottom: 1px solid var(--border);
      background: var(--surface2); gap: 12px;
    }
    .tbl-search-wrap {
      position: relative; flex: 1; max-width: 380px;
    }
    .tbl-search-icon {
      position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
      color: var(--text-muted); pointer-events: none;
    }
    .tbl-search-input {
      width: 100%; padding: 6px 10px 6px 32px;
      border: 1px solid var(--border); border-radius: 6px;
      font-size: 13px; background: #fff; color: var(--text);
      outline: none; transition: border-color .15s;
    }
    .tbl-search-input:focus { border-color: var(--blue); }
    .tbl-results-count { font-size: 11px; color: var(--text-muted); white-space: nowrap; }

    .table-wrap { overflow-x: auto; }

    /* Row */
    .data-row { transition: background .12s; }
    .data-row:hover { background: var(--surface2); }
    .row-actions { display: flex; gap: 6px; align-items: center; }
    .btn-icon-sm {
      width: 28px; height: 28px; border-radius: 6px; border: none;
      display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background .15s;
    }
    .btn-icon-sm.edit { background: #eff6ff; color: #2563eb; }
    .btn-icon-sm.edit:hover { background: #dbeafe; }
    .btn-icon-sm.del { background: #fef2f2; color: #dc2626; }
    .btn-icon-sm.del:hover { background: #fee2e2; }

    /* Cargo badges */
    .cargo-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }
    .cargo-instructor { background: #dbeafe; color: #1d4ed8; }
    .cargo-administrador { background: #f3e8ff; color: #7c3aed; }
    .cargo-aprendiz { background: #dcfce7; color: #166534; }
    .cargo-coordinador { background: #fef3c7; color: #92400e; }

    /* Toggle */
    .toggle-switch { position: relative; display: inline-block; width: 34px; height: 18px; margin-top: 4px; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute; cursor: pointer; inset: 0; background: #e5e7eb;
      border-radius: 18px; transition: .15s; border: 1px solid #d1d5db;
    }
    .slider::before {
      content: ''; position: absolute; height: 12px; width: 12px;
      left: 2px; bottom: 2px; background: #fff; border-radius: 50%; transition: .15s;
    }
    input:checked + .slider { background: #10b981; border-color: #059669; }
    input:checked + .slider::before { transform: translateX(16px); }

    /* Alert */
    .alert-error {
      background: #fee2e2; color: #991b1b; border-radius: 8px;
      padding: 10px 16px; font-size: 13px; margin: 12px 16px 0;
    }
    .mb-3 { margin-bottom: 12px; }
    .modal-body { padding: 16px 24px 8px; }
    .modal-footer {
      display: flex; gap: 12px; justify-content: flex-end;
      padding: 16px 24px; border-top: 1px solid var(--border); margin-top: 16px;
    }
    .text-center { text-align: center; }
    .p-8 { padding: 32px; }
    .text-xs { font-size: 11px; }

    /* Form grid in modal */
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
    .form-grid .form-group { margin-top: 0; }
    .form-grid .span-2 { grid-column: 1 / -1; }

    /* Spinner */
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* Hint bajo un campo */
    .field-hint {
      display: block; margin-top: 4px;
      font-size: 11px; color: #d97706;
      background: #fffbeb; border: 1px solid #fcd34d;
      border-radius: 5px; padding: 3px 8px;
    }
  `],
})
export class AdminFormativoComponent implements OnInit {
  activeTab = signal<TabKey>('centros');
  rows = signal<any[]>([]);
  loading = signal(false);
  error = signal('');
  limitAccesos = signal(100);

  // Búsqueda con debounce: searchDisplay va al input (feedback visual inmediato),
  // searchQ (signal) solo se actualiza 200ms después del último tecleo → computed eficiente
  searchDisplay = '';
  searchQ = signal('');
  private _searchTimer: any = null;

  modalOpen = signal(false);
  editingId = signal<number | null>(null);
  formData: any = {};
  saving = signal(false);
  modalError = signal('');

  // Reference signals for FK dropdowns
  centros = signal<any[]>([]);
  sedes = signal<any[]>([]);
  departamentos = signal<any[]>([]);
  municipios = signal<any[]>([]);
  ambientes = signal<any[]>([]);
  areas = signal<any[]>([]);
  programas = signal<any[]>([]);
  personas = signal<any[]>([]);
  aplicativos = signal<any[]>([]);
  roles = signal<any[]>([]);
  modulos = signal<any[]>([]);
  servicios = signal<any[]>([]);
  usuarios = signal<any[]>([]);
  cursos = signal<any[]>([]);

  tabGroups: TabGroup[] = [
    { label: 'Estructura Organizacional', icon: 'building', tabs: ['centros', 'sedes', 'departamentos', 'municipios', 'ambientes'] },
    { label: 'Estructura Académica', icon: 'book-open', tabs: ['programas', 'areas', 'cursos', 'matriculas'] },
    { label: 'Gestión de Personas y Accesos', icon: 'users', tabs: ['personas', 'usuarios', 'credenciales', 'permisos'] },
    { label: 'Aplicativos y Seguridad', icon: 'shield', tabs: ['aplicativos', 'roles', 'modulos', 'servicios'] },
    { label: 'Auditoría', icon: 'activity', tabs: ['accesos'] },
  ];

  tabConfig: Record<TabKey, {
    label: string;
    desc?: string;
    cols: { key: string; label: string; badge?: boolean }[];
    fields: { key: string; label: string; type?: string; opts?: string; required?: boolean; span2?: boolean; hidden?: boolean; hiddenIf?: string; }[];
    load: () => void;
    create?: (d: any) => any;
    update?: (id: number, d: any) => any;
    remove?: (id: number) => any;
  }> = {
    centros: {
      label: 'Centros de Formación', desc: 'centro_formacion',
      cols: [{ key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' }, { key: 'direccion', label: 'Dirección' }],
      fields: [
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'direccion', label: 'Dirección', span2: true },
      ],
      load: () => this.api.getCentros().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createCentro(d), update: (id, d) => this.api.updateCentro(id, d), remove: id => this.api.deleteCentro(id),
    },
    sedes: {
      label: 'Sedes', desc: 'sedes',
      cols: [{ key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' }, { key: 'centro_nombre', label: 'Centro de Formación' }],
      fields: [
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'centroFormacionId', label: 'Centro de Formación', type: 'select', opts: 'centros', required: true },
      ],
      load: () => this.api.getSedes().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createSede(d), update: (id, d) => this.api.updateSede(id, d), remove: id => this.api.deleteSede(id),
    },
    departamentos: {
      label: 'Departamentos', desc: 'departamentos',
      cols: [{ key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' }],
      fields: [{ key: 'nombre', label: 'Nombre del Departamento', required: true, span2: true }],
      load: () => this.api.getDepartamentos().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createDepartamento(d), update: (id, d) => this.api.updateDepartamento(id, d), remove: id => this.api.deleteDepartamento(id),
    },
    municipios: {
      label: 'Municipios', desc: 'municipios',
      cols: [{ key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' }, { key: 'departamento_nombre', label: 'Departamento' }],
      fields: [
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'departamentoId', label: 'Departamento', type: 'select', opts: 'departamentos', required: true },
      ],
      load: () => this.api.getMunicipios().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createMunicipio(d), update: (id, d) => this.api.updateMunicipio(id, d), remove: id => this.api.deleteMunicipio(id),
    },
    ambientes: {
      label: 'Ambientes', desc: 'Aulas, laboratorios, auditorios y todos los espacios del centro',
      cols: [
        { key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' },
        { key: 'tipo', label: 'Tipo' }, { key: 'estado', label: 'Estado' },
        { key: 'capacidad', label: 'Capacidad' },
        { key: 'area_nombre', label: 'Área' }, { key: 'sede_nombre', label: 'Sede' },
      ],
      fields: [
        { key: 'nombre',     label: 'Nombre',    required: true, span2: true },
        { key: 'tipo',       label: 'Tipo',       type: 'enum-tipo-ambiente', required: true },
        { key: 'estado',     label: 'Estado',     type: 'enum-estado-ambiente' },
        { key: 'capacidad',  label: 'Capacidad',  type: 'number' },
        { key: 'areaId',     label: 'Área',       type: 'select', opts: 'areas' },
        { key: 'sedeId',     label: 'Sede',       type: 'select', opts: 'sedes' },
        { key: 'municipioId',label: 'Municipio',  type: 'select', opts: 'municipios' },
      ],
      load: () => this.api.getAmbientesFormativo().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createAmbienteFormativo(d), update: (id, d) => this.api.updateAmbienteFormativo(id, d), remove: id => this.api.deleteAmbienteFormativo(id),
    },
    programas: {
      label: 'Programas', desc: 'programas',
      cols: [{ key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' }, { key: 'tipo', label: 'Tipo' }],
      fields: [
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'tipo', label: 'Tipo', type: 'enum-tipo-programa', required: true },
      ],
      load: () => this.api.getProgramas().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createPrograma(d), update: (id, d) => this.api.updatePrograma(id, d), remove: id => this.api.deletePrograma(id),
    },
    areas: {
      label: 'Áreas', desc: 'areas',
      cols: [{ key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' }, { key: 'sede_nombre', label: 'Sede' }, { key: 'lider_nombre', label: 'Instructor Líder' }],
      fields: [
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'sedeId', label: 'Sede', type: 'select', opts: 'sedes', required: true },
        { key: 'liderId', label: 'Instructor Líder', type: 'select', opts: 'instructores-lider-area' },
      ],
      load: () => this.api.getAreas().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createArea(d), update: (id, d) => this.api.updateArea(id, d), remove: id => this.api.deleteArea(id),
    },
    cursos: {
      label: 'Cursos (Fichas)', desc: 'cursos',
      cols: [
        { key: 'id', label: 'ID' }, { key: 'codigo', label: 'Código' },
        { key: 'programa_nombre', label: 'Programa' }, { key: 'area_nombre', label: 'Área' },
        { key: 'ambiente_nombre', label: 'Ambiente' }, { key: 'estado', label: 'Estado', badge: true },
      ],
      fields: [
        { key: 'codigo', label: 'Código del Curso', required: true },
        { key: 'estado', label: 'Estado', type: 'enum-estado-curso' },
        { key: 'programaId', label: 'Programa', type: 'select', opts: 'programas', required: true },
        { key: 'areaId', label: 'Área', type: 'select', opts: 'areas', required: true },
        { key: 'ambienteId', label: 'Ambiente Asignado', type: 'select', opts: 'ambientes-disponibles-cursos' },
        { key: 'liderId', label: 'Instructor Líder', type: 'select', opts: 'instructores-lider-ficha' },
        { key: 'fechaInicio', label: 'Fecha Inicio', type: 'date', required: true },
        { key: 'fechaFin', label: 'Fecha Fin', type: 'date', required: true },
        { key: 'finLectiva', label: 'Fecha Fin Lectiva', type: 'date' },
      ],
      load: () => this.api.getCursos().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createCurso(d), update: (id, d) => this.api.updateCurso(id, d), remove: id => this.api.deleteCurso(id),
    },
    matriculas: {
      label: 'Matrículas', desc: 'matriculas',
      cols: [
        { key: 'id', label: 'ID' }, { key: 'persona_nombre', label: 'Persona' },
        { key: 'persona_doc', label: 'Documento' }, { key: 'curso_codigo', label: 'Curso' },
        { key: 'fecha_matricula', label: 'Fecha' }, { key: 'estado', label: 'Estado', badge: true },
      ],
      fields: [
        { key: 'persona', label: 'Persona', type: 'select', opts: 'personas', hidden: true },
        { key: 'curso', label: 'Curso', type: 'select', opts: 'cursos', hidden: true },
        { key: 'fechaMatricula', label: 'Fecha de Matrícula', type: 'date', hidden: true },
        { key: 'estado', label: 'Estado Actual', type: 'enum-estado-matricula', required: true },
      ],
      load: () => this.api.getMatriculas().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createMatricula(d), update: (id, d) => this.api.updateMatricula(id, d), remove: id => this.api.deleteMatricula(id),
    },
    personas: {
      label: 'Personas', desc: 'personas',
      cols: [
        { key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' }, { key: 'apellido', label: 'Apellido' },
        { key: 'identificacion', label: 'Identificación' }, { key: 'correo', label: 'Correo' },
        { key: 'cargo', label: 'Cargo' }, { key: 'municipio_nombre', label: 'Municipio' }, { key: 'estado', label: 'Estado', badge: true },
      ],
      fields: [
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'apellido', label: 'Apellido', required: true },
        { key: 'tipoDoc', label: 'Tipo de Documento', type: 'enum-tipo-doc', required: true },
        { key: 'cedula', label: 'N° Identificación', type: 'number', required: true },
        { key: 'correo', label: 'Correo Electrónico', required: true },
        { key: 'genero', label: 'Género', type: 'enum-genero', required: true },
        { key: 'cargo', label: 'Cargo', type: 'enum-cargo', required: true },
        { key: 'municipioId', label: 'Municipio', type: 'select', opts: 'municipios', required: true },
        { key: 'fichaId', label: 'Asignación de Ficha (Solo para Aprendiz)', type: 'select', opts: 'cursos', hiddenIf: 'cargo !== "aprendiz"' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'direccion', label: 'Dirección' },
        { key: 'estado', label: 'Estado', type: 'enum-estado-persona' },
      ],
      load: () => this.api.getPersonas().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createPersona(d), update: (id, d) => this.api.updatePersona(id, d), remove: id => this.api.deletePersona(id),
    },
    aplicativos: {
      label: 'Aplicativos', desc: 'aplicativos',
      cols: [{ key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' }],
      fields: [{ key: 'nombre', label: 'Nombre del Aplicativo', required: true, span2: true }],
      load: () => this.api.getAplicativos().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createAplicativo(d), update: (id, d) => this.api.updateAplicativo(id, d), remove: id => this.api.deleteAplicativo(id),
    },
    roles: {
      label: 'Roles', desc: 'roles',
      cols: [{ key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' }, { key: 'aplicativo_nombre', label: 'Aplicativo' }],
      fields: [
        { key: 'nombre', label: 'Nombre del Rol', required: true },
        { key: 'aplicativoId', label: 'Aplicativo', type: 'select', opts: 'aplicativos', required: true },
        { key: 'modulos', label: 'Módulos', type: 'multiselect', opts: 'modulos', span2: true },
      ],
      load: () => this.api.getRoles().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createRol(d), update: (id, d) => this.api.updateRol(id, d), remove: id => this.api.deleteRol(id),
    },
    modulos: {
      label: 'Módulos', desc: 'modulos',
      cols: [{ key: 'id', label: 'ID' }, { key: 'nombre', label: 'Módulo' }, { key: 'aplicativo_nombre', label: 'Aplicativo' }],
      fields: [
        { key: 'nombre', label: 'Nombre del Módulo', required: true },
        { key: 'aplicativoId', label: 'Aplicativo', type: 'select', opts: 'aplicativos', required: true },
      ],
      load: () => this.api.getModulos().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createModulo(d), update: (id, d) => this.api.updateModulo(id, d), remove: id => this.api.deleteModulo(id),
    },
    servicios: {
      label: 'Servicios (Endpoints)', desc: 'servicios',
      cols: [{ key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' }, { key: 'url', label: 'URL' }, { key: 'modulo_nombre', label: 'Módulo' }],
      fields: [
        { key: 'nombre', label: 'Nombre', required: true },
        { key: 'moduloId', label: 'Módulo', type: 'select', opts: 'modulos', required: true },
        { key: 'url', label: 'URL del Endpoint', required: true, span2: true },
      ],
      load: () => this.api.getServicios().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createServicio(d), update: (id, d) => this.api.updateServicio(id, d), remove: id => this.api.deleteServicio(id),
    },
    usuarios: {
      label: 'Usuarios del Sistema', desc: 'usuarios',
      cols: [
        { key: 'id', label: 'ID' }, { key: 'persona_nombre', label: 'Persona' },
        { key: 'persona_doc', label: 'Documento' }, { key: 'cargo', label: 'Cargo' },
        { key: 'aplicativo_nombre', label: 'Aplicativo' }, { key: 'estado', label: 'Estado', badge: true },
      ],
      fields: [
        { key: 'personaId', label: 'Persona', type: 'select', opts: 'personas', required: true },
        { key: 'aplicativoId', label: 'Aplicativo', type: 'select', opts: 'aplicativos', required: true },
        { key: 'estado', label: 'Estado', type: 'enum-estado-usuario' },
      ],
      load: () => this.api.getUsuariosFormativo().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createUsuarioFormativo(d), update: (id, d) => this.api.updateUsuarioFormativo(id, d), remove: id => this.api.deleteUsuarioFormativo(id),
    },
    credenciales: {
      label: 'Credenciales de Acceso', desc: 'credenciales',
      cols: [
        { key: 'id', label: 'ID' }, { key: 'login', label: 'Login' },
        { key: 'usuario_nombre', label: 'Usuario' }, { key: 'rol_nombre', label: 'Rol' },
      ],
      fields: [
        { key: 'login', label: 'Doc o Correo', required: true },
        { key: 'password', label: 'Contraseña (dejar vacío para no cambiar)', type: 'password' },
        { key: 'usuarioId', label: 'Usuario del Sistema', type: 'select', opts: 'usuarios', required: true },
        { key: 'rolId', label: 'Rol', type: 'select', opts: 'roles' },
      ],
      load: () => this.api.getCredenciales().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createCredencial(d), update: (id, d) => this.api.updateCredencial(id, d), remove: id => this.api.deleteCredencial(id),
    },
    permisos: {
      label: 'Permisos', desc: 'permisos',
      cols: [
        { key: 'id', label: 'ID' }, { key: 'usuario_nombre', label: 'Usuario' },
        { key: 'rol_nombre', label: 'Rol' }, { key: 'servicio_nombre', label: 'Servicio' },
      ],
      fields: [
        { key: 'usuarioId', label: 'Usuario', type: 'select', opts: 'usuarios', required: true },
        { key: 'servicioId', label: 'Servicio', type: 'select', opts: 'servicios', required: true },
      ],
      load: () => this.api.getPermisos().subscribe({ next: r => this.rows.set(r), error: e => this.setErr(e) }),
      create: d => this.api.createPermiso(d), update: (id, d) => this.api.updatePermiso(id, d), remove: id => this.api.deletePermiso(id),
    },
    accesos: {
      label: 'Historial de Accesos', desc: 'accesos (solo lectura)',
      cols: [
        { key: 'usuario_nombre', label: 'Usuario' },
        { key: 'estado', label: 'Estado', badge: true },
        { key: 'fechaIngresoFmt', label: 'Inicio de sesión' },
        { key: 'fechaSalidaFmt', label: 'Cierre de sesión' },
      ],
      fields: [],
      load: () => this.api.getAccesos(this.limitAccesos()).subscribe({
        next: r => this.rows.set(r.map((a: any) => ({
          ...a,
          fechaIngresoFmt: a.fechaIngreso ? new Date(a.fechaIngreso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—',
          fechaSalidaFmt: a.fechaSalida  ? new Date(a.fechaSalida).toLocaleString('es-CO',  { dateStyle: 'short', timeStyle: 'short' }) : '—',
        }))),
        error: e => this.setErr(e),
      }),
    },
  };

  filteredRows = computed(() => {
    const q = this.searchQ(); // señal rastreada → se recomputa al cambiar
    if (!q) return this.rows();
    return this.rows().filter(r =>
      Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q))
    );
  });

  private toast = inject(ToastService);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadRefData();
    this.loadTab();
  }

  loadRefData() {
    this.api.getCentros().subscribe({ next: r => this.centros.set(r), error: () => {} });
    this.api.getSedes().subscribe({ next: r => this.sedes.set(r), error: () => {} });
    this.api.getDepartamentos().subscribe({ next: r => this.departamentos.set(r), error: () => {} });
    this.api.getMunicipios().subscribe({ next: r => this.municipios.set(r), error: () => {} });
    this.api.getAmbientesFormativo().subscribe({ next: r => this.ambientes.set(r), error: () => {} });
    this.api.getAreas().subscribe({ next: r => this.areas.set(r), error: () => {} });
    this.api.getProgramas().subscribe({ next: r => this.programas.set(r), error: () => {} });
    this.api.getPersonas().subscribe({ next: r => this.personas.set(r), error: () => {} });
    this.api.getAplicativos().subscribe({ next: r => this.aplicativos.set(r), error: () => {} });
    this.api.getRoles().subscribe({ next: r => this.roles.set(r), error: () => {} });
    this.api.getModulos().subscribe({ next: r => this.modulos.set(r), error: () => {} });
    this.api.getServicios().subscribe({ next: r => this.servicios.set(r), error: () => {} });
    this.api.getUsuariosFormativo().subscribe({ next: r => this.usuarios.set(r), error: () => {} });
    this.api.getCursos().subscribe({ next: r => this.cursos.set(r), error: () => {} });
  }

  onSearch(val: string) {
    this.searchDisplay = val;
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.searchQ.set(val.toLowerCase()), 200);
  }

  switchTab(key: TabKey) {
    this.activeTab.set(key);
    this.searchDisplay = '';
    this.searchQ.set('');
    this.error.set('');
    this.loadTab();
  }

  loadTab() {
    this.loading.set(true);
    this.rows.set([]);
    const tab = this.tabConfig[this.activeTab()];
    tab.load();
    setTimeout(() => this.loading.set(false), 600);
  }

  /** Convierte getOpts() al formato SSOption para SearchableSelect */
  getSSOpts(listKey: string): SSOption[] {
    return this.getOpts(listKey).map(o => ({ value: o.id, label: o.label }));
  }

  getEnumOpts(type: string): SSOption[] {
    const maps: Record<string, SSOption[]> = {
      'enum-estado-persona': [
        { value: 'activo', label: 'Activo' },
        { value: 'inactivo', label: 'Inactivo' }
      ],
      'enum-tipo-ambiente': [
        { value: 'Ambiente', label: 'Ambiente' },
        { value: 'Biblioteca', label: 'Biblioteca' },
        { value: 'Auditorio', label: 'Auditorio' },
        { value: 'restaurante', label: 'Restaurante' }
      ],
      'enum-estado-ambiente': [
        { value: 'activo',   label: 'Activo' },
        { value: 'inactivo', label: 'Inactivo' },
      ],
      'enum-tipo-ubicacion': [
        { value: 'Aula', label: 'Aula' },
        { value: 'Laboratorio', label: 'Laboratorio' },
        { value: 'Taller', label: 'Taller' },
        { value: 'Auditorio', label: 'Auditorio' },
        { value: 'Biblioteca', label: 'Biblioteca' },
        { value: 'Restaurante', label: 'Restaurante' },
        { value: 'Centro Deportivo', label: 'Centro Deportivo' },
        { value: 'Sala de Conferencias', label: 'Sala de Conferencias' },
        { value: 'Zona Común', label: 'Zona Común' },
      ],
      'enum-genero': [
        { value: 'masculino', label: 'Masculino' },
        { value: 'femenino', label: 'Femenino' },
        { value: 'otro', label: 'Otro' }
      ],
      'enum-cargo': [
        { value: 'instructor', label: 'Instructor' },
        { value: 'administrador', label: 'Administrador' },
        { value: 'aprendiz', label: 'Aprendiz' },
      ],
      'enum-tipo-doc': [
        { value: 'CC', label: 'Cédula de Ciudadanía (CC)' },
        { value: 'TI', label: 'Tarjeta de Identidad (TI)' },
        { value: 'CE', label: 'Cédula de Extranjería (CE)' },
        { value: 'PA', label: 'Pasaporte (PA)' },
        { value: 'RC', label: 'Registro Civil (RC)' },
      ],
      'enum-tipo-programa': [
        { value: 'tecnologo', label: 'Tecnólogo' },
        { value: 'tecnico', label: 'Técnico' },
        { value: 'especializacion', label: 'Especialización' },
        { value: 'curso_corto', label: 'Curso Corto' }
      ],
      'enum-estado-curso': [
        { value: 'activo', label: 'Activo' },
        { value: 'finalizado', label: 'Finalizado' },
        { value: 'cancelado', label: 'Cancelado' }
      ],
      'enum-estado-matricula': [
        { value: 'activo', label: 'Activo' },
        { value: 'retirado', label: 'Retirado' },
        { value: 'graduado', label: 'Graduado' },
        { value: 'cancelado', label: 'Cancelado' }
      ],
      'enum-estado-usuario': [
        { value: 'activo', label: 'Activo' },
        { value: 'inactivo', label: 'Inactivo' }
      ]
    };
    return maps[type] || [];
  }

  getOpts(listKey: string): { id: any; label: string }[] {
    switch (listKey) {
      case 'centros': return this.centros().map(c => ({ id: c.id, label: c.nombre }));
      case 'sedes': return this.sedes().map(s => ({ id: s.id, label: `${s.nombre}${s.centro_nombre ? ' · ' + s.centro_nombre : ''}` }));
      case 'departamentos': return this.departamentos().map(d => ({ id: d.id, label: d.nombre }));
      case 'municipios': return this.municipios().map(m => ({ id: m.id, label: `${m.nombre}${m.departamento_nombre ? ' · ' + m.departamento_nombre : ''}` }));
      case 'ambientes': return this.ambientes().map(a => ({ id: a.id, label: a.nombre }));
      case 'areas': return this.areas().map(a => ({ id: a.id, label: `${a.nombre}${a.sede_nombre ? ' · ' + a.sede_nombre : ''}` }));
      case 'programas': return this.programas().map(p => ({ id: p.id, label: `${p.nombre} (${p.tipo})` }));
      case 'personas': return this.personas().map(p => ({ id: p.id, label: `${p.nombre} ${p.apellido} — ${p.identificacion}` }));
      case 'aplicativos': return this.aplicativos().map(a => ({ id: a.id, label: a.nombre }));
      case 'roles': return this.roles().map(r => ({ id: r.id, label: `${r.nombre}${r.aplicativo_nombre ? ' · ' + r.aplicativo_nombre : ''}` }));
      case 'modulos': return this.modulos().map(m => ({ id: m.id, label: `${m.nombre}${m.aplicativo_nombre ? ' · ' + m.aplicativo_nombre : ''}` }));
      case 'servicios': return this.servicios().map(s => ({ id: s.id, label: `${s.nombre} — ${s.url}` }));
      case 'usuarios': return this.usuarios().map(u => ({ id: u.id, label: `${u.persona_nombre} (${u.aplicativo_nombre})` }));
      case 'cursos': return this.cursos().map(c => ({ id: c.id, label: `${c.codigo} · ${c.programa_nombre ?? ''}` }));

      // ── Ambientes no asignados a otra ficha, filtrados por el área seleccionada ──
      case 'ambientes-disponibles-cursos': {
        const usados = new Set(
          this.cursos()
            .filter((c: any) => c.ambienteId && c.id !== this.editingId())
            .map((c: any) => c.ambienteId)
        );
        const areaSeleccionada = this.formData['areaId'] ?? null;
        return this.ambientes()
          .filter(a => {
            if (usados.has(a.id)) return false;
            // Si hay un área seleccionada, mostrar solo ambientes de esa área
            if (areaSeleccionada) return (a as any).areaId === areaSeleccionada;
            return true;
          })
          .map(a => ({ id: a.id, label: `${a.nombre}${(a as any).area_nombre ? ' · ' + (a as any).area_nombre : ''}` }));
      }

      // ── Solo instructores no asignados como líder en otra ficha ──
      case 'instructores-lider-ficha': {
        const usados = new Set(
          this.cursos()
            .filter((c: any) => c.liderId && c.id !== this.editingId())
            .map((c: any) => c.liderId)
        );
        return this.personas()
          .filter((p: any) => p.cargo === 'instructor' && !usados.has(p.id))
          .map((p: any) => ({ id: p.id, label: `${p.nombre} ${p.apellido} — ${p.identificacion}` }));
      }

      // ── Solo instructores no asignados como líder en otra área ──
      case 'instructores-lider-area': {
        const usados = new Set(
          this.areas()
            .filter((a: any) => a.liderId && a.id !== this.editingId())
            .map((a: any) => a.liderId)
        );
        return this.personas()
          .filter((p: any) => p.cargo === 'instructor' && !usados.has(p.id))
          .map((p: any) => ({ id: p.id, label: `${p.nombre} ${p.apellido} — ${p.identificacion}` }));
      }

      default: return [];
    }
  }

  /** Actualiza formData y aplica lógica dependiente entre campos.
   *  Usar este método en (ngModelChange) de los <app-ss> con type='select'
   *  para evitar el conflicto de doble listener con [(ngModel)]. */
  setField(key: string, value: any) {
    this.formData[key] = value;
    this.onFieldChange(key, value);
  }

  /** Lógica dependiente entre campos (sin modificar formData aquí). */
  onFieldChange(fieldKey: string, value: any) {
    if (fieldKey === 'areaId' && this.activeTab() === 'cursos') {
      this.formData['ambienteId'] = '';
    }
  }

  openModal(row?: any) {
    this.modalError.set('');
    if (row) {
      this.editingId.set(row.id);
      this.formData = { ...row, password: '' };
      // Para inicializar multiselect de roles
      if (this.activeTab() === 'roles' && row.modulos) { // asumimos modulos vendran de db como array
        this.formData.modulos = [...row.modulos];
      }
    } else {
      this.editingId.set(null);
      const tipoDefault = this.activeTab() === 'ambientes' ? 'Ambiente' : 'Aula';
      this.formData = { estado: 'activo', tipo: tipoDefault, genero: 'masculino', cargo: 'aprendiz' };
      if (this.activeTab() === 'roles') this.formData.modulos = [];
    }
    this.modalOpen.set(true);
  }

  closeModal() { this.modalOpen.set(false); }

  toggleMulti(key: string, optId: number, event: Event) {
    if (!this.formData[key]) this.formData[key] = [];
    if ((event.target as HTMLInputElement).checked) {
      if (!this.formData[key].includes(optId)) this.formData[key].push(optId);
    } else {
      this.formData[key] = this.formData[key].filter((id: number) => id !== optId);
    }
  }

  save() {
    const cfg: any = this.tabConfig[this.activeTab()];
    const required = cfg.fields.filter((f: any) => f.required).map((f: any) => f.key);
    // Filtrar los que estan ocultos logicamente por el hiddenIf
    const missing = required.filter((k: string) => {
      const fieldDef = cfg.fields.find((fd: any) => fd.key === k);
      if (fieldDef?.hiddenIf === 'cargo !== "aprendiz"' && this.formData['cargo'] !== 'aprendiz') return false;
      return !this.formData[k] && this.formData[k] !== 0;
    });
    if (missing.length) { this.modalError.set(`Completa: ${missing.join(', ')}`); return; }

    this.saving.set(true);
    this.modalError.set('');
    const id = this.editingId();
    const obs = id ? cfg.update!(id, this.formData) : cfg.create!(this.formData);
    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.loadTab();
        this.loadRefData();
        this.toast.success(
          id ? 'Registro actualizado' : 'Registro creado',
          id ? 'Los cambios fueron guardados correctamente.' : 'El registro fue añadido al sistema.',
        );
      },
      error: (e: any) => {
        this.saving.set(false);
        const msg: string = e?.error?.message ?? 'No se pudo guardar. Verifica los datos e intenta de nuevo.';
        this.modalError.set(msg);
        this.toast.error('Error al guardar', msg);
      },
    });
  }

  deleteRow(id: number) {
    const warnings: Record<string, string> = {
      centros: '🚫 PELIGRO: ¿Eliminar Centro de Formación?\nSe eliminarán de forma permanente TODAS sus Sedes, Ambientes, Áreas y Cursos asociados en cascada.',
      sedes: '🚫 PELIGRO: ¿Eliminar esta Sede?\nSe borrarán simultáneamente los Ambientes y Áreas asociados a ella.',
      departamentos: '🚫 CRÍTICO: ¿Eliminar este Departamento?\nSe eliminarán en cadena sus Municipios y ABSOLUTAMENTE TODAS las Personas, Usuarios y Matrículas domiciliadas allí.',
      municipios: '🚫 CRÍTICO: ¿Eliminar Municipio?\nSe borrarán irreversiblemente todas las personas domiciliadas, causando discrepancias severas con los usuarios activos del sistema principal.',
      programas: '⚠️ ADVERTENCIA: ¿Eliminar Programa?\nSe anularán y borrarán automáticamente todas las Fichas/Cursos académicas pertenecientes.',
      areas: '⚠️ ¿Eliminar Área?\nLos cursos vinculados a esta área quedarán sin área asignada (no se eliminan). El instructor líder perderá ese rol.',
      cursos: '⚠️ ¿Eliminar Curso/Ficha?\nSe erradicarán todas las Matrículas y enlaces de los aprendices asigandos a este programa.',
      personas: '⚠️ ¿Eliminar esta Persona?\nSe destruirá su Perfil, su Usuario de Sistema, sus Permisos y sus Credenciales de Acceso al mismo tiempo.',
      aplicativos: '🚫 PELIGRO: ¿Eliminar Aplicativo Principal?\nEsta es una acción nuclear. Borrará los Módulos de la UI y los Roles de sistema atados.',
      roles: '⚠️ ¿Eliminar Rol Administrativo?\nTodos los usuarios que ostentaban este rol perderán inmediatamente el acceso a sus credenciales.',
      modulos: '⚠️ ¿Eliminar Módulo de la UI?\nProvocará el borrado de sus respectivos servicios/endpoints.',
      usuarios: '⚠️ ¿Revocar (Eliminar) Usuario?\nSe destruirán sus credenciales de login y privilegios de la red.',
    };

    const tab = this.activeTab() as string;
    const msg = warnings[tab] || '¿Estás completamente seguro de eliminar este registro?';
    
    if (!confirm(msg)) return;

    const cfg = this.tabConfig[this.activeTab()];
    cfg.remove!(id).subscribe({
      next: () => {
        this.loadTab();
        this.loadRefData();
        this.toast.success('Registro eliminado', 'El registro fue eliminado del sistema.');
      },
      error: (e: any) => {
        const msg: string = e?.error?.message ?? 'No se pudo eliminar. Puede haber registros relacionados que impiden la eliminación.';
        this.setErr(msg);
        this.toast.error('Error al eliminar', msg);
      },
    });
  }

  private setErr(e: any) {
    const msg = typeof e === 'string' ? e : (e?.error?.message ?? 'Error de conexión con el servidor');
    this.error.set(msg);
  }

  toggleEstadoPersona(row: any, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const newEstado = checked ? 'activo' : 'inactivo';

    // Solo actualizar el estado
    this.api.updatePersona(row.id, { ...row, estado: newEstado }).subscribe({
      next: () => {
        this.loadTab();
        this.toast.success('Estado actualizado', `La persona fue marcada como ${newEstado}.`);
      },
      error: (e) => {
        this.toast.error('Error al cambiar estado', e?.error?.message ?? 'No se pudo actualizar el estado.');
        this.loadTab(); // fallback para regresar el switch visualmente
      }
    });
  }
}
