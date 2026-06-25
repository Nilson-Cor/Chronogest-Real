import { Component, OnInit, signal, computed } from '@angular/core';
import { forkJoin, catchError, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { DIAS_SEMANA, DIAS_LABELS } from '../../../core/models/user.model';
import { LucideAngularModule } from 'lucide-angular';
import { DatePipe, UpperCasePipe } from '@angular/common';

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

@Component({
  selector: 'app-aprendiz-mis-horarios',
  imports: [LucideAngularModule, DatePipe, UpperCasePipe],
  template: `
    <div class="page-header">
      <div><h2>Mis Horarios</h2><p class="text-muted text-sm">Tu programación semanal (Pantalla Completa)</p></div>
    </div>

    @if (ficha()) {
    <div class="ficha-info-card mt-4 mb-4" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; background:var(--surface); padding:14px 18px; border:1px solid var(--border); border-radius:10px;">
      <span class="text-xs text-muted">Ficha:</span>
      <strong>{{ ficha().codigo }}</strong>
      <span class="badge active">{{ ficha().programa }}</span>
      @if (ficha().fechaInicio || ficha().fechaFin) {
        <span class="text-xs text-muted" style="margin-left:auto;"><lucide-icon name="calendar" [size]="14" style="vertical-align:-2px"></lucide-icon> {{ ficha().fechaInicio ?? '?' }} — {{ ficha().fechaFin ?? '?' }}</span>
      }
    </div>
    }

    <div class="matrix-wrap">
      <div class="matrix-grid">
        <!-- HEADER ROW -->
        @for (d of dias; track d) { 
          <div class="matrix-header-col text-center" [class.is-today]="isToday(d)">
            {{ LABELS[d] }}
            @if (isToday(d)) { <br><span class="today-badge mt-1">HOY</span> }
          </div> 
        }
        
        <!-- DATA ROW -->
        @for (d of dias; track d) {
        <div class="matrix-cell" style="position: relative;">
          @if (horariosByDay()[d]?.length) {
            <div style="display:flex; flex-direction:column; gap:12px; width:100%; height:100%">
            @for (h of horariosByDay()[d]; track h.id) {
              <div class="horario-card"
                   [class.active-session]="isActivo(d, h)"
                   [class.en-curso]="!isActivo(d, h) && isEnCursoAp(d, h)">
                <div class="card-layout">

                  <!-- ── Columna izquierda: toda la información ── -->
                  <div class="card-main">
                    <div class="card-top">
                      <div class="info-row"><span class="info-label">Inicio</span><span class="info-val info-time">{{ to12h(h.horaInicio) }}</span></div>
                      <div class="info-row"><span class="info-label">Fin</span><span class="info-val info-time">{{ to12h(h.horaFin) }}</span></div>
                      <div class="info-row"><span class="info-label">Jornada</span><span class="info-val">{{ h.jornada | uppercase }}</span></div>
                      <div class="info-row"><span class="info-label">Instructor</span><span class="info-val">{{ h.instructor?.nombre }} {{ h.instructor?.apellido }}</span></div>
                      <div class="info-row">
                        <span class="info-label">Ambiente</span>
                        <span class="info-val">
                          @if (h.ubicacionTransversalNombre && h.ambiente?.nombre) {
                            <span class="amb-temp-wrap">
                              <span style="color:#d97706;font-weight:700;">{{ h.ubicacionTransversalNombre }}</span>
                              <lucide-icon name="info" [size]="10" style="color:#d97706;flex-shrink:0;"></lucide-icon>
                              <span class="amb-temp-tooltip">
                                <span class="amb-temp-row">
                                  <span class="amb-temp-lbl">Temporal</span>
                                  <span>{{ h.ubicacionTransversalNombre }}</span>
                                </span>
                                <span class="amb-temp-row">
                                  <span class="amb-temp-lbl">Real asignado</span>
                                  <span>{{ h.ambiente.nombre }}</span>
                                </span>
                              </span>
                            </span>
                          } @else if (h.ambiente?.nombre) {
                            {{ h.ambiente.nombre }}
                          } @else if (h.ubicacionTransversalNombre) {
                            <span style="font-weight:700;color:var(--blue)">{{ h.ubicacionTransversalNombre }}</span>
                          } @else {
                            —
                          }
                        </span>
                      </div>

                      @if (h.minutosRetraso > 0 && isToday(d)) {
                        <div class="retraso-badge mt-2">Retraso: {{ h.minutosRetraso }} min</div>
                      }
                    </div><!-- end card-top -->

                    <div class="card-bottom">
                      @if (isActivo(d, h)) {
                        <div class="status-pill status-activa">
                          <lucide-icon name="radio" [size]="9"></lucide-icon> Clase activa
                        </div>
                        <div class="progress-bar mt-2">
                          <div class="progress-fill" [style.width.%]="calcDayProgress(h)"></div>
                        </div>
                        <div class="text-xs text-muted text-right mt-1">En curso · {{ calcDayProgress(h) }}%</div>
                      } @else if (isEnCursoAp(d, h)) {
                        <div class="status-pill status-en-horario">
                          <lucide-icon name="clock" [size]="9"></lucide-icon> En horario
                        </div>
                        <div class="progress-bar mt-2">
                          <div class="progress-fill progress-fill-light" [style.width.%]="calcDayProgress(h)"></div>
                        </div>
                        <div class="text-xs text-muted text-right mt-1">{{ calcDayProgress(h) }}%</div>
                      } @else if (isHoyFinalizado(d, h)) {
                        <div class="text-xs text-muted text-center mt-2">Horario finalizado</div>
                      }
                    </div><!-- end card-bottom -->
                  </div><!-- end card-main -->

                  <!-- ── Columna derecha: iconos interactivos ── -->
                  <div class="card-actions-col">
                    <div class="card-help-btn"
                         [class.card-help-active]="tooltipState()?.h?.id === h.id"
                         (click)="toggleTooltip(h, getCompetenciaVigente(h), $event)">
                      <lucide-icon name="help-circle" [size]="15"></lucide-icon>
                    </div>
                    @if (fichaEventos().length && isToday(d)) {
                      @for (ev of fichaEventos(); track ev.id) {
                        <button [class]="'ev-notif-btn ev-notif-' + ev.tipo"
                                (mouseenter)="showEventoTooltip(ev, $event)"
                                (mouseleave)="hideEventoTooltip()">
                          <lucide-icon name="bell" [size]="9"></lucide-icon>
                        </button>
                      }
                    }
                  </div>

                </div><!-- end card-layout -->
              </div>
            }
            </div>
          } @else {
            <span style="color:var(--border);font-size:12px; margin: auto;">—</span>
          }
        </div>
        }
      </div>
    </div>

    <!-- Tooltip fijo encima de todo, alineado al top del card -->
    @if (tooltipState()) {
      <div class="tt-fixed-box"
           [style.left.px]="tooltipState()!.x"
           [style.top.px]="tooltipState()!.y"
           (click)="$event.stopPropagation()">
        <!-- Cabecera: navegación + label + copiar + cerrar -->
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;">
          @if ((tooltipState()!.h.competencias ?? []).length > 1) {
            <button class="tt-close-btn" (click)="ttPrevComp()" title="Anterior">
              <lucide-icon name="chevron-left" [size]="11"></lucide-icon>
            </button>
          }
          <p class="tt-label" style="margin:0;font-size:11px;flex:1;">
            COMPETENCIA
            @if ((tooltipState()!.h.competencias ?? []).length > 1) {
              <span style="font-weight:400;color:var(--text-muted);">
                {{ tooltipState()!.compIdx + 1 }}/{{ (tooltipState()!.h.competencias ?? []).length }}
              </span>
            }
          </p>
          @if ((tooltipState()!.h.competencias ?? []).length > 1) {
            <button class="tt-close-btn" (click)="ttNextComp()" title="Siguiente">
              <lucide-icon name="chevron-right" [size]="11"></lucide-icon>
            </button>
          }
          <button class="tt-close-btn" [class.tt-copy-ok]="apCopied()"
                  (click)="copiarCompetenciaAp()" [title]="apCopied() ? '¡Copiado!' : 'Copiar'">
            <lucide-icon [name]="apCopied() ? 'check' : 'copy'" [size]="11"></lucide-icon>
          </button>
          <button class="tt-close-btn" (click)="hideTooltip()" title="Cerrar">
            <lucide-icon name="x" [size]="12"></lucide-icon>
          </button>
        </div>
        <!-- Nombre -->
        <p style="color:var(--text);font-weight:700;font-size:14px;margin:0 0 6px;">{{ tooltipState()!.comp.nombre }}</p>
        @let compResultadosTT = resultadosDe(tooltipState()!.comp);
        @if (compResultadosTT.length > 0) {
          <p class="tt-label mt-2">RESULTADOS</p>
          <div class="tt-resultados-list">
            @for (r of compResultadosTT; track $index) {
              <div class="tt-resultado-row">
                <lucide-icon [name]="estadoResultadoIcon(r)" [size]="13" [style.color]="estadoResultadoInfo(r).text"></lucide-icon>
                <span>{{ r.texto }}</span>
              </div>
            }
          </div>
        }
        <p class="tt-label mt-2">PERÍODO</p>
        <p style="color:var(--text);font-size:12px;margin:2px 0 4px;">
          {{ tooltipState()!.comp.fechaInicio | date:'dd/MM/yyyy' }} — {{ tooltipState()!.comp.fechaFin | date:'dd/MM/yyyy' }}
        </p>
        <p class="tt-label mt-2">PROGRESO</p>
        <div class="progress-bar mt-1">
          <div class="progress-fill" [style.width.%]="getProgresoCompetencia(tooltipState()!.comp)"></div>
        </div>
        <p style="font-size:11px;color:var(--text-muted);text-align:right;margin:4px 0 0;">{{ getProgresoCompetencia(tooltipState()!.comp) }}%</p>
        <!-- Horario recurrente — una sola vez -->
        <p class="tt-label mt-2">HORARIO</p>
        <div class="tt-horario-compact">
          <div class="tt-horario-row"><lucide-icon name="calendar" [size]="12"></lucide-icon> Todos los {{ diaPluralLabel(tooltipState()!.h.diaSemana) }}</div>
          <div class="tt-horario-row"><lucide-icon name="clock" [size]="12"></lucide-icon> {{ to12h(tooltipState()!.h.horaInicio) }} — {{ to12h(tooltipState()!.h.horaFin) }}</div>
          <div class="tt-horario-row"><lucide-icon name="hourglass" [size]="12"></lucide-icon> {{ formatHorasPorDiaStr(tooltipState()!.h) }} por clase</div>
        </div>
        <!-- Clases — lista compacta de fechas -->
        @if ((tooltipState()!.comp.diasClase ?? []).length > 0) {
          <p class="tt-label mt-2">CLASES ({{ (tooltipState()!.comp.diasClase ?? []).length }})</p>
          <div class="tt-clases-chips">
            @for (iso of (tooltipState()!.comp.diasClase ?? []); track iso) {
              <span class="tt-clase-chip">{{ formatFechaCorta(iso) }}</span>
            }
          </div>
        }
      </div>
    }

    <!-- Tooltip de Evento activo -->
    @if (eventoTooltip()) {
      <div [class]="'ev-tooltip-box ev-tooltip-' + eventoTooltip()!.ev.tipo"
           [style.left.px]="eventoTooltip()!.x"
           [style.top.px]="eventoTooltip()!.y">
        <p style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;opacity:.8;margin-bottom:5px;">
          {{ tipoLabelEvento(eventoTooltip()!.ev.tipo) }}
        </p>
        <p style="font-weight:700;font-size:14px;margin:0 0 2px;color:inherit;">{{ eventoTooltip()!.ev.nombre }}</p>
        @if (eventoTooltip()!.ev.horaInicio) {
          <p style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;margin-top:6px;opacity:.85;">
            <lucide-icon name="clock" [size]="11"></lucide-icon>
            {{ to12h(eventoTooltip()!.ev.horaInicio) }} — {{ to12h(eventoTooltip()!.ev.horaFin) }}
          </p>
        }
        @if (eventoTooltip()!.ev.ubicacionNombre || eventoTooltip()!.ev.lugar) {
          <p style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;margin-top:4px;opacity:.85;">
            <lucide-icon name="map-pin" [size]="11"></lucide-icon>
            {{ eventoTooltip()!.ev.ubicacionNombre ?? eventoTooltip()!.ev.lugar }}
            @if (eventoTooltip()!.ev.ubicacionArea) {
              <span style="opacity:.7;font-weight:400;">— {{ eventoTooltip()!.ev.ubicacionArea }}</span>
            }
          </p>
        }
        @if (eventoTooltip()!.ev.descripcion) {
          <p style="font-size:12px;opacity:.75;border-top:1px solid currentColor;padding-top:6px;margin-top:6px;">{{ eventoTooltip()!.ev.descripcion }}</p>
        }
      </div>
    }
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
    
    .matrix-wrap { width: 100%; background: #fff; border: 1px solid var(--border); border-radius: 8px; overflow-x: auto; overflow-y: visible; display:flex; flex-direction:column; }
    .matrix-grid { 
      display: grid; 
      grid-template-columns: repeat(6, minmax(0, 1fr));
      border-radius: 8px; overflow: visible; min-width: 1000px;
    }
    
    .matrix-header-col {
      background: var(--surface2); padding: 12px; font-weight: 800; font-size: 13px; color: var(--text); border-bottom: 2px solid var(--border); border-right: 1px solid var(--border);
    }
    .matrix-header-col.is-today { background: #e0f2fe; color: var(--blue); }
    .matrix-cell {
      padding: 8px; border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); display: flex; align-items: stretch; position: relative;
      background: var(--surface); min-height: 220px;
    }
    .matrix-header-col:last-child, .matrix-cell:last-child { border-right: none; }
    .today-badge { display:inline-block; background: var(--blue); color: #fff; border-radius: 12px; padding: 2px 8px; font-size: 10px; }

    /* Horario Card */
    .horario-card {
      background: var(--surface); width: 100%; min-width: 0;
      border: 1.5px solid var(--border); border-radius: 6px; padding: 10px;
      margin-bottom: 8px; font-size: 13px; color: var(--text);
      transition: border-color .2s, box-shadow .2s;
      display: flex; flex-direction: column;
    }
    .horario-card.active-session { border-color: var(--blue); box-shadow: 0 4px 12px rgba(59,130,246,0.15); background: #f8fafc; }
    .horario-card.en-curso { border-color: var(--blue) !important; box-shadow: 0 0 0 2px rgba(37,99,235,0.13) !important; }
    /* Layout de dos columnas */
    .card-layout {
      display: flex; flex: 1; gap: 0; min-width: 0;
    }
    .card-main {
      flex: 1; min-width: 0; display: flex; flex-direction: column;
    }
    .card-actions-col {
      display: flex; flex-direction: column; align-items: center; gap: 5px;
      padding: 2px 0 2px 6px;
      margin-left: 6px;
      border-left: 1px solid var(--border);
      min-width: 26px; flex-shrink: 0;
    }
    .card-help-btn {
      color: var(--text-muted); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border-radius: 50%;
      transition: color .15s, background .15s;
    }
    .card-help-btn:hover { color: var(--blue); background: #eff6ff; }
    .card-top { flex: 1; display: flex; flex-direction: column; }
    .card-bottom { display: flex; flex-direction: column; margin-top: 8px; }

    .progress-bar { height: 6px; background: var(--gray-200); border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; background: var(--blue); transition: width 1s linear; }

    /* ── Filas etiqueta-valor dentro de la card ── */
    .info-row {
      margin-top: 3px; line-height: 1.4;
    }
    .info-label {
      color: var(--text-muted); font-weight: 500;
      font-size: 11px; font-family: inherit;
      white-space: nowrap;
    }
    .info-label::after { content: ': '; }
    .info-val {
      color: var(--text); font-weight: 600;
      font-size: 11px; font-family: inherit;
    }
    .info-time { font-weight: 700; }

    /* Badge activo → azul */
    .badge.active { background: #dbeafe !important; color: #1d4ed8 !important; border-color: #bfdbfe !important; }

    /* Trigger + tooltip de ubicación temporal */
    .amb-temp-wrap {
      position: relative; display: inline-flex; align-items: center;
      gap: 3px; cursor: help;
    }
    .amb-temp-tooltip {
      display: none; position: absolute; z-index: 9999;
      left: 0; top: calc(100% + 5px);
      background: #1e293b; color: #f1f5f9;
      border-radius: 8px; padding: 9px 12px;
      font-size: 11px; white-space: nowrap;
      box-shadow: 0 6px 16px rgba(0,0,0,.3);
      pointer-events: none;
    }
    .amb-temp-wrap:hover .amb-temp-tooltip { display: block; }
    .amb-temp-lbl {
      color: #94a3b8; font-size: 9px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .06em;
      display: block; margin-bottom: 2px;
    }
    .amb-temp-row { display: flex; flex-direction: column; }
    .amb-temp-row + .amb-temp-row { margin-top: 7px; }

    .retraso-badge {
      display: inline-block; background: #fee2e2; color: #dc2626; border-radius: 4px; padding: 3px 6px; font-size: 10px; font-weight: 700; border: 1px solid #fca5a5;
    }

    /* ── Botón de notificación de evento (columna derecha) ── */
    .ev-notif-btn {
      width: 22px; height: 22px; border-radius: 6px; border: none;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: transform .15s, opacity .2s;
      box-shadow: 0 1px 3px rgba(0,0,0,.12);
    }
    .ev-notif-btn:hover { transform: scale(1.18); }
    .ev-notif-formativo     { background: #dbeafe; color: #1d4ed8; }
    .ev-notif-institucional { background: #dcfce7; color: #166534; }
    .ev-notif-evaluacion    { background: #fed7aa; color: #92400e; }
    .ev-notif-festivo       { background: #fee2e2; color: #991b1b; }

    /* ── Pastillas de estado en card-bottom ── */
    .status-pill {
      display: inline-flex; align-items: center; gap: 4px;
      border-radius: 6px; padding: 3px 8px;
      font-size: 10px; font-weight: 700; width: fit-content;
    }
    .status-activa      { background: #dbeafe; color: #1d4ed8; }
    .status-en-horario  { background: #f0f9ff; color: #0369a1; }
    .progress-fill-light { background: #93c5fd; }

    /* ── Tooltip flotante de Evento ── */
    .ev-tooltip-box {
      position: fixed; z-index: 9999;
      width: 240px; padding: 12px 14px;
      border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.15);
      font-size: 13px; pointer-events: none; border: 1.5px solid;
    }
    .ev-tooltip-formativo     { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
    .ev-tooltip-institucional { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
    .ev-tooltip-evaluacion    { background: #fff7ed; border-color: #fed7aa; color: #92400e; }
    .ev-tooltip-festivo       { background: #fef2f2; border-color: #fecaca; color: #991b1b; }

    /* ── Botones en tooltip de competencia ── */
    .card-help-active { color: var(--blue) !important; background: #eff6ff !important; }
    .tt-close-btn {
      display: flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border-radius: 6px;
      border: 1px solid var(--border); background: var(--surface2);
      cursor: pointer; color: var(--text-muted); transition: all .15s; flex-shrink: 0;
    }
    .tt-close-btn:hover { background: #eff6ff; color: var(--blue); border-color: var(--blue); }
    .tt-copy-ok { background: #dcfce7 !important; color: #166534 !important; border-color: #86efac !important; }

    /* ── Tabla dos columnas: días de formación ── */
    .tt-form-table { margin-top:10px; border:1px solid #bfdbfe; border-radius:7px; overflow:hidden; }
    .tt-form-header-row { display:flex; align-items:center; justify-content:space-between; gap:6px; padding:5px 9px; background:#dbeafe; border-bottom:1px solid #bfdbfe; }
    .tt-form-lbl { font-size:10px; font-weight:700; color:#1d4ed8; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap; }
    .tt-form-lbl strong { color:#1e40af; font-weight:800; }
    .tt-form-row { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:4px 9px; border-top:1px solid #e0f2fe; background:var(--surface); }
    .tt-form-dia { font-size:11px; font-weight:700; color:var(--text); min-width:95px; white-space:nowrap; }
    .tt-form-hrs { font-size:10px; color:var(--text-muted); text-align:right; white-space:nowrap; }

    /* ── Card de competencia compacta: resultados / horario / clases ── */
    .tt-resultados-list { display:flex; flex-direction:column; gap:3px; margin:2px 0 0; }
    .tt-resultado-row { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text); }
    .tt-horario-compact { display:flex; flex-direction:column; gap:3px; margin:2px 0 0; font-size:12px; color:var(--text); }
    .tt-horario-row { display:flex; align-items:center; gap:6px; }
    .tt-horario-row lucide-icon { color:var(--text-muted); flex-shrink:0; }
    .tt-clases-chips { display:flex; flex-wrap:wrap; gap:5px; margin:4px 0 0; }
    .tt-clase-chip { font-size:10px; font-weight:600; color:#1d4ed8; background:#eff6ff; border:1px solid #bfdbfe; border-radius:5px; padding:2px 6px; }
  `],
})
export class AprendizMisHorariosComponent implements OnInit {
  readonly hoyIso = new Date().toISOString().slice(0, 10);

