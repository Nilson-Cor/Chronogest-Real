import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { DIAS_SEMANA, DIAS_LABELS } from '../../../core/models/user.model';
import { LucideAngularModule } from 'lucide-angular';
import { SearchableSelectComponent, SSOption } from '../../../shared/components/searchable-select.component';
import { ToastService } from '../../../core/services/toast.service';

const JORNADAS = ['manana', 'tarde'];
const JORNADA_LABEL: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde' };

@Component({
  selector: 'app-programador-instructor',
  imports: [FormsModule, LucideAngularModule, SearchableSelectComponent],
  template: `
    <div class="page-header">
      <div>
        <h2>Programador de Instructores</h2>
        <p class="text-muted text-sm">Vista de carga y disponibilidad semanal de instructores</p>
      </div>
      <button class="btn btn-blue" (click)="openNuevoHorario()">
        <lucide-icon name="plus" [size]="16"></lucide-icon>
        Asignar Horario
      </button>
    </div>

    <!-- Filtros y búsqueda -->
    <div class="card p-4 mt-4">
      <div class="flex items-center gap-3" style="flex-wrap:wrap">
        <div class="form-group" style="min-width:220px">
          <label class="form-label">Buscar instructor</label>
          <div style="position:relative">
            <lucide-icon name="search" [size]="15" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted)"></lucide-icon>
            <input class="form-control" style="padding-left:32px" [(ngModel)]="searchQ" placeholder="Nombre o apellido...">
          </div>
        </div>
        <div class="form-group" style="min-width:140px">
          <label class="form-label">Jornada</label>
          <app-ss [options]="jornadaFilterOpts" placeholder="Todas" [(ngModel)]="filterJornada"></app-ss>
        </div>
        <div class="form-group" style="min-width:140px">
          <label class="form-label">Ver semana</label>
          <app-ss [options]="liderFilterOpts" placeholder="Todos" [(ngModel)]="filterLider"></app-ss>
        </div>
      </div>
    </div>

    <!-- Matriz por instructor -->
    <div class="inst-matrix mt-4">
      @if (filteredInstructores().length === 0) {
        <div class="card p-8 text-center text-muted">No se encontraron instructores</div>
      }
      @for (inst of filteredInstructores(); track inst.id) {
      <div class="inst-card">
        <!-- Cabecera del instructor -->
        <div class="inst-header">
          <div class="inst-avatar">{{ inst.nombre[0] }}{{ inst.apellido?.[0] ?? '' }}</div>
          <div class="inst-info">
            <div class="inst-name">{{ inst.nombre }} {{ inst.apellido }}</div>
            <div class="inst-meta">
              @if (inst.esLider) {
                <span class="badge-lider">
                  <lucide-icon name="star" [size]="11"></lucide-icon>
                  Líder{{ inst.areaLiderada ? ' · ' + inst.areaLiderada : '' }}
                </span>
              }
              <span class="text-muted text-xs">{{ getHorasSemanales(inst.id) }}h/semana</span>
            </div>
          </div>
          <div class="inst-actions">
            <button class="btn btn-outline btn-sm" (click)="toggleDetalle(inst.id)">
              <lucide-icon [name]="detalleAbierto() === inst.id ? 'chevron-up' : 'chevron-down'" [size]="14"></lucide-icon>
              {{ detalleAbierto() === inst.id ? 'Ocultar' : 'Ver horarios' }}
            </button>
          </div>
        </div>

        <!-- Barra de carga semanal -->
        <div class="carga-bar">
          @for (dia of dias; track dia) {
          <div class="carga-dia" [title]="LABELS[dia]">
            <span class="carga-dia-label">{{ LABELS[dia].slice(0,3) }}</span>
            <div class="carga-slots">
              @for (j of jornadas; track j) {
                <div class="carga-slot"
                     [class.ocupado]="isOcupado(inst.id, dia, j)"
                     [title]="getHorarioInfo(inst.id, dia, j)"
                     [class.jornada-manana]="j === 'manana'"
                     [class.jornada-tarde]="j === 'tarde'">
                  {{ j === 'manana' ? 'M' : 'T' }}
                </div>
              }
            </div>
          </div>
          }
        </div>

        <!-- Detalle de horarios -->
        @if (detalleAbierto() === inst.id) {
        <div class="horario-detalle">
          @if (horariosInst()[inst.id]?.length) {
            <div class="h-detail-grid">
              @for (h of horariosInst()[inst.id]; track h.id) {
              <div class="h-detail-card" [class.inactivo]="!h.activo">
                <div class="hd-top">
                  <span class="hd-dia">{{ LABELS[h.diaSemana] }}</span>
                  <span class="hd-jornada">{{ JORNADA_LABEL[h.jornada] }}</span>
                </div>
                <div class="hd-hora">{{ h.horaInicio?.slice(0,5) }} – {{ h.horaFin?.slice(0,5) }}</div>
                <div class="hd-ficha">
                  <lucide-icon name="layout-dashboard" [size]="11"></lucide-icon>
                  {{ h.ficha?.codigo }} — {{ h.ficha?.programa }}
                </div>
                <div class="hd-amb">
                  <lucide-icon name="building-2" [size]="11"></lucide-icon>
                  {{ h.ambiente?.nombre ?? '—' }}
                </div>
                <div class="hd-actions">
                  <button class="btn btn-icon btn-sm" style="color:var(--red)" (click)="eliminarHorario(h.id)">
                    <lucide-icon name="trash-2" [size]="12"></lucide-icon>
                  </button>
                </div>
                @if (!h.activo) { <span class="h-badge-off">Inactivo</span> }
              </div>
              }
            </div>
          } @else {
            <p class="text-muted text-sm" style="padding:16px">Sin horarios asignados.</p>
          }
        </div>
        }
      </div>
      }
    </div>

    <!-- MODAL Asignar Horario — tabla -->
    @if (showModal()) {
    <div class="modal-overlay">
      <div class="wizard-modal" (click)="$event.stopPropagation()">

        <div class="wiz-header">
          <div>
            <h3 class="wiz-title">Asignar Horario a Instructor</h3>
            <p class="wiz-subtitle">Activa los días y configura cada bloque en la tabla</p>
          </div>
          <button class="btn-icon" (click)="showModal.set(false)">
            <lucide-icon name="x" [size]="20"></lucide-icon>
          </button>
        </div>

        <!-- Jornada + horas -->
        <div class="wiz-top-bar">
          <div class="wiz-top-field" style="min-width:220px; flex:1.2;">
            <label class="form-label">Jornada *</label>
            <app-ss [options]="jornadaOpts" placeholder="Seleccionar jornada..."
                    [(ngModel)]="wForm.jornada" (ngModelChange)="onJornadaChange()"></app-ss>
          </div>
          <div class="wiz-top-field" style="min-width:130px;">
            <label class="form-label">Hora inicio</label>
            <input class="form-control" type="time" [(ngModel)]="wForm.horaInicio">
          </div>
          <div class="wiz-top-field" style="min-width:130px;">
            <label class="form-label">Hora fin</label>
            <input class="form-control" type="time" [(ngModel)]="wForm.horaFin">
          </div>
          <div style="margin-left:auto; align-self:flex-end; padding-bottom:2px;">
            @if (wForm.dias.length > 0) {
              <span class="wiz-sel-count">{{ wForm.dias.length }} día{{ wForm.dias.length !== 1 ? 's' : '' }}</span>
            } @else {
              <span class="wiz-sel-hint">Activa los días en la tabla</span>
            }
          </div>
        </div>

        <!-- Tabla de días -->
        <div class="wiz-table-wrap">
          <table class="wiz-table">
            <thead>
              <tr>
                <th class="wt-th-dia">Día</th>
                <th class="wt-th-area">
                  <span>Área <span class="wt-th-hint">(filtro)</span></span>
                  <label class="wt-apply-all">
                    <input type="checkbox" [checked]="applyAll.area" (change)="onToggleApplyAll('area', $event)">
                    <span>Aplicar a todos</span>
                  </label>
                </th>
                <th class="wt-th-ficha">
                  <span>Ficha</span>
                  <label class="wt-apply-all">
                    <input type="checkbox" [checked]="applyAll.ficha" (change)="onToggleApplyAll('ficha', $event)">
                    <span>Aplicar a todos</span>
                  </label>
                </th>
                <th class="wt-th-inst">
                  <span>Instructor</span>
                  <label class="wt-apply-all">
                    <input type="checkbox" [checked]="applyAll.instructor" (change)="onToggleApplyAll('instructor', $event)">
                    <span>Aplicar a todos</span>
                  </label>
                </th>
                <th class="wt-th-amb">
                  <span>Ambiente</span>
                  <label class="wt-apply-all">
                    <input type="checkbox" [checked]="applyAll.ambiente" (change)="onToggleApplyAll('ambiente', $event)">
                    <span>Aplicar a todos</span>
                  </label>
                </th>
              </tr>
            </thead>
            <tbody>
              @for (d of dias; track d) {
              @let activo = wForm.dias.includes(d);
              <tr class="wt-row" [class.wt-row-on]="activo" [class.wt-row-off]="!activo">
                <td class="wt-td-dia">
                  <label class="wt-day-label" [class.wt-day-on]="activo">
                    <input type="checkbox" class="wt-checkbox" [checked]="activo" (change)="toggleDay(d)">
                    <span class="wt-day-name">{{ LABELS[d] }}</span>
                  </label>
                </td>
                @if (activo) {
                <td class="wt-td">
                  <app-ss [options]="fichaAreasOpts()" placeholder="Todas las áreas"
                          [(ngModel)]="wForm.diasConfig[d].areaFiltro"
                          (ngModelChange)="onAreaChange(d)"></app-ss>
                </td>
                <td class="wt-td">
                  <app-ss [options]="getFichasOpts(d)" placeholder="Seleccionar ficha..."
                          [(ngModel)]="wForm.diasConfig[d].fichaId"
                          (ngModelChange)="onFichaChange(d, $event)"></app-ss>
                </td>
                <td class="wt-td">
                  <app-ss [options]="instructoresOpts()" placeholder="Seleccionar instructor..."
                          [(ngModel)]="wForm.diasConfig[d].instructorId"
                          (ngModelChange)="onInstructorChange(d, $event)"></app-ss>
                </td>
                <td class="wt-td">
                  <app-ss [options]="getAmbientesOpts(d)" placeholder="Seleccionar ambiente..."
                          [(ngModel)]="wForm.diasConfig[d].ambienteId"
                          (ngModelChange)="onAmbienteChange(d, $event)"></app-ss>
                </td>
                } @else {
                <td class="wt-td-off" colspan="4">
                  <span class="wt-off-hint">Activa el día para configurar</span>
                </td>
                }
              </tr>
              }
            </tbody>
          </table>
        </div>

        @if (formError()) { <div class="error-msg" style="margin:12px 24px 0;">{{ formError() }}</div> }
        <div class="wiz-footer">
          <button class="btn btn-outline" (click)="showModal.set(false)">Cancelar</button>
          <button class="btn btn-blue" (click)="saveHorario()" [disabled]="saving() || !esValido()">
            @if (saving()) { <lucide-icon name="loader" [size]="14" class="spin"></lucide-icon> Guardando... }
            @else { <lucide-icon name="save" [size]="14"></lucide-icon> Asignar Horario }
          </button>
        </div>
      </div>
    </div>
    }
  `,
  styles: [`
    .page-header { display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px }
    .page-header h2 { font-size:1.4rem;color:var(--text) }

    /* ── Modal Wizard (tabla) ── */
    .wizard-modal {
      background: var(--surface); border-radius: 16px;
      width: 95vw; max-width: 1020px; max-height: 92vh; overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,.25);
      display: flex; flex-direction: column;
    }
    .wiz-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 24px 28px 16px; border-bottom: 1px solid var(--border); gap: 12px; flex-shrink: 0;
    }
    .wiz-title { font-size: 1.25rem; font-weight: 800; color: var(--text); margin-bottom: 2px; }
    .wiz-subtitle { font-size: 12px; color: var(--text-muted); }
    .wiz-top-bar {
      display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap;
      padding: 20px 28px; border-bottom: 1px solid var(--border);
      background: var(--surface2); flex-shrink: 0;
    }
    .wiz-top-field { display: flex; flex-direction: column; gap: 5px; }
    .wiz-sel-count {
      display: inline-flex; align-items: center; gap: 5px;
      background: var(--blue); color: #fff;
      border-radius: 20px; padding: 3px 12px; font-size: 12px; font-weight: 700;
    }
    .wiz-sel-hint { font-size: 12px; color: var(--text-muted); font-style: italic; }
    .wiz-table-wrap { flex: 1; overflow-y: auto; overflow-x: auto; }
    .wiz-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .wiz-table thead tr { background: var(--navy); position: sticky; top: 0; z-index: 2; }
    .wiz-table th {
      padding: 11px 14px; font-size: 11px; font-weight: 800; color: #fff;
      text-transform: uppercase; letter-spacing: .06em; text-align: left; white-space: nowrap;
    }
    .wt-th-dia { width: 100px; }
    .wt-th-area { width: 160px; }
    .wt-th-ficha, .wt-th-inst, .wt-th-amb { width: auto; }
    .wt-th-hint { font-weight: 400; opacity: .7; text-transform: none; }

    /* Checkbox "Aplicar a todos" en cabecera */
    .wt-th-area, .wt-th-ficha, .wt-th-inst, .wt-th-amb {
      white-space: normal; vertical-align: top;
    }
    .wt-apply-all {
      display: flex; align-items: center; gap: 5px;
      margin-top: 6px; cursor: pointer;
      font-size: 10px; font-weight: 500;
      text-transform: none; letter-spacing: 0;
      opacity: .8; color: #c7d8f5; transition: opacity .15s;
    }
    .wt-apply-all:hover { opacity: 1; color: #fff; }
    .wt-apply-all input[type="checkbox"] {
      width: 13px; height: 13px; cursor: pointer;
      accent-color: #60a5fa; flex-shrink: 0;
    }
    .wt-apply-all input[type="checkbox"]:checked + span {
      color: #fff; font-weight: 700;
    }
    .wt-row { transition: background .12s; }
    .wt-row-on  { background: var(--surface); }
    .wt-row-off { background: var(--surface2); }
    .wt-row + .wt-row { border-top: 1px solid var(--border); }
    .wt-td-dia {
      padding: 12px 14px; vertical-align: middle;
      border-right: 2px solid var(--border);
    }
    .wt-day-label { display: flex; align-items: center; gap: 9px; cursor: pointer; user-select: none; }
    .wt-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: var(--blue); flex-shrink: 0; }
    .wt-day-name { font-size: 13px; font-weight: 700; color: var(--text-muted); text-transform: capitalize; }
    .wt-day-on .wt-day-name { color: var(--blue); }
    .wt-td { padding: 8px 10px; vertical-align: middle; }
    .wt-td-off { padding: 12px 14px; vertical-align: middle; }
    .wt-off-hint { font-size: 12px; color: var(--text-muted); font-style: italic; }
    .wiz-footer {
      display: flex; align-items: center; justify-content: flex-end; gap: 12px;
      padding: 16px 28px; border-top: 1px solid var(--border);
      background: var(--surface2); flex-shrink: 0;
    }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Instructor matrix */
    .inst-matrix { display: flex; flex-direction: column; gap: 16px; }
    .inst-card {
      background: var(--surface); border-radius: 12px;
      border: 1px solid var(--border); overflow: hidden;
    }
    .inst-header {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 20px; border-bottom: 1px solid var(--border);
    }
    .inst-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--navy); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 700; flex-shrink: 0;
    }
    .inst-info { flex: 1; }
    .inst-name { font-size: 14px; font-weight: 700; color: var(--text); }
    .inst-meta { display: flex; align-items: center; gap: 10px; margin-top: 2px; }
    .badge-lider {
      display: inline-flex; align-items: center; gap: 4px;
      background: #fef3c7; color: #92400e;
      border-radius: 12px; padding: 2px 8px; font-size: 11px; font-weight: 700;
    }
    .inst-actions { margin-left: auto; }

    /* Carga bar */
    .carga-bar {
      display: flex; gap: 4px; padding: 12px 20px;
      background: var(--surface2); border-bottom: 1px solid var(--border);
    }
    .carga-dia { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .carga-dia-label { font-size: 10px; font-weight: 700; color: var(--text-muted); }
    .carga-slots { display: flex; gap: 2px; }
    .carga-slot {
      width: 20px; height: 20px; border-radius: 4px;
      background: var(--gray-100); border: 1.5px solid var(--border);
      font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center;
      color: var(--text-muted); cursor: default; transition: all .15s;
    }
    .carga-slot.ocupado.jornada-manana { background: #bfdbfe; border-color: #3b82f6; color: #1d4ed8; }
    .carga-slot.ocupado.jornada-tarde { background: #bbf7d0; border-color: #22c55e; color: #166534; }

    /* Horario Detalle */
    .horario-detalle { padding: 16px 20px; background: var(--bg); }
    .h-detail-grid { display: flex; flex-wrap: wrap; gap: 10px; }
    .h-detail-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
      padding: 10px 14px; min-width: 180px; position: relative;
      display: flex; flex-direction: column; gap: 4px;
    }
    .h-detail-card.inactivo { opacity: .55; }
    .hd-top { display: flex; align-items: center; justify-content: space-between; }
    .hd-dia { font-size: 13px; font-weight: 700; color: var(--navy); }
    .hd-jornada { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; }
    .hd-hora { font-size: 15px; font-weight: 800; color: var(--text); }
    .hd-ficha, .hd-amb {
      display: flex; align-items: center; gap: 4px;
      font-size: 11px; color: var(--text-muted);
    }
    .hd-actions { position: absolute; top: 8px; right: 8px; }
    .h-badge-off {
      display: inline-block; background: #fee2e2; color: #991b1b;
      font-size: 10px; padding: 1px 6px; border-radius: 4px; font-weight: 600;
    }

    /* Modal Ambiente selector */
    .amb-options { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); gap: 10px; margin-top: 8px; }
    .amb-card {
      border: 2px solid var(--border); border-radius: 10px; padding: 12px;
      cursor: pointer; display: flex; align-items: center; gap: 10px;
      transition: all .15s;
    }
    .amb-card:hover:not(.ocupado) { border-color: var(--blue); background: #eff6ff; }
    .amb-card.selected { border-color: var(--blue); background: #eff6ff; }
    .amb-card.ocupado { opacity: .6; cursor: not-allowed; background: var(--surface2); }
    .amb-details { flex: 1; display: flex; flex-direction: column; }
    .amb-nombre { font-weight: 600; font-size: 13px; }
    .badge-ocupado {
      font-size: 10px; background: #fee2e2; color: #991b1b;
      border-radius: 4px; padding: 2px 6px; font-weight: 700;
    }

    .days-selector { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .day-check {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 12px; border-radius: 8px; border: 1.5px solid var(--border);
      cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text-muted); transition: all .15s;
    }
    .day-check.active { border-color: var(--blue); background: #eff6ff; color: var(--blue); }
    .day-check input { display: none; }
    .animate-fade-in { animation: fadeIn .3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    .error-msg { background:#fee2e2;color:#991b1b;border-radius:8px;padding:10px 14px;font-size:13px; }
  `],
})
export class ProgramadorInstructorComponent implements OnInit {
  readonly LABELS = DIAS_LABELS;
  readonly JORNADA_LABEL = JORNADA_LABEL;
  dias = [...DIAS_SEMANA] as string[];
  jornadas = JORNADAS;

