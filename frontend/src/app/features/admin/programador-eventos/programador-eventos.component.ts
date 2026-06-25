import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { LucideAngularModule } from 'lucide-angular';
import { SearchableSelectComponent, SSOption } from '../../../shared/components/searchable-select.component';
import { ToastService } from '../../../core/services/toast.service';

const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
  formativo:     { bg: '#dbeafe', text: '#1d4ed8' },
  institucional: { bg: '#dcfce7', text: '#166534' },
  evaluacion:    { bg: '#fed7aa', text: '#92400e' },
  festivo:       { bg: '#fee2e2', text: '#991b1b' },
};

@Component({
  selector: 'app-programador-eventos',
  imports: [FormsModule, LucideAngularModule, SearchableSelectComponent],
  template: `
    <div class="page-header">
      <div>
        <h2>Programador de Eventos</h2>
        <p class="text-muted text-sm">Gestiona eventos especiales del calendario académico</p>
      </div>
      <button class="btn btn-blue" (click)="openNew()">
        <lucide-icon name="plus" [size]="16"></lucide-icon>
        Nuevo Evento
      </button>
    </div>

    <!-- Filtros -->
    <div class="card p-4 mt-4">
      <div class="flex items-center gap-3" style="flex-wrap:wrap">
        <div class="form-group" style="min-width:180px">
          <label class="form-label">Buscar evento</label>
          <input class="form-control" [ngModel]="searchQ()" (ngModelChange)="searchQ.set($event)" placeholder="Nombre del evento...">
        </div>
        <div class="form-group" style="min-width:140px">
          <label class="form-label">Tipo</label>
          <app-ss [options]="tipoOpts" placeholder="Todos los tipos"
                  [ngModel]="filterTipo()" (ngModelChange)="filterTipo.set($event)"></app-ss>
        </div>
        <div class="form-group" style="min-width:160px">
          <label class="form-label">Mes</label>
          <app-ss [options]="mesOpts" placeholder="Todos los meses"
                  [ngModel]="filterMes()" (ngModelChange)="onFilterMesChange($event)"></app-ss>
        </div>
      </div>
    </div>

    <!-- Calendario Visual -->
    <div class="calendar-section mt-4">
      <div class="calendar-header">
        <button class="btn btn-icon" (click)="prevMes()">
          <lucide-icon name="chevron-left" [size]="18"></lucide-icon>
        </button>
        <h3 class="calendar-title">{{ mesActualLabel() }}</h3>
        <button class="btn btn-icon" (click)="nextMes()">
          <lucide-icon name="chevron-right" [size]="18"></lucide-icon>
        </button>
        <button class="btn btn-outline ml-auto" (click)="irHoy()">Hoy</button>
      </div>
      <div class="calendar-grid">
        @for (dia of diasSemana; track dia) {
          <div class="cal-day-header">{{ dia }}</div>
        }
        @for (cell of calendarCells(); track cell.date) {
          <div class="cal-cell" [class.other-month]="!cell.isCurrentMonth" [class.today]="cell.isToday"
               (click)="openNewOnDate(cell.date)">
            <span class="cal-day-num">{{ cell.day }}</span>
            @for (ev of cell.events; track ev.id) {
              <div [class]="'cal-event ev-tipo-' + ev.tipo"
                   (click)="$event.stopPropagation(); openEdit(ev)">
                {{ ev.nombre }}
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Lista de Eventos -->
    <div class="card mt-4 table-wrap">
      <div class="flex items-center justify-between p-4" style="border-bottom:1px solid var(--border)">
        <h3>Eventos — <span style="font-weight:400">{{ filteredEventos().length }} registros</span></h3>
      </div>
      <table class="data-table">
        <thead><tr>
          <th>Evento</th><th>Tipo</th><th>Fecha</th><th>Horario</th><th>Lugar</th>
          <th>Fichas invitadas</th><th>Descripción</th><th>Acciones</th>
        </tr></thead>
        <tbody>
          @if (filteredEventos().length === 0) {
            <tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">
              Sin eventos registrados
            </td></tr>
          }
          @for (ev of filteredEventos(); track ev.id) {
          <tr>
            <td>
              <div [class]="'ev-badge ev-tipo-' + ev.tipo">
                <lucide-icon [name]="tipoIcon(ev.tipo)" [size]="13"></lucide-icon>
                <strong>{{ ev.nombre }}</strong>
              </div>
            </td>
            <td><span [class]="'badge tipo-badge-' + ev.tipo">{{ tipoLabel(ev.tipo) }}</span></td>
            <td style="white-space:nowrap">
              {{ formatFecha(ev.fechaInicio) }}
              @if (ev.fechaFin && ev.fechaFin !== ev.fechaInicio) {
                <br><span class="text-xs text-muted">→ {{ formatFecha(ev.fechaFin) }}</span>
              }
            </td>
            <td style="white-space:nowrap;font-size:12px;">
              @if (ev.horaInicio) {
                {{ to12h(ev.horaInicio) }} — {{ to12h(ev.horaFin) }}
              } @else { — }
            </td>
            <td>
              @if (ev.lugar) {
                <span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;">
                  <lucide-icon name="map-pin" [size]="11"></lucide-icon>{{ ev.lugar }}
                </span>
              } @else { <span class="text-muted text-sm">—</span> }
            </td>
            <td>
              <span class="fichas-count-chip">{{ (ev.fichasParticipantes ?? []).length }} ficha{{ (ev.fichasParticipantes ?? []).length !== 1 ? 's' : '' }}</span>
            </td>
            <td><span class="text-sm text-muted">{{ ev.descripcion ?? '—' }}</span></td>
            <td>
              <div class="flex gap-2">
                <button class="btn btn-icon" (click)="openEdit(ev)" title="Editar">
                  <lucide-icon name="pencil" [size]="14"></lucide-icon>
                </button>
                <button class="btn btn-icon" style="color:var(--red)" (click)="remove(ev.id)" title="Eliminar">
                  <lucide-icon name="trash-2" [size]="14"></lucide-icon>
                </button>
              </div>
            </td>
          </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- ═══════════════ MODAL ═══════════════ -->
    @if (showModal()) {
    <div class="modal-overlay" (click)="showModal.set(false)">
    <div class="modal modal-evento" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:10px;">
          <h3>{{ editId() ? 'Editar' : 'Nuevo' }} Evento</h3>
        </div>
        <button class="btn-icon" (click)="showModal.set(false)">
          <lucide-icon name="x" [size]="18"></lucide-icon>
        </button>
      </div>

      <!-- Nombre -->
      <div class="form-group mt-2">
        <label class="form-label">Nombre del evento *</label>
        <input class="form-control" [(ngModel)]="form.nombre" placeholder="Ej: Semana Cultural SENA">
      </div>

      <!-- Tipo + Color preview -->
      <div class="grid-2 mt-3">
        <div class="form-group">
          <label class="form-label">Tipo *</label>
          <app-ss [options]="tipoOptsRequired" placeholder="Seleccionar tipo..."
                  [ngModel]="formTipo()" (ngModelChange)="formTipo.set($event)"></app-ss>
        </div>
        <div class="form-group">
          <label class="form-label">Color distintivo</label>
          <div [class]="'color-preview' + (formTipo() ? ' ev-tipo-' + formTipo() : '')">
            @if (formTipo(); as tipo) {
              <lucide-icon [name]="tipoIcon(tipo)" [size]="15"></lucide-icon>
              <strong>{{ tipoLabel(tipo) }}</strong>
              <span style="margin-left:auto;font-size:10px;opacity:.7">Asignado automáticamente</span>
            } @else {
              <span style="color:var(--text-muted);font-size:12px;">Selecciona un tipo para ver el color</span>
            }
          </div>
        </div>
      </div>

      <!-- Fechas -->
      <div class="grid-2 mt-3">
        <div class="form-group">
          <label class="form-label">Fecha inicio *</label>
          <input class="form-control" type="date" [(ngModel)]="form.fechaInicio">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha fin *</label>
          <input class="form-control" type="date" [(ngModel)]="form.fechaFin"
                 [min]="form.fechaInicio">
        </div>
      </div>

      <!-- Horas -->
      <div class="grid-2 mt-3">
        <div class="form-group">
          <label class="form-label">Hora inicio *</label>
          <input class="form-control" type="time"
                 [ngModel]="formHoraInicio()"
                 (ngModelChange)="formHoraInicio.set($event)">
        </div>
        <div class="form-group">
          <label class="form-label">Hora fin *</label>
          <input class="form-control" type="time"
                 [ngModel]="formHoraFin()"
                 (ngModelChange)="formHoraFin.set($event)">
        </div>
      </div>

      <!-- Lugar: tipo + ubicacion específica -->
      <div class="form-group mt-3">
        <label class="form-label">Tipo de lugar *</label>
        <app-ss [options]="lugarTipoOpts" placeholder="Sin lugar específico"
                [ngModel]="formLugarTipo()" (ngModelChange)="onLugarTipoChange($event)"></app-ss>
      </div>
      @if (formLugarTipo() && formLugarTipo() !== 'ambiente') {
        <div class="form-group mt-2">
          <label class="form-label">Ubicación específica</label>
          @if (cargandoUbicaciones()) {
            <p style="font-size:12px;color:var(--text-muted);padding:4px 0;">Cargando...</p>
          } @else if (ubicacionesPorTipo().length === 0) {
            <p style="font-size:12px;color:var(--text-muted);padding:4px 0;">
              No hay ubicaciones de este tipo registradas. Agrégalas en Formativo → Ubicaciones.
            </p>
          } @else {
            <app-ss [options]="ubicacionOpts()"
                    placeholder="Seleccionar ubicación..."
                    [ngModel]="formUbicacionId()"
                    (ngModelChange)="formUbicacionId.set($event || null)"></app-ss>
          }
        </div>
      }

      <!-- Descripción -->
      <div class="form-group mt-3">
        <label class="form-label">Descripción</label>
        <textarea class="form-control" [(ngModel)]="form.descripcion" rows="2"
                  placeholder="Descripción opcional del evento..."></textarea>
      </div>

      <!-- ── Selector de Fichas ── -->
      <div class="fichas-section mt-4">
        <div class="fichas-section-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <lucide-icon name="users" [size]="14"></lucide-icon>
            <strong>Fichas invitadas</strong>
            @if (fichasSeleccionadas().size > 0) {
              <span class="fichas-count-chip">{{ fichasSeleccionadas().size }} seleccionada{{ fichasSeleccionadas().size !== 1 ? 's' : '' }}</span>
            }
          </div>
          @if (formHoraInicio() && formHoraFin()) {
            <span class="text-xs text-muted">
              Solo fichas con horarios en {{ to12h(formHoraInicio()) }} — {{ to12h(formHoraFin()) }}
            </span>
          }
        </div>

        @if (!formHoraInicio() || !formHoraFin()) {
          <div class="fichas-hint">
            <lucide-icon name="info" [size]="14"></lucide-icon>
            Completa el rango de horas para ver las fichas disponibles en esa franja
          </div>
        } @else if (fichasEnRango().length === 0) {
          <div class="fichas-hint fichas-hint-warn">
            <lucide-icon name="alert-triangle" [size]="14"></lucide-icon>
            No hay fichas con horarios en la franja {{ to12h(formHoraInicio()) }} — {{ to12h(formHoraFin()) }}
          </div>
        } @else {
          <!-- Filtro por área -->
          <div class="ficha-filter-row mt-2">
            <div style="min-width:180px; max-width:220px;">
              <app-ss [options]="areasOpts()" placeholder="Todas las áreas"
                      [ngModel]="filtroArea()" (ngModelChange)="filtroArea.set($event)"></app-ss>
            </div>
            <button class="btn btn-outline btn-sm" style="font-size:11px;" (click)="seleccionarTodas()">
              Todas
            </button>
            <button class="btn btn-outline btn-sm" style="font-size:11px;" (click)="deseleccionarTodas()">
              Ninguna
            </button>
          </div>

          <!-- Lista de fichas con checkboxes -->
          <div class="ficha-check-list mt-2">
            @for (f of fichasEnRangoFiltradas(); track f.id) {
              <label class="ficha-check-row" [class.selected]="fichasSeleccionadas().has('' + f.id)">
                <input type="checkbox"
                       [checked]="fichasSeleccionadas().has('' + f.id)"
                       (change)="toggleFicha('' + f.id)">
                <div class="ficha-check-info">
                  <span class="ficha-code">{{ f.codigo }}</span>
                  <span class="ficha-prog">{{ f.programa }}</span>
                  @if (f.area) {
                    <span class="ficha-area-tag">{{ f.area }}</span>
                  }
                </div>
              </label>
            }
            @if (fichasEnRangoFiltradas().length === 0 && filtroArea()) {
              <p class="text-xs text-muted" style="padding:8px;">No hay fichas en el área "{{ filtroArea() }}" para este rango horario</p>
            }
          </div>
        }
      </div>

      @if (formError()) { <div class="error-msg mt-3">{{ formError() }}</div> }
      <div class="btn-row mt-4">
        <button class="btn btn-outline" (click)="showModal.set(false)">Cancelar</button>
        <button class="btn btn-blue" (click)="save()" [disabled]="saving()">
          {{ saving() ? 'Guardando...' : (editId() ? 'Guardar Cambios' : 'Crear Evento') }}
        </button>
      </div>
    </div>
    </div>
    }
  `,
  styles: [`
    .page-header { display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px }
    .page-header h2 { font-size:1.4rem;color:var(--text) }

    /* ── Calendar ── */
    .calendar-section {
      background: var(--surface); border-radius: 12px;
      border: 1px solid var(--border); overflow: hidden;
    }
    .calendar-header {
      display: flex; align-items: center; gap: 12px;
      padding: 16px 20px; border-bottom: 1px solid var(--border);
    }
    .calendar-title { font-size: 1.1rem; font-weight: 700; color: var(--text); flex: 1; text-align: center; }
    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
    .cal-day-header {
      text-align: center; padding: 10px 4px; font-size: 12px;
      font-weight: 700; color: var(--text-muted);
      background: var(--surface2); border-bottom: 1px solid var(--border);
    }
    .cal-cell {
      min-height: 90px; padding: 6px; border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border); cursor: pointer;
      transition: background .15s; position: relative;
    }
    .cal-cell:hover { background: var(--surface2); }
    .cal-cell.other-month { opacity: .4; }
    .cal-cell.today { background: #eff6ff; }
    .cal-cell.today .cal-day-num {
      background: var(--navy); color: #fff; border-radius: 50%;
      width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
    }
    .cal-day-num { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
    .cal-event {
      font-size: 10px; font-weight: 600; padding: 2px 5px;
      border-radius: 4px; margin-bottom: 2px; cursor: pointer;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      transition: opacity .15s;
    }
    .cal-event:hover { opacity: .8; }

    /* ── Event type colors ── */
    .ev-tipo-formativo     { background: #dbeafe; color: #1d4ed8; }
    .ev-tipo-institucional { background: #dcfce7; color: #166534; }
    .ev-tipo-evaluacion    { background: #fed7aa; color: #92400e; }
    .ev-tipo-festivo       { background: #fee2e2; color: #991b1b; }

    .tipo-badge-formativo     { background: #dbeafe; color: #1d4ed8; }
    .tipo-badge-institucional { background: #dcfce7; color: #166534; }
    .tipo-badge-evaluacion    { background: #fed7aa; color: #92400e; }
    .tipo-badge-festivo       { background: #fee2e2; color: #991b1b; }

    .ev-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 8px; border-radius: 6px; font-size: 13px;
    }

    /* ── Modal overrides ── */
    .modal-evento { max-width: 620px; width: 95vw; max-height: 90vh; overflow-y: auto; }

    /* ── Date badge in header ── */
    .ev-date-badge {
      display: inline-flex; align-items: center; gap: 5px;
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 6px; padding: 3px 9px; font-size: 12px;
      color: var(--text-muted); font-weight: 600;
    }

    /* ── Color preview ── */
    .color-preview {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 12px; border-radius: 8px;
      border: 1.5px solid var(--border);
      min-height: 40px; font-size: 13px; font-weight: 600;
      transition: background .2s, color .2s, border-color .2s;
    }

    /* ── Fichas section ── */
    .fichas-section {
      border: 1.5px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    .fichas-section-header {
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;
      padding: 10px 14px; background: var(--surface2);
      border-bottom: 1px solid var(--border);
    }
    .fichas-hint {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 14px; font-size: 13px; color: var(--text-muted);
    }
    .fichas-hint-warn { color: #d97706; background: #fffbeb; }
    .ficha-filter-row {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; flex-wrap: wrap;
    }
    .ficha-check-list {
      display: flex; flex-direction: column; gap: 0;
      max-height: 220px; overflow-y: auto;
      padding: 4px 0;
    }
    .ficha-check-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 14px; cursor: pointer; transition: background .1s;
      border-bottom: 1px solid var(--border);
    }
    .ficha-check-row:last-child { border-bottom: none; }
    .ficha-check-row:hover { background: var(--surface2); }
    .ficha-check-row.selected { background: #eff6ff; }
    .ficha-check-row input[type="checkbox"] { flex-shrink: 0; width: 15px; height: 15px; cursor: pointer; }
    .ficha-check-info {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0;
    }
    .ficha-code {
      font-weight: 700; font-size: 12px; color: var(--text); white-space: nowrap;
    }
    .ficha-prog {
      font-size: 12px; color: var(--text-muted); white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; max-width: 200px;
    }
    .ficha-area-tag {
      font-size: 10px; font-weight: 700;
      background: #ede9fe; color: #6d28d9;
      border-radius: 4px; padding: 1px 6px; white-space: nowrap;
    }
    .fichas-count-chip {
      font-size: 11px; font-weight: 700;
      background: #dbeafe; color: #1d4ed8;
      border-radius: 20px; padding: 2px 8px;
    }

    .error-msg { background:#fee2e2;color:#991b1b;border-radius:8px;padding:10px 14px;font-size:13px; }
    textarea.form-control { resize: vertical; font-family: inherit; }
    .ml-auto { margin-left: auto; }
  `],
})
export class ProgramadorEventosComponent implements OnInit {
  // ── Datos ──────────────────────────────────────────────────────
  eventos   = signal<any[]>([]);
  fichas    = signal<any[]>([]);
  horarios  = signal<any[]>([]);