  /** Normaliza c.resultados (puede venir en formato legado string[]) para mostrarlos */
  resultadosDe(c: any): Resultado[] {
    return normalizarResultados(c?.resultados);
  }

  estadoResultadoInfo(r: Resultado) {
    return RESULTADO_ESTADO_INFO[estadoResultado(r, this.hoyIso)];
  }

  readonly LABELS = DIAS_LABELS;
  dias = [...DIAS_SEMANA] as string[];
  ficha = signal<any>(null);
  horariosByDay = signal<Record<string, any[]>>({});
  tooltipState = signal<{ h: any; comp: any; compIdx: number; x: number; y: number } | null>(null);
  apCopied = signal(false);
  eventoTooltip = signal<{ ev: any; x: number; y: number } | null>(null);
  eventos = signal<any[]>([]);

  // Eventos activos HOY para la ficha del aprendiz
  fichaEventos = computed(() => {
    const d = new Date();
    // Usar hora LOCAL (toISOString devuelve UTC y puede diferir en zonas GMT-)
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const nowMin = d.getHours() * 60 + d.getMinutes();
    // Los eventos ya vienen filtrados por fichaId desde el backend (JSONB @>)
    return this.eventos().filter(ev => {
      if (!ev.fechaInicio) return false;
      const start = ev.fechaInicio.split('T')[0];
      const end = (ev.fechaFin ?? ev.fechaInicio).split('T')[0];
      if (!(today >= start && today <= end)) return false;
      // Si el evento termina hoy y tiene horaFin, ocultar si ya pasó la hora
      if (today === end && ev.horaFin) {
        const [hh, mm] = ev.horaFin.split(':').map(Number);
        if (nowMin > hh * 60 + mm) return false;
      }
      return true;
    });
  });

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit() {
    const u = this.auth.currentUser();
    if (!u?.id) return;

    const iniciar = (fichaId: string) => {
      // setTimeout(0) difiere la carga al siguiente ciclo del event loop,
      // DESPUÉS de que cualquier transición de ruta haya terminado.
      // Esto garantiza que Angular detecte la actualización de señales correctamente.
      setTimeout(() => {
        this.cargarDatos(fichaId);
        this.api.getEventosByFicha(fichaId).pipe(catchError(() => of([]))).subscribe(
          (e: any[]) => this.eventos.set(e ?? [])
        );
      }, 0);

      // Refrescar cada minuto para animar la barra de progreso
      setInterval(() => {
        this.horariosByDay.set({ ...this.horariosByDay() });
        this.api.getEventosByFicha(fichaId).pipe(catchError(() => of([]))).subscribe(
          (e: any[]) => this.eventos.set(e ?? [])
        );
      }, 60000);
    };

    if (u.fichaId) {
      // fichaId ya está en el JWT — usar directamente
      iniciar(u.fichaId as unknown as string);
    } else {
      // fichaId ausente en el JWT (token viejo) — consultar desde la DB
      this.api.getAprendiz(u.id).pipe(catchError(() => of(null))).subscribe((ap: any) => {
        const fid = ap?.fichaId ?? ap?.ficha?.id ?? null;
        if (!fid) return;
        // Actualizar usuario en memoria para no repetir la consulta si navega
        this.auth.updateCurrentUser({ fichaId: fid } as any);
        iniciar(fid);
      });
    }
  }