  instructores = signal<any[]>([]);
  horarios = signal<any[]>([]);
  fichas = signal<any[]>([]);
  ambientes = signal<any[]>([]);

  searchQ = '';
  filterJornada = '';
  filterLider = '';
  detalleAbierto = signal<number | null>(null);
  showModal = signal(false);
  saving = signal(false);
  formError = signal('');

  /** Controla qué columnas del wizard se "aplican a todos los días" */
  applyAll = { area: false, ficha: false, instructor: false, ambiente: false };

  wForm: {
    jornada: string;
    horaInicio: string;
    horaFin: string;
    dias: string[];
    diasConfig: Record<string, { areaFiltro: string; fichaId: string | number; ambienteId: string | number; instructorId: string | number }>;
  } = this.resetWForm();

  horariosInst = computed<Record<number, any[]>>(() => {
    const map: Record<number, any[]> = {};
    this.horarios().forEach(h => {
      const id = h.instructor?.id ?? h.instructorId;
      if (!map[id]) map[id] = [];
      map[id].push(h);
    });
    return map;
  });

  filteredInstructores = computed(() => {
    let list = this.instructores();
    if (this.searchQ) list = list.filter(i =>
      `${i.nombre} ${i.apellido}`.toLowerCase().includes(this.searchQ.toLowerCase())
    );
    if (this.filterLider === 'lider') list = list.filter(i => i.esLider);
    if (this.filterLider === 'regular') list = list.filter(i => !i.esLider);
    return list;
  });