  // ── Filtros de lista (signals → computed reactivo) ─────────────
  searchQ   = signal('');
  filterTipo = signal('');
  filterMes  = signal('');

  // ── Modal state ────────────────────────────────────────────────
  showModal = signal(false);
  editId    = signal<number | null>(null);
  form: any = {};
  formError = signal('');
  saving    = signal(false);

  // ── Form campos reactivos ──────────────────────────────────────
  formHoraInicio   = signal('');
  formHoraFin      = signal('');
  formTipo         = signal('');
  filtroArea       = signal('');
  fichasSeleccionadas = signal<Set<string>>(new Set());

  // ── Lugar / Ubicación ─────────────────────────────────────────
  readonly LUGAR_TIPOS = [
    { tipo: 'auditorio',       label: 'Auditorio' },
    { tipo: 'biblioteca',      label: 'Biblioteca' },
    { tipo: 'restaurante',     label: 'Restaurante' },
    { tipo: 'centro_deportivo', label: 'Centro Deportivo' },
  ];
  formLugarTipo       = signal('');
  formUbicacionId     = signal<string | null>(null);
  ubicacionesPorTipo  = signal<any[]>([]);
  cargandoUbicaciones = signal(false);

  onLugarTipoChange(tipo: string) {
    this.formLugarTipo.set(tipo);
    this.formUbicacionId.set(null);
    this.ubicacionesPorTipo.set([]);
    // 'ambiente' no necesita cargar ubicaciones (no es una ubicacion registrada)
    if (tipo && tipo !== 'ambiente') {
      this.cargandoUbicaciones.set(true);
      this.api.getUbicaciones().subscribe({
        next: list => {
          this.ubicacionesPorTipo.set(list.filter((u: any) => u.tipo === tipo));
          this.cargandoUbicaciones.set(false);
        },
        error: () => this.cargandoUbicaciones.set(false),
      });
    }
  }

