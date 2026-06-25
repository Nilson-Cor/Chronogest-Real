import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

type TabKey =
  | 'horarios' | 'competencias'
  | 'eventos'
  | 'solicitudes' | 'notificaciones'
  | 'configuracion';

interface ColDef   { key: string; label: string; badge?: boolean; bool?: boolean; }
interface FieldDef { key: string; label: string; type?: string; opts?: string; required?: boolean; span2?: boolean; }
interface TabCfg {
  label: string; desc?: string;
  /** Sin botón Nuevo ni editar */
  viewOnly?: boolean;
  cols: ColDef[];
  fields: FieldDef[];
  load: () => void;
  create?: (d: any) => any;
  update?: (id: number, d: any) => any;
  remove?: (id: number) => any;
}

@Component({
  selector: 'app-horarios-admin',
  imports: [FormsModule, LucideAngularModule],
  template: `
    <!-- GRUPOS DE TABS -->
    <div class="tab-groups">
      @for (g of tabGroups; track g.label) {
      <div class="tab-group">
        <div class="tab-group-label">
          <lucide-icon [name]="g.icon" [size]="13"></lucide-icon>{{ g.label }}
        </div>
        <div class="tab-group-tabs">
          @for (t of g.tabs; track t) {
          <button class="tab-btn" [class.active]="activeTab() === t" (click)="switchTab(t)">
            {{ cfg(t).label }}
          </button>
          }
        </div>
      </div>
      }
    </div>

    <!-- CARD CRUD -->
    <div class="crud-card">
      <div class="crud-header">
        <div>
          <h3>{{ cfg().label }}</h3>
          <p class="text-muted text-xs">{{ cfg().desc ?? '' }}</p>
        </div>
        @if (!cfg().viewOnly && cfg().create) {
        <button class="btn btn-blue" (click)="openModal()">
          <lucide-icon name="plus" [size]="14"></lucide-icon> Nuevo
        </button>
        }
      </div>

      @if (error()) { <div class="alert-error">{{ error() }}</div> }

      <div class="table-search-bar">
        <div class="tbl-search-wrap">
          <lucide-icon name="search" [size]="14" class="tbl-search-icon"></lucide-icon>
          <input class="tbl-search-input" placeholder="Buscar..." [value]="searchDisplay"
            (input)="onSearch($any($event.target).value)">
        </div>
        <span class="row-count">{{ filteredRows().length }} registro(s)</span>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              @for (col of cfg().cols; track col.key) { <th>{{ col.label }}</th> }
              <th style="width:80px">Acc.</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr><td [attr.colspan]="cfg().cols.length + 1" class="empty-cell">
                <lucide-icon name="loader" [size]="16" class="spin"></lucide-icon> Cargando...
              </td></tr>
            } @else if (filteredRows().length === 0) {
              <tr><td [attr.colspan]="cfg().cols.length + 1" class="empty-cell">Sin registros</td></tr>
            } @else {
              @for (row of filteredRows(); track row.id) {
              <tr class="data-row">
                @for (col of cfg().cols; track col.key) {
                <td>
                  @if (col.badge) {
                    <span class="badge" [class.active]="isActive(row[col.key])" [class.inactive]="!isActive(row[col.key])">
                      {{ row[col.key] ?? '—' }}
                    </span>
                  } @else if (col.bool) {
                    <span class="badge" [class.active]="row[col.key]" [class.inactive]="!row[col.key]">
                      {{ row[col.key] ? 'Sí' : 'No' }}
                    </span>
                  } @else {
                    <span [title]="row[col.key] ?? ''">{{ truncate(row[col.key]) }}</span>
                  }
                </td>
                }
                <td>
                  <div class="row-actions">
                    @if (!cfg().viewOnly && cfg().update) {
                      <button class="btn-icon-sm edit" (click)="openModal(row)" title="Editar">
                        <lucide-icon name="pencil" [size]="13"></lucide-icon>
                      </button>
                    }
                    @if (cfg().remove) {
                      <button class="btn-icon-sm del" (click)="deleteRow(row)" title="Eliminar">
                        <lucide-icon name="trash-2" [size]="13"></lucide-icon>
                      </button>
                    }
                  </div>
                </td>
              </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL -->
    @if (modalOpen()) {
    <div class="modal-backdrop" (click)="closeModal()">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-head">
          <span>{{ editingId() ? 'Editar' : 'Nuevo' }} {{ cfg().label }}</span>
          <button class="modal-close" (click)="closeModal()">
            <lucide-icon name="x" [size]="16"></lucide-icon>
          </button>
        </div>
        <div class="modal-body">
          @if (modalError()) { <div class="alert-error">{{ modalError() }}</div> }
          <div class="form-grid">
          @for (f of cfg().fields; track f.key) {
            <div class="form-field" [class.span2]="f.span2">
              <label>{{ f.label }}@if(f.required){<span class="req">*</span>}</label>
              @if (f.type === 'select') {
                <select class="form-control" [(ngModel)]="formData[f.key]">
                  <option value="">— Seleccionar —</option>
                  @for (opt of getSelectOpts(f.opts!); track opt.id) {
                  <option [value]="opt.id">{{ opt.label }}</option>
                  }
                </select>
              } @else if (f.type?.startsWith('enum-')) {
                <select class="form-control" [(ngModel)]="formData[f.key]">
                  @for (opt of getEnumOpts(f.type!); track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                  }
                </select>
              } @else if (f.type === 'date') {
                <input class="form-control" type="date" [(ngModel)]="formData[f.key]">
              } @else if (f.type === 'time') {
                <input class="form-control" type="time" [(ngModel)]="formData[f.key]">
              } @else if (f.type === 'number') {
                <input class="form-control" type="number" [(ngModel)]="formData[f.key]" [placeholder]="f.label">
              } @else if (f.type === 'password') {
                <input class="form-control" type="password" [(ngModel)]="formData[f.key]"
                  [placeholder]="editingId() ? 'Dejar vacío para no cambiar' : 'Contraseña inicial (def: 1234)'">
              } @else if (f.type === 'textarea') {
                <textarea class="form-control" rows="3" [(ngModel)]="formData[f.key]" [placeholder]="f.label"></textarea>
              } @else {
                <input class="form-control" type="text" [(ngModel)]="formData[f.key]" [placeholder]="f.label">
              }
            </div>
          }
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="closeModal()">Cancelar</button>
          <button class="btn btn-blue" (click)="saveRow()" [disabled]="saving()">
            @if (saving()) { <lucide-icon name="loader" [size]="14" class="spin"></lucide-icon> }
            Guardar
          </button>
        </div>
      </div>
    </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .tab-groups { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
    .tab-group { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; }
    .tab-group-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .7px; color: #64748b; display: flex; align-items: center; gap: 5px; margin-bottom: 8px; }
    .tab-group-tabs { display: flex; flex-wrap: wrap; gap: 4px; }
    .tab-btn { padding: 5px 12px; border-radius: 6px; border: 1px solid #e2e8f0; background: transparent; font-size: 12px; cursor: pointer; color: #1e293b; transition: all .15s; }
    .tab-btn:hover { background: #f1f5f9; }
    .tab-btn.active { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
    .crud-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .crud-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
    .crud-header h3 { font-size: 15px; font-weight: 700; margin: 0; }
    .table-search-bar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid #e2e8f0; }
    .tbl-search-wrap { position: relative; flex: 1; max-width: 340px; }
    .tbl-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
    .tbl-search-input { width: 100%; padding: 7px 10px 7px 32px; border: 1px solid #e2e8f0; border-radius: 7px; font-size: 13px; box-sizing: border-box; }
    .row-count { font-size: 12px; color: #94a3b8; margin-left: auto; }
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th { background: #f8fafc; padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #64748b; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
    .data-table td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; vertical-align: middle; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .data-row:hover { background: #f8fafc; }
    .empty-cell { text-align: center; padding: 40px; color: #94a3b8; }
    .row-actions { display: flex; gap: 4px; }
    .btn-icon-sm { width: 28px; height: 28px; border-radius: 6px; border: 1px solid; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s; background: none; }
    .btn-icon-sm.edit { border-color: #bfdbfe; color: #1d4ed8; } .btn-icon-sm.edit:hover { background: #eff6ff; }
    .btn-icon-sm.del { border-color: #fecaca; color: #dc2626; } .btn-icon-sm.del:hover { background: #fee2e2; }
    .badge { padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge.active { background: #dcfce7; color: #166534; }
    .badge.inactive { background: #f1f5f9; color: #64748b; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all .15s; }
    .btn-blue { background: #1d4ed8; color: #fff; } .btn-blue:hover { background: #1e40af; } .btn-blue:disabled { opacity: .6; cursor: not-allowed; }
    .btn-ghost { background: transparent; border-color: #e2e8f0; color: #64748b; } .btn-ghost:hover { background: #f8fafc; }
    .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin: 12px 16px 0; }
    .text-muted { color: #64748b; } .text-xs { font-size: 12px; margin: 2px 0 0; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal-box { background: #fff; border-radius: 14px; width: 100%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,.25); }
    .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 15px; font-weight: 700; }
    .modal-close { background: none; border: none; cursor: pointer; color: #94a3b8; display: flex; }
    .modal-body { padding: 20px; overflow-y: auto; flex: 1; }
    .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid #e2e8f0; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-field { display: flex; flex-direction: column; gap: 5px; }
    .form-field.span2 { grid-column: span 2; }
    .form-field label { font-size: 12px; font-weight: 600; color: #374151; }
    .req { color: #dc2626; margin-left: 2px; }
    .form-control { border: 1px solid #d1d5db; border-radius: 7px; padding: 7px 10px; font-size: 13px; width: 100%; box-sizing: border-box; font-family: inherit; }
    .form-control:focus { outline: none; border-color: #1d4ed8; box-shadow: 0 0 0 2px rgba(29,78,216,.1); }
    textarea.form-control { resize: vertical; min-height: 70px; }
    .spin { animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class HorariosAdminComponent implements OnInit {
  activeTab = signal<TabKey>('horarios');
  rows      = signal<any[]>([]);
  loading   = signal(false);
  error     = signal('');
  modalOpen = signal(false);
  saving    = signal(false);
  modalError = signal('');
  editingId  = signal<number | null>(null);
  searchDisplay = '';
  searchQ = signal('');
  formData: Record<string, any> = {};

  tabGroups = [
    { label: 'Horarios',      icon: 'calendar',        tabs: ['horarios', 'competencias'] as TabKey[] },
    { label: 'Espacios',      icon: 'building-2',      tabs: ['eventos'] as TabKey[] },
    { label: 'Operacional',   icon: 'clipboard-list',  tabs: ['solicitudes', 'notificaciones'] as TabKey[] },
    { label: 'Sistema',       icon: 'settings',        tabs: ['configuracion'] as TabKey[] },
  ];

  private tabMap: Record<TabKey, TabCfg> = {

    // ── HORARIOS (horarios_db) ────────────────────────────────
    horarios: {
      label: 'Horarios', desc: 'Horarios activos del sistema (vista + eliminar)',
      viewOnly: true,
      cols: [
        { key: 'id', label: 'ID' }, { key: 'dia_semana', label: 'Día' },
        { key: 'jornada', label: 'Jornada' },
        { key: 'hora_inicio', label: 'Inicio' }, { key: 'hora_fin', label: 'Fin' },
        { key: 'ficha_codigo', label: 'Ficha' }, { key: 'instructor_nombre', label: 'Instructor' },
        { key: 'ambiente_nombre', label: 'Ambiente' },
        { key: 'activo', label: 'Activo', bool: true },
      ],
      fields: [],
      load:   () => this.api.getHHorarios().subscribe({ next: r => this.onLoad(r), error: e => this.onErr(e) }),
      remove: id => this.api.deleteHHorario(id),
    },

    competencias: {
      label: 'Competencias', desc: 'Competencias asignadas a horarios (vista + eliminar)',
      viewOnly: true,
      cols: [
        { key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' },
        { key: 'ficha_codigo', label: 'Ficha' }, { key: 'instructor_nombre', label: 'Instructor' },
        { key: 'dia_semana', label: 'Día' }, { key: 'hora_inicio', label: 'Inicio' },
        { key: 'fecha_inicio', label: 'F. Inicio' }, { key: 'fecha_fin', label: 'F. Fin' },
        { key: 'horas_requeridas', label: 'H. Req.' }, { key: 'dias_clase_count', label: 'Días clase' },
      ],
      fields: [],
      load:   () => this.api.getHCompetencias().subscribe({ next: r => this.onLoad(r), error: e => this.onErr(e) }),
      remove: id => this.api.deleteHCompetencia(id),
    },

    // ── ESPACIOS (horarios_db) ────────────────────────────────
    eventos: {
      label: 'Eventos', desc: 'Eventos programados del sistema',
      cols: [
        { key: 'id', label: 'ID' }, { key: 'nombre', label: 'Nombre' },
        { key: 'tipo', label: 'Tipo' }, { key: 'fechaInicio', label: 'F. Inicio' },
        { key: 'fechaFin', label: 'F. Fin' }, { key: 'horaInicio', label: 'H. Inicio' },
        { key: 'horaFin', label: 'H. Fin' }, { key: 'lugar', label: 'Lugar' },
      ],
      fields: [
        { key: 'nombre',       label: 'Nombre',     required: true, span2: true },
        { key: 'tipo',         label: 'Tipo',       type: 'enum-tipo-evento' },
        { key: 'descripcion',  label: 'Descripción', type: 'textarea', span2: true },
        { key: 'fechaInicio', label: 'Fecha Inicio', type: 'date' },
        { key: 'fechaFin',    label: 'Fecha Fin',    type: 'date' },
        { key: 'horaInicio',  label: 'Hora Inicio',  type: 'time' },
        { key: 'horaFin',     label: 'Hora Fin',     type: 'time' },
        { key: 'lugar',        label: 'Lugar', span2: true },
      ],
      load:   () => this.api.getHEventos().subscribe({ next: r => this.onLoad(r), error: e => this.onErr(e) }),
      create: d => this.api.createHEvento(d),
      update: (id, d) => this.api.updateHEvento(id, d),
      remove: id => this.api.deleteHEvento(id),
    },

    // ── OPERACIONAL ───────────────────────────────────────────
    solicitudes: {
      label: 'Solicitudes de Cambio', desc: 'Solo lectura', viewOnly: true,
      cols: [
        { key: 'id', label: 'ID' }, { key: 'instructor_nombre', label: 'Instructor' },
        { key: 'estado', label: 'Estado', badge: true }, { key: 'razon', label: 'Razón' },
        { key: 'respuesta_admin', label: 'Respuesta' }, { key: 'fecha', label: 'Fecha' },
      ],
      fields: [],
      load: () => this.api.getHSolicitudes().subscribe({ next: r => this.onLoad(r), error: e => this.onErr(e) }),
    },

    notificaciones: {
      label: 'Notificaciones', desc: 'Historial de notificaciones (eliminar individual)', viewOnly: true,
      cols: [
        { key: 'id', label: 'ID' }, { key: 'tipo', label: 'Tipo' },
        { key: 'destinatario_id', label: 'Dest. ID' }, { key: 'destinatario_rol', label: 'Rol' },
        { key: 'leida', label: 'Leída', bool: true }, { key: 'fecha', label: 'Fecha' },
      ],
      fields: [],
      load:   () => this.api.getHNotificaciones().subscribe({ next: r => this.onLoad(r), error: e => this.onErr(e) }),
      remove: id => this.api.deleteHNotificacion(id),
    },

    // ── SISTEMA ───────────────────────────────────────────────
    configuracion: {
      label: 'Configuración Sistema', desc: 'Parámetros globales (solo editar)', viewOnly: true,
      cols: [
        { key: 'id', label: 'ID' }, { key: 'pin_registro', label: 'PIN Registro' },
        { key: 'updated_at', label: 'Actualizado' },
      ],
      fields: [
        { key: 'pin_registro', label: 'PIN de Registro', required: true },
      ],
      load:   () => this.api.getHConfiguracion().subscribe({ next: r => this.onLoad(r), error: e => this.onErr(e) }),
      update: (id, d) => this.api.updateHConfiguracion(id, d),
    },
  };

  private enumMap: Record<string, { value: string; label: string }[]> = {
    'enum-tipo-evento': [
      { value: 'formativo', label: 'Formativo' }, { value: 'institucional', label: 'Institucional' },
      { value: 'evaluacion', label: 'Evaluación' }, { value: 'festivo', label: 'Festivo' },
    ],
  };

  filteredRows = computed(() => {
    const q = this.searchQ();
    if (!q) return this.rows();
    return this.rows().filter(r =>
      Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q))
    );
  });

  private _searchTimer: any;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.loadTab();
  }

  /** Acceso rápido al tabConfig activo */
  cfg(): TabCfg;
  cfg(tab: TabKey): TabCfg;
  cfg(tab?: TabKey): TabCfg { return this.tabMap[tab ?? this.activeTab()]; }

  switchTab(tab: TabKey) {
    this.activeTab.set(tab);
    this.rows.set([]);
    this.searchDisplay = '';
    this.searchQ.set('');
    this.error.set('');
    this.loadTab();
  }

  private loadTab() {
    this.loading.set(true);
    this.error.set('');
    this.rows.set([]);
    this.tabMap[this.activeTab()].load();
  }

  onLoad(r: any[]) {
    this.rows.set(r);
    this.loading.set(false);
  }

  onErr(e: any) {
    this.loading.set(false);
    this.error.set(e?.error?.message ?? e?.message ?? 'Error al cargar los datos');
  }

  onSearch(val: string) {
    this.searchDisplay = val;
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.searchQ.set(val.toLowerCase()), 180);
  }

  openModal(row?: any) {
    this.modalError.set('');
    if (row) {
      this.editingId.set(row.id);
      this.formData = { ...row, password: '' };
      // Normalizar booleanos para los selects enum-bool
      for (const f of this.cfg().fields) {
        if (f.type === 'enum-bool' && this.formData[f.key] !== undefined) {
          this.formData[f.key] = this.formData[f.key] ? '1' : '0';
        }
      }
    } else {
      this.editingId.set(null);
      this.formData = { tipo: 'formativo' };
    }
    this.modalOpen.set(true);
  }

  closeModal() {
    this.modalOpen.set(false);
    this.editingId.set(null);
    this.formData = {};
  }

  saveRow() {
    const tab   = this.tabMap[this.activeTab()];
    const id    = this.editingId();
    const dto   = { ...this.formData };
    if (id && !dto['password']) delete dto['password'];

    this.saving.set(true);
    this.modalError.set('');

    const obs$ = id ? tab.update!(id, dto) : tab.create!(dto);
    obs$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.toast.success(id ? 'Registro actualizado' : 'Registro creado');
        this.loadTab();
      },
      error: (e: any) => {
        this.saving.set(false);
        this.modalError.set(e?.error?.message ?? e?.message ?? 'Error al guardar');
      },
    });
  }

  deleteRow(row: any) {
    const tab = this.tabMap[this.activeTab()];
    if (!tab.remove) return;
    if (!confirm(`¿Eliminar registro ID ${row.id}?`)) return;
    tab.remove(row.id).subscribe({
      next: () => { this.toast.success('Eliminado'); this.loadTab(); },
      error: (e: any) => this.error.set(e?.error?.message ?? 'Error al eliminar'),
    });
  }

  getEnumOpts(type: string) { return this.enumMap[type] ?? []; }
  getSelectOpts(_opts: string): { id: number; label: string }[] { return []; }

  isActive(v: any) { return ['activo', 'activa', 'pendiente'].includes(String(v ?? '')); }

  truncate(v: any): string {
    if (v === null || v === undefined || v === '') return '—';
    const s = String(v);
    return s.length > 35 ? s.substring(0, 35) + '…' : s;
  }
}