  private toast = inject(ToastService);

  constructor(private api: ApiService) {}

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.api.getInstructores().subscribe({
      next: i => this.instructores.set(i ?? []),
      error: () => this.toast.error('Sin datos', 'No se pudieron cargar los instructores. Verifica tu sesión.'),
    });
    this.api.getHorarios().subscribe({ next: h => this.horarios.set(h ?? []), error: () => {} });
    this.api.getFichas().subscribe({ next: f => this.fichas.set(f ?? []), error: () => {} });
    this.api.getAmbientes().subscribe({
      next: a => this.ambientes.set(a ?? []),
      error: () => this.toast.error('Sin datos', 'No se pudieron cargar los ambientes. Verifica tu sesión.'),
    });
  }

  getHorasSemanales(instructorId: number): number {
    const hs = this.horariosInst()[instructorId] ?? [];
    return hs.reduce((acc: number, h: any) => {
      const [sh, sm] = (h.horaInicio ?? '00:00').split(':').map(Number);
      const [eh, em] = (h.horaFin ?? '00:00').split(':').map(Number);
      return acc + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    }, 0);
  }

  isOcupado(instructorId: number, dia: string, jornada: string): boolean {
    return (this.horariosInst()[instructorId] ?? []).some(
      h => h.diaSemana === dia && h.jornada === jornada
    );
  }

  getHorarioInfo(instructorId: number, dia: string, jornada: string): string {
    const h = (this.horariosInst()[instructorId] ?? []).find(
      x => x.diaSemana === dia && x.jornada === jornada
    );
    if (!h) return 'Disponible';
    return `${h.horaInicio?.slice(0,5)} – ${h.horaFin?.slice(0,5)} · Ficha ${h.ficha?.codigo ?? h.fichaId}`;
  }

  toggleDetalle(id: number) {
    this.detalleAbierto.set(this.detalleAbierto() === id ? null : id);
  }

  eliminarHorario(id: number) {
    if (!confirm('¿Eliminar este horario?')) return;
    this.api.deleteHorario(id).subscribe(() => this.loadAll());
  }

  openNuevoHorario() {
    this.wForm = this.resetWForm();
    this.applyAll = { area: false, ficha: false, instructor: false, ambiente: false };
    this.formError.set('');
    this.showModal.set(true);
  }

  resetWForm() {
    const diasConfig: Record<string, { areaFiltro: string; fichaId: string | number; ambienteId: string | number; instructorId: string | number }> = {};
    this.dias.forEach(d => {
      diasConfig[d] = { areaFiltro: '', fichaId: '', ambienteId: '', instructorId: '' };
    });
    return {
      jornada: '',
      horaInicio: '',
      horaFin: '',
      dias: [] as string[],
      diasConfig,
    };
  }

  onJornadaChange() {
    if (this.wForm.jornada === 'manana') { this.wForm.horaInicio = '07:00'; this.wForm.horaFin = '12:00'; }
    if (this.wForm.jornada === 'tarde') { this.wForm.horaInicio = '13:00'; this.wForm.horaFin = '17:00'; }
  }

  toggleDay(d: string) {
    const idx = this.wForm.dias.indexOf(d);
    if (idx > -1) {
      this.wForm.dias.splice(idx, 1);
    } else {
      this.wForm.dias.push(d);
      if (!this.wForm.diasConfig[d]) {
        this.wForm.diasConfig[d] = { areaFiltro: '', fichaId: '', ambienteId: '', instructorId: '' };
      }
      // Auto-rellenar desde otro día activo si "Aplicar a todos" está activado
      const refDay = this.wForm.dias.find(dd => dd !== d);
      if (refDay) {
        const refCfg = this.wForm.diasConfig[refDay];
        const dCfg   = this.wForm.diasConfig[d];
        if (this.applyAll.area)       { dCfg.areaFiltro   = refCfg.areaFiltro; }
        if (this.applyAll.ficha)      { dCfg.fichaId       = refCfg.fichaId; }
        if (this.applyAll.instructor) { dCfg.instructorId  = refCfg.instructorId; }
        if (this.applyAll.ambiente)   { dCfg.ambienteId    = refCfg.ambienteId; }
      }
    }
  }

  // ── Opciones para SearchableSelect ─────────────────────────────
  readonly jornadaOpts: SSOption[] = [
    { value: 'manana', label: 'Mañana (07:00–12:00)' },
    { value: 'tarde',  label: 'Tarde (13:00–17:00)' },
    { value: 'noche',  label: 'Noche (18:00–20:00)' },
  ];

  readonly jornadaFilterOpts: SSOption[] = [
    { value: '', label: 'Todas' },
    { value: 'manana', label: 'Mañana' },
    { value: 'tarde', label: 'Tarde' },
    { value: 'noche', label: 'Noche' }
  ];

  readonly liderFilterOpts: SSOption[] = [
    { value: '', label: 'Todos' },
    { value: 'lider', label: 'Solo Líderes' },
    { value: 'regular', label: 'Sin rol especial' }
  ];

  fichaAreasOpts = computed<SSOption[]>(() => [
    { value: '', label: 'Todas las áreas' },
    ...this.fichaAreas().map(a => ({ value: a, label: a })),
  ]);

  instructoresOpts = computed<SSOption[]>(() =>
    this.instructores().map(i => ({
      value: i.id,
      label: `${i.nombre} ${i.apellido}${i.esLider ? ' ⭐' : ''}`,
    }))
  );

  getFichasOpts(dia: string): SSOption[] {
    return this.getFichasFiltradas(dia).map(f => ({
      value: f.id,
      label: `${f.codigo} — ${f.programa}`,
    }));
  }

  getAmbientesOpts(dia: string): SSOption[] {
    return this.getAmbientesFiltrados(dia).map(a => ({
      value: a.id,
      label: a.nombre,
      disabled: this.isAmbOcupado(a.id, dia),
    }));
  }

  // ── Filtro de fichas por área en el wizard ─────────────────────
  fichaAreas = computed(() =>
    [...new Set(this.fichas().map((f: any) => f.area).filter(Boolean))].sort() as string[]
  );

  getFichasFiltradas(dia: string): any[] {
    const cfg = this.wForm.diasConfig[dia];
    if (!cfg?.areaFiltro) return this.fichas();
    return this.fichas().filter((f: any) => f.area === cfg.areaFiltro);
  }

  getAmbientesFiltrados(dia: string): any[] {
    const cfg = this.wForm.diasConfig[dia];
    if (!cfg?.areaFiltro) return this.ambientes();
    return this.ambientes().filter((a: any) => a.area_nombre === cfg.areaFiltro);
  }

  onAreaChange(dia: string) {
    const cfg = this.wForm.diasConfig[dia];
    if (cfg) {
      cfg.fichaId    = '';
      cfg.ambienteId = '';
    }
    if (this.applyAll.area) {
      const val = cfg?.areaFiltro ?? '';
      this.wForm.dias.forEach(d => {
        if (d !== dia) {
          this.wForm.diasConfig[d].areaFiltro  = val;
          this.wForm.diasConfig[d].fichaId      = '';
          this.wForm.diasConfig[d].ambienteId   = '';
        }
      });
    }
  }

  onFichaChange(dia: string, val: any) {
    if (this.applyAll.ficha) {
      this.wForm.dias.forEach(d => { this.wForm.diasConfig[d].fichaId = val; });
    }
  }

  onInstructorChange(dia: string, val: any) {
    if (this.applyAll.instructor) {
      this.wForm.dias.forEach(d => { this.wForm.diasConfig[d].instructorId = val; });
    }
  }

  onAmbienteChange(dia: string, val: any) {
    if (this.applyAll.ambiente) {
      this.wForm.dias.forEach(d => { this.wForm.diasConfig[d].ambienteId = val; });
    }
  }

  /** Activa/desactiva "Aplicar a todos" y propaga el valor del primer día activo */
  onToggleApplyAll(field: 'area' | 'ficha' | 'instructor' | 'ambiente', event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.applyAll[field] = checked;
    if (!checked || !this.wForm.dias.length) return;

    const firstDay = this.wForm.dias[0];
    const cfg = this.wForm.diasConfig[firstDay];
    if (!cfg) return;

    switch (field) {
      case 'area': {
        const val = cfg.areaFiltro;
        this.wForm.dias.forEach(d => {
          this.wForm.diasConfig[d].areaFiltro  = val;
          this.wForm.diasConfig[d].fichaId      = '';
          this.wForm.diasConfig[d].ambienteId   = '';
        });
        break;
      }
      case 'ficha': {
        const val = cfg.fichaId;
        if (!val) break;
        this.wForm.dias.forEach(d => { this.wForm.diasConfig[d].fichaId = val; });
        break;
      }
      case 'instructor': {
        const val = cfg.instructorId;
        if (!val) break;
        this.wForm.dias.forEach(d => { this.wForm.diasConfig[d].instructorId = val; });
        break;
      }
      case 'ambiente': {
        const val = cfg.ambienteId;
        if (!val) break;
        this.wForm.dias.forEach(d => { this.wForm.diasConfig[d].ambienteId = val; });
        break;
      }
    }
  }

  isAmbOcupado(ambId: number, dia: string): boolean {
    if (!this.wForm.jornada) return false;
    return this.horarios().some(h =>
      (h.ambienteId === ambId || h.ambiente?.id === ambId) &&
      h.diaSemana === dia &&
      h.jornada === this.wForm.jornada
    );
  }

  esValido(): boolean {
    if (!this.wForm.jornada || this.wForm.dias.length === 0) return false;
    for (const d of this.wForm.dias) {
      const config = this.wForm.diasConfig[d];
      if (!config || !config.fichaId || !config.ambienteId || !config.instructorId) return false;
    }
    return true;
  }

  saveHorario() {
    if (!this.esValido()) return;
    this.saving.set(true);
    this.formError.set('');
    const dias = this.wForm.dias.map(d => ({
      diaSemana: d,
      jornada: this.wForm.jornada,
      horaInicio: this.wForm.horaInicio,
      horaFin: this.wForm.horaFin,
      fichaId: +this.wForm.diasConfig[d].fichaId,
      ambienteId: +this.wForm.diasConfig[d].ambienteId,
      instructorId: +this.wForm.diasConfig[d].instructorId,
    }));
    const count = dias.length;
    this.api.createHorario({ dias }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.loadAll();
        this.toast.success(
          'Horarios asignados',
          `Se asignaron ${count} horario${count !== 1 ? 's' : ''} al instructor correctamente.`,
        );
      },
      error: (e) => {
        this.saving.set(false);
        const msg: string = e?.error?.message ?? 'No se pudo guardar el horario. Verifica los datos e intenta de nuevo.';
        this.toast.error('Error al asignar horario', msg);
      },
    });
  }
}