  // ── Calendar state ─────────────────────────────────────────────
  // Signals (no propiedades planas): calendarCells es un computed() y solo
  // se vuelve a evaluar cuando cambia una señal que lee — con propiedades
  // planas, prevMes()/nextMes() nunca disparaban un recálculo del grid.
  viewYear  = signal(new Date().getFullYear());
  viewMonth = signal(new Date().getMonth());

  diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  meses = [
    { val: '01', label: 'Enero' }, { val: '02', label: 'Febrero' },
    { val: '03', label: 'Marzo' }, { val: '04', label: 'Abril' },
    { val: '05', label: 'Mayo' }, { val: '06', label: 'Junio' },
    { val: '07', label: 'Julio' }, { val: '08', label: 'Agosto' },
    { val: '09', label: 'Septiembre' }, { val: '10', label: 'Octubre' },
    { val: '11', label: 'Noviembre' }, { val: '12', label: 'Diciembre' },
  ];

  // ── Calendario ─────────────────────────────────────────────────
  calendarCells = computed(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    // Usa los eventos YA FILTRADOS (búsqueda/tipo/mes) — antes leía
    // this.eventos() crudo y el calendario ignoraba los filtros.
    const eventosFiltrados = this.filteredEventos();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const cells: any[] = [];

    const prevDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevDays - i);
      cells.push({ date: d, day: d.getDate(), isCurrentMonth: false, isToday: false, events: [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isToday = date.toDateString() === today.toDateString();
      // Usar fecha LOCAL (no toISOString que convierte a UTC y puede desfasar el día)
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = eventosFiltrados.filter(ev => {
        const start = ev.fechaInicio?.split('T')[0] ?? '';
        const end   = (ev.fechaFin ?? ev.fechaInicio)?.split('T')[0] ?? start;
        return dayStr >= start && dayStr <= end;
      });
      cells.push({ date, day: d, isCurrentMonth: true, isToday, events: dayEvents });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      cells.push({ date, day: d, isCurrentMonth: false, isToday: false, events: [] });
    }
    return cells;
  });