  toggleTooltip(h: any, comp: any, event: MouseEvent) {
    event.stopPropagation();
    if (!comp) return;
    if (this.tooltipState()?.h?.id === h.id) { this.hideTooltip(); return; }
    const icon = event.currentTarget as HTMLElement;
    const card = icon.closest('.horario-card');
    const iconRect = icon.getBoundingClientRect();
    const cardTop  = card ? card.getBoundingClientRect().top : iconRect.top;
    const tooltipW = 320;
    const x = iconRect.right + 8 + tooltipW > window.innerWidth
      ? iconRect.left - tooltipW - 8
      : iconRect.right + 8;
    const comps: any[] = h.competencias ?? [];
    const compIdx = Math.max(0, comps.findIndex((c: any) => c.id === comp.id));
    this.tooltipState.set({ h, comp, compIdx, x, y: cardTop });
  }

  showTooltip(h: any, comp: any, event: MouseEvent) { this.toggleTooltip(h, comp, event); }
  hideTooltip() { this.tooltipState.set(null); }

  ttPrevComp() {
    const s = this.tooltipState();
    if (!s) return;
    const comps: any[] = s.h.competencias ?? [];
    if (comps.length <= 1) return;
    const newIdx = (s.compIdx - 1 + comps.length) % comps.length;
    this.tooltipState.set({ ...s, comp: comps[newIdx], compIdx: newIdx });
  }

