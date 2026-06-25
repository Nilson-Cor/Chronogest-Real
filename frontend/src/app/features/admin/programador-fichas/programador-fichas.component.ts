import {
  Component, OnInit, signal, computed, inject,
  ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { LucideAngularModule } from 'lucide-angular';
import { SearchableSelectComponent, SSOption } from '../../../shared/components/searchable-select.component';
import { ToastService } from '../../../core/services/toast.service';

// ── Constants ────────────────────────────────────────────────────────────────
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

const DIA_TO_JS: Record<string, number> = {
  domingo:0, lunes:1, martes:2, miercoles:3, 'miércoles':3,
  jueves:4, viernes:5, sabado:6, 'sábado':6,
};

// ── Pure helpers ─────────────────────────────────────────────────────────────
function normDia(d: string): number {
  if (!d) return -1;
  const s = d.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return DIA_TO_JS[d.toLowerCase()] ?? DIA_TO_JS[s] ?? -1;
}

function horaToMin(t: string): number {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function horasSesion(h: any): number {
  if (!h?.horaInicio || !h?.horaFin) return 0;
  return Math.max(0, horaToMin(h.horaFin) - horaToMin(h.horaInicio)) / 60;
}

function horasComp(c: any): number {
  return (c.diasClase?.length ?? 0) * horasSesion(c.horario);
}

interface Resultado {
  texto: string;
  fechaInicio: string | null;
  fechaFin: string | null;
}

/** Normaliza resultados heredados: strings sueltos → objeto sin fechas */
function normalizarResultados(raw: any[] | null | undefined): Resultado[] {
  return (raw ?? []).map((r: any) =>
    typeof r === 'string'
      ? { texto: r, fechaInicio: null, fechaFin: null }
      : { texto: r?.texto ?? '', fechaInicio: r?.fechaInicio ?? null, fechaFin: r?.fechaFin ?? null },
  );
}

type ResultadoEstado = 'sin-fecha' | 'pendiente' | 'en-curso' | 'completado';

/** Estado de un resultado según la fecha actual vs su propio rango */
function estadoResultado(r: Resultado, hoyIso: string): ResultadoEstado {
  if (!r.fechaInicio) return 'sin-fecha';
  const fin = r.fechaFin ?? r.fechaInicio;
  if (hoyIso < r.fechaInicio) return 'pendiente';
  if (hoyIso > fin) return 'completado';
  return 'en-curso';
}

const RESULTADO_ESTADO_INFO: Record<ResultadoEstado, { label: string; bg: string; text: string }> = {
  'sin-fecha':  { label: 'Sin fecha',  bg: '#f3f4f6', text: '#6b7280' },
  'pendiente':  { label: 'Pendiente',  bg: '#fef3c7', text: '#92400e' },
  'en-curso':   { label: 'En curso',   bg: '#dbeafe', text: '#1d4ed8' },
  'completado': { label: 'Completado', bg: '#dcfce7', text: '#166534' },
};

function generarDias(ini: string, fin: string, diaSemana: string): string[] {
  const jd = normDia(diaSemana);
  if (jd < 0 || !ini || !fin || ini > fin) return [];
  const res: string[] = [];
  const cur = new Date(ini + 'T12:00:00');
  const end = new Date(fin + 'T12:00:00');
  while (cur <= end) {
    if (cur.getDay() === jd) res.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return res;
}

type CState = 'completada' | 'en-curso' | 'pendiente' | 'sin-datos';

function compState(c: any): CState {
  const today = new Date().toISOString().slice(0, 10);
  const fin   = c.fechaFin    ? String(c.fechaFin).slice(0, 10)    : null;
  const ini   = c.fechaInicio ? String(c.fechaInicio).slice(0, 10) : null;

  // Las fechas tienen prioridad — una competencia con fechaInicio futura
  // es Pendiente aunque diasClase esté vacío (ej: recién creada)
  if (ini || fin) {
    if (fin && fin < today) return 'completada';
    if (ini && ini <= today) return 'en-curso';
    return 'pendiente'; // ini > today (futuro) o solo fin definido y futuro
  }

  // Sin fechaInicio/fechaFin → inferir del array diasClase
  const dias = (c.diasClase ?? []) as string[];
  if (!dias.length) return 'sin-datos';
  const sorted   = dias.map(d => String(d).slice(0, 10)).sort();
  const firstDay = sorted[0];
  const lastDay  = sorted[sorted.length - 1];
  if (lastDay  < today) return 'completada';
  if (firstDay <= today) return 'en-curso';
  return 'pendiente';
}

// Paleta de colores únicos por competencia (15 tonos distintos y vivos)
const COMP_PALETTE = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
  '#a855f7', // purple
  '#fb7185', // rose
  '#0ea5e9', // sky
  '#d946ef', // fuchsia
];

const SINFO: Record<CState, { label: string; bg: string; text: string; border: string; dot: string }> = {
  'completada': { label: 'Completada', bg: '#dcfce7', text: '#166534', border: '#86efac', dot: '#22c55e' },
  'en-curso':   { label: 'En curso',   bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd', dot: '#3b82f6' },
  'pendiente':  { label: 'Pendiente',  bg: '#fef3c7', text: '#92400e', border: '#fcd34d', dot: '#f59e0b' },
  'sin-datos':  { label: 'Sin fechas', bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', dot: '#ef4444' },
};

function to12h(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Convierte horas decimales a "Xh Ymin" (ej: 4.5 → "4h 30min", 3 → "3h") */
function fmtHoras(h: number): string {
  if (!h || h <= 0) return '0h';
  const totalMin = Math.round(h * 60);
  const hrs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (min === 0) return `${hrs}h`;
  if (hrs === 0) return `${min}min`;
  return `${hrs}h ${min}min`;
}
function cap(s: string)       { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''; }
function fmtDate(iso: string) {
  if (!iso) return '';
  // slice(0,10) handles both "2026-04-10" and "2026-04-10T00:00:00.000Z"
  const clean = String(iso).slice(0, 10);
  const d = new Date(clean + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function toIso(v: any): string { return v ? String(v).slice(0, 10) : ''; }
function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Component ────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-programador-fichas',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, SearchableSelectComponent, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<!-- ── Cabecera ── -->
<div class="page-header">
  <div>
    <h2>Programador de Fichas</h2>
    <p class="text-muted text-sm">Gestiona el calendario de competencias por ficha de formación</p>
  </div>
  @if (selectedFicha() && activeTab() === 'calendar') {
    <button class="btn btn-blue" (click)="openNewComp()">
      <lucide-icon name="plus" [size]="16"></lucide-icon>
      Nueva Competencia
    </button>
  }
</div>

<!-- ── Filtros cascading ── -->
<div class="card p-4 mt-4">
  <div class="flex items-center gap-3" style="flex-wrap:wrap">
    <div class="form-group" style="min-width:200px">
      <label class="form-label">Área de Formación</label>
      <app-ss [options]="areas()" placeholder="Todas las áreas"
              [ngModel]="selectedArea()" (ngModelChange)="onAreaChange($event)"></app-ss>
    </div>
    <div class="form-group" style="min-width:240px">
      <label class="form-label">Programa</label>
      <app-ss [options]="programas()" placeholder="Todos los programas"
              [ngModel]="selectedPrograma()" (ngModelChange)="onProgramaChange($event)"></app-ss>
    </div>
    <div class="form-group" style="min-width:280px">
      <label class="form-label">Ficha de Formación</label>
      <app-ss [options]="fichaOpts()" placeholder="Seleccionar ficha..."
              [ngModel]="selectedFichaId()" (ngModelChange)="onFichaChange($event)"></app-ss>
    </div>
  </div>
</div>

<!-- ── Loading ── -->
@if (loadingFicha()) {
  <div class="card p-8 text-center mt-4" style="display:flex;flex-direction:column;align-items:center;gap:12px">
    <lucide-icon name="loader" [size]="28" style="color:var(--blue);animation:pf-spin 1s linear infinite"></lucide-icon>
    <p class="text-muted text-sm">Cargando datos de la ficha...</p>
  </div>
}

<!-- ── Placeholder vacío ── -->
@if (!selectedFicha() && !loadingFicha()) {
  <div class="card p-8 text-center mt-4" style="display:flex;flex-direction:column;align-items:center;gap:16px">
    <div style="width:64px;height:64px;background:#dbeafe;border-radius:16px;display:flex;align-items:center;justify-content:center">
      <lucide-icon name="calendar" [size]="30" style="color:#1d4ed8"></lucide-icon>
    </div>
    <div>
      <p style="font-size:15px;font-weight:700;color:var(--text);margin:0">Selecciona una ficha</p>
      <p style="font-size:13px;color:var(--text-muted);margin-top:4px">Usa los filtros para encontrar y seleccionar una ficha de formación</p>
    </div>
  </div>
}

<!-- ── Contenido de la ficha ── -->
@if (selectedFicha() && !loadingFicha()) {

  <!-- Banner ficha -->
  <div class="ficha-banner card mt-4">
    <div class="ficha-banner-body">
      <div class="ficha-code">{{ selectedFicha()?.codigo }}</div>
      <div class="ficha-details">
        <div class="ficha-prog">{{ selectedFicha()?.programa }}</div>
        <div class="ficha-meta">
          <span><lucide-icon name="layers" [size]="12"></lucide-icon>{{ selectedFicha()?.area }}</span>
          <span><lucide-icon name="calendar" [size]="12"></lucide-icon>{{ horarios().length }} horario(s)</span>
          <span><lucide-icon name="book-open" [size]="12"></lucide-icon>{{ competencias().length }} competencia(s)</span>
          @if (fichaHorasRequeridas() > 0) {
            <span><lucide-icon name="clock" [size]="12"></lucide-icon>{{ fmtH(totalHorasFicha()) }} / {{ fmtH(fichaHorasRequeridas()) }} requeridas</span>
            @if (fichaDeficit() > 0) {
              <span class="ficha-meta-deficit">
                <lucide-icon name="alert-triangle" [size]="12"></lucide-icon>
                {{ fmtH(fichaDeficit()) }} de horas faltantes
              </span>
            } @else {
              <span class="ficha-meta-ok">
                <lucide-icon name="check" [size]="12"></lucide-icon>
                Intensidad horaria cubierta
              </span>
            }
          } @else {
            <span><lucide-icon name="clock" [size]="12"></lucide-icon>{{ fmtH(totalHorasFicha()) }} registradas</span>
          }
        </div>
      </div>
    </div>
    <!-- Tabs -->
    <div class="pf-tabs">
      <button [class.active]="activeTab()==='calendar'" (click)="activeTab.set('calendar')">
        <lucide-icon name="calendar" [size]="15"></lucide-icon>
        Calendario Anual
      </button>
      <button [class.active]="activeTab()==='instructores'" (click)="activeTab.set('instructores')">
        <lucide-icon name="users" [size]="15"></lucide-icon>
        Horas por Instructor
      </button>
    </div>
  </div>

  <!-- ════════════════ CALENDARIO ANUAL ════════════════ -->
  @if (activeTab() === 'calendar') {

    <!-- Toolbar: año + leyenda -->
    <div class="cal-toolbar card mt-4 p-3">
      <div class="flex items-center gap-2">
        <button class="btn btn-icon" (click)="calYear.update(y => y - 1)">
          <lucide-icon name="chevron-left" [size]="18"></lucide-icon>
        </button>
        <span class="cal-year-label">{{ calYear() }}</span>
        <button class="btn btn-icon" (click)="calYear.update(y => y + 1)">
          <lucide-icon name="chevron-right" [size]="18"></lucide-icon>
        </button>
        <button class="btn btn-outline btn-sm" style="margin-left:8px" (click)="calYear.set(currentYear)">
          Año actual
        </button>
      </div>
      <!-- Guía visual del sistema de caminos -->
      <div class="cal-guide">
        <div class="guide-item">
          <div class="guide-bar-demo solid"></div>
          <span>Día de clase</span>
        </div>
        <div class="guide-sep"></div>
        <div class="guide-item">
          <div class="guide-bar-demo faded"></div>
          <span>Rango de competencia</span>
        </div>
        <div class="guide-sep"></div>
        <div class="guide-item guide-hint">
          <lucide-icon name="mouse-pointer" [size]="13"></lucide-icon>
          <span>Pasa el cursor sobre una franja para ver el nombre</span>
        </div>
        <div class="guide-sep"></div>
        <div class="guide-item guide-hint">
          <lucide-icon name="hand" [size]="13"></lucide-icon>
          <span>Clic en un día para ver el detalle</span>
        </div>
      </div>
    </div>

    <!-- 12 meses -->
    <div class="months-grid mt-4">
      @for (month of calMonths(); track month.mi) {
        <div class="month-card card">
          <div class="month-name">{{ month.label }}</div>
          <div class="mini-cal">
            <!-- Headers días -->
            @for (ds of diasSemanaShort; track ds) {
              <div class="mini-cal-hdr">{{ ds }}</div>
            }
            <!-- Celdas -->
            @for (cell of month.cells; track $index) {
              @if (!cell) {
                <div class="mini-cal-cell empty"></div>
              } @else {
                <div class="mini-cal-cell"
                     [class.today]="cell.isToday"
                     [class.selected]="selectedDay() === cell.iso"
                     (click)="onDayClick(cell.iso)">
                  <span class="mini-day-num">{{ cell.day }}</span>
                  @if (cell.events.length > 0) {
                    <div class="mini-event-bars">
                      @for (ev of cell.events; track ev.comp.id) {
                        @let capL = ev.isFirst || cell.colIdx === 0;
                        @let capR = ev.isLast  || cell.colIdx === 6;
                        <div class="ev-bar"
                             [class.ev-class]="ev.isClassDay"
                             [class.cap-l]="capL"
                             [class.cap-r]="capR"
                             [style.background]="getCompColor(ev.comp)"
                             [title]="ev.comp.nombre">
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>
        </div>
      }
    </div>

    <!-- Panel de día seleccionado — modal sobre el calendario -->
    @if (selectedDay()) {
    <div class="modal-overlay" (click)="selectedDay.set(null)">
      <div class="day-detail modal modal-lg" style="max-height:85vh;overflow-y:auto;" (click)="$event.stopPropagation()">
        <div class="day-detail-header">
          <div>
            <h3 style="font-size:15px;font-weight:800;margin:0">{{ formatDayTitle(selectedDay()!) }}</h3>
            <p style="font-size:12px;color:var(--text-muted);margin:2px 0 0">
              {{ selectedClassComps().length }} clase(s) · {{ selectedDayEvents().length }} competencia(s) en rango
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-blue btn-sm" (click)="openNewComp(selectedDay()!)">
              <lucide-icon name="plus" [size]="13"></lucide-icon>
              Agregar
            </button>
            <button class="btn-icon" (click)="selectedDay.set(null)">
              <lucide-icon name="x" [size]="16"></lucide-icon>
            </button>
          </div>
        </div>

        <!-- Leyenda de estados -->
        <div class="day-state-legend">
          @for (e of legendEntries; track e.key) {
            <span class="legend-pill" [style.background]="e.bg" [style.color]="e.text" [style.border-color]="e.border">
              <span class="legend-dot" [style.background]="e.dot"></span>
              {{ e.label }}
            </span>
          }
        </div>

        @if (selectedDayEvents().length === 0) {
          <div style="padding:28px;text-align:center;color:var(--text-muted);font-size:13px">
            No hay competencias en este día
          </div>
        }

        @for (ev of selectedDayEvents(); track ev.comp.id) {
          @let c = ev.comp;
          @let hFull = getFullHorario(c.asignacionId);

          <!-- ── DÍA DE CLASE → tarjeta completa ── -->
          @if (ev.isClassDay) {
            <div class="day-comp-item" [style.border-left-color]="getCompColor(c)">
              <div class="day-comp-top">
                <span class="day-comp-badge"
                      [style.background]="getStateInfo(c).bg"
                      [style.color]="getStateInfo(c).text"
                      [style.border-color]="getStateInfo(c).border">
                  <lucide-icon name="book-open" [size]="11" style="flex-shrink:0"></lucide-icon>
                  Clase · {{ getStateInfo(c).label }}
                </span>
                <span style="font-size:11px;color:var(--text-muted)">
                  {{ fmtH(getHorasComp(c)) }} · {{ c.diasClase?.length ?? 0 }} clases totales
                </span>
              </div>
              <div class="day-comp-nombre">{{ c.nombre }}</div>
              @if (resultadosDe(c).length > 0) {
                <div style="display:flex;flex-direction:column;gap:3px;margin-top:4px;">
                  @for (r of resultadosDe(c); track $index) {
                    <div style="display:flex;align-items:center;gap:6px;font-size:11px;">
                      <span style="padding:1px 6px;border-radius:8px;font-weight:700;white-space:nowrap;"
                            [style.background]="estadoResultadoInfo(r).bg" [style.color]="estadoResultadoInfo(r).text">
                        {{ estadoResultadoInfo(r).label }}
                      </span>
                      <span style="color:var(--text-muted);">{{ r.texto }}</span>
                    </div>
                  }
                </div>
              }
              <!-- Instructor + horario -->
              <div style="font-size:11px;color:var(--text-muted);margin-top:6px;display:flex;align-items:center;gap:4px">
                <lucide-icon name="user" [size]="11"></lucide-icon>
                {{ c.horario?.instructor?.nombre }} {{ c.horario?.instructor?.apellido }}
                · {{ cap(c.horario?.diaSemana) }}
                {{ to12h(c.horario?.horaInicio) }}–{{ to12h(c.horario?.horaFin) }}
              </div>
              <!-- Rango de fechas -->
              @if (c.fechaInicio || c.fechaFin) {
                <div style="font-size:11px;color:var(--text-muted);margin-top:3px;display:flex;align-items:center;gap:4px">
                  <lucide-icon name="calendar" [size]="11"></lucide-icon>
                  {{ fmtDate(c.fechaInicio) }} → {{ fmtDate(c.fechaFin) }}
                </div>
              }
              <!-- Ambiente (del horario completo) -->
              @if (hFull?.ambiente?.nombre || hFull?.ambienteNombre || c.horario?.ambiente?.nombre) {
                <div style="font-size:11px;color:var(--text-muted);margin-top:3px;display:flex;align-items:center;gap:4px">
                  <lucide-icon name="map-pin" [size]="11"></lucide-icon>
                  Ambiente:
                  <strong style="color:var(--text)">
                    {{ hFull?.ambiente?.nombre ?? hFull?.ambienteNombre ?? c.horario?.ambiente?.nombre }}
                  </strong>
                </div>
              }
              <div class="day-comp-actions">
                <button class="btn btn-outline btn-sm" (click)="openEditComp(c)">
                  <lucide-icon name="pencil" [size]="12"></lucide-icon>
                  Editar
                </button>
                <button class="btn btn-outline btn-sm pf-btn-extend" (click)="openExtend(c)">
                  <lucide-icon name="calendar-plus" [size]="12"></lucide-icon>
                  Extender
                </button>
                <button class="btn btn-outline btn-sm pf-btn-danger" (click)="deleteComp(c)">
                  <lucide-icon name="trash-2" [size]="12"></lucide-icon>
                  Eliminar
                </button>
              </div>
            </div>

          <!-- ── DÍA DE RANGO (sin clase) → tarjeta reducida ── -->
          } @else {
            <div class="day-range-item" [style.border-left-color]="getCompColor(c)">
              <div style="display:flex;align-items:center;gap:8px">
                <span class="day-comp-badge"
                      [style.background]="getStateInfo(c).bg"
                      [style.color]="getStateInfo(c).text"
                      [style.border-color]="getStateInfo(c).border">
                  <lucide-icon name="calendar" [size]="11" style="flex-shrink:0"></lucide-icon>
                  En rango
                </span>
                <span style="font-size:12px;font-weight:700;color:var(--text)">{{ c.nombre }}</span>
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
                Rango: {{ fmtDate(c.fechaInicio) }} → {{ fmtDate(c.fechaFin) }}
                · Próxima clase: {{ proximaClase(c, selectedDay()!) }}
              </div>
            </div>
          }
        }
      </div>
    </div>
    }
  }

  <!-- ════════════════ HORAS POR INSTRUCTOR ════════════════ -->
  @if (activeTab() === 'instructores') {
    <div class="mt-4">

      <!-- Resumen global de la ficha -->
      @if (fichaHorasRequeridas() > 0) {
        @let pctFicha = min100(totalHorasFicha() / fichaHorasRequeridas() * 100);
        <div class="ficha-horas-summary card mb-3">
          <div class="fhs-top">
            <div>
              <p class="fhs-label">Intensidad horaria total de la ficha</p>
              <p class="fhs-value">
                {{ fmtH(totalHorasFicha()) }}
                <span class="fhs-de">de {{ fmtH(fichaHorasRequeridas()) }} requeridas</span>
              </p>
            </div>
            @if (fichaDeficit() > 0) {
              <div class="fhs-badge fhs-badge-deficit">
                <lucide-icon name="alert-triangle" [size]="15"></lucide-icon>
                {{ fmtH(fichaDeficit()) }} de horas faltantes
              </div>
            } @else {
              <div class="fhs-badge fhs-badge-ok">
                <lucide-icon name="check" [size]="15"></lucide-icon>
                Intensidad cubierta
              </div>
            }
          </div>
          <div class="fhs-bar-track">
            <div class="fhs-bar-fill" [style.width]="pctFicha+'%'" [style.background]="progColor(pctFicha)"></div>
          </div>
          <p class="fhs-pct">{{ pctFicha | number:'1.0-0' }}% completado</p>
        </div>
      }

      @if (instructorStats().length === 0) {
        <div class="card p-8 text-center text-muted" style="font-size:14px">
          No hay competencias registradas para esta ficha aún
        </div>
      }

      @for (stat of instructorStats(); track stat.instructor.id) {
        @let hasTarget = stat.horasRequeridas > 0;
        @let pctInst   = hasTarget ? min100(stat.horasActual / stat.horasRequeridas * 100) : -1;
        <div class="inst-stat-card card mt-3">

          <!-- Header instructor -->
          <div class="inst-stat-header">
            <div class="inst-avatar-sm">
              {{ stat.instructor.nombre[0] }}{{ stat.instructor.apellido?.[0] ?? '' }}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:14px;color:var(--text)">
                {{ stat.instructor.nombre }} {{ stat.instructor.apellido }}
              </div>
              <div style="font-size:12px;color:var(--text-muted)">{{ stat.instructor.correo }}</div>
              <!-- Barra de progreso del instructor -->
              @if (hasTarget) {
                <div class="inst-prog-row">
                  <div class="inst-prog-track">
                    <div class="inst-prog-fill"
                         [style.width]="pctInst+'%'"
                         [style.background]="progColor(pctInst)"></div>
                  </div>
                  <span class="inst-prog-label">{{ fmtH(stat.horasActual) }} / {{ fmtH(stat.horasRequeridas) }}</span>
                </div>
              }
            </div>
            <!-- Badge horas -->
            <div class="inst-horas-badge"
                 [style.background]="stat.deficit > 0 ? '#fee2e2' : '#dbeafe'"
                 [style.color]="stat.deficit > 0 ? '#991b1b' : '#1d4ed8'">
              <lucide-icon [name]="stat.deficit > 0 ? 'alert-triangle' : 'clock'" [size]="16"></lucide-icon>
              <div>
                <div style="font-size:18px;font-weight:800;line-height:1">{{ fmtH(stat.horasActual) }}</div>
                @if (stat.deficit > 0) {
                  <div style="font-size:10px;font-weight:700">−{{ fmtH(stat.deficit) }} faltantes</div>
                } @else if (hasTarget) {
                  <div style="font-size:10px;opacity:.75">cumple</div>
                } @else {
                  <div style="font-size:10px;opacity:.75">registradas</div>
                }
              </div>
            </div>
          </div>

          <!-- Barra de resumen estados -->
          <div class="inst-summary-bar">
            <span style="font-size:12px;color:var(--text-muted)">{{ stat.comps.length }} competencia(s)</span>
            <div class="inst-state-pills">
              @if (countByState(stat.comps, 'completada') > 0) {
                <span class="inst-spill" style="background:#dcfce7;color:#166534">
                  <lucide-icon name="check" [size]="10"></lucide-icon>
                  {{ countByState(stat.comps, 'completada') }} completadas
                </span>
              }
              @if (countByState(stat.comps, 'en-curso') > 0) {
                <span class="inst-spill" style="background:#dbeafe;color:#1d4ed8">
                  <lucide-icon name="play" [size]="10"></lucide-icon>
                  {{ countByState(stat.comps, 'en-curso') }} en curso
                </span>
              }
              @if (countByState(stat.comps, 'pendiente') > 0) {
                <span class="inst-spill" style="background:#fef3c7;color:#92400e">
                  <lucide-icon name="clock" [size]="10"></lucide-icon>
                  {{ countByState(stat.comps, 'pendiente') }} pendientes
                </span>
              }
              @if (countByState(stat.comps, 'sin-datos') > 0) {
                <span class="inst-spill" style="background:#fee2e2;color:#991b1b">
                  <lucide-icon name="alert-triangle" [size]="10"></lucide-icon>
                  {{ countByState(stat.comps, 'sin-datos') }} sin fechas
                </span>
              }
            </div>
          </div>

          <!-- Lista de competencias con progreso individual -->
          <div class="inst-comps-list">
            @for (c of stat.comps; track c.id) {
              @let hs = getHorasStats(c);
              <div class="inst-comp-row" [class.inst-comp-deficit]="hs.deficit > 0">
                <span class="inst-comp-dot" [style.background]="getCompColor(c)"></span>
                <div class="inst-comp-body">
                  <span class="inst-comp-name">{{ c.nombre }}</span>
                  <!-- Barra de progreso por competencia -->
                  @if (hs.requeridas > 0) {
                    <div class="comp-prog-wrap">
                      <div class="comp-prog-track">
                        <div class="comp-prog-fill"
                             [style.width]="min100(hs.pct)+'%'"
                             [style.background]="progColor(hs.pct)"></div>
                      </div>
                      <span class="comp-prog-nums">{{ fmtH(hs.actuales) }}/{{ fmtH(hs.requeridas) }}</span>
                      @if (hs.deficit > 0) {
                        <span class="deficit-tag">−{{ fmtH(hs.deficit) }}</span>
                      } @else {
                        <span class="ok-tag"><lucide-icon name="check" [size]="10"></lucide-icon></span>
                      }
                    </div>
                  } @else {
                    <span class="comp-prog-nums">{{ fmtH(hs.actuales) }} · {{ c.diasClase?.length ?? 0 }} clases</span>
                  }
                </div>
                <span class="inst-state-badge"
                      [style.background]="getStateInfo(c).bg"
                      [style.color]="getStateInfo(c).text">
                  {{ getStateInfo(c).label }}
                </span>
                <div style="display:flex;gap:4px;flex-shrink:0">
                  <button class="btn-icon" style="padding:3px" title="Editar" (click)="openEditComp(c)">
                    <lucide-icon name="pencil" [size]="13"></lucide-icon>
                  </button>
                  <button class="btn-icon" style="padding:3px;color:#7c3aed" title="Extender" (click)="openExtend(c)">
                    <lucide-icon name="calendar-plus" [size]="13"></lucide-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  }
}

<!-- ════════════════ MODAL: Competencia ════════════════ -->
@if (modalOpen()) {
  <div class="modal-overlay" (click)="closeModal()">
    <div class="modal modal-lg" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <h3>{{ editMode() ? 'Editar' : 'Nueva' }} Competencia</h3>
        <button class="btn-icon" (click)="closeModal()">
          <lucide-icon name="x" [size]="18"></lucide-icon>
        </button>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="form-group">
          <label class="form-label">Nombre de la Competencia *</label>
          <input class="form-control" [ngModel]="mNombre()" (ngModelChange)="mNombre.set($event)"
                 placeholder="Ej: Análisis y diseño de sistemas de información">
        </div>

        <div class="form-group">
          <label class="form-label">Resultados de Aprendizaje</label>
          @for (r of mResultados(); track $index; let i = $index) {
            <div style="border:1px solid var(--border);border-radius:8px;padding:8px;margin-bottom:8px;">
              <div style="display:flex;gap:6px;align-items:center;">
                <input class="form-control" style="flex:1;"
                       [ngModel]="r.texto" (ngModelChange)="setMResultado(i, $event)"
                       placeholder="Resultado {{ i + 1 }}">
                <button type="button" class="btn-icon" (click)="removeMResultado(i)" title="Quitar">
                  <lucide-icon name="x" [size]="14"></lucide-icon>
                </button>
              </div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
                <button type="button" class="btn btn-outline" style="font-size:11px;padding:3px 8px;"
                        [disabled]="mDiasClase().length === 0"
                        (click)="toggleRCal(i)">
                  <lucide-icon name="calendar" [size]="11" style="vertical-align:-2px;margin-right:4px;"></lucide-icon>
                  {{ rCalOpenIdx() === i ? 'Cerrar calendario' : 'Elegir fechas' }}
                </button>
                @if (r.fechaInicio) {
                  <span style="font-size:11px;color:var(--text-muted);">
                    {{ fmtDate(r.fechaInicio) }} @if (r.fechaFin && r.fechaFin !== r.fechaInicio) { → {{ fmtDate(r.fechaFin) }} }
                  </span>
                } @else {
                  <span style="font-size:11px;color:var(--text-muted);">Sin fechas asignadas</span>
                }
              </div>

              @if (rCalOpenIdx() === i) {
                <div class="comp-cal-wrap mt-2">
                  <div class="comp-cal-header">
                    <button class="comp-cal-nav" (click)="rCalPrevMes()" title="Mes anterior">&#8249;</button>
                    <span class="comp-cal-title">{{ formatRCalMes() }}</span>
                    <button class="comp-cal-nav" (click)="rCalNextMes()" title="Mes siguiente">&#8250;</button>
                  </div>
                  <div class="comp-cal-grid">
                    @for (lbl of ['Lu','Ma','Mi','Ju','Vi','Sá','Do']; track lbl) {
                      <div class="comp-cal-dayhdr">{{ lbl }}</div>
                    }
                    @for (cell of rCalCeldas(); track cell.iso) {
                      <div class="comp-cal-cell"
                           [class.comp-cal-allowed]="cell.allowed && !cell.inRange && !cell.isIni && !cell.isFin"
                           [class.comp-cal-inrange]="cell.allowed && cell.inRange && !cell.isIni && !cell.isFin"
                           [class.comp-cal-boundary]="cell.allowed && (cell.isIni || cell.isFin)"
                           [class.comp-cal-other]="cell.otherMonth || !cell.allowed"
                           (click)="cell.allowed && pickRCalDay(i, cell.iso)">
                        {{ cell.day }}
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
          <button type="button" class="btn btn-outline" style="font-size:12px;padding:5px 10px;" (click)="addMResultado()">
            <lucide-icon name="plus" [size]="12" style="vertical-align:-2px;margin-right:4px;"></lucide-icon>Agregar resultado
          </button>
        </div>

        <div class="form-group">
          <label class="form-label">Intensidad Horaria (horas requeridas) *</label>
          <div class="input-sfx-wrap">
            <input type="number" class="form-control" min="1" max="9999"
                   placeholder="Ej: 48"
                   [ngModel]="mHorasRequeridas()"
                   (ngModelChange)="mHorasRequeridas.set(+$event > 0 ? +$event : null)">
            <span class="input-sfx">h</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Horario — Instructor / Jornada / Hora *</label>
          <app-ss [options]="horarioOpts()" placeholder="Seleccionar horario..."
                  [ngModel]="mHorarioId()" (ngModelChange)="mHorarioId.set($event); autoGenDias()"></app-ss>
          @if (horarios().length === 0) {
            <span class="form-error">Esta ficha no tiene horarios asignados aún</span>
          }
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Fecha de Inicio</label>
            <input type="date" class="form-control"
                   [ngModel]="mFechaInicio()" (ngModelChange)="mFechaInicio.set($event); autoGenDias()">
          </div>
          <div class="form-group">
            <label class="form-label">Fecha de Fin</label>
            <input type="date" class="form-control"
                   [ngModel]="mFechaFin()" (ngModelChange)="mFechaFin.set($event); autoGenDias()">
          </div>
        </div>

        <!-- Vista previa días generados -->
        <div class="dias-preview">
          <div class="dias-preview-hdr">
            <span style="font-size:12px;font-weight:700;color:var(--text)">
              <lucide-icon name="calendar-check" [size]="13" style="vertical-align:middle;margin-right:4px"></lucide-icon>
              Días de clase generados: <strong style="color:var(--blue)">{{ mDiasClase().length }}</strong>
            </span>
            @if (mHorarioId() && mFechaInicio() && mFechaFin()) {
              <button class="btn btn-outline btn-sm" style="font-size:11px;padding:3px 10px" (click)="autoGenDias()">
                <lucide-icon name="refresh-cw" [size]="11"></lucide-icon>
                Regenerar
              </button>
            }
          </div>
          @if (mDiasClase().length > 0) {
            <div class="dias-chips">
              @for (iso of mDiasClase(); track iso) {
                <span class="dia-chip">{{ fmtDate(iso) }}</span>
              }
            </div>
          } @else {
            <p style="font-size:12px;color:var(--text-muted);margin:4px 0 0">
              @if (mHorarioId() && mFechaInicio() && mFechaFin()) {
                Sin días del horario seleccionado en ese rango de fechas
              } @else {
                Selecciona el horario y las fechas para generar los días automáticamente
              }
            </p>
          }
        </div>
      </div>

        <!-- Preview progreso de horas (se activa cuando hay horasRequeridas) -->
        @if (mHorasRequeridas() && mHorasRequeridas()! > 0) {
          @let pctM = mPctModal();
          @let defM = mDeficitModal();
          <div class="modal-horas-status" [class.mhs-ok]="defM === 0" [class.mhs-deficit]="defM > 0">
            <div class="mhs-row">
              <span style="font-size:12px;font-weight:700;color:var(--text)">Progreso de horas</span>
              <span style="font-size:12px;color:var(--text-muted)">{{ fmtH(mHorasActuales()) }} de {{ fmtH(mHorasRequeridas()!) }} requeridas</span>
            </div>
            <div class="modal-prog-track">
              <div class="modal-prog-fill"
                   [style.width]="min100(pctM) + '%'"
                   [style.background]="progColor(pctM)"></div>
            </div>
            @if (defM > 0) {
              <p class="mhs-msg mhs-msg-deficit">
                <lucide-icon name="alert-triangle" [size]="12"></lucide-icon>
                Horas faltantes: <strong>{{ fmtH(defM) }}</strong> — se necesitan {{ calcClasesExtra() }} clase(s) adicional(es)
              </p>
            } @else {
              <p class="mhs-msg mhs-msg-ok">
                <lucide-icon name="check" [size]="12"></lucide-icon>
                Cumple la intensidad horaria requerida
              </p>
            }
          </div>
        }

      <div class="flex items-center justify-between mt-6">
        <button class="btn btn-outline" (click)="closeModal()">Cancelar</button>
        <button class="btn btn-blue" (click)="saveComp()" [disabled]="saving()">
          @if (saving()) {
            <lucide-icon name="loader" [size]="14" style="animation:pf-spin 1s linear infinite"></lucide-icon>
          }
          {{ editMode() ? 'Guardar cambios' : 'Crear competencia' }}
        </button>
      </div>
    </div>
  </div>
}

<!-- ════════════════ MODAL: Extender competencia ════════════════ -->
@if (extendOpen()) {
  <div class="modal-overlay" (click)="extendOpen.set(false)">
    <div class="modal" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <h3>Extender Competencia</h3>
        <button class="btn-icon" (click)="extendOpen.set(false)">
          <lucide-icon name="x" [size]="18"></lucide-icon>
        </button>
      </div>

      @if (extComp()) {
        <div style="display:flex;flex-direction:column;gap:14px">
          <!-- Info de la competencia -->
          <div style="background:var(--surface2);border-radius:8px;padding:12px 14px">
            <div style="font-weight:700;font-size:13px;color:var(--text)">{{ extComp()!.nombre }}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
              Fecha fin actual:
              <strong>{{ fmtDate(toIso(extComp()!.fechaFin)) }}</strong>
              · {{ extComp()!.diasClase?.length ?? 0 }} clases acumuladas
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Nueva Fecha de Fin (debe ser posterior a la actual)</label>
            <input type="date" class="form-control"
                   [ngModel]="extFechaFin()" (ngModelChange)="extFechaFin.set($event)"
                   [min]="toIso(extComp()!.fechaFin)">
          </div>

          @if (extFechaFin()) {
            @let extDias = calcExtDias();
            <div class="dias-preview" [style.border-color]="extDias > 0 ? '#86efac' : '#fca5a5'">
              @if (extDias > 0) {
                <p style="font-size:13px;font-weight:700;color:#166534;margin:0">
                  + {{ extDias }} clase(s) adicional(es) se agregarán
                </p>
                <p style="font-size:12px;color:var(--text-muted);margin:4px 0 0">
                  Del {{ fmtDate(toIso(extComp()!.fechaFin)) }} al {{ fmtDate(extFechaFin()) }}
                </p>
              } @else {
                <p style="font-size:13px;color:#991b1b;margin:0">
                  La nueva fecha debe ser posterior a la fecha fin actual
                </p>
              }
            </div>
          }
        </div>

        <div class="flex items-center justify-between mt-6">
          <button class="btn btn-outline" (click)="extendOpen.set(false)">Cancelar</button>
          <button class="btn btn-blue" (click)="saveExtend()"
                  [disabled]="!extFechaFin() || calcExtDias() <= 0">
            <lucide-icon name="calendar-plus" [size]="14"></lucide-icon>
            Confirmar extensión
          </button>
        </div>
      }
    </div>
  </div>
}
  `,
  styles: [`
    @keyframes pf-spin { to { transform: rotate(360deg); } }

    /* ── Page header ── */
    .page-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
    .page-header h2 { font-size:22px; margin:0; }

    /* ── Ficha banner ── */
    .ficha-banner { overflow:hidden; }
    .ficha-banner-body { display:flex; align-items:flex-start; gap:16px; padding:16px 20px 12px; }
    .ficha-code {
      font-size:32px; font-weight:900; color:var(--navy);
      line-height:1; min-width:80px; flex-shrink:0;
    }
    .ficha-details { flex:1; min-width:0; }
    .ficha-prog { font-size:15px; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .ficha-meta { display:flex; gap:16px; flex-wrap:wrap; margin-top:6px; font-size:12px; color:var(--text-muted); }
    .ficha-meta span { display:flex; align-items:center; gap:4px; }

    /* ── Tabs ── */
    .pf-tabs { display:flex; border-top:1px solid var(--border); }
    .pf-tabs button {
      flex:1; padding:10px 16px; background:transparent; border:none; cursor:pointer;
      font-size:13px; font-weight:600; color:var(--text-muted); transition:all .15s;
      display:flex; align-items:center; justify-content:center; gap:6px;
      border-top:2px solid transparent; margin-top:-1px;
    }
    .pf-tabs button.active { color:var(--blue); border-top-color:var(--blue); background:var(--surface2); }
    .pf-tabs button:hover:not(.active) { background:var(--surface2); color:var(--text); }

    /* ── Calendar toolbar ── */
    .cal-toolbar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
    .cal-year-label { font-size:20px; font-weight:800; color:var(--text); min-width:56px; text-align:center; }
    /* ── Guía de caminos (reemplaza la leyenda de estados en el toolbar) ── */
    .cal-guide {
      display:flex; align-items:center; gap:8px; flex-wrap:wrap;
      font-size:11px; color:var(--text-muted); min-width:0;
      margin-right:6px;
    }
    .guide-item { display:flex; align-items:center; gap:5px; min-width:0; }
    .guide-item span { white-space:nowrap; }
    .guide-hint { color:var(--text-muted); font-style:italic; }
    .guide-sep { width:1px; height:14px; background:var(--border); flex-shrink:0; }
    .guide-bar-demo {
      width:28px; height:5px; border-radius:3px; flex-shrink:0;
    }
    .guide-bar-demo.solid { background:#3b82f6; opacity:1; }
    .guide-bar-demo.faded { background:#3b82f6; opacity:0.28; }

    /* ── Leyenda de estados dentro del panel de día ── */
    .day-state-legend {
      display:flex; gap:6px; flex-wrap:wrap; align-items:center;
      padding:10px 20px; border-bottom:1px solid var(--border);
      background:var(--surface2);
    }
    .legend-pill {
      display:inline-flex; align-items:center; gap:5px;
      padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; border:1px solid;
    }
    .legend-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

    /* ── Months grid ── */
    .months-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    @media(max-width:1100px) { .months-grid { grid-template-columns:repeat(3,1fr); } }
    @media(max-width:780px)  { .months-grid { grid-template-columns:repeat(2,1fr); } }
    @media(max-width:500px)  { .months-grid { grid-template-columns:1fr; } }

    .month-card { overflow:hidden; }
    .month-name {
      padding:7px 10px; font-size:12px; font-weight:800; color:var(--text);
      background:var(--surface2); border-bottom:1px solid var(--border); text-align:center;
      letter-spacing:.03em; text-transform:uppercase;
    }
    .mini-cal { display:grid; grid-template-columns:repeat(7,1fr); padding:4px 0 4px; gap:0; }
    .mini-cal-hdr {
      text-align:center; font-size:9px; font-weight:700;
      color:var(--text-muted); padding:3px 0 5px;
    }
    .mini-cal-cell {
      min-height:38px; padding:2px 0 2px; cursor:pointer;
      display:flex; flex-direction:column; align-items:stretch;
      transition:background .1s; position:relative; overflow:visible;
    }
    .mini-cal-cell:not(.empty):hover { background:rgba(0,0,0,.04); }
    .mini-cal-cell.empty { cursor:default; pointer-events:none; }
    .mini-cal-cell.today { background:#dbeafe !important; }
    .mini-cal-cell.today .mini-day-num { color:#1d4ed8 !important; font-weight:800; }
    .mini-cal-cell.selected { background:var(--navy) !important; }
    .mini-cal-cell.selected .mini-day-num { color:#fff !important; }

    .mini-day-num {
      font-size:10px; font-weight:600; color:var(--text);
      text-align:center; line-height:1.4; display:block;
    }

    /* ── Barras de eventos (camino) ── */
    .mini-event-bars { display:flex; flex-direction:column; justify-content:flex-end; gap:1px; flex:1; padding:1px 0; }
    .ev-bar {
      height:5px; width:100%; border-radius:0;
      flex-shrink:0; cursor:pointer; transition:filter .1s;
    }
    .ev-bar:not(.ev-class) { opacity:0.28; }   /* días de rango sin clase: tenue */
    .ev-bar.ev-class       { opacity:1; }       /* días de clase: sólido */
    .ev-bar:hover          { filter:brightness(.8); }
    /* Extremo izquierdo de la franja (inicio del rango o domingo) */
    .ev-bar.cap-l          { border-radius:3px 0 0 3px; margin-left:2px; width:calc(100% - 2px); }
    /* Extremo derecho de la franja (fin del rango o sábado) */
    .ev-bar.cap-r          { border-radius:0 3px 3px 0; margin-right:2px; width:calc(100% - 2px); }
    /* Día único o inicio+fin el mismo día */
    .ev-bar.cap-l.cap-r    { border-radius:3px; margin:0 2px; width:calc(100% - 4px); }

    /* ── Day detail panel ── */
    .day-detail { overflow:hidden; }
    .day-detail-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:14px 20px; border-bottom:1px solid var(--border);
    }
    .day-comp-item {
      border-left:3px solid; padding:12px 20px;
      border-bottom:1px solid var(--border);
    }
    .day-comp-item:last-child { border-bottom:none; }
    .day-range-item {
      border-left:3px solid; padding:9px 20px;
      border-bottom:1px solid var(--border);
      background: repeating-linear-gradient(
        135deg, transparent, transparent 4px,
        rgba(0,0,0,.025) 4px, rgba(0,0,0,.025) 8px
      );
    }
    .day-range-item:last-child { border-bottom:none; }
    .day-comp-top { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
    .day-comp-badge {
      display:inline-flex; align-items:center; gap:4px;
      padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; border:1px solid;
    }
    .day-comp-nombre { font-size:13px; font-weight:700; color:var(--text); }
    .day-comp-actions { display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; }
    .pf-btn-extend { color:#7c3aed !important; border-color:#c4b5fd !important; }
    .pf-btn-danger  { color:var(--red) !important; border-color:#fca5a5 !important; }

    /* ── Instructor stats ── */
    .inst-stat-card { overflow:hidden; }
    .inst-stat-header {
      display:flex; align-items:center; gap:14px;
      padding:16px 20px; border-bottom:1px solid var(--border);
    }
    .inst-avatar-sm {
      width:42px; height:42px; border-radius:10px; background:var(--navy); color:#fff;
      display:flex; align-items:center; justify-content:center;
      font-size:15px; font-weight:800; flex-shrink:0;
    }
    .inst-horas-badge {
      display:flex; align-items:center; gap:6px;
      background:#dbeafe; color:#1d4ed8; border-radius:10px; padding:8px 16px; flex-shrink:0;
    }
    .inst-summary-bar {
      display:flex; align-items:center; gap:10px; flex-wrap:wrap;
      padding:8px 20px; border-bottom:1px solid var(--border); background:var(--surface2);
    }
    .inst-state-pills { display:flex; gap:6px; flex-wrap:wrap; }
    .inst-spill {
      display:inline-flex; align-items:center; gap:4px;
      padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700;
    }

    .inst-comps-list { padding:0; }
    .inst-comp-row {
      display:flex; align-items:center; gap:8px;
      padding:9px 20px; border-bottom:1px solid var(--border);
    }
    .inst-comp-row:last-child { border-bottom:none; }
    .inst-comp-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .inst-state-badge { padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; flex-shrink:0; }

    /* ── Modal: días preview ── */
    .dias-preview {
      background:var(--surface2); border-radius:8px; padding:12px;
      border:1px solid var(--border);
    }
    .dias-preview-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .dias-chips { display:flex; flex-wrap:wrap; gap:4px; }
    .dia-chip {
      background:#dbeafe; color:#1d4ed8; border-radius:4px;
      padding:2px 8px; font-size:11px; font-weight:600;
    }

    /* ── Ficha banner: estados especiales ── */
    .ficha-meta-deficit {
      display:flex; align-items:center; gap:4px;
      color:#dc2626; font-weight:700; background:#fee2e2;
      padding:2px 8px; border-radius:20px; border:1px solid #fca5a5;
    }
    .ficha-meta-ok {
      display:flex; align-items:center; gap:4px;
      color:#166534; font-weight:700; background:#dcfce7;
      padding:2px 8px; border-radius:20px; border:1px solid #86efac;
    }

    /* ── Modal: campo con sufijo ── */
    .input-sfx-wrap { position:relative; display:flex; align-items:center; }
    .input-sfx-wrap .form-control { padding-right:36px; }
    .input-sfx {
      position:absolute; right:12px; font-size:12px; font-weight:700;
      color:var(--text-muted); pointer-events:none;
    }
    .form-hint { font-size:11px; color:var(--text-muted); margin:4px 0 0; }

    /* ── Mini-calendario para fechas de un resultado ── */
    .comp-cal-wrap {
      border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px;
      background: var(--surface2);
    }
    .comp-cal-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
    }
    .comp-cal-title { font-size: 12px; font-weight: 700; color: var(--text); }
    .comp-cal-nav {
      background: none; border: 1px solid var(--border); border-radius: 4px;
      width: 22px; height: 22px; cursor: pointer; font-size: 16px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      color: var(--text-muted); transition: all .15s; padding: 0;
    }
    .comp-cal-nav:hover { background: var(--blue); color: white; border-color: var(--blue); }
    .comp-cal-grid {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;
    }
    .comp-cal-dayhdr {
      text-align: center; font-size: 9px; font-weight: 700;
      color: var(--text-muted); padding: 3px 0 4px;
      text-transform: uppercase; letter-spacing: .03em;
    }
    .comp-cal-cell {
      text-align: center; font-size: 11px; padding: 5px 2px;
      border-radius: 5px; cursor: default; color: var(--text);
      transition: background .1s, color .1s; user-select: none;
    }
    .comp-cal-other { color: var(--text-muted); opacity: .3; }
    .comp-cal-allowed { cursor: pointer; background: #eff6ff; font-weight: 600; color: #1d4ed8; }
    .comp-cal-allowed:hover { background: #dbeafe; }
    .comp-cal-inrange { cursor: pointer; background: #bfdbfe; color: #1e40af; }
    .comp-cal-boundary {
      cursor: pointer;
      background: var(--blue) !important; color: white !important;
      font-weight: 700;
      border-radius: 5px;
    }

    /* ── Modal: estado de horas ── */
    .modal-horas-status {
      border-radius:8px; padding:12px 14px; border:1px solid var(--border);
      background:var(--surface2);
    }
    .modal-horas-status.mhs-ok     { border-color:#86efac; background:#f0fdf4; }
    .modal-horas-status.mhs-deficit{ border-color:#fca5a5; background:#fff5f5; }
    .mhs-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
    .modal-prog-track {
      height:8px; background:var(--border); border-radius:4px; overflow:hidden;
    }
    .modal-prog-fill { height:100%; border-radius:4px; transition:width .3s; }
    .mhs-msg {
      font-size:12px; margin:8px 0 0;
      display:flex; align-items:center; gap:5px;
    }
    .mhs-msg-deficit { color:#dc2626; }
    .mhs-msg-ok      { color:#166534; }

    /* ── Resumen global de la ficha (tab instructores) ── */
    .ficha-horas-summary { padding:16px 20px; }
    .fhs-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
    .fhs-label { font-size:11px; text-transform:uppercase; font-weight:800; color:var(--text-muted); margin:0 0 4px; letter-spacing:.04em; }
    .fhs-value { font-size:22px; font-weight:900; color:var(--text); margin:0; }
    .fhs-de { font-size:13px; font-weight:500; color:var(--text-muted); }
    .fhs-badge {
      display:flex; align-items:center; gap:6px;
      padding:8px 14px; border-radius:10px; font-size:13px; font-weight:700; flex-shrink:0;
    }
    .fhs-badge-deficit { background:#fee2e2; color:#991b1b; }
    .fhs-badge-ok      { background:#dcfce7; color:#166534; }
    .fhs-bar-track { height:10px; background:var(--border); border-radius:5px; overflow:hidden; }
    .fhs-bar-fill  { height:100%; border-radius:5px; transition:width .4s; }
    .fhs-pct { font-size:11px; color:var(--text-muted); margin:6px 0 0; text-align:right; }

    /* ── Instructor: barra de progreso en header ── */
    .inst-prog-row { display:flex; align-items:center; gap:8px; margin-top:6px; }
    .inst-prog-track { flex:1; height:6px; background:var(--border); border-radius:3px; overflow:hidden; }
    .inst-prog-fill  { height:100%; border-radius:3px; transition:width .3s; }
    .inst-prog-label { font-size:11px; font-weight:700; color:var(--text-muted); white-space:nowrap; }

    /* ── Competencia row: progreso individual ── */
    .inst-comp-row { display:flex; align-items:center; gap:8px; padding:9px 20px; border-bottom:1px solid var(--border); }
    .inst-comp-row:last-child { border-bottom:none; }
    .inst-comp-row.inst-comp-deficit { background:#fff9f9; }
    .inst-comp-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
    .inst-comp-name { font-size:12px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .comp-prog-wrap { display:flex; align-items:center; gap:6px; }
    .comp-prog-track { flex:1; height:5px; background:var(--border); border-radius:3px; overflow:hidden; min-width:60px; }
    .comp-prog-fill  { height:100%; border-radius:3px; transition:width .3s; }
    .comp-prog-nums  { font-size:10px; color:var(--text-muted); white-space:nowrap; flex-shrink:0; }
    .deficit-tag {
      font-size:10px; font-weight:800; color:#dc2626;
      background:#fee2e2; padding:1px 6px; border-radius:10px; flex-shrink:0;
    }
    .ok-tag {
      display:flex; align-items:center; justify-content:center;
      width:16px; height:16px; border-radius:50%; background:#dcfce7; color:#166534; flex-shrink:0;
    }
  `],
})
export class ProgramadorFichasComponent implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);
  private cdr   = inject(ChangeDetectorRef);

  readonly currentYear     = new Date().getFullYear();
  readonly hoyIso          = new Date().toISOString().slice(0, 10);
  readonly diasSemanaShort = DIAS_SHORT;
  readonly legendEntries   = (Object.entries(SINFO) as [CState, (typeof SINFO)[CState]][])
                               .map(([key, v]) => ({ key, ...v }));

  // ── Data ──────────────────────────────────────────────────────
  fichas       = signal<any[]>([]);
  horarios     = signal<any[]>([]);
  competencias = signal<any[]>([]);

  // ── Filtros ───────────────────────────────────────────────────
  selectedArea     = signal('');
  selectedPrograma = signal('');
  selectedFichaId  = signal<number | null>(null);

  // ── UI ────────────────────────────────────────────────────────
  loadingFicha = signal(false);
  activeTab    = signal<'calendar' | 'instructores'>('calendar');
  calYear      = signal(this.currentYear);
  selectedDay  = signal<string | null>(null);

  // ── Modal competencia ─────────────────────────────────────────
  modalOpen    = signal(false);
  editMode     = signal(false);
  saving       = signal(false);
  mId          = signal<number | null>(null);
  mNombre      = signal('');
  mResultados  = signal<Resultado[]>([]);
  mHorarioId   = signal<number | null>(null);
  mFechaInicio = signal('');
  mFechaFin    = signal('');
  mDiasClase   = signal<string[]>([]);

  // ── Modal extensión ───────────────────────────────────────────
  extendOpen  = signal(false);
  extComp     = signal<any>(null);
  extFechaFin = signal('');

  // ── Modal: intensidad horaria ─────────────────────────────────
  mHorasRequeridas = signal<number | null>(null);

  // ── Computed: opciones filtros ────────────────────────────────
  areas = computed((): SSOption[] => {
    const all = [...new Set(this.fichas().map(f => f.area).filter(Boolean))] as string[];
    return all.sort().map(a => ({ value: a, label: a }));
  });

  programas = computed((): SSOption[] => {
    const area = this.selectedArea();
    const list = this.fichas()
      .filter(f => !area || f.area === area)
      .map(f => f.programa).filter(Boolean) as string[];
    return [...new Set(list)].sort().map(p => ({ value: p, label: p }));
  });

  fichaOpts = computed((): SSOption[] => {
    const area = this.selectedArea(), prog = this.selectedPrograma();
    return this.fichas()
      .filter(f => (!area || f.area === area) && (!prog || f.programa === prog))
      .map(f => ({ value: f.id, label: `${f.codigo} — ${f.programa}` }));
  });

  selectedFicha = computed(() => this.fichas().find(f => f.id === this.selectedFichaId()) ?? null);

  // ── Computed: calendario ──────────────────────────────────────
  // Mapea cada día ISO → array de eventos {comp, isClassDay, isFirst, isLast}
  dayRangeMap = computed(() => {
    type EvEntry = { comp: any; isClassDay: boolean; isFirst: boolean; isLast: boolean };
    const map = new Map<string, EvEntry[]>();

    const addDay = (k: string, ev: EvEntry) => {
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ev);
    };

    this.competencias().forEach(c => {
      const iniStr   = c.fechaInicio ? String(c.fechaInicio).slice(0, 10) : null;
      const finStr   = c.fechaFin    ? String(c.fechaFin).slice(0, 10)    : null;
      const classSet: Set<string> = new Set((c.diasClase ?? []).map((d: any) => String(d).slice(0, 10)));

      if (iniStr && finStr) {
        // Recorre todos los días del rango (límite 400 días por seguridad)
        const cur = new Date(iniStr + 'T12:00:00');
        const end = new Date(finStr + 'T12:00:00');
        let n = 0;
        while (cur <= end && n++ < 400) {
          const k = cur.toISOString().slice(0, 10);
          addDay(k, { comp: c, isClassDay: classSet.has(k), isFirst: k === iniStr, isLast: k === finStr });
          cur.setDate(cur.getDate() + 1);
        }
      } else {
        // Sin rango definido → solo días de clase como blobs individuales
        classSet.forEach(k => addDay(k, { comp: c, isClassDay: true, isFirst: true, isLast: true }));
      }
    });
    return map;
  });

  calMonths = computed(() => {
    const year  = this.calYear();
    const dmap  = this.dayRangeMap();
    const today = new Date().toISOString().slice(0, 10);
    type CellEv = { comp: any; isClassDay: boolean; isFirst: boolean; isLast: boolean };
    type CalCell = null | { iso: string; day: number; events: CellEv[]; isToday: boolean; colIdx: number };
    return Array.from({ length: 12 }, (_, mi) => {
      const daysInMonth = new Date(year, mi + 1, 0).getDate();
      const firstDow    = new Date(year, mi, 1).getDay(); // 0 = Dom
      const cells: CalCell[] = [];
      for (let i = 0; i < firstDow; i++) cells.push(null);
      for (let d = 1; d <= daysInMonth; d++) {
        const iso    = `${year}-${String(mi + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const colIdx = (firstDow + d - 1) % 7; // 0=Dom … 6=Sáb
        cells.push({ iso, day: d, events: dmap.get(iso) ?? [], isToday: iso === today, colIdx });
      }
      return { mi, label: MESES[mi], cells };
    });
  });

  // Todos los eventos del día seleccionado (clase + rango)
  selectedDayEvents = computed(() => {
    const day = this.selectedDay();
    if (!day) return [] as { comp: any; isClassDay: boolean }[];
    return this.dayRangeMap().get(day) ?? [];
  });

  // Solo los días de clase (para el contador del header del panel)
  selectedClassComps = computed(() =>
    this.selectedDayEvents().filter(ev => ev.isClassDay).map(ev => ev.comp)
  );

  // ── Computed: opciones horarios para modal ────────────────────
  horarioOpts = computed((): SSOption[] =>
    this.horarios().map(h => {
      const fichaCode = h.ficha?.codigo ? `[${h.ficha.codigo}] ` : '';
      const instrName = [h.instructor?.nombre, h.instructor?.apellido].filter(Boolean).join(' ');
      return {
        value: h.id,
        label: `${fichaCode}${cap(h.diaSemana)} ${h.jornada === 'manana' ? 'Mañana' : 'Tarde'} · ${to12h(h.horaInicio)}–${to12h(h.horaFin)}${instrName ? ' — ' + instrName : ''}`.trim(),
      };
    })
  );

  // ── Computed: horas por competencia (actual vs requerida) ─────
  horasStats = computed(() => {
    const map = new Map<number, { requeridas: number; actuales: number; deficit: number; pct: number }>();
    this.competencias().forEach(c => {
      const actuales   = Math.max(0, Math.round(horasComp(c) * 100) / 100);
      // Math.max(0, ...) por si hay datos heredados con horasRequeridas negativas
      const requeridas = Math.max(0, c.horasRequeridas ?? 0);
      const deficit    = requeridas > 0 ? Math.round(Math.max(0, requeridas - actuales) * 100) / 100 : 0;
      const pct        = requeridas > 0 ? Math.min(100, (actuales / requeridas) * 100) : -1;
      map.set(c.id, { requeridas, actuales, deficit, pct });
    });
    return map;
  });

  // ── Computed: estadísticas instructores ───────────────────────
  instructorStats = computed(() => {
    const hStats = this.horasStats();
    const map = new Map<number, {
      instructor: any; horasActual: number; horasRequeridas: number; deficit: number; comps: any[];
    }>();
    this.competencias().forEach(c => {
      const inst = c.horario?.instructor;
      if (!inst) return;
      if (!map.has(inst.id)) map.set(inst.id, { instructor: inst, horasActual: 0, horasRequeridas: 0, deficit: 0, comps: [] });
      const e = map.get(inst.id)!;
      const s = hStats.get(c.id)!;
      e.horasActual     = Math.round((e.horasActual     + s.actuales)   * 100) / 100;
      e.horasRequeridas = Math.round((e.horasRequeridas + s.requeridas) * 100) / 100;
      e.deficit         = Math.round((e.deficit         + s.deficit)    * 100) / 100;
      e.comps.push(c);
    });
    // Ordenar: primero los que tienen déficit, luego por horas actuales
    return [...map.values()].sort((a, b) => b.deficit - a.deficit || b.horasActual - a.horasActual);
  });

  totalHorasFicha = computed(() =>
    Math.round(this.competencias().reduce((s, c) => s + horasComp(c), 0) * 100) / 100
  );

  fichaHorasRequeridas = computed(() =>
    this.competencias().reduce((s, c) => s + (c.horasRequeridas ?? 0), 0)
  );

  fichaDeficit = computed(() => {
    let total = 0;
    this.horasStats().forEach(s => { total += s.deficit; });
    return Math.round(total * 100) / 100;
  });

  // Horas actuales del modal (para preview en tiempo real)
  mHorasActuales = computed(() => {
    const hId = this.mHorarioId();
    if (!hId) return 0;
    const h = this.horarios().find(x => x.id === hId);
    if (!h) return 0;
    return Math.round(this.mDiasClase().length * horasSesion(h) * 100) / 100;
  });

  mDeficitModal = computed(() => {
    const req = this.mHorasRequeridas();
    if (!req || req <= 0) return 0;
    return Math.max(0, req - this.mHorasActuales());
  });

  mPctModal = computed(() => {
    const req = this.mHorasRequeridas();
    if (!req || req <= 0) return -1;
    return Math.min(100, (this.mHorasActuales() / req) * 100);
  });

  // Asigna un color único de la paleta a cada competencia ordenando por id
  // (orden de creación) → la primera siempre es COMP_PALETTE[0], la nueva
  // suma al final y no desplaza los colores de las existentes.
  compColorMap = computed(() => {
    const map = new Map<number, string>();
    [...this.competencias()]
      .sort((a, b) => a.id - b.id)   // más antigua = índice 0
      .forEach((c, i) => map.set(c.id, COMP_PALETTE[i % COMP_PALETTE.length]));
    return map;
  });

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit() {
    this.api.getFichas().subscribe({
      next: d => { this.fichas.set(d); this.cdr.markForCheck(); this.cdr.detectChanges(); },
      error: () => this.toast.error('Error cargando fichas'),
    });
  }

  // ── Handlers de filtros ───────────────────────────────────────
  onAreaChange(area: string) {
    this.selectedArea.set(area);
    this.selectedPrograma.set('');
    this.selectedFichaId.set(null);
    this.clearFichaData();
  }

  onProgramaChange(prog: string) {
    this.selectedPrograma.set(prog);
    this.selectedFichaId.set(null);
    this.clearFichaData();
  }

  onFichaChange(id: number) {
    this.selectedFichaId.set(id);
    id ? this.loadFichaData(id) : this.clearFichaData();
  }

  clearFichaData() {
    this.horarios.set([]);
    this.competencias.set([]);
    this.selectedDay.set(null);
  }

  loadFichaData(fichaId: number) {
    this.loadingFicha.set(true);
    this.selectedDay.set(null);
    forkJoin({
      horarios:     this.api.getHorariosByFicha(fichaId),
      comps:        this.api.getCompetencias(),
      instructores: this.api.getInstructores(),
    }).subscribe({
      next: ({ horarios, comps, instructores }) => {
        // Enriquecer horarios con objeto instructor
        const instMap = new Map<string, any>((instructores as any[]).map(i => [String(i.id), i]));
        const enrichedHorarios = (horarios as any[]).map(h => ({
          ...h,
          instructor: h.instructorId ? (instMap.get(String(h.instructorId)) ?? null) : null,
        }));
        this.horarios.set(enrichedHorarios);

        // Filtrar competencias por las asignaciones cargadas (UUIDs — NO usar Number()).
        // h.id es el id de la AsignacionHorario (ver HorariosService.toView()); la
        // Competencia se relaciona vía asignacionId, NO existe un campo "horarioId".
        const asignacionIds = new Set(enrichedHorarios.map(h => String(h.id)));
        const horarioMap = new Map(enrichedHorarios.map(h => [String(h.id), h]));
        const fc = (comps as any[])
          .filter(c => asignacionIds.has(String(c.asignacionId)))
          .map(c => ({
            ...c,
            // Sobrescribir c.horario con la versión enriquecida (instructor incluido)
            horario: horarioMap.get(String(c.asignacionId)) ?? c.horario,
          }));
        this.competencias.set(fc);
        this.loadingFicha.set(false);
        this.cdr.markForCheck(); this.cdr.detectChanges();
      },
      error: () => {
        this.toast.error('Error cargando datos de la ficha');
        this.loadingFicha.set(false);
        this.cdr.markForCheck(); this.cdr.detectChanges();
      },
    });
  }

  // ── Calendar ──────────────────────────────────────────────────
  onDayClick(iso: string) {
    this.selectedDay.set(this.selectedDay() === iso ? null : iso);
    this.cdr.markForCheck(); this.cdr.detectChanges();
  }

  formatDayTitle(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    return `${DIAS_SHORT[d.getDay()]}. ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  }

  // ── Modal competencia ─────────────────────────────────────────
  openNewComp(preDate?: string) {
    this.editMode.set(false);
    this.mId.set(null);
    this.mNombre.set('');
    this.mResultados.set([{ texto: '', fechaInicio: null, fechaFin: null }]);
    this.mHorarioId.set(this.horarios().length === 1 ? this.horarios()[0].id : null);
    this.mFechaInicio.set(preDate ?? '');
    this.mFechaFin.set('');
    this.mDiasClase.set([]);
    this.mHorasRequeridas.set(null);
    this.modalOpen.set(true);
    this.cdr.markForCheck(); this.cdr.detectChanges();
  }

  openEditComp(c: any) {
    this.editMode.set(true);
    this.mId.set(c.id);
    this.mNombre.set(c.nombre ?? '');
    const resultadosIniciales = normalizarResultados(c.resultados);
    this.mResultados.set(resultadosIniciales.length ? resultadosIniciales : [{ texto: '', fechaInicio: null, fechaFin: null }]);
    this.mHorarioId.set(c.asignacionId);
    this.mFechaInicio.set(toIso(c.fechaInicio));
    this.mFechaFin.set(toIso(c.fechaFin));
    this.mDiasClase.set([...(c.diasClase ?? [])]);
    this.mHorasRequeridas.set(c.horasRequeridas > 0 ? c.horasRequeridas : null);
    this.modalOpen.set(true);
    this.cdr.markForCheck(); this.cdr.detectChanges();
  }

  closeModal() { this.modalOpen.set(false); }

  addMResultado() {
    this.mResultados.set([...this.mResultados(), { texto: '', fechaInicio: null, fechaFin: null }]);
  }

  removeMResultado(i: number) {
    this.mResultados.set(this.mResultados().filter((_, idx) => idx !== i));
  }

  setMResultado(i: number, texto: string) {
    const arr = [...this.mResultados()];
    arr[i] = { ...arr[i], texto };
    this.mResultados.set(arr);
  }

  /** Días permitidos para las fechas de un resultado: los ya asignados a la competencia */
  resultadoDiasPermitidos(): string[] {
    return [...this.mDiasClase()].sort();
  }

  // ── Mini-calendario para elegir fechas de un resultado ─────────
  rCalOpenIdx = signal<number | null>(null);
  rCalMes     = signal<Date>(new Date());

  toggleRCal(i: number) {
    if (this.rCalOpenIdx() === i) {
      this.rCalOpenIdx.set(null);
      return;
    }
    const permitidos = this.resultadoDiasPermitidos();
    const r = this.mResultados()[i];
    const ref = r?.fechaInicio ?? permitidos[0];
    if (ref) {
      const d = new Date(ref + 'T00:00:00');
      this.rCalMes.set(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    this.rCalOpenIdx.set(i);
  }

  formatRCalMes(): string {
    const m = this.rCalMes();
    return `${MESES[m.getMonth()]} ${m.getFullYear()}`;
  }

  private _rCalLimites(): { min: Date; max: Date } | null {
    const permitidos = this.resultadoDiasPermitidos();
    if (!permitidos.length) return null;
    return {
      min: new Date(permitidos[0] + 'T00:00:00'),
      max: new Date(permitidos[permitidos.length - 1] + 'T00:00:00'),
    };
  }

  rCalPrevMes() {
    const lim = this._rCalLimites();
    const m = this.rCalMes();
    if (lim && m.getFullYear() === lim.min.getFullYear() && m.getMonth() === lim.min.getMonth()) return;
    this.rCalMes.set(new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  rCalNextMes() {
    const lim = this._rCalLimites();
    const m = this.rCalMes();
    if (lim && m.getFullYear() === lim.max.getFullYear() && m.getMonth() === lim.max.getMonth()) return;
    this.rCalMes.set(new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  rCalCeldas(): { day: number; iso: string; allowed: boolean; inRange: boolean; isIni: boolean; isFin: boolean; otherMonth: boolean }[] {
    const i = this.rCalOpenIdx();
    const mes = this.rCalMes();
    const year = mes.getFullYear();
    const month = mes.getMonth();
    const permitidos = new Set(this.resultadoDiasPermitidos());
    const r = i !== null ? this.mResultados()[i] : null;
    const ini = r?.fechaInicio ?? '';
    const fin = r?.fechaFin ?? '';
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const cells: ReturnType<typeof this.rCalCeldas> = [];

    const startDow = (firstDay.getDay() + 6) % 7;
    for (let d = startDow - 1; d >= 0; d--) {
      const date = new Date(year, month, -d);
      cells.push({ day: date.getDate(), iso: dateToIso(date), allowed: false, inRange: false, isIni: false, isFin: false, otherMonth: true });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const iso = dateToIso(date);
      cells.push({
        day: d, iso, allowed: permitidos.has(iso),
        inRange: !!(ini && fin && iso >= ini && iso <= fin),
        isIni: iso === ini, isFin: iso === fin, otherMonth: false,
      });
    }
    let after = 1;
    while (cells.length < 42) {
      const date = new Date(year, month + 1, after++);
      cells.push({ day: date.getDate(), iso: dateToIso(date), allowed: false, inRange: false, isIni: false, isFin: false, otherMonth: true });
    }
    return cells;
  }

  pickRCalDay(i: number, iso: string) {
    const arr = [...this.mResultados()];
    const actual = { ...arr[i] };
    if (!actual.fechaInicio || (actual.fechaInicio && actual.fechaFin)) {
      // Sin selección previa, o ya había un rango completo → empieza de nuevo
      actual.fechaInicio = iso;
      actual.fechaFin = null;
    } else if (iso < actual.fechaInicio) {
      // Eligió un día anterior al inicio → se convierte en el nuevo inicio
      actual.fechaInicio = iso;
      actual.fechaFin = null;
    } else {
      actual.fechaFin = iso;
    }
    arr[i] = actual;
    this.mResultados.set(arr);
  }

  estadoResultadoInfo(r: Resultado) {
    return RESULTADO_ESTADO_INFO[estadoResultado(r, this.hoyIso)];
  }

  /** Normaliza c.resultados (puede venir en formato legado string[]) para mostrarlos */
  resultadosDe(c: any): Resultado[] {
    return normalizarResultados(c.resultados);
  }

  autoGenDias() {
    const hId = this.mHorarioId();
    const ini = this.mFechaInicio();
    const fin = this.mFechaFin();
    if (!hId || !ini || !fin) return;
    const h = this.horarios().find(x => x.id === hId);
    if (!h?.diaSemana) return;
    this.mDiasClase.set(generarDias(ini, fin, h.diaSemana));
    this.cdr.markForCheck(); this.cdr.detectChanges();
  }

  saveComp() {
    if (!this.mNombre().trim()) { this.toast.error('El nombre es obligatorio'); return; }
    if (!this.mHorarioId())    { this.toast.error('Selecciona un horario');     return; }

    const dto = {
      asignacionId:    this.mHorarioId()!,
      nombre:          this.mNombre().trim(),
      resultados:      this.mResultados()
                         .map(r => ({ ...r, texto: r.texto.trim() }))
                         .filter(r => r.texto),
      fechaInicio:     this.mFechaInicio() || null,
      fechaFin:        this.mFechaFin()    || null,
      diasClase:       this.mDiasClase(),
      horasRequeridas: this.mHorasRequeridas() || null,
    };

    this.saving.set(true);
    const fichaId = this.selectedFichaId()!;
    const obs$    = this.editMode() && this.mId()
      ? this.api.updateCompetencia(this.mId()!, dto)
      : this.api.createCompetencia(dto);

    obs$.subscribe({
      next: () => {
        this.toast.success(this.editMode() ? 'Competencia actualizada' : 'Competencia creada');
        this.closeModal();
        this.saving.set(false);
        this.loadFichaData(fichaId);
      },
      error: () => {
        this.toast.error('Error guardando la competencia');
        this.saving.set(false);
        this.cdr.markForCheck(); this.cdr.detectChanges();
      },
    });
  }

  deleteComp(c: any) {
    if (!confirm(`¿Eliminar la competencia "${c.nombre}"?`)) return;
    const fichaId = this.selectedFichaId()!;
    this.api.deleteCompetencia(c.id).subscribe({
      next: () => { this.toast.success('Competencia eliminada'); this.loadFichaData(fichaId); },
      error: () => this.toast.error('Error eliminando la competencia'),
    });
  }

  // ── Modal extensión ───────────────────────────────────────────
  openExtend(c: any) {
    this.extComp.set(c);
    this.extFechaFin.set(toIso(c.fechaFin));
    this.extendOpen.set(true);
    this.cdr.markForCheck(); this.cdr.detectChanges();
  }

  calcExtDias(): number {
    const c      = this.extComp();
    const newFin = this.extFechaFin();
    if (!c || !newFin) return 0;
    const h      = this.horarios().find(x => x.id === c.asignacionId) ?? c.horario;
    const oldFin = toIso(c.fechaFin);
    if (!oldFin || newFin <= oldFin) return 0;
    const next = new Date(oldFin + 'T12:00:00');
    next.setDate(next.getDate() + 1);
    return generarDias(next.toISOString().slice(0, 10), newFin, h?.diaSemana ?? '').length;
  }

  saveExtend() {
    const c      = this.extComp();
    const newFin = this.extFechaFin();
    if (!c || !newFin || this.calcExtDias() <= 0) return;

    const h      = this.horarios().find(x => x.id === c.asignacionId) ?? c.horario;
    const oldFin = toIso(c.fechaFin);
    const next   = new Date(oldFin + 'T12:00:00');
    next.setDate(next.getDate() + 1);

    const extra   = generarDias(next.toISOString().slice(0, 10), newFin, h?.diaSemana ?? '');
    const allDias = [...new Set([...(c.diasClase ?? []), ...extra])].sort();
    const fichaId = this.selectedFichaId()!;

    this.api.updateCompetencia(c.id, { fechaFin: newFin, diasClase: allDias }).subscribe({
      next: () => {
        this.toast.success(`Competencia extendida: +${extra.length} clase(s) agregada(s)`);
        this.extendOpen.set(false);
        this.loadFichaData(fichaId);
      },
      error: () => this.toast.error('Error al extender la competencia'),
    });
  }

  // ── Helpers de template ───────────────────────────────────────
  getStateInfo(c: any)      { return SINFO[compState(c)]; }
  getHorasComp(c: any)      { return Math.round(horasComp(c) * 100) / 100; }
  countByState(comps: any[], state: CState) { return comps.filter(c => compState(c) === state).length; }
  to12h(t: string)          { return to12h(t); }
  cap(s: string)            { return cap(s); }
  fmtDate(iso: string)      { return fmtDate(iso); }
  toIso(v: any)             { return toIso(v); }
  min100(n: number)         { return Math.min(100, Math.max(0, n)); }
  /** Formatea horas decimales → "Xh Ymin" */
  fmtH(h: number)           { return fmtHoras(h); }

  /** Stats de horas para una competencia */
  getHorasStats(c: any) {
    return this.horasStats().get(c.id) ?? { requeridas: 0, actuales: this.getHorasComp(c), deficit: 0, pct: -1 };
  }

  /** Color de la barra de progreso según porcentaje */
  progColor(pct: number): string {
    if (pct < 0)   return '#6b7280'; // sin target
    if (pct >= 100) return '#22c55e'; // cumple
    if (pct >= 75)  return '#f59e0b'; // cerca
    return '#ef4444';                 // déficit
  }

  /** Clases extra necesarias para cubrir el déficit del modal */
  calcClasesExtra(): number {
    const hId = this.mHorarioId();
    if (!hId) return 0;
    const h = this.horarios().find(x => x.id === hId);
    const dur = h ? horasSesion(h) : 0;
    return dur > 0 ? Math.ceil(this.mDeficitModal() / dur) : 0;
  }

  /** Color único asignado a la competencia (independiente del estado) */
  getCompColor(c: any): string {
    return this.compColorMap().get(c.id) ?? '#6b7280';
  }

  /** Devuelve el horario completo (del array cargado) para mostrar ambiente */
  getFullHorario(horarioId: number | null): any {
    if (!horarioId) return null;
    return this.horarios().find(h => h.id === horarioId) ?? null;
  }

  /** Próxima clase de la competencia después de la fecha dada */
  proximaClase(c: any, desde: string): string {
    const dias = ((c.diasClase ?? []) as string[])
      .map(d => String(d).slice(0, 10))
      .filter(d => d > desde)
      .sort();
    return dias.length ? fmtDate(dias[0]) : 'ninguna';
  }
}