  mesActualLabel = computed(() => {
    const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${nombres[this.viewMonth()]} ${this.viewYear()}`;
  });

  filteredEventos = computed(() => {
    let list = this.eventos();
    const q = this.searchQ().toLowerCase();
    const t = this.filterTipo();
    const m = this.filterMes();
    if (q) list = list.filter(e => e.nombre?.toLowerCase().includes(q));
    if (t) list = list.filter(e => e.tipo === t);
    if (m) list = list.filter(e => e.fechaInicio?.slice(5, 7) === m);
    return list;
  });

  // ── Fichas en rango horario ────────────────────────────────────
  fichasEnRango = computed(() => {
    const hI = this.formHoraInicio();
    const hF = this.formHoraFin();
    if (!hI || !hF) return [];

    // UUIDs como strings — NO convertir con +fid (daría NaN)
    const fichaIds = new Set<string>();
    this.horarios().forEach(h => {
      if (!h.horaInicio || !h.horaFin) return;
      // Solapamiento: inicio del horario < fin del evento Y fin del horario > inicio del evento
      if (h.horaInicio < hF && h.horaFin > hI) {
        const fid = h.fichaId ?? h.ficha?.id;
        if (fid) fichaIds.add(String(fid));
      }
    });
    return this.fichas().filter((f: any) => fichaIds.has(String(f.id)));
  });

  areasDisponibles = computed(() => {
    const areas = this.fichasEnRango()
      .map((f: any) => f.area)
      .filter(Boolean);
    return [...new Set(areas)].sort();
  });

  // ── Opciones SearchableSelect ────────────────────────────────────
  readonly tipoOpts: SSOption[] = [
    { value: '', label: 'Todos los tipos' },
    { value: 'formativo',     label: 'Formativo' },
    { value: 'institucional', label: 'Institucional' },
    { value: 'evaluacion',    label: 'Evaluación' },
    { value: 'festivo',       label: 'Festivo / No lectivo' },
  ];
  readonly tipoOptsRequired: SSOption[] = [
    { value: 'formativo',     label: 'Formativo' },
    { value: 'institucional', label: 'Institucional' },
    { value: 'evaluacion',    label: 'Evaluación' },
    { value: 'festivo',       label: 'Festivo / No lectivo' },
  ];
  readonly mesOpts: SSOption[] = [
    { value: '', label: 'Todos los meses' },
    ...[ { val: '01', label: 'Enero' }, { val: '02', label: 'Febrero' }, { val: '03', label: 'Marzo' },
         { val: '04', label: 'Abril' }, { val: '05', label: 'Mayo' }, { val: '06', label: 'Junio' },
         { val: '07', label: 'Julio' }, { val: '08', label: 'Agosto' }, { val: '09', label: 'Septiembre' },
         { val: '10', label: 'Octubre' }, { val: '11', label: 'Noviembre' }, { val: '12', label: 'Diciembre' },
    ].map(m => ({ value: m.val, label: m.label })),
  ];
  readonly lugarTipoOpts: SSOption[] = [
    { value: '', label: 'Sin lugar específico' },
    { value: 'ambiente', label: 'Ambiente (ficha)' },
    ...[ { tipo: 'auditorio', label: 'Auditorio' }, { tipo: 'biblioteca', label: 'Biblioteca' },
         { tipo: 'restaurante', label: 'Restaurante' }, { tipo: 'centro_deportivo', label: 'Centro Deportivo' },
    ].map(t => ({ value: t.tipo, label: t.label })),
  ];
  ubicacionOpts = computed<SSOption[]>(() =>
    this.ubicacionesPorTipo().map(u => ({
      value: u.id,
      label: u.nombre + (u.area_nombre ? ` — ${u.area_nombre}` : ''),
    }))
  );
  areasOpts = computed<SSOption[]>(() => [
    { value: '', label: 'Todas las áreas' },
    ...this.areasDisponibles().map((a: string) => ({ value: a, label: a })),
  ]);

  fichasEnRangoFiltradas = computed(() => {
    const area = this.filtroArea();
    if (!area) return this.fichasEnRango();
    return this.fichasEnRango().filter((f: any) => f.area === area);
  });

  private toast = inject(ToastService);

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.getEventos().subscribe(e => this.eventos.set(e ?? []));
    this.api.getFichas().subscribe(f => this.fichas.set(f ?? []));
    this.api.getHorarios().subscribe(h => this.horarios.set(h ?? []));
  }

  prevMes() {
    if (this.viewMonth() === 0) { this.viewMonth.set(11); this.viewYear.update(y => y - 1); }
    else this.viewMonth.update(m => m - 1);
  }
  nextMes() {
    if (this.viewMonth() === 11) { this.viewMonth.set(0); this.viewYear.update(y => y + 1); }
    else this.viewMonth.update(m => m + 1);
  }
  irHoy() { this.viewYear.set(new Date().getFullYear()); this.viewMonth.set(new Date().getMonth()); }

  /** Al elegir un mes en el filtro, el calendario salta a ese mes (mismo año visible) */
  onFilterMesChange(val: string) {
    this.filterMes.set(val);
    if (val) this.viewMonth.set(Number(val) - 1);
  }

  tipoLabel(t: string) {
    return ({ formativo: 'Formativo', institucional: 'Institucional', evaluacion: 'Evaluación', festivo: 'Festivo/No lectivo' } as any)[t] ?? t;
  }
  tipoIcon(t: string) {
    return ({ formativo: 'book-open', institucional: 'building', evaluacion: 'clipboard-check', festivo: 'umbrella' } as any)[t] ?? 'calendar';
  }
  /** Convierte "HH:MM:SS" o "HH:MM" a formato 12h con am/pm */
  to12h(time: string | null | undefined): string {
    if (!time) return '';
    const [hStr, mStr] = time.slice(0, 5).split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ?? '00';
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }

  formatFecha(f: string) {
    if (!f) return '—';
    return new Date(f + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Ficha selector helpers ─────────────────────────────────────
  toggleFicha(id: string) {
    this.fichasSeleccionadas.update(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  seleccionarTodas() {
    const ids = this.fichasEnRangoFiltradas().map((f: any) => String(f.id));
    this.fichasSeleccionadas.update(s => {
      const next = new Set(s);
      ids.forEach(id => next.add(id));
      return next;
    });
  }

  deseleccionarTodas() {
    const ids = new Set(this.fichasEnRangoFiltradas().map((f: any) => String(f.id)));
    this.fichasSeleccionadas.update(s => {
      const next = new Set(s);
      ids.forEach(id => next.delete(id));
      return next;
    });
  }

  // ── Modal open/close ───────────────────────────────────────────
  private resetModal() {
    this.formHoraInicio.set('');
    this.formHoraFin.set('');
    this.formTipo.set('');
    this.filtroArea.set('');
    this.fichasSeleccionadas.set(new Set());
    this.formError.set('');
    this.formLugarTipo.set('');
    this.formUbicacionId.set(null);
    this.ubicacionesPorTipo.set([]);
  }

  openNew() {
    this.editId.set(null);
    this.form = {};
    this.resetModal();
    this.formTipo.set('formativo');
    this.showModal.set(true);
  }

  openNewOnDate(date: Date) {
    const iso = date.toISOString().split('T')[0];
    this.editId.set(null);
    this.form = { fechaInicio: iso, fechaFin: iso };
    this.resetModal();
    this.formTipo.set('formativo');
    this.showModal.set(true);
  }

  openEdit(ev: any) {
    this.editId.set(ev.id);
    this.form = {
      ...ev,
      fechaInicio: ev.fechaInicio?.split('T')[0],
      fechaFin:    ev.fechaFin?.split('T')[0],
    };
    this.formTipo.set(ev.tipo ?? '');
    this.formHoraInicio.set(ev.horaInicio ?? '');
    this.formHoraFin.set(ev.horaFin ?? '');
    this.filtroArea.set('');
    // Restaurar TODAS las fichas guardadas — no filtrar por rangeIds para evitar perder
    // fichas invitadas cuyos horarios hayan cambiado desde la creación del evento
    this.fichasSeleccionadas.set(new Set((ev.fichasParticipantes ?? []).map(String)));
    this.formError.set('');
    // Restaurar tipo/ubicacion del evento existente
    const tipoGuardado = ev.lugar?.toLowerCase().replace(' ', '_') ?? '';
    const tipoMatch = this.LUGAR_TIPOS.find(t => t.tipo === tipoGuardado || t.label.toLowerCase() === ev.lugar?.toLowerCase());
    if (tipoMatch) {
      this.onLugarTipoChange(tipoMatch.tipo);
      if (ev.ubicacionId) this.formUbicacionId.set(ev.ubicacionId);
    } else if (ev.lugar?.toLowerCase() === 'ambiente') {
      this.formLugarTipo.set('ambiente');
    } else {
      this.formLugarTipo.set('');
      this.formUbicacionId.set(null);
    }
    this.showModal.set(true);
  }

  remove(id: number) {
    if (!confirm('¿Eliminar este evento?')) return;
    this.api.deleteEvento(id).subscribe({
      next: () => { this.load(); this.toast.success('Evento eliminado', 'El evento fue eliminado del sistema.'); },
      error: (e) => this.toast.error('Error al eliminar', e?.error?.message ?? 'No se pudo eliminar el evento.'),
    });
  }

  save() {
    const horaInicio = this.formHoraInicio();
    const horaFin    = this.formHoraFin();

    if (!this.form.nombre?.trim()) {
      this.formError.set('El nombre del evento es obligatorio');
      return;
    }
    if (!this.formTipo()) {
      this.formError.set('Selecciona el tipo de evento');
      return;
    }
    if (!this.form.fechaInicio) {
      this.formError.set('Selecciona la fecha de inicio del evento');
      return;
    }
    if (!this.form.fechaFin) {
      this.formError.set('Selecciona la fecha de fin del evento');
      return;
    }
    if (!horaInicio || !horaFin) {
      this.formError.set('Completa la hora de inicio y fin');
      return;
    }
    if (horaFin <= horaInicio) {
      this.formError.set('La hora de fin debe ser mayor que la hora de inicio');
      return;
    }
    if (!this.formLugarTipo()) {
      this.formError.set('Selecciona el tipo de lugar del evento');
      return;
    }

    // Validar conflicto de ubicación: si se seleccionó una ubicación específica,
    // verificar que ningún otro evento la use en fechas/horas que se solapan.
    const ubicId = (this.formLugarTipo() && this.formLugarTipo() !== 'ambiente')
      ? this.formUbicacionId() : null;
    if (ubicId) {
      const myStart = this.form.fechaInicio;
      const myEnd   = this.form.fechaFin ?? myStart;
      const conflict = this.eventos().find(ev => {
        if (this.editId() && ev.id === this.editId()) return false; // ignorar el propio evento al editar
        if (!ev.ubicacionId || ev.ubicacionId !== ubicId) return false;
        // Solapamiento de fechas
        const evStart = ev.fechaInicio?.split('T')[0] ?? '';
        const evEnd   = (ev.fechaFin ?? ev.fechaInicio)?.split('T')[0] ?? evStart;
        if (myStart > evEnd || myEnd < evStart) return false;
        // Solapamiento de horas dentro del período
        if (!ev.horaInicio || !ev.horaFin) return false;
        return ev.horaInicio < horaFin && ev.horaFin > horaInicio;
      });
      if (conflict) {
        this.formError.set(
          `La ubicación ya está ocupada por "${conflict.nombre}" en ese período ` +
          `(${this.formatFecha(conflict.fechaInicio)}, ` +
          `${this.to12h(conflict.horaInicio)} — ${this.to12h(conflict.horaFin)})`
        );
        return;
      }
    }

    this.saving.set(true);
    this.formError.set('');

    // Construir lugar y ubicacionId a partir del tipo seleccionado
    const lugarTipo = this.formLugarTipo();
    const lugarLabel = lugarTipo === 'ambiente' ? 'Ambiente'
      : this.LUGAR_TIPOS.find(t => t.tipo === lugarTipo)?.label ?? '';

    const payload = {
      ...this.form,
      tipo: this.formTipo(),
      horaInicio,
      horaFin,
      fichasParticipantes: Array.from(this.fichasSeleccionadas()),
      lugar: lugarLabel || null,
      ubicacionId: (lugarTipo && lugarTipo !== 'ambiente') ? this.formUbicacionId() : null,
    };

    const obs = this.editId()
      ? this.api.updateEvento(this.editId()!, payload)
      : this.api.createEvento(payload);

    const isEdit = !!this.editId();
    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.load();
        this.toast.success(
          isEdit ? 'Evento actualizado' : 'Evento creado',
          isEdit
            ? 'Los cambios del evento fueron guardados correctamente.'
            : 'El evento fue programado y registrado en el sistema.',
        );
      },
      error: (e) => {
        this.saving.set(false);
        const msg: string = e?.error?.message ?? 'No se pudo guardar el evento. Verifica los datos e intenta de nuevo.';
        this.toast.error('Error al guardar evento', msg);
      },
    });
  }
}