  ttNextComp() {
    const s = this.tooltipState();
    if (!s) return;
    const comps: any[] = s.h.competencias ?? [];
    if (comps.length <= 1) return;
    const newIdx = (s.compIdx + 1) % comps.length;
    this.tooltipState.set({ ...s, comp: comps[newIdx], compIdx: newIdx });
  }

  formatDiaClase(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dias = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];
    return `${dias[date.getDay()]} ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}`;
  }

  /** Nombre completo del día + fecha "Viernes: 12/04" */
  formatDiaClaseFull(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    return `${dias[date.getDay()]}: ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}`;
  }

  /** "10/06" — solo la fecha, sin nombre del día (para listas compactas) */
  formatFechaCorta(iso: string): string {
    if (!iso) return '';
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  }

  /** "lunes" → "lunes", "sabado" → "sábados" (para "Todos los ___") */
  diaPluralLabel(dia: string): string {
    const map: Record<string, string> = {
      lunes: 'lunes', martes: 'martes', miercoles: 'miércoles', miércoles: 'miércoles',
      jueves: 'jueves', viernes: 'viernes', sabado: 'sábados', sábado: 'sábados', domingo: 'domingos',
    };
    return map[dia?.toLowerCase()] ?? dia ?? '';
  }

  /** Ícono según el estado del resultado: check si ya completó, reloj en otro caso */
  estadoResultadoIcon(r: Resultado): string {
    return estadoResultado(r, this.hoyIso) === 'completado' ? 'check-circle' : 'hourglass';
  }

  /** "Xh" — duración del horario en texto corto */
  formatHorasPorDiaStr(h: any): string {
    if (!h?.horaInicio || !h?.horaFin) return '';
    const [sh, sm] = h.horaInicio.split(':').map(Number);
    const [eh, em] = h.horaFin.split(':').map(Number);
    const s = sh * 60 + sm, e = eh * 60 + em;
    const durMin = e < s ? (e + 1440) - s : e - s;
    const horas = durMin / 60;
    const horasStr = Number.isInteger(horas) ? String(horas) : horas.toFixed(1);
    return `${horasStr}h`;
  }

  calcHorasCompetencia(comp: any, h: any): string {
    const dias = (comp?.diasClase ?? []).length;
    if (!dias || !h?.horaInicio || !h?.horaFin) return '0';
    const [sh, sm] = h.horaInicio.split(':').map(Number);
    const [eh, em] = h.horaFin.split(':').map(Number);
    const s = sh * 60 + sm, e = eh * 60 + em;
    const durMin = e < s ? (e + 1440) - s : e - s;
    const total = (dias * durMin) / 60;
    return Number.isInteger(total) ? String(total) : total.toFixed(1);
  }

  copiarCompetenciaAp() {
    const state = this.tooltipState();
    if (!state) return;
    const { comp, h } = state;
    const horas    = this.calcHorasCompetencia(comp, h);
    const diasArr: string[] = comp.diasClase ?? [];
    const fmt = (iso: string) => iso?.split('T')[0]?.split('-').reverse().join('/') ?? '';
    const lines: string[] = [`Competencia: ${comp.nombre}`];
    const compResultadosCopy = this.resultadosDe(comp);
    if (compResultadosCopy.length) {
      lines.push(`Resultados: ${compResultadosCopy.map(r => `${r.texto} (${this.estadoResultadoInfo(r).label})`).join(' | ')}`);
    }
    if (comp.fechaInicio) lines.push(`Período: ${fmt(comp.fechaInicio)} — ${fmt(comp.fechaFin ?? comp.fechaInicio)}`);
    lines.push(`Progreso: ${this.getProgresoCompetencia(comp)}%`);
    if (diasArr.length > 0) {
      const rango = `${this.to12h(h.horaInicio)} — ${this.to12h(h.horaFin)}`;
      lines.push(`Horario: Todos los ${this.diaPluralLabel(h.diaSemana)}, ${rango} (${this.formatHorasPorDiaStr(h)} por clase, ${horas}h en total)`);
      lines.push(`Clases (${diasArr.length}): ${diasArr.map(iso => this.formatFechaCorta(iso)).join(', ')}`);
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      this.apCopied.set(true);
      setTimeout(() => this.apCopied.set(false), 2000);
    });
  }

  cargarDatos(fichaIdParam?: string) {
    const fichaId = fichaIdParam ?? (this.auth.currentUser() as any)?.fichaId;
    if (!fichaId) return;
    forkJoin({
      horarios:     this.api.getHorariosByFicha(fichaId),
      fichas:       this.api.getFichas().pipe(catchError(() => of([]))),
      ambientes:    this.api.getAmbientes().pipe(catchError(() => of([]))),
      instructores: this.api.getInstructores().pipe(catchError(() => of([]))),
    }).subscribe(({ horarios, fichas, ambientes, instructores }) => {
      const fichaMap  = new Map<string, any>((fichas       as any[]).map((f: any) => [String(f.id), f]));
      const ambMap    = new Map<string, any>((ambientes    as any[]).map((a: any) => [String(a.id), a]));
      const instrMap  = new Map<string, any>((instructores as any[]).map((i: any) => [String(i.id), i]));

      // Extraer info de la ficha del resultado del forkJoin (evita llamada duplicada)
      const fichaInfo = fichaMap.get(String(fichaId)) ?? null;
      if (fichaInfo) this.ficha.set(fichaInfo);

      const byDay: Record<string, any[]> = {};
      this.dias.forEach(d => byDay[d] = []);
      (horarios as any[]).forEach((hor: any) => {
        const enriched = {
          ...hor,
          ficha:      hor.fichaId      ? (fichaMap.get(String(hor.fichaId))   ?? null) : null,
          ambiente:   hor.ambienteId   ? (ambMap.get(String(hor.ambienteId))  ?? null) : null,
          instructor: hor.instructorId ? (instrMap.get(String(hor.instructorId)) ?? null) : null,
        };
        if (!byDay[enriched.diaSemana]) byDay[enriched.diaSemana] = [];
        byDay[enriched.diaSemana].push(enriched);
      });
      Object.keys(byDay).forEach(k => {
        byDay[k].sort((a: any, b: any) => (a.horaInicio ?? '').localeCompare(b.horaInicio ?? ''));
      });
      this.horariosByDay.set(byDay);
    });
  }

  isToday(dia: string): boolean {
    const days = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
    return days[new Date().getDay()] === dia;
  }

  private enRangoHorario(h: any): boolean {
    if (!h.horaInicio || !h.horaFin) return false;
    const [sh, sm] = h.horaInicio.split(':').map(Number);
    const [eh, em] = h.horaFin.split(':').map(Number);
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    return nowMin >= sh * 60 + sm && nowMin <= eh * 60 + em;
  }

  // Verifica que ultimaActivacion corresponda a HOY (evita sesiones rancias de días anteriores)
  private activacionEsHoy(h: any): boolean {
    if (!h.ultimaActivacion) return false;
    const act = new Date(h.ultimaActivacion);
    const hoy = new Date();
    return act.getFullYear() === hoy.getFullYear() &&
           act.getMonth()    === hoy.getMonth()    &&
           act.getDate()     === hoy.getDate();
  }

  // El instructor activó la sesión HOY Y estamos dentro del rango horario
  isActivo(dia: string, h: any): boolean {
    return this.isToday(dia) && this.activacionEsHoy(h) && this.enRangoHorario(h);
  }

  // Estamos dentro del rango de tiempo del horario (sin importar activación)
  isEnCursoAp(dia: string, h: any): boolean {
    return this.isToday(dia) && this.enRangoHorario(h);
  }

  // El horario fue activado hoy pero ya pasó el tiempo fin
  isHoyFinalizado(dia: string, h: any): boolean {
    return this.isToday(dia) && this.activacionEsHoy(h) && !this.enRangoHorario(h);
  }

  now() { return new Date(); }

  calcDayProgress(h: any): number {
    if (!h.horaInicio || !h.horaFin) return 0;
    const curr = this.now();
    const [sh, sm] = h.horaInicio.split(':').map(Number);
    const [eh, em] = h.horaFin.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const nowMin = curr.getHours() * 60 + curr.getMinutes();
    
    if (nowMin < startMin) return 0;
    if (nowMin > endMin) return 100;
    return Math.round(((nowMin - startMin) / (endMin - startMin)) * 100);
  }

  getCompetenciaVigente(h: any): any | null {
    if (!h.competencias || h.competencias.length === 0) return null;
    const current = this.now();
    const vigente = h.competencias.find((c: any) => {
      if (!c.fechaInicio) return true;
      const start = new Date(c.fechaInicio);
      const end = c.fechaFin ? new Date(c.fechaFin) : new Date('2099-01-01');
      return current >= start && current <= end;
    });
    return vigente || h.competencias[h.competencias.length - 1];
  }

  getProgresoCompetencia(c: any): number {
    if (!c || !c.fechaInicio) return 0;
    const start = new Date(c.fechaInicio).getTime();
    const end = c.fechaFin ? new Date(c.fechaFin).getTime() : new Date().getTime();
    const now = new Date().getTime();
    if (now < start) return 0;
    if (now > end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }

  showEventoTooltip(ev: any, event: MouseEvent) {
    const el = event.currentTarget as HTMLElement;
    const card = el.closest('.horario-card');
    const rect = el.getBoundingClientRect();
    const cardRect = card ? card.getBoundingClientRect() : rect;
    const tooltipW = 240;
    const x = cardRect.right + 12 + tooltipW > window.innerWidth
      ? cardRect.left - tooltipW - 12
      : cardRect.right + 12;
    const y = Math.min(Math.max(rect.top - 8, 8), window.innerHeight - 210);
    this.eventoTooltip.set({ ev, x, y });
  }
  hideEventoTooltip() { this.eventoTooltip.set(null); }

  tipoLabelEvento(t: string): string {
    return ({ formativo: 'Formativo', institucional: 'Institucional', evaluacion: 'Evaluación', festivo: 'Festivo / No lectivo' } as any)[t] ?? t;
  }

  /** Convierte "HH:MM:SS" o "HH:MM" a formato 12h con am/pm */
  to12h(time: string | null | undefined): string {
    if (!time) return '—';
    const [hStr, mStr] = time.slice(0, 5).split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ?? '00';
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }
}
