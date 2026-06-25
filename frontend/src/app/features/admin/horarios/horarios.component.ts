import { Component, OnInit, OnDestroy, signal, computed, effect, inject, NgZone, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { DIAS_SEMANA, DIAS_LABELS } from '../../../core/models/user.model';
import { LucideAngularModule } from 'lucide-angular';
import { SearchableSelectComponent, SSOption } from '../../../shared/components/searchable-select.component';
import { ToastService } from '../../../core/services/toast.service';

const JORNADAS = [
  { key: 'manana', label: 'Mañana (07:00–12:00)', inicio: '07:00', fin: '12:00' },
  { key: 'tarde', label: 'Tarde (13:00–17:00)', inicio: '13:00', fin: '17:00' },
  { key: 'noche', label: 'Noche (18:00–20:00)', inicio: '18:00', fin: '20:00' },
];

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
  selector: 'app-admin-horarios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideAngularModule, SearchableSelectComponent, DatePipe],
  template: `
    <div class="page-header" style="display:flex; align-items:flex-end; justify-content:space-between; flex-wrap:wrap; gap:16px;">
      <div>
        <h2>{{ pageTitle() }}</h2>
        <p class="text-muted text-sm">{{ pageSubtitle() }} — {{ tableRows().length }} total</p>
      </div>
      
      <!-- TOOLBAR: DISP_TITULO (Izquierda), LUPA Y BOTON (Derecha) -->
      <div class="toolbar" style="display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-left:auto; width:100%; justify-content:flex-end;">
        
        <!-- Título Informativo de Ambientes pegado a la Lupa -->
        @if (activeTab() === 'ambiente') {
           <div style="font-weight:600; font-size:13px; color:var(--text-muted); margin-right:auto; padding-top:10px;">
             <lucide-icon name="search" [size]="14" style="vertical-align:-2px; margin-right:4px; opacity:0.7;"></lucide-icon>
             Consultar Disponibilidad de Ambientes
           </div>
        }

        <button class="btn btn-outline" style="padding:9px 14px; white-space:nowrap; display:flex; align-items:center; gap:6px;" (click)="openHistorial()">
          <lucide-icon name="clock" [size]="15"></lucide-icon> Historial
        </button>
        <button class="btn btn-outline" style="padding:9px 14px; white-space:nowrap; display:flex; align-items:center; gap:6px;" (click)="descargarReporte()">
          <lucide-icon name="download" [size]="15"></lucide-icon> Reporte del Día
        </button>
        <button class="btn btn-blue" style="padding:9px 16px; white-space:nowrap;" (click)="openNew()">+ Nuevo Horario</button>
      </div>
    </div>

    <div class="matrix-wrap mt-4">

      <!-- BUSCADOR + FILTRO JORNADA integrado en la tabla -->
      <div class="matrix-search-bar">
        <div class="tbl-search-wrap">
          <lucide-icon name="search" [size]="14" class="tbl-search-icon"></lucide-icon>
          <input class="tbl-search-input"
                 [ngModel]="searchDisplay"
                 (ngModelChange)="onSearch($event)"
                 placeholder="Buscar instructor, ficha o ambiente...">
        </div>
        <!-- Filtro de jornada -->
        <div class="jornada-filter-chips">
          @for (chip of jornadaChips; track chip.key) {
            <button class="jornada-chip" [class.active]="filterJornada() === chip.key"
                    (click)="filterJornada.set(chip.key)">{{ chip.label }}</button>
          }
        </div>
        <span class="tbl-results-count">{{ filteredRows().length }} fila{{ filteredRows().length !== 1 ? 's' : '' }}</span>
      </div>

      <!-- HEADER "INTEGRADO" DE DISPONIBILIDAD AMBIENTES (Sólo en pestaña ambientes) -->
      @if (activeTab() === 'ambiente') {
        <div class="matrix-disp-header" style="display:flex; align-items:center; gap:10px; padding:12px 16px; background:#f8fafc; border-bottom:1px solid var(--border); flex-wrap:wrap;">
          <div style="min-width:130px; flex:1; max-width:160px;">
            <app-ss [options]="dispDiaOpts()" placeholder="Todos los días" [(ngModel)]="dispDia"></app-ss>
          </div>
          <div style="min-width:120px; flex:1; max-width:150px;">
            <app-ss [options]="dispJornadaOpts" placeholder="Jornada..." [(ngModel)]="dispJornada"></app-ss>
          </div>
          <div style="min-width:130px; flex:1; max-width:175px;">
            <app-ss [options]="dispAreaOpts()" placeholder="Todas las áreas" [(ngModel)]="dispArea"></app-ss>
          </div>
          <button class="btn btn-blue" style="height:34px; padding:0 14px; font-size:12px; white-space:nowrap;" (click)="checkDisp()">
            <lucide-icon name="search" [size]="13" style="vertical-align:-2px;margin-right:4px;"></lucide-icon>Verificar
          </button>
          @if (dispResult().length > 0 || dispDia || dispJornada || dispArea) {
            <button class="btn btn-outline" style="height:34px; padding:0 12px; font-size:12px; white-space:nowrap; display:flex; align-items:center; gap:5px;" (click)="clearDisp()">
              <lucide-icon name="x" [size]="12"></lucide-icon> Limpiar
            </button>
          }
        </div>

        @if (dispResult().length > 0) {
          <div style="padding:6px 16px; background:#f0f4ff; border-bottom:1px solid var(--border); font-size:11px; color:var(--text-muted); display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <lucide-icon name="filter" [size]="11" style="opacity:.6;"></lucide-icon>
            <span><strong>{{ dispResultFiltered().length }}</strong> ambiente{{ dispResultFiltered().length !== 1 ? 's' : '' }}
              @if (dispResultFiltered().length !== dispResult().length) { <span style="opacity:.7;">(de {{ dispResult().length }})</span> }
            </span>
            @if (dispDia) { <span class="disp-tag">{{ LABELS[dispDia] || dispDia }}</span> }
            @if (dispJornada) { <span class="disp-tag">{{ dispJornada }}</span> }
            @if (dispArea) { <span class="disp-tag">{{ dispArea }}</span> }
          </div>
          <div class="disp-grid" style="padding:16px; background:#fff; border-bottom: 2px solid var(--border);">
            @for (a of dispResultFiltered(); track a.id) {
              <div class="disp-card" [class.ocupado]="!a.disponible" [class.disponible-click]="a.disponible"
                   (click)="a.disponible && abrirWizardDesdeAmbiente(a)"
                   [title]="a.disponible ? 'Click para crear horario en ' + a.nombre : (a.fichaOcupado ? 'Ocupado por ficha ' + a.fichaOcupado : 'Ocupado')">
                <span class="disp-icon">
                  @if (a.disponible) { <lucide-icon name="check-circle" [size]="20" style="color:#16a34a"></lucide-icon> }
                  @else { <lucide-icon name="x-circle" [size]="20" style="color:#dc2626"></lucide-icon> }
                </span>
                <span class="disp-name">{{ a.nombre }}</span>
                @if (a.area_nombre) { <span class="disp-area">{{ a.area_nombre }}</span> }
                <span class="disp-status">
                  @if (a.disponible) { Disponible · Click para crear horario }
                  @else if (a.programaOcupado) { Ficha: {{ a.fichaOcupado ?? '—' }} }
                  @else { Ocupado }
                </span>
              </div>
            }
          </div>
        }
      }

      <div class="matrix-grid">
        <!-- HEADER ROW -->
        <div class="matrix-header-col sticky-header">{{ tabLabel().toUpperCase() }}</div>
        @for (d of dias; track d) {
          <div class="matrix-header-col text-center sticky-header" [class.is-today]="isDiaHoy(d)">{{ LABELS[d] }}</div>
        }
        
        <!-- DATA ROWS -->
        @if (filteredRows().length === 0) {
        <div class="matrix-empty">Sin horarios registrados</div>
        }
        
        @for (row of filteredRows(); track row.entity.id) {
        <div class="matrix-row-item sticky-col">
          <div style="font-weight:700;color:var(--text);font-size:14px">
            {{ row.entity.nombre ?? row.entity.codigo }}
          </div>
          @if (row.entity.programa) {
          <div class="text-xs text-muted" style="margin-top:2px;">{{ row.entity.programa }}</div>
          }
        </div>
        
        @for (d of dias; track d) {
        <div class="matrix-cell" style="position: relative;" [class.is-today]="isDiaHoy(d)">
          @if (row.horariosByDay[d]?.length) {
            @let slots = row.horariosByDay[d];
            @let idx = getSlotIdx(row.entity.id, d);
            @let h = slots[idx];

          <div class="slot-wrapper">

            <div class="horario-card" [class.en-curso]="isCurrentTime(h)">
              @let fichaEvs = fichaEventoMap().get(h.fichaId ?? '');
              <div class="card-layout">

                <!-- ── Columna izquierda: toda la información ── -->
                <div class="card-main">
                  <div class="card-top">
                    <div class="info-row"><span class="info-label">Inicio</span><span class="info-val info-time">{{ to12h(h.horaInicio) }}</span></div>
                    <div class="info-row"><span class="info-label">Fin</span><span class="info-val info-time">{{ to12h(h.horaFin) }}</span></div>
                    <div class="info-row"><span class="info-label">Jornada</span><span class="info-val">{{ h.jornada }}</span></div>

                    <div class="slot-nav-row" [style.visibility]="slots.length > 1 ? 'visible' : 'hidden'">
                      <div class="slot-dots">
                        @for (s of slots; track s.id; let i = $index) {
                          <span class="slot-dot" [class.active]="i === idx" [class.current]="isCurrentTime(s) && i !== idx"></span>
                        }
                      </div>
                      @if (slots.length > 1) {
                        <button class="slot-arrow-btn" (click)="nextSlot(row.entity.id, d, slots.length)" title="Ver siguiente jornada">
                          <lucide-icon name="chevron-right" [size]="13"></lucide-icon>
                        </button>
                      }
                    </div>

                    <div class="info-row"><span class="info-label">Ficha</span><span class="info-val">{{ h.ficha?.codigo ?? '—' }}</span></div>
                    <div class="info-row"><span class="info-label">Programa</span><span class="info-val">{{ h.ficha?.programa ?? '—' }}</span></div>
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
                        } @else {
                          {{ h.ambiente?.nombre ?? h.ubicacionTransversalNombre ?? '—' }}
                        }
                      </span>
                    </div>
                    @if (activeTab() !== 'instructor') {
                      <div class="info-row"><span class="info-label">Instructor</span><span class="info-val">{{ h.instructor?.nombre }} {{ h.instructor?.apellido }}</span></div>
                    }
                    @if (h.activo && h.instructor?.esTransversal && (h.ambiente?.nombre || h.ubicacionTransversalNombre)) {
                      <div class="transversal-env-badge mt-1">
                        <lucide-icon name="map-pin" [size]="10"></lucide-icon>
                        Transversal · {{ h.ambiente?.nombre ?? h.ubicacionTransversalNombre }}
                      </div>
                    }
                  </div>

                  <div class="card-bottom">
                    @if (h.minutosRetraso > 0 && isDiaHoy(h.diaSemana)) {
                      <div class="retraso-chip">
                        <lucide-icon name="clock" [size]="10"></lucide-icon>
                        Retraso: {{ h.minutosRetraso }} min
                      </div>
                    }
                    @if (h.activo && isDiaHoy(h.diaSemana)) {
                      <div class="progress-bar" style="margin-top:6px;">
                        <div class="progress-fill" [style.width.%]="calcProgress(h)"></div>
                      </div>
                      <div style="font-size:10px;color:var(--text-muted);text-align:right;margin-top:2px;">En curso · {{ calcProgress(h) }}%</div>
                    }
                    <span class="badge" [class.active]="isActive(h)" [class.inactive]="!isActive(h)"
                          style="font-size:10px;padding:2px 6px;margin-top:6px;display:inline-block;">
                      {{ isActive(h) ? 'activo' : 'inactivo' }}
                    </span>
                  </div>
                </div>

                <!-- ── Columna derecha: iconos interactivos ── -->
                <div class="card-actions-col">
                  <div class="card-help-btn"
                       [class.card-help-active]="tooltipState()?.h?.id === h.id"
                       (click)="toggleTooltip(h, h.compVigente, $event)">
                    <lucide-icon name="help-circle" [size]="15"></lucide-icon>
                  </div>
                  @if (fichaEvs?.length && isDiaHoy(h.diaSemana)) {
                    @for (ev of fichaEvs; track ev.id) {
                      @if (!isEventoPasado(ev, now())) {
                        <button [class]="'ev-notif-btn ev-notif-' + ev.tipo"
                                (mouseenter)="showEventoTooltip(ev, $event)"
                                (mouseleave)="hideEventoTooltip()">
                          <lucide-icon name="bell" [size]="9"></lucide-icon>
                        </button>
                      }
                    }
                  }
                  <button class="btn btn-icon btn-sm" style="color:var(--red);margin-top:auto;" title="Eliminar" (click)="deleteHorario(h.id)">
                    <lucide-icon name="trash-2" [size]="14"></lucide-icon>
                  </button>
                </div>

              </div>
            </div>
          </div>
          } @else {
          <span style="color:var(--border);font-size:12px">—</span>
          }
        </div>
        }
        }
      </div>
    </div>

    <!-- FIN VIEW -->

    <!-- Tooltip fijo: escapa overflow de la tabla, alineado al top del card -->
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
          <button class="tt-copy-btn" [class.tt-copy-ok]="copyOk()"
                  (click)="copyTooltipInfo(tooltipState()!.h, tooltipState()!.comp)"
                  [title]="copyOk() ? '¡Copiado!' : 'Copiar información'">
            <lucide-icon [name]="copyOk() ? 'check' : 'copy'" [size]="12"></lucide-icon>
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
          {{ tooltipState()!.comp.fechaInicio ?? '—' }} — {{ tooltipState()!.comp.fechaFin ?? '—' }}
        </p>
        <p class="tt-label mt-2">PROGRESO</p>
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="getProgresoCompetencia(tooltipState()!.comp)"></div>
        </div>
        <p style="font-size:11px;color:var(--text-muted);text-align:right;margin:4px 0 0;">{{ getProgresoCompetencia(tooltipState()!.comp) }}%</p>
        <!-- Horario recurrente — se muestra UNA sola vez (antes se repetía por cada clase) -->
        <p class="tt-label mt-2">HORARIO</p>
        <div class="tt-horario-compact">
          <div class="tt-horario-row"><lucide-icon name="calendar" [size]="12"></lucide-icon> Todos los {{ diaPluralLabel(tooltipState()!.h.diaSemana) }}</div>
          <div class="tt-horario-row"><lucide-icon name="clock" [size]="12"></lucide-icon> {{ to12h(tooltipState()!.h.horaInicio) }} — {{ to12h(tooltipState()!.h.horaFin) }}</div>
          <div class="tt-horario-row"><lucide-icon name="hourglass" [size]="12"></lucide-icon> {{ formatHorasPorDiaStr(tooltipState()!.h) }} por clase</div>
        </div>
        <!-- Clases — lista compacta de fechas, sin repetir la hora -->
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

    <!-- Tooltip de Evento -->
    @if (eventoTooltip()) {
      <div [class]="'ev-tooltip-box ev-tooltip-' + eventoTooltip()!.ev.tipo"
           [style.left.px]="eventoTooltip()!.x"
           [style.top.px]="eventoTooltip()!.y">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;">
          <p style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;opacity:.8;margin:0;">
            {{ tipoLabelEvento(eventoTooltip()!.ev.tipo) }}
          </p>
          @if (eventoTooltip()!.pasado) {
            <span style="background:rgba(0,0,0,.12);border-radius:6px;padding:2px 7px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;opacity:.85;">
              Terminado
            </span>
          } @else if (eventoTooltip()!.noIniciado) {
            <span style="background:rgba(0,0,0,.10);border-radius:6px;padding:2px 7px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;opacity:.85;">
              No iniciado
            </span>
          }
        </div>
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

    <!-- ═══ HISTORIAL DE COMPETENCIAS (ADMIN) ═══ -->
    @if (historialOpen()) {
    <div class="modal-overlay">
      <div class="modal hist-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3 style="margin:0">Historial de Competencias</h3>
            <p style="font-size:12px;color:var(--text-muted);margin:2px 0 0">Registro global de competencias asignadas a todos los horarios</p>
          </div>
          <button class="btn-icon" (click)="historialOpen.set(false)"><lucide-icon name="x" [size]="18"></lucide-icon></button>
        </div>

        <!-- Filtros -->
        <div style="padding:12px 0 8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <div style="position:relative;flex:1;min-width:200px;">
            <lucide-icon name="search" [size]="13" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none;"></lucide-icon>
            <input class="form-control" style="padding-left:32px;font-size:13px;"
                   [ngModel]="histFiltro()" (ngModelChange)="histFiltro.set($event)"
                   placeholder="Buscar por instructor, ficha o competencia...">
          </div>
          <span style="font-size:12px;color:var(--text-muted);white-space:nowrap;">
            {{ histFiltered().length }} resultado{{ histFiltered().length !== 1 ? 's' : '' }}
          </span>
        </div>

        @if (histLoading()) {
          <div style="text-align:center;padding:32px;color:var(--text-muted);">
            <lucide-icon name="loader" [size]="22" class="spin"></lucide-icon>
          </div>
        } @else if (histByInstructor().length === 0) {
          <div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">Sin competencias registradas</div>
        } @else {
          <div class="hist-sections-wrap">
            @for (group of histByInstructor(); track group.key) {
              @let fichasGrupo = getFichasDelGrupo(group.items);
              @let itemsFiltrados = getItemsFiltradosPorFicha(group);
              @let fichaSeleccionada = histFichaFilters()[group.key];

              <!-- Cabecera de sección por instructor + filtro ficha -->
              <div class="hist-instructor-header">
                <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                  <div class="hist-instr-avatar">{{ group.nombre.charAt(0).toUpperCase() }}</div>
                  <div>
                    <span style="font-weight:700;font-size:14px;color:var(--text);">{{ group.nombre }}</span>
                    <span style="font-size:11px;color:var(--text-muted);margin-left:8px;">
                      {{ itemsFiltrados.length }}/{{ group.items.length }} competencia{{ group.items.length !== 1 ? 's' : '' }}
                    </span>
                  </div>
                </div>
                <!-- Filtro por ficha (visible si hay ≥2 fichas distintas) -->
                @if (fichasGrupo.length > 1) {
                  <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                    <lucide-icon name="filter" [size]="12" style="color:var(--text-muted);opacity:.7;"></lucide-icon>
                    <select class="hist-ficha-sel"
                            [value]="fichaSeleccionada"
                            (change)="setFichaFilter(group.key, $any($event.target).value)">
                      <option value="">Todas las fichas</option>
                      @for (f of fichasGrupo; track f.codigo) {
                        <option [value]="f.codigo">{{ f.codigo }}</option>
                      }
                    </select>
                    @if (fichaSeleccionada) {
                      <button class="hist-ficha-clear" (click)="setFichaFilter(group.key, '')" title="Limpiar filtro">
                        <lucide-icon name="x" [size]="10"></lucide-icon>
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Tabla de competencias del instructor -->
              <div class="hist-table-wrap" style="margin-bottom:24px;">
                @if (itemsFiltrados.length === 0) {
                  <div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;background:var(--surface2);">
                    <lucide-icon name="search-x" [size]="18" style="display:block;margin:0 auto 6px;opacity:.4;"></lucide-icon>
                    Sin competencias para la ficha seleccionada
                  </div>
                } @else {
                <table class="hist-table">
                  <thead>
                    <tr>
                      <th style="width:36px;">#</th>
                      <th>Fecha Registro</th>
                      <th>Día / Jornada</th>
                      <th>Ficha / Programa</th>
                      <th>Competencia</th>
                      <th>Resultado</th>
                      <th>Período</th>
                      <th>Días / Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of itemsFiltrados; track c.id; let i = $index) {
                    <tr>
                      <td style="font-size:11px;color:var(--text-muted);text-align:center;font-weight:700;">{{ i + 1 }}</td>
                      <td style="font-size:11px;white-space:nowrap;">
                        <span style="font-weight:600;color:var(--text);">{{ c.createdAt | date:'dd/MM/yyyy' }}</span><br>
                        <span style="color:var(--text-muted);">{{ c.createdAt | date:'dd/MM/yyyy' }}</span>
                      </td>
                      <td>
                        <span class="hist-dia-badge">{{ getDiaLabel(c.dia_semana) }}</span>
                        <span class="hist-jorn-badge">{{ c.hora_inicio || '—' }}</span>
                      </td>
                      <td style="font-size:12px;">
                        <strong>{{ c.ficha_codigo || '—' }}</strong><br>
                        <span style="color:var(--text-muted);font-size:11px;">{{ c.ficha_programa || '' }}</span>
                      </td>
                      <td style="font-weight:600;font-size:13px;max-width:200px;">{{ c.nombre }}</td>
                      <td style="text-align:center;vertical-align:middle;">
                        @let rs = resultadosDe(c);
                        @if (rs.length > 0) {
                          <button class="hist-horas-btn"
                                  (mouseenter)="showHistResultados(c, $event)"
                                  (mouseleave)="hideHistResultados()">
                            <lucide-icon name="clipboard-check" [size]="13"></lucide-icon>
                            <span>{{ rs.length }} resultado{{ rs.length !== 1 ? 's' : '' }}</span>
                          </button>
                        } @else {
                          <span style="font-size:11px;color:var(--text-muted);">—</span>
                        }
                      </td>
                      <td style="font-size:11px;white-space:nowrap;">
                        @if (c.fecha_inicio) {
                          <span>{{ c.fecha_inicio | date:'dd/MM/yy' }} — {{ c.fecha_fin | date:'dd/MM/yy' }}</span>
                        } @else { <span>—</span> }
                      </td>
                      <!-- Días / Horas — botón icono con popover flotante -->
                      <td style="text-align:center;vertical-align:middle;">
                        @if ((c.diasClase ?? []).length > 0) {
                          <button class="hist-horas-btn"
                                  (mouseenter)="showHistDias(c, $event)"
                                  (mouseleave)="hideHistDias()">
                            <lucide-icon name="clock" [size]="13"></lucide-icon>
                            <span>{{ calcHorasCompetencia(c, c.horario) }}</span>
                          </button>
                        } @else {
                          <span style="font-size:11px;color:var(--text-muted);">—</span>
                        }
                      </td>
                    </tr>
                    }
                  </tbody>
                </table>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
    }

    <!-- Popover flotante días/horas del historial -->
    @if (histDiasPopover()) {
      <div class="hist-dias-popover"
           [style.left.px]="histDiasPopover()!.x"
           [style.top.px]="histDiasPopover()!.y">
        <div class="tt-form-header-row">
          <span class="tt-form-lbl">Días: <strong>{{ (histDiasPopover()!.c.diasClase ?? []).length }} clases</strong></span>
          <span class="tt-form-lbl">Horas: <strong>{{ calcHorasCompetencia(histDiasPopover()!.c, histDiasPopover()!.c.horario) }}</strong></span>
        </div>
        <div style="padding:7px 9px;">
          <div class="tt-horario-compact">
            <div class="tt-horario-row"><lucide-icon name="calendar" [size]="11"></lucide-icon> Todos los {{ diaPluralLabel(histDiasPopover()!.c.horario?.diaSemana) }}</div>
            <div class="tt-horario-row"><lucide-icon name="clock" [size]="11"></lucide-icon> {{ to12h(histDiasPopover()!.c.horario?.horaInicio) }} — {{ to12h(histDiasPopover()!.c.horario?.horaFin) }}</div>
          </div>
          <div class="tt-clases-chips">
            @for (iso of (histDiasPopover()!.c.diasClase ?? []); track iso) {
              <span class="tt-clase-chip">{{ formatFechaCorta(iso) }}</span>
            }
          </div>
        </div>
      </div>
    }

    <!-- Popover flotante de resultados del historial -->
    @if (histResultadosPopover()) {
      <div class="hist-dias-popover"
           [style.left.px]="histResultadosPopover()!.x"
           [style.top.px]="histResultadosPopover()!.y">
        <div class="tt-form-header-row">
          <span class="tt-form-lbl">Resultados de la competencia</span>
        </div>
        @for (r of resultadosDe(histResultadosPopover()!.c); track $index) {
          <div class="tt-form-row">
            <span class="tt-form-dia" style="white-space:normal;min-width:0;">{{ r.texto }}</span>
            <span style="padding:1px 6px;border-radius:8px;font-weight:700;font-size:9px;white-space:nowrap;flex-shrink:0;"
                  [style.background]="estadoResultadoInfo(r).bg" [style.color]="estadoResultadoInfo(r).text">
              {{ estadoResultadoInfo(r).label }}
            </span>
          </div>
        }
      </div>
    }

    <!-- MODAL: NUEVO HORARIO — DISEÑO TABLA -->
    @if (showModal()) {
    <div class="modal-overlay">
      <div class="wizard-modal" (click)="$event.stopPropagation()">

        <!-- Cabecera -->
        <div class="wiz-header">
          <div>
            <h3 class="wiz-title">Nuevo Horario</h3>
            <p class="wiz-subtitle">Selecciona los días y configura ficha, instructor y ambiente para cada uno</p>
          </div>
          <button class="btn-icon" (click)="showModal.set(false)">
            <lucide-icon name="x" [size]="20"></lucide-icon>
          </button>
        </div>

        <!-- Fila global: jornada + horas -->
        <div class="wiz-top-bar">
          <div class="wiz-top-field" style="min-width:220px; flex:1.2;">
            <label class="form-label">Jornada *</label>
            <app-ss [options]="jornadaOpts" placeholder="Seleccionar jornada..."
                    [(ngModel)]="wizardForm.jornada"
                    (ngModelChange)="onWizardJornadaChange()"></app-ss>
          </div>
          <div class="wiz-top-field" style="min-width:130px;">
            <label class="form-label">Hora inicio</label>
            <input class="form-control" type="time" [(ngModel)]="wizardForm.horaInicio"
                   (ngModelChange)="onHoraInicioChange($event)">
          </div>
          <div class="wiz-top-field" style="min-width:130px;">
            <label class="form-label">Hora fin</label>
            <input class="form-control" type="time" [(ngModel)]="wizardForm.horaFin"
                   (ngModelChange)="onHoraFinChange()">
          </div>
          <!-- Indicador de jornada detectada por horas -->
          @if (wizardForm.horaInicio) {
            <div [class]="'jornada-det-badge ' + (abarcaDosJornadas() ? 'jornada-det-span' : 'jornada-det-ok')">
              <lucide-icon [name]="abarcaDosJornadas() ? 'alert-triangle' : 'clock'" [size]="12"></lucide-icon>
              <div>
                <div>Jornada: <strong>{{ jornadaDetectadaLabel() }}</strong></div>
                @if (abarcaDosJornadas()) {
                  <div style="font-size:10px;opacity:.85;">El horario abarca dos jornadas</div>
                }
              </div>
            </div>
          }
          <!-- Resumen de días seleccionados -->
          <div class="wiz-dias-badge" style="margin-left:auto; align-self:flex-end; padding-bottom:2px;">
            @if (wizardForm.dias.length > 0) {
              <span class="wiz-sel-count">{{ wizardForm.dias.length }} día{{ wizardForm.dias.length !== 1 ? 's' : '' }} seleccionado{{ wizardForm.dias.length !== 1 ? 's' : '' }}</span>
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
              @let activo = wizardForm.dias.includes(d);
              <tr class="wt-row" [class.wt-row-on]="activo" [class.wt-row-off]="!activo">
                <!-- Día -->
                <td class="wt-td-dia">
                  <label class="wt-day-label" [class.wt-day-on]="activo">
                    <input type="checkbox" class="wt-checkbox"
                           [checked]="activo"
                           (change)="toggleWizardDay(d)">
                    <span class="wt-day-name">{{ LABELS[d] }}</span>
                  </label>
                </td>
                @if (activo) {
                <!-- Área filtro -->
                <td class="wt-td">
                  <app-ss [options]="fichaAreasOpts()"
                          placeholder="Todas las áreas"
                          [(ngModel)]="wizardForm.diasConfig[d].areaFiltro"
                          (ngModelChange)="onWizardAreaChange(d)"></app-ss>
                </td>
                <!-- Ficha -->
                <td class="wt-td">
                  <app-ss [options]="getFichasOpts(d)"
                          placeholder="Seleccionar ficha..."
                          [(ngModel)]="wizardForm.diasConfig[d].fichaId"
                          (ngModelChange)="onFichaChange(d, $event)"></app-ss>
                </td>
                <!-- Instructor -->
                <td class="wt-td">
                  <app-ss [options]="instructoresOpts()"
                          placeholder="Seleccionar instructor..."
                          [(ngModel)]="wizardForm.diasConfig[d].instructorId"
                          (ngModelChange)="onInstructorChange(d, $event)"></app-ss>
                </td>
                <!-- Ambiente -->
                <td class="wt-td">
                  @if (!isInstructorTransversal(d)) {
                    <app-ss [options]="getAmbientesOpts(d)"
                            placeholder="Seleccionar ambiente..."
                            [(ngModel)]="wizardForm.diasConfig[d].ambienteId"
                            (ngModelChange)="onAmbienteChange(d, $event)"></app-ss>
                  } @else {
                    <div class="wt-transversal-pill">
                      <lucide-icon name="shuffle" [size]="11"></lucide-icon>
                      Transversal — se asigna al iniciar
                    </div>
                  }
                </td>
                } @else {
                <!-- Fila desactivada -->
                <td class="wt-td-off" colspan="4">
                  <span class="wt-off-hint">Activa el día para configurar</span>
                </td>
                }
              </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Error + botones -->
        @if (formError()) { <div class="error-msg" style="margin:12px 24px 0;">{{ formError() }}</div> }
        <div class="wiz-footer">
          <button class="btn btn-outline" (click)="showModal.set(false)">Cancelar</button>
          <button class="btn btn-blue" (click)="saveWizardHorarios()" [disabled]="saving() || !esWizardValido()">
            @if (saving()) { <lucide-icon name="loader" [size]="14" class="spin"></lucide-icon> Guardando... }
            @else { <lucide-icon name="save" [size]="14"></lucide-icon> Guardar Horarios }
          </button>
        </div>
      </div>
    </div>
    }
  `,
  styles: [`
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;
    }
    .page-header h2 { font-size: 1.4rem; color: var(--text); }
    .view-tabs {
      display: flex; border: 1.5px solid var(--border); border-radius: 8px; overflow: hidden;
    }
    .view-tabs button {
      padding: 7px 14px; font-size: 13px; background: transparent;
      border: none; cursor: pointer; color: var(--text-muted); font-weight: 500;
    }
    .view-tabs button.active { background: var(--navy); color: #fff; font-weight: 700; }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
    .error-msg { background: #fee2e2; color: #991b1b; border-radius: 8px; padding: 10px 14px; font-size: 13px; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Modal Wizard — tabla ───────────────────────────────────── */
    .wizard-modal {
      background: var(--surface);
      border-radius: 16px;
      width: 95vw;
      max-width: 1020px;
      max-height: 92vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,.25);
      display: flex;
      flex-direction: column;
    }
    .wiz-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 24px 28px 16px; border-bottom: 1px solid var(--border);
      gap: 12px; flex-shrink: 0;
    }
    .wiz-title { font-size: 1.25rem; font-weight: 800; color: var(--text); margin-bottom: 2px; }
    .wiz-subtitle { font-size: 12px; color: var(--text-muted); }

    /* Fila global: jornada + horas */
    .wiz-top-bar {
      display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap;
      padding: 20px 28px; border-bottom: 1px solid var(--border);
      background: var(--surface2); flex-shrink: 0;
    }
    .wiz-top-field { display: flex; flex-direction: column; gap: 5px; }

    /* Indicador jornada detectada por horas */
    .jornada-det-badge {
      display: flex; align-items: flex-start; gap: 6px;
      padding: 7px 11px; border-radius: 8px; font-size: 12px; font-weight: 600;
      align-self: flex-end; margin-bottom: 1px;
    }
    .jornada-det-ok   { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .jornada-det-span { background: #fff7ed; color: #92400e; border: 1px solid #fcd34d; }
    .wiz-sel-count {
      display: inline-flex; align-items: center; gap: 5px;
      background: var(--blue); color: #fff;
      border-radius: 20px; padding: 3px 12px; font-size: 12px; font-weight: 700;
    }
    .wiz-sel-hint { font-size: 12px; color: var(--text-muted); font-style: italic; }

    /* Tabla de días */
    .wiz-table-wrap {
      flex: 1; overflow-y: auto; overflow-x: auto;
    }
    .wiz-table {
      width: 100%; border-collapse: collapse; table-layout: fixed;
    }
    .wiz-table thead tr {
      background: var(--navy); position: sticky; top: 0; z-index: 2;
    }
    .wiz-table th {
      padding: 11px 14px; font-size: 11px; font-weight: 800; color: #fff;
      text-transform: uppercase; letter-spacing: .06em; text-align: left;
      white-space: nowrap;
    }
    .wt-th-dia  { width: 100px; }
    .wt-th-area { width: 160px; }
    .wt-th-ficha, .wt-th-inst, .wt-th-amb { width: auto; }
    .wt-th-hint { font-weight: 400; opacity: .7; text-transform: none; }

    /* Checkbox "Aplicar a todos" en cabecera */
    .wt-th-area, .wt-th-ficha, .wt-th-inst, .wt-th-amb {
      white-space: normal;
      vertical-align: top;
    }
    .wt-apply-all {
      display: flex; align-items: center; gap: 5px;
      margin-top: 6px; cursor: pointer;
      font-size: 10px; font-weight: 500;
      text-transform: none; letter-spacing: 0;
      opacity: .8; color: #c7d8f5;
      transition: opacity .15s;
    }
    .wt-apply-all:hover { opacity: 1; color: #fff; }
    .wt-apply-all input[type="checkbox"] {
      width: 13px; height: 13px; cursor: pointer;
      accent-color: #60a5fa; flex-shrink: 0;
    }
    .wt-apply-all input[type="checkbox"]:checked + span {
      color: #fff; font-weight: 700;
    }

    /* Filas de datos */
    .wt-row { transition: background .12s; }
    .wt-row-on  { background: var(--surface); }
    .wt-row-off { background: var(--surface2); }
    .wt-row + .wt-row { border-top: 1px solid var(--border); }

    /* Celda Día */
    .wt-td-dia {
      padding: 12px 14px; vertical-align: middle;
      border-right: 2px solid var(--border);
    }
    .wt-day-label {
      display: flex; align-items: center; gap: 9px;
      cursor: pointer; user-select: none;
    }
    .wt-checkbox {
      width: 16px; height: 16px; cursor: pointer; accent-color: var(--blue); flex-shrink: 0;
    }
    .wt-day-name {
      font-size: 13px; font-weight: 700; color: var(--text-muted);
      text-transform: capitalize;
    }
    .wt-day-on .wt-day-name { color: var(--blue); }

    /* Celdas con select */
    .wt-td { padding: 8px 10px; vertical-align: middle; }

    /* Celda desactivada */
    .wt-td-off {
      padding: 12px 14px; vertical-align: middle;
    }
    .wt-off-hint {
      font-size: 12px; color: var(--text-muted); font-style: italic;
    }

    /* Badge transversal */
    .wt-transversal-pill {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11px; color: #d97706;
      background: #fffbeb; border: 1px solid #fcd34d;
      border-radius: 6px; padding: 5px 10px; font-weight: 600; white-space: nowrap;
    }

    /* Footer del modal */
    .wiz-footer {
      display: flex; align-items: center; justify-content: flex-end; gap: 12px;
      padding: 16px 28px; border-top: 1px solid var(--border);
      background: var(--surface2); flex-shrink: 0;
    }
    .disp-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:0; }
    .disp-card {
      background:var(--surface2);border-radius:8px;padding:12px;
      display:flex;flex-direction:column;align-items:center;gap:4px;
      border:1.5px solid var(--border);font-size:13px;
    }
    .disp-card.ocupado { background:#fee2e2;border-color:#fca5a5; }
    .disp-name { font-weight:600;color:var(--text);text-align:center; }
    .disp-area { font-size:10px;color:var(--text-muted);text-align:center;background:var(--surface);border-radius:4px;padding:1px 6px; }
    .disp-status { font-size:11px;color:var(--text-muted);text-align:center; }
    .disp-hora-input { width:100%; border:1px solid var(--border); border-radius:6px; background:#fff; color:var(--text); outline:none; transition:border-color .15s; }
    .disp-hora-input:focus { border-color:var(--blue); }
    .disp-tag { display:inline-flex;align-items:center;background:#dbeafe;color:#1d4ed8;border-radius:10px;padding:1px 8px;font-size:10px;font-weight:700; }

    /* Barra de búsqueda integrada en la tabla */
    .matrix-search-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 14px; border-bottom: 1px solid var(--border);
      background: var(--surface2); gap: 12px; flex-wrap: wrap;
    }
    .tbl-search-wrap { position: relative; flex: 1; max-width: 380px; }

    /* Filtro de jornada — chips */
    .jornada-filter-chips {
      display: flex; gap: 4px; flex-wrap: wrap;
    }
    .jornada-chip {
      padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;
      border: 1.5px solid var(--border); background: var(--surface);
      color: var(--text-muted); cursor: pointer; transition: all .15s;
      white-space: nowrap;
    }
    .jornada-chip:hover { border-color: var(--blue); color: var(--blue); }
    .jornada-chip.active { background: var(--blue); color: #fff; border-color: var(--blue); }
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

    /* Estilos Matriciales Fullscreen sin scroll horizontal */
    .matrix-wrap { width: 100%; background: #fff; border: 1px solid var(--border); border-radius: 8px; overflow-x: auto; overflow-y: visible; display:flex; flex-direction:column; }
    .matrix-grid { 
      display: grid; 
      grid-template-columns: 140px repeat(6, minmax(0, 1fr)); 
      width: 100%; border: none; background: transparent;
    }
    .matrix-header-col {
      background: var(--surface2); padding: 12px; font-weight: 800; font-size: 13px; color: var(--text); border-bottom: 2px solid var(--border); border-right: 1px solid var(--border); text-align: center;
    }
    .matrix-header-col:first-child { text-align: left; }
    .matrix-header-col:last-child { border-right: none; }
    /* Hoy: resaltado azul */
    .matrix-header-col.is-today {
      background: #eff6ff; border-bottom: 3px solid var(--blue); color: var(--blue);
    }
    .matrix-cell.is-today { background: rgba(37,99,235,.03); }
    .matrix-row-item {
      padding: 12px; border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); background: var(--surface); display: flex; flex-direction: column; justify-content: center;
      word-break: break-word; min-width: 0;
    }
    .matrix-cell {
      padding: 8px; border-bottom: 1px solid var(--border); border-right: 1px solid var(--border);
      display: flex; align-items: stretch; position: relative;
      min-width: 0; word-break: break-word;
    }
    .matrix-cell:last-child { border-right: none; }
    /* Ambiente disponible clickeable */
    .disp-card.disponible-click { cursor: pointer; transition: border-color .15s, background .15s, box-shadow .15s; }
    .disp-card.disponible-click:hover {
      background: #f0fdf4; border-color: #16a34a; box-shadow: 0 0 0 2px rgba(22,163,74,.15);
    }
    .disp-card.disponible-click .disp-status { color: #16a34a; font-weight: 600; font-size: 11px; }
    .matrix-empty {
      grid-column: 1 / -1; padding: 32px; text-align: center; color: var(--text-muted); font-size: 14px;
    }

    /* Carrusel de jornadas múltiples */
    /* slot-wrapper llena toda la celda para que la card también lo haga */
    .slot-wrapper { width: 100%; height: 100%; display: flex; flex-direction: column; }

    /* La card se estira para llenar el wrapper y empuja la sección inferior al fondo */
    .horario-card {
      width: 100%; min-width: 0; flex: 1;
      display: flex; flex-direction: column;
      background: var(--surface); border: 1.5px solid var(--border);
      border-radius: 6px; padding: 10px; font-size: 13px; color: var(--text);
    }
    /* Layout de dos columnas dentro de la card */
    .card-layout {
      display: flex; flex: 1; gap: 0; min-width: 0; height: 100%;
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
    .card-top { display: flex; flex-direction: column; gap: 0; flex: 1; }
    .card-bottom { display: flex; flex-direction: column; margin-top: 8px; }

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

    /* Chip de retraso */
    .retraso-chip {
      display: inline-flex; align-items: center; gap: 4px;
      background: #fee2e2; color: #dc2626; border-radius: 4px;
      padding: 2px 6px; font-size: 10px; font-weight: 700;
      border: 1px solid #fca5a5; margin-bottom: 2px;
    }

    /* Fila: dots + flecha de alternado */
    .slot-nav-row {
      display: flex; align-items: center; justify-content: flex-start; gap: 8px;
      margin: 5px 0 3px;
    }
    .slot-dots { display: flex; align-items: center; gap: 4px; }
    .slot-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); transition: background .2s; }
    .slot-dot.active { background: var(--blue); }
    /* En-curso pero NO visualizado: anillo outline para distinguirlo del activo */
    .slot-dot.current { background: transparent; border: 2px solid var(--blue); }

    /* Botón flecha pequeño junto a los dots */
    .slot-arrow-btn {
      background: none; border: 1px solid var(--border); border-radius: 4px;
      padding: 1px 4px; cursor: pointer; display: flex; align-items: center;
      color: var(--text-muted); transition: border-color .15s, color .15s;
      line-height: 1;
    }
    .slot-arrow-btn:hover { border-color: var(--blue); color: var(--blue); }

    /* Card activa según hora actual */
    .horario-card.en-curso { border-color: var(--blue) !important; box-shadow: 0 0 0 2px rgba(37,99,235,0.13) !important; }
    .horario-card.en-curso .time-range { color: var(--blue); }

    /* Badge de ambiente para instructor transversal activo */
    .transversal-env-badge {
      display: inline-flex; align-items: center; gap: 4px;
      background: #fffbeb; color: #d97706; border: 1px solid #fcd34d;
      border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 700;
    }

    /* ── Columna derecha de acciones — estilos compartidos con card-actions-col ── */
    .card-help-btn {
      color: var(--text-muted); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border-radius: 50%;
      transition: color .15s, background .15s;
    }
    .card-help-btn:hover { color: var(--blue); background: #eff6ff; }
    .card-help-active { color: var(--blue) !important; background: #eff6ff !important; }

    /* Botón de notificación de evento */
    .ev-notif-btn {
      width: 22px; height: 22px; border-radius: 6px; border: none;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: transform .15s, opacity .2s, filter .2s;
      box-shadow: 0 1px 3px rgba(0,0,0,.12);
    }
    .ev-notif-btn:hover { transform: scale(1.18); }
    .ev-notif-pasado { opacity: 0.3; filter: grayscale(1); }
    .ev-notif-formativo     { background: #dbeafe; color: #1d4ed8; }
    .ev-notif-institucional { background: #dcfce7; color: #166534; }
    .ev-notif-evaluacion    { background: #fed7aa; color: #92400e; }
    .ev-notif-festivo       { background: #fee2e2; color: #991b1b; }

    .ev-tipo-formativo     { background: #dbeafe; color: #1d4ed8; }
    .ev-tipo-institucional { background: #dcfce7; color: #166534; }
    .ev-tipo-evaluacion    { background: #fed7aa; color: #92400e; }
    .ev-tipo-festivo       { background: #fee2e2; color: #991b1b; }

    /* ── Tooltip flotante de Evento ── */
    .ev-tooltip-box {
      position: fixed; z-index: 9999;
      width: 240px; padding: 12px 14px;
      border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.15);
      font-size: 13px; pointer-events: none;
      border: 1.5px solid;
    }
    .ev-tooltip-formativo     { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
    .ev-tooltip-institucional { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
    .ev-tooltip-evaluacion    { background: #fff7ed; border-color: #fed7aa; color: #92400e; }
    .ev-tooltip-festivo       { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
    .ev-tt-tipo {
      display: flex; align-items: center; gap: 5px;
      font-size: 10px; font-weight: 800; text-transform: uppercase;
      letter-spacing: .5px; opacity: .7; margin-bottom: 4px;
    }
    .ev-tt-nombre { font-weight: 700; font-size: 14px; margin: 0; color: inherit; }
    .ev-tt-time {
      display: flex; align-items: center; gap: 5px;
      margin-top: 6px; font-size: 12px; font-weight: 600; opacity: .85;
    }
    .ev-tt-desc {
      margin-top: 6px; font-size: 12px; opacity: .75;
      border-top: 1px solid currentColor; padding-top: 6px;
    }

    /* ── Botón copiar en tooltip de competencia ── */
    .tt-copy-btn {
      display: flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border-radius: 6px; border: 1px solid var(--border);
      background: var(--surface2); cursor: pointer; color: var(--text-muted);
      transition: all .15s; flex-shrink: 0;
    }
    .tt-copy-btn:hover { background: #eff6ff; color: var(--blue); border-color: var(--blue); }
    .tt-copy-btn.tt-copy-ok { background: #dcfce7; color: #166534; border-color: #86efac; }
    .tt-close-btn {
      display: flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border-radius: 6px;
      border: 1px solid var(--border); background: var(--surface2);
      cursor: pointer; color: var(--text-muted); transition: all .15s;
    }
    .tt-close-btn:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

    /* ── Historial de competencias (admin) ── */
    .hist-modal { width: 95vw; max-width: 1060px; max-height: 88vh; overflow: hidden; display: flex; flex-direction: column; }
    .hist-sections-wrap { flex: 1; overflow-y: auto; padding: 4px 0; }
    .hist-instructor-header {
      display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
      padding: 10px 16px; background: #f0f4ff;
      border-left: 4px solid var(--blue); border-radius: 0 8px 0 0;
      margin-top: 8px; margin-bottom: 0;
    }
    .hist-instr-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: var(--navy); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 800; flex-shrink: 0;
    }
    /* ── Filtro de ficha por instructor ── */
    .hist-ficha-sel {
      height: 28px; padding: 0 8px; font-size: 12px; font-weight: 600;
      border: 1px solid #bfdbfe; border-radius: 6px;
      background: #fff; color: #1d4ed8; cursor: pointer;
      outline: none; max-width: 130px;
    }
    .hist-ficha-sel:focus { border-color: var(--blue); box-shadow: 0 0 0 2px rgba(59,130,246,.15); }
    .hist-ficha-clear {
      display: flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; border-radius: 50%;
      border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8;
      cursor: pointer; flex-shrink: 0; transition: all .15s;
    }
    .hist-ficha-clear:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
    .hist-table-wrap { overflow-x: auto; }
    .hist-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .hist-table thead tr { background: var(--navy); position: sticky; top: 0; z-index: 2; }
    .hist-table th { padding: 10px 14px; color: #fff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; text-align: left; white-space: nowrap; }
    .hist-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); vertical-align: top; }
    .hist-table tbody tr:hover td { background: #f8faff; }
    .hist-dia-badge { display:inline-block; background:#eff6ff; color:var(--blue); border-radius:4px; padding:2px 7px; font-size:11px; font-weight:700; text-transform:capitalize; margin-right:4px; }
    .hist-jorn-badge { display:inline-block; background:var(--surface2); color:var(--text-muted); border-radius:4px; padding:2px 7px; font-size:10px; font-weight:600; text-transform:uppercase; }

    /* ── Tabla dos columnas: días de formación (tooltip y popover) ── */
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
    /* ── Botón horas en historial ── */
    .hist-horas-btn { display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border:1px solid #bfdbfe; border-radius:6px; background:#eff6ff; color:var(--blue); cursor:default; font-size:11px; font-weight:700; transition:all .15s; }
    .hist-horas-btn:hover { background:var(--blue); color:#fff; border-color:var(--blue); }
    /* ── Popover flotante días/horas del historial ── */
    .hist-dias-popover { position:fixed; z-index:10000; min-width:250px; max-width:340px; border:1px solid var(--border); border-radius:7px; box-shadow:0 8px 24px rgba(0,0,0,.15); overflow:hidden; background:var(--surface); pointer-events:none; }
  `],
})
export class AdminHorariosComponent implements OnInit, OnDestroy {
  readonly LABELS = DIAS_LABELS;
  getDiaLabel(dia?: string): string {
    if (!dia) return '—';
    return (this.LABELS as Record<string, string>)[dia] || dia;
  }
  dias = [...DIAS_SEMANA] as string[];
  jornadas = JORNADAS;

  tabs = [
    { key: 'instructor', label: 'Por Instructor' },
    { key: 'ficha', label: 'Por Ficha' },
    { key: 'ambiente', label: 'Por Ambiente' },
  ];

  activeTab = signal('instructor');

  // Filtro de jornada en la matriz
  filterJornada = signal('');
  jornadaChips = [
    { key: '', label: 'Todas' },
    { key: 'manana', label: 'Mañana' },
    { key: 'tarde', label: 'Tarde' },
    { key: 'noche', label: 'Noche' },
  ];

  // Búsqueda con debounce
  searchDisplay = '';
  searchSig = signal('');
  private _searchTimer: any = null;

  onSearch(val: string) {
    this.searchDisplay = val;
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this.searchSig.set(val.toLowerCase()), 200);
  }

  tabLabel = computed(() => {
    const map: Record<string, string> = {
      instructor: 'Horarios por Instructor',
      ficha: 'Horarios por Ficha',
      ambiente: 'Horarios por Ambiente'
    };
    return map[this.activeTab()] ?? '';
  });
  pageTitle = computed(() => {
    const map: Record<string, string> = {
      instructor: 'Horarios de Instructores',
      ficha: 'Horarios de Fichas',
      ambiente: 'Horarios y Ambientes'
    };
    return map[this.activeTab()] ?? 'Gestión de Horarios';
  });
  pageSubtitle = computed(() => {
    const map: Record<string, string> = {
      instructor: 'Vista matricial semanal por instructor',
      ficha: 'Vista matricial semanal por ficha',
      ambiente: 'Vista de horarios por ambiente, disponibilidad y gestión de aulas'
    };
    return map[this.activeTab()] ?? 'Vista matricial semanal';
  });
  tooltipState = signal<{ h: any; comp: any; compIdx: number; x: number; y: number } | null>(null);
  histDiasPopover = signal<{ c: any; x: number; y: number } | null>(null);
  histResultadosPopover = signal<{ c: any; x: number; y: number } | null>(null);
  showModal = signal(false);
  saving = signal(false);
  formError = signal('');

  // ── Historial de competencias ────────────────────────────────
  historialOpen    = signal(false);
  histLoading      = signal(false);
  histItems        = signal<any[]>([]);
  histFiltro       = signal('');
  histFichaFilters = signal<Record<string, string>>({});   // key=instructorId, value=codigo ficha

  histFiltered = computed(() => {
    const q = this.histFiltro().trim().toLowerCase();
    if (!q) return this.histItems();
    return this.histItems().filter((c: any) =>
      (c.nombre ?? '').toLowerCase().includes(q) ||
      this.resultadosDe(c).some((r: Resultado) => r.texto.toLowerCase().includes(q)) ||
      (c.instructor_nombre ?? '').toLowerCase().includes(q) ||
      (c.ficha_codigo ?? '').toLowerCase().includes(q)
    );
  });

  /** Historial agrupado por instructor, ítems ordenados por fecha desc */
  histByInstructor = computed(() => {
    const map = new Map<string, { key: string; nombre: string; items: any[] }>();
    for (const c of this.histFiltered()) {
      // Backend returns instructor_nombre (resolved string), not nested object
      const nombre = c.instructor_nombre || 'Sin instructor asignado';
      const key    = nombre; // use name as key since we don't have a separate id
      if (!map.has(key)) map.set(key, { key, nombre, items: [] });
      map.get(key)!.items.push(c);
    }
    for (const g of map.values()) {
      g.items.sort((a: any, b: any) =>
        new Date(b.fecha_inicio ?? b.createdAt ?? 0).getTime() - new Date(a.fecha_inicio ?? a.createdAt ?? 0).getTime()
      );
    }
    return Array.from(map.values());
  });

  /** Obtiene los códigos únicos de ficha que tiene un grupo de instructor */
  getFichasDelGrupo(items: any[]): { codigo: string; programa: string }[] {
    const map = new Map<string, string>();
    items.forEach(c => {
      // Backend returns ficha_codigo and ficha_programa (flat snake_case fields)
      const cod = c.ficha_codigo;
      if (cod) map.set(cod, c.ficha_programa ?? '');
    });
    return Array.from(map.entries())
      .map(([codigo, programa]) => ({ codigo, programa }))
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }

  /** Ítems de un grupo filtrados por ficha seleccionada */
  getItemsFiltradosPorFicha(group: { key: string; items: any[] }): any[] {
    const sel = this.histFichaFilters()[group.key] ?? '';
    if (!sel) return group.items;
    return group.items.filter((c: any) => c.ficha_codigo === sel);
  }

  setFichaFilter(key: string, codigo: string) {
    this.histFichaFilters.update(m => ({ ...m, [key]: codigo }));
  }

  openHistorial() {
    this.tooltipState.set(null);
    this.historialOpen.set(true);
    this.histFiltro.set('');
    this.histFichaFilters.set({});
    this.histLoading.set(true);
    this.api.getCompetenciasAdmin().subscribe({
      next: data => this.zone.run(() => {
        this.histItems.set(data);
        this.histLoading.set(false);
        this.cdr.detectChanges();
      }),
      error: () => this.zone.run(() => {
        this.histItems.set([]);
        this.histLoading.set(false);
        this.cdr.detectChanges();
      }),
    });
  }

  // ── Botón copiar tooltip competencia ─────────────────────────
  copyOk = signal(false);
  private copyTimer: any;

  copyTooltipInfo(h: any, comp: any) {
    const instructor = `${h?.instructor?.nombre ?? ''} ${h?.instructor?.apellido ?? ''}`.trim();
    const ficha      = h?.ficha?.codigo ?? '';
    const programa   = h?.ficha?.programa ?? '';
    const diasArr: string[] = comp?.diasClase ?? [];
    const horas      = this.calcHorasCompetencia(comp, h);
    const lines: string[] = [];
    if (instructor) lines.push(`Instructor: ${instructor}`);
    if (ficha)      lines.push(`Ficha: ${ficha}`);
    if (programa)   lines.push(`Programa: ${programa}`);
    lines.push(`Competencia: ${comp.nombre ?? ''}`);
    const compResultadosCopy = this.resultadosDe(comp);
    if (compResultadosCopy.length) {
      lines.push(`Resultados: ${compResultadosCopy.map((r: Resultado) => `${r.texto} (${this.estadoResultadoInfo(r).label})`).join(' | ')}`);
    }
    if (comp.fechaInicio) lines.push(`Período: ${comp.fechaInicio} — ${comp.fechaFin ?? ''}`);
    lines.push(`Progreso: ${this.getProgresoCompetencia(comp)}%`);
    if (diasArr.length > 0) {
      const rango = `${this.to12h(h.horaInicio)} — ${this.to12h(h.horaFin)}`;
      lines.push(`Horario: Todos los ${this.diaPluralLabel(h.diaSemana)}, ${rango} (${this.formatHorasPorDiaStr(h)} por clase, ${horas} en total)`);
      lines.push(`Clases (${diasArr.length}): ${diasArr.map(iso => this.formatFechaCorta(iso)).join(', ')}`);
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      this.copyOk.set(true);
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copyOk.set(false), 2000);
    });
  }

  /** Controla qué columnas del wizard se "aplican a todos los días" */
  applyAll = { area: false, ficha: false, instructor: false, ambiente: false };

  // Carrusel de múltiples jornadas por día
  now = signal<Date>(new Date());
  activeSlotMap = signal<Record<string, number>>({});
  /** Claves (entityId-day) donde el usuario navegó manualmente — no se sobreescriben con autoSwitch */
  private manualOverrides = new Set<string>();
  timer: any;

  // Disponibilidad Ambientes
  diasKeys = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  dispDia      = '';
  dispJornada  = '';
  dispArea     = '';
  dispResult   = signal<any[]>([]);

  dispDiaOpts = computed<SSOption[]>(() => [
    { value: '', label: 'Todos los días' },
    ...this.diasKeys.map(d => ({ value: d, label: this.LABELS[d] || d }))
  ]);

  dispJornadaOpts: SSOption[] = [
    { value: '', label: 'Jornada...' },
    { value: 'manana', label: 'Mañana' },
    { value: 'tarde', label: 'Tarde' },
    { value: 'noche', label: 'Noche' }
  ];

  dispAreaOpts = computed<SSOption[]>(() => {
    const areas = new Set<string>();
    this.ambientes().forEach((a: any) => { if (a.area_nombre) areas.add(a.area_nombre); });
    return [
      { value: '', label: 'Todas las áreas' },
      ...[...areas].sort().map(a => ({ value: a, label: a })),
    ];
  });

  dispResultFiltered = computed<any[]>(() => {
    let r = this.dispResult();
    if (this.dispArea) r = r.filter(a => a.area_nombre === this.dispArea);
    return r;
  });



  horarios = signal<any[]>([]);
  fichas = signal<any[]>([]);
  ambientes = signal<any[]>([]);
  instructores = signal<any[]>([]);
  eventos = signal<any[]>([]);
  areasRegistradas = signal<any[]>([]);   // áreas del sistema (formativo)

  // ── Mapa ficha → eventos del día (todos, sin filtro de hora) ────
  fichaEventoMap = computed(() => {
    // Fecha LOCAL — toISOString() devuelve UTC y puede diferir en zonas GMT-
    const d = this.now();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    // Clave = UUID de ficha (string) — NO usar +fid (daría NaN para UUIDs)
    const map = new Map<string, any[]>();
    this.eventos().forEach(ev => {
      if (!ev.fechaInicio) return;
      const start = ev.fechaInicio.split('T')[0];
      const end   = (ev.fechaFin ?? ev.fechaInicio).split('T')[0];
      if (today < start || today > end) return;
      const seen = new Set<string>();
      (ev.fichasParticipantes ?? []).forEach((fid: any) => {
        const key = String(fid);
        if (!key || seen.has(key)) return;
        seen.add(key);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      });
    });
    return map;
  });

  // ── Tooltip de Evento ─────────────────────────────────────────
  eventoTooltip = signal<{ ev: any; x: number; y: number; pasado: boolean; noIniciado: boolean } | null>(null);

  wizardForm: {
    jornada: string;
    horaInicio: string;
    horaFin: string;
    dias: string[];
    diasConfig: Record<string, { areaFiltro: string; fichaId: string | number; ambienteId: string | number; instructorId: string | number }>;
  } = {
    jornada: '',
    horaInicio: '',
    horaFin: '',
    dias: [],
    diasConfig: {}
  };

  /**
   * Enriquece cada horario con los objetos anidados que buildRows() necesita.
   * GET /horarios devuelve fichaId/instructorId/ambienteId como UUIDs planos;
   * aquí los cruzamos con los signals ya cargados (fichas, instructores, ambientes).
   */
  private enrichedHorarios = computed(() => {
    const instMap  = new Map<string, any>(this.instructores().map((i: any) => [i.id, i]));
    const fichaMap = new Map<string, any>(this.fichas().map((f: any)       => [f.id, f]));
    const ambMap   = new Map<string, any>(this.ambientes().map((a: any)    => [a.id, a]));

    return this.horarios().map((h: any) => ({
      ...h,
      instructor: h.instructorId ? (instMap.get(h.instructorId) ?? null) : null,
      ficha:      h.fichaId      ? (fichaMap.get(h.fichaId)     ?? null) : null,
      ambiente:   h.ambienteId   ? (ambMap.get(h.ambienteId)    ?? null) : null,
    }));
  });

  tableRows = computed(() => this.buildRows(this.activeTab(), this.enrichedHorarios()));
  filteredRows = computed(() => {
    const q  = this.searchSig();
    const jf = this.filterJornada();
    let rows = this.tableRows();

    // Filtrar por texto de búsqueda
    if (q) {
      rows = rows.filter(r => {
        const n = (r.entity.nombre ?? r.entity.codigo ?? '').toLowerCase();
        const p = (r.entity.programa ?? '').toLowerCase();
        return n.includes(q) || p.includes(q);
      });
    }

    // Filtrar por jornada: solo mostrar filas que tengan algún horario en esa jornada
    if (jf) {
      rows = rows.filter(r =>
        Object.values(r.horariosByDay).some((slots: any) =>
          (slots as any[]).some((h: any) => h.jornada === jf)
        )
      );
    }

    return rows;
  });

  private toast = inject(ToastService);

  constructor(private api: ApiService, private route: ActivatedRoute, private zone: NgZone, private cdr: ChangeDetectorRef) {
    this.resetForm();
    this.route.data.subscribe(data => {
      if (data['tab']) this.activeTab.set(data['tab']);
    });
    // Auto-switch al horario activo según hora actual
    effect(() => {
      this.now(); // dependencia reactiva
      this.autoSwitchSlots();
    });
  }

  ngOnInit() {
    this.loadAll();
    // Actualiza el reloj Y recarga horarios/eventos cada 30s
    this.timer = setInterval(() => {
      this.now.set(new Date());
      this.api.getHorarios().subscribe({ next: h => this.horarios.set(h), error: () => {} });
      this.api.getEventos().subscribe({ next: e => this.eventos.set(e ?? []), error: () => {} });
    }, 30000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  loadAll() {
    // Limpiar overrides manuales al recargar la vista completa
    this.manualOverrides.clear();
    this.api.getHorarios().subscribe({ next: h => this.zone.run(() => { this.horarios.set(h); this.cdr.markForCheck(); }), error: () => {} });
    this.api.getFichas().subscribe({ next: f => this.zone.run(() => { this.fichas.set(f); this.cdr.markForCheck(); }), error: () => {} });
    this.api.getAmbientes().subscribe({
      next: a => this.zone.run(() => { this.ambientes.set(a); this.cdr.markForCheck(); }),
      error: () => this.zone.run(() => { this.toast.error('Sin datos', 'No se pudieron cargar los ambientes. Verifica tu sesión.'); this.cdr.markForCheck(); }),
    });
    this.api.getInstructores().subscribe({
      next: i => this.zone.run(() => { this.instructores.set(i); this.cdr.markForCheck(); }),
      error: () => this.zone.run(() => { this.toast.error('Sin datos', 'No se pudieron cargar los instructores. Verifica tu sesión.'); this.cdr.markForCheck(); }),
    });
    this.api.getEventos().subscribe({ next: e => this.zone.run(() => { this.eventos.set(e ?? []); this.cdr.markForCheck(); }), error: () => {} });
    this.api.getAreas().subscribe({ next: a => this.zone.run(() => { this.areasRegistradas.set(a ?? []); this.cdr.markForCheck(); }), error: () => {} });
  }

  buildRows(tab: string, horarios: any[]) {
    const map = new Map<number, Record<string, any>>();

    horarios.forEach(h => {
      let entity: any;
      if (tab === 'instructor') entity = h.instructor;
      else if (tab === 'ficha') entity = h.ficha;
      else entity = h.ambiente;
      if (!entity) return;

      h.compVigente = this.getCompetencia(h);

      if (!map.has(entity.id)) {
        map.set(entity.id, { entity, horariosByDay: {} });
      }
      const row = map.get(entity.id)!;
      if (!row.horariosByDay[h.diaSemana]) {
        row.horariosByDay[h.diaSemana] = [];
      }
      row.horariosByDay[h.diaSemana].push(h);
    });

    // Ordenar cada día por horaInicio
    map.forEach(row => {
      Object.keys(row.horariosByDay).forEach(day => {
        row.horariosByDay[day].sort((a: any, b: any) =>
          (a.horaInicio ?? '').localeCompare(b.horaInicio ?? '')
        );
      });
    });

    return Array.from(map.values());
  }

  // ── Carrusel de múltiples jornadas por día ──────────────────────
  getSlotIdx(entityId: number, day: string): number {
    return this.activeSlotMap()[`${entityId}-${day}`] ?? 0;
  }

  nextSlot(entityId: number, day: string, total: number) {
    const key = `${entityId}-${day}`;
    this.manualOverrides.add(key);
    const curr = this.activeSlotMap()[key] ?? 0;
    this.activeSlotMap.update(m => ({ ...m, [key]: (curr + 1) % total }));
    this.hideTooltip();
    this.hideEventoTooltip();
  }

  isCurrentTime(h: any): boolean {
    if (!h?.horaInicio || !h?.horaFin) return false;
    const curr = this.now();
    // Solo resaltar si la columna corresponde al día de hoy
    const days = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
    if (h.diaSemana !== days[curr.getDay()]) return false;
    const [sh, sm] = h.horaInicio.split(':').map(Number);
    const [eh, em] = h.horaFin.split(':').map(Number);
    const nowMin = curr.getHours() * 60 + curr.getMinutes();
    return nowMin >= sh * 60 + sm && nowMin <= eh * 60 + em;
  }

  autoSwitchSlots() {
    const curr = this.now();
    const nowMin = curr.getHours() * 60 + curr.getMinutes();
    const updates: Record<string, number> = {};

    this.tableRows().forEach(row => {
      const entityId = row.entity.id;
      Object.entries(row.horariosByDay).forEach(([day, slots]: [string, any]) => {
        const key = `${entityId}-${day}`;
        // No sobreescribir celdas donde el usuario navegó manualmente
        if (this.manualOverrides.has(key)) return;
        if (!slots?.length || slots.length <= 1) return;
        const matchIdx = slots.findIndex((h: any) => {
          if (!h.horaInicio || !h.horaFin) return false;
          const [sh, sm] = h.horaInicio.split(':').map(Number);
          const [eh, em] = h.horaFin.split(':').map(Number);
          return nowMin >= sh * 60 + sm && nowMin <= eh * 60 + em;
        });
        if (matchIdx > -1) {
          updates[key] = matchIdx;
        }
      });
    });

    if (Object.keys(updates).length > 0) {
      this.activeSlotMap.update(m => ({ ...m, ...updates }));
    }
  }

  /** Click en (?) — abre el tooltip si estaba cerrado, lo cierra si ya estaba abierto para este horario */
  toggleTooltip(h: any, comp: any, event: MouseEvent) {
    event.stopPropagation();
    if (!comp) return;
    if (this.tooltipState()?.h?.id === h.id) { this.hideTooltip(); return; }
    const icon = event.currentTarget as HTMLElement;
    const card = icon.closest('.horario-card');
    const iconRect = icon.getBoundingClientRect();
    const cardRect = card ? card.getBoundingClientRect() : iconRect;
    const tooltipW = 320;
    const x = cardRect.right + 12 + tooltipW > window.innerWidth
      ? cardRect.left - tooltipW - 12
      : cardRect.right + 12;
    const y = Math.min(Math.max(iconRect.top - 8, 8), window.innerHeight - 320);
    const comps: any[] = h.competencias ?? [];
    const compIdx = Math.max(0, comps.findIndex((c: any) => c.id === comp.id));
    this.tooltipState.set({ h, comp, compIdx, x, y });
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
    const durMin = this._durHorarioMin(h);
    const hrs = Math.floor(durMin / 60);
    const min = durMin % 60;
    if (min === 0) return `${hrs}h`;
    if (hrs === 0) return `${min}min`;
    return `${hrs}h ${min}min`;
  }

  showHistDias(c: any, event: MouseEvent) {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const popW = 300;
    const rowCount = (c.diasClase ?? []).length;
    const popH = 36 + rowCount * 27;
    // A la DERECHA del botón, en el espacio vacío junto al icono
    const x = Math.min(rect.right + 10, window.innerWidth - popW - 8);
    // Centrado verticalmente respecto al botón, sin salirse del viewport
    const y = Math.max(Math.min(rect.top - Math.floor(popH / 2), window.innerHeight - popH - 8), 8);
    this.histDiasPopover.set({ c, x, y });
  }
  hideHistDias() { this.histDiasPopover.set(null); }

  showHistResultados(c: any, event: MouseEvent) {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const popW = 300;
    const rowCount = this.resultadosDe(c).length;
    const popH = 36 + rowCount * 27;
    const x = Math.min(rect.right + 10, window.innerWidth - popW - 8);
    const y = Math.max(Math.min(rect.top - Math.floor(popH / 2), window.innerHeight - popH - 8), 8);
    this.histResultadosPopover.set({ c, x, y });
  }
  hideHistResultados() { this.histResultadosPopover.set(null); }

  private _durHorarioMin(h: any): number {
    if (!h?.horaInicio || !h?.horaFin) return 0;
    const [sh, sm] = h.horaInicio.split(':').map(Number);
    const [eh, em] = h.horaFin.split(':').map(Number);
    const s = sh * 60 + sm, e = eh * 60 + em;
    return e < s ? (e + 1440) - s : e - s;
  }

  calcHorasCompetencia(comp: any, h: any): string {
    const dias = (comp?.diasClase ?? []).length;
    if (!dias) return '0h';
    const totalMin = dias * this._durHorarioMin(h);
    const hrs = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    if (min === 0) return `${hrs}h`;
    if (hrs === 0) return `${min}min`;
    return `${hrs}h ${min}min`;
  }

  /** True si hoy es el último día del evento Y su horaFin ya pasó */
  isEventoPasado(ev: any, now: Date): boolean {
    if (!ev.horaFin) return false;
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const endDate = (ev.fechaFin ?? ev.fechaInicio)?.split('T')[0];
    if (endDate && endDate > today) return false;
    const [hh, mm] = ev.horaFin.split(':').map(Number);
    return now.getHours() * 60 + now.getMinutes() > hh * 60 + mm;
  }

  /** True si el evento aún no ha comenzado (horaInicio no ha llegado) */
  isEventoNoIniciado(ev: any, now: Date): boolean {
    if (!ev.horaInicio) return false;
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const startDate = ev.fechaInicio?.split('T')[0];
    if (startDate && startDate > today) return true;
    if (startDate && startDate < today) return false;
    const [hh, mm] = ev.horaInicio.split(':').map(Number);
    return now.getHours() * 60 + now.getMinutes() < hh * 60 + mm;
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
    this.eventoTooltip.set({
      ev, x, y,
      pasado: this.isEventoPasado(ev, this.now()),
      noIniciado: this.isEventoNoIniciado(ev, this.now()),
    });
  }
  hideEventoTooltip() { this.eventoTooltip.set(null); }

  tipoLabelEvento(t: string): string {
    return ({ formativo: 'Formativo', institucional: 'Institucional', evaluacion: 'Evaluación', festivo: 'Festivo / No lectivo' } as any)[t] ?? t;
  }
  tipoIconEvento(t: string): string {
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

  isActive(h: any): boolean {
    if (!h.activo) return false;
    const now = this.now();
    const days = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
    const diaHoy = days[now.getDay()];
    const nowMin = now.getHours() * 60 + now.getMinutes();

    // El horario solo cuenta como activo si fue activado HOY (no la semana pasada)
    if (h.ultimaActivacion) {
      const actDate = new Date(h.ultimaActivacion);
      const sameDay = actDate.getFullYear() === now.getFullYear() &&
                      actDate.getMonth()    === now.getMonth()    &&
                      actDate.getDate()     === now.getDate();
      if (!sameDay) return false;
    }

    // Debe corresponder al día de hoy y no haber terminado
    if (h.diaSemana !== diaHoy) return false;
    if (h.horaFin) {
      const [eh, em] = h.horaFin.split(':').map(Number);
      if (nowMin > eh * 60 + em) return false;
    }
    return true;
  }

  readonly hoyIso = new Date().toISOString().slice(0, 10);

  /** Normaliza c.resultados (puede venir en formato legado string[]) para mostrarlos */
  resultadosDe(c: any): Resultado[] {
    return normalizarResultados(c?.resultados);
  }

  estadoResultadoInfo(r: Resultado) {
    return RESULTADO_ESTADO_INFO[estadoResultado(r, this.hoyIso)];
  }

  getCompetencia(h: any) {
    if (!h.competencias || h.competencias.length === 0) return null;
    const now = new Date();
    // Solo se considera la competencia VIGENTE (dentro de su período). Si ya
    // terminó su período, no debe seguir mostrándose (antes caía al último
    // elemento del arreglo sin importar si estaba vencido).
    return h.competencias.find((c: any) => {
      if (!c.fechaInicio) return true;
      const start = new Date(c.fechaInicio);
      const end = c.fechaFin ? new Date(c.fechaFin) : new Date('2099-01-01');
      return now >= start && now <= end;
    }) ?? null;
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

  // ── Día actual ─────────────────────────────────────────────────
  isDiaHoy(dia: string): boolean {
    const days = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
    return days[new Date().getDay()] === dia;
  }

  /** Porcentaje de progreso del horario activo en el día (igual que en instructor) */
  calcProgress(h: any): number {
    if (!h.horaInicio || !h.horaFin) return 0;
    const curr = this.now();
    const [sh, sm] = h.horaInicio.split(':').map(Number);
    const [eh, em] = h.horaFin.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin   = eh * 60 + em;
    const nowMin   = curr.getHours() * 60 + curr.getMinutes();
    if (nowMin < startMin) return 0;
    if (nowMin > endMin) return 100;
    return Math.round(((nowMin - startMin) / (endMin - startMin)) * 100);
  }

  // ── Descarga reporte HTML del día ──────────────────────────────
  descargarReporte() {
    const hoy = new Date();
    const today = hoy.toISOString().split('T')[0];
    const fechaLabel = hoy.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const horaLabel  = hoy.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const days = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
    const diaHoy = days[hoy.getDay()];
    const horariosHoy = this.enrichedHorarios().filter((h: any) => h.diaSemana === diaHoy);
    const conRetraso  = horariosHoy.filter((h: any) => h.minutosRetraso > 0);
    const eventosHoy  = this.eventos().filter((ev: any) => {
      if (!ev.fechaInicio) return false;
      const s = ev.fechaInicio.split('T')[0];
      const e = (ev.fechaFin ?? ev.fechaInicio).split('T')[0];
      return today >= s && today <= e;
    });

    const jornadaLabel: Record<string,string> = { manana:'Mañana', tarde:'Tarde', noche:'Noche' };
    const tipoLabel:    Record<string,string> = { formativo:'Formativo', institucional:'Institucional', evaluacion:'Evaluación', festivo:'Festivo' };
    const tipoColor:    Record<string,string> = { formativo:'#dbeafe;color:#1d4ed8', institucional:'#dcfce7;color:#166534', evaluacion:'#fed7aa;color:#92400e', festivo:'#fee2e2;color:#991b1b' };

    const badge = (txt: string, bg: string, col: string) =>
      `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${bg};color:${col}">${txt}</span>`;

    // ── Filas horarios ──
    const rowsHor = horariosHoy.length ? horariosHoy.map((h: any) => {
      const instr = `${h.instructor?.nombre ?? ''} ${h.instructor?.apellido ?? ''}`.trim() || '—';
      const ficha = h.ficha ? `<strong>${h.ficha.codigo}</strong><br><span style="font-size:11px;color:#6b7280">${h.ficha.programa}</span>` : '—';
      const ambNombre = h.ambiente?.nombre ?? h.ubicacionTransversalNombre;
      const esTransversal = !!h.instructor?.esTransversal;
      const amb = ambNombre
        ? (esTransversal ? `${ambNombre} <span style="font-size:11px;color:#d97706;font-style:italic">(transversal)</span>` : ambNombre)
        : (esTransversal ? `<span style="color:#d97706;font-style:italic">Transversal</span>` : '—');
      const jorn  = jornadaLabel[h.jornada] ?? h.jornada ?? '—';
      const hora  = `${this.to12h(h.horaInicio)} — ${this.to12h(h.horaFin)}`;
      const est   = h.activo ? badge('Activo','#dcfce7','#166534') : (h.ultimaActivacion ? badge('Finalizado','#f3f4f6','#374151') : badge('Sin iniciar','#fef9c3','#854d0e'));
      const ret   = h.minutosRetraso > 0 ? badge(`${h.minutosRetraso} min retraso`,'#fee2e2','#991b1b') : '<span style="color:#9ca3af">—</span>';
      return `<tr><td>${instr}</td><td>${ficha}</td><td>${amb}</td><td>${jorn}</td><td style="font-weight:700">${hora}</td><td>${est}</td><td>${ret}</td></tr>`;
    }).join('') : `<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:20px">Sin horarios registrados hoy</td></tr>`;

    // ── Filas eventos ──
    const rowsEv = eventosHoy.length ? eventosHoy.map((ev: any) => {
      const [bg, col] = (tipoColor[ev.tipo] ?? '#f3f4f6;color:#374151').split(';color:');
      const tipo  = badge(tipoLabel[ev.tipo] ?? ev.tipo, bg.replace('background:',''), col ?? '#374151');
      const hora  = ev.horaInicio ? `${this.to12h(ev.horaInicio)} — ${this.to12h(ev.horaFin)}` : '—';
      const fichas = (ev.fichasParticipantes ?? []).length;
      const lugarTxt = (ev.ubicacionNombre ?? ev.lugar ?? '—') + (ev.ubicacionArea ? ` — ${ev.ubicacionArea}` : '');
      return `<tr><td><strong>${ev.nombre}</strong></td><td>${tipo}</td><td>${hora}</td><td>${lugarTxt}</td><td style="text-align:center">${fichas}</td><td style="color:#6b7280;font-size:12px">${ev.descripcion ?? '—'}</td></tr>`;
    }).join('') : `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px">Sin eventos hoy</td></tr>`;

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Reporte Diario — ${fechaLabel}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f3f4f6;color:#111827;padding:32px}
  .wrap{max-width:1100px;margin:auto}
  .header{background:#1e3a5f;color:#fff;border-radius:12px;padding:28px 32px;margin-bottom:24px}
  .header h1{font-size:22px;font-weight:800;margin-bottom:4px}
  .header p{opacity:.8;font-size:13px}
  .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
  .card{background:#fff;border-radius:10px;padding:18px 24px;border:1px solid #e5e7eb;flex:1;min-width:130px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
  .card .num{font-size:32px;font-weight:800}
  .card .lbl{font-size:12px;color:#6b7280;margin-top:2px}
  section{background:#fff;border-radius:10px;border:1px solid #e5e7eb;margin-bottom:24px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)}
  .sec-head{background:#1e3a5f;color:#fff;padding:12px 20px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
  table{width:100%;border-collapse:collapse}
  th{background:#f8fafc;color:#374151;padding:10px 16px;font-size:11px;font-weight:700;text-align:left;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #e5e7eb}
  td{padding:11px 16px;border-bottom:1px solid #f3f4f6;font-size:13px;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#fafafa}
  @media print{body{background:#fff;padding:0}.card{box-shadow:none}}
</style></head><body><div class="wrap">
<div class="header">
  <h1>Reporte Diario — ChronoGest</h1>
  <p>${fechaLabel.charAt(0).toUpperCase() + fechaLabel.slice(1)} &nbsp;·&nbsp; Generado a las ${horaLabel}</p>
</div>
<div class="cards">
  <div class="card"><div class="num" style="color:#2563eb">${horariosHoy.length}</div><div class="lbl">Horarios hoy</div></div>
  <div class="card"><div class="num" style="color:#16a34a">${horariosHoy.filter((h:any)=>h.ultimaActivacion).length}</div><div class="lbl">Finalizados</div></div>
  <div class="card"><div class="num" style="color:#dc2626">${conRetraso.length}</div><div class="lbl">Con retraso</div></div>
  <div class="card"><div class="num" style="color:#d97706">${eventosHoy.length}</div><div class="lbl">Eventos</div></div>
</div>
<section>
  <div class="sec-head">Horarios del Día</div>
  <table><thead><tr><th>Instructor</th><th>Ficha</th><th>Ambiente</th><th>Jornada</th><th>Horario</th><th>Estado</th><th>Retraso</th></tr></thead>
  <tbody>${rowsHor}</tbody></table>
</section>
<section>
  <div class="sec-head">Eventos del Día</div>
  <table><thead><tr><th>Nombre</th><th>Tipo</th><th>Horario</th><th>Lugar</th><th style="text-align:center">Fichas</th><th>Descripción</th></tr></thead>
  <tbody>${rowsEv}</tbody></table>
</section>
</div></body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `reporte-${today}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ── Abrir wizard desde ambiente disponible ──────────────────────
  abrirWizardDesdeAmbiente(ambiente: any) {
    this.resetForm();
    this.formError.set('');
    this.wizardForm.jornada = this.dispJornada;
    this.onWizardJornadaChange();
    if (this.dispDia) {
      // area_nombre viene directamente del spread del Ambiente entity en checkDisponibilidad
      const area = ambiente.area_nombre ?? '';
      this.wizardForm.dias = [this.dispDia];
      this.wizardForm.diasConfig[this.dispDia] = {
        areaFiltro: area,   // pre-rellena área → filtra fichas y ambientes automáticamente
        fichaId: '',
        ambienteId: ambiente.id,
        instructorId: ''
      };
    }
    this.showModal.set(true);
  }

  toggle(h: any) {
    this.api.toggleHorario(h.id).subscribe((updated: any) => {
      this.horarios.update(list => list.map((x: any) => x.id === updated.id ? { ...x, activo: updated.activo } : x));
    });
  }

  deleteHorario(id: number) {
    if (!confirm('¿Eliminar este horario?')) return;
    this.api.deleteHorario(id).subscribe({
      next: () => {
        this.horarios.update(list => list.filter(h => h.id !== id));
        this.toast.success('Horario eliminado', 'El horario fue eliminado correctamente.');
      },
      error: (e) => {
        this.toast.error('Error al eliminar', e?.error?.message ?? 'No se pudo eliminar el horario.');
      },
    });
  }

  // ── Opciones para SearchableSelect ─────────────────────────────

  /** Jornadas disponibles */
  readonly jornadaOpts: SSOption[] = [
    { value: 'manana', label: 'Mañana (07:00–12:00)' },
    { value: 'tarde',  label: 'Tarde (13:00–17:00)' },
    { value: 'noche',  label: 'Noche (18:00–20:00)' },
  ];

  /** Áreas de ficha con opción "Todas" */
  fichaAreasOpts = computed<SSOption[]>(() => [
    { value: '', label: 'Todas las áreas' },
    ...this.fichaAreas().map(a => ({ value: a, label: a })),
  ]);

  /** Instructores */
  instructoresOpts = computed<SSOption[]>(() =>
    this.instructores().map(i => ({
      value: i.id,
      label: `${i.nombre} ${i.apellido}${i.esTransversal ? ' · Transversal' : ''}`,
    }))
  );

  /** Fichas filtradas por área para un día del wizard */
  getFichasOpts(dia: string): SSOption[] {
    return this.getFichasFiltradas(dia).map(f => ({
      value: f.id,
      label: `${f.codigo} — ${f.programa}`,
    }));
  }

  /** Ambientes filtrados para un día del wizard (con disabled si ocupado) */
  getAmbientesOpts(dia: string): SSOption[] {
    return this.getAmbientesFiltrados(dia).map(a => ({
      value: a.id,
      label: a.nombre,
      disabled: this.isWizardAmbienteOcupado(a.id, dia),
    }));
  }

  // ── Áreas disponibles (del sistema formativo + las que tienen cursos asignados) ────
  fichaAreas = computed(() => {
    // Áreas registradas en el sistema
    const sistemAreas = this.areasRegistradas().map((a: any) => a.nombre).filter(Boolean);
    // Áreas derivadas de los cursos (por si algún curso tiene un área no registrada)
    const cursoAreas = this.fichas().map((f: any) => f.area).filter(Boolean);
    // Unión sin duplicados, ordenada
    return [...new Set([...sistemAreas, ...cursoAreas])].sort() as string[];
  });

  getFichasFiltradas(dia: string): any[] {
    const cfg = this.wizardForm.diasConfig[dia];
    if (!cfg?.areaFiltro) return this.fichas();
    return this.fichas().filter((f: any) => f.area === cfg.areaFiltro);
  }

  getAmbientesFiltrados(dia: string): any[] {
    const cfg = this.wizardForm.diasConfig[dia];
    if (!cfg?.areaFiltro) return this.ambientes();
    return this.ambientes().filter((a: any) => a.area_nombre === cfg.areaFiltro);
  }

  onWizardAreaChange(dia: string) {
    const cfg = this.wizardForm.diasConfig[dia];
    if (cfg) {
      cfg.fichaId   = '';
      cfg.ambienteId = '';
    }
    // Propagar a todos los días activos si "Aplicar a todos" está marcado
    if (this.applyAll.area) {
      const val = cfg?.areaFiltro ?? '';
      this.wizardForm.dias.forEach(d => {
        if (d !== dia) {
          this.wizardForm.diasConfig[d].areaFiltro  = val;
          this.wizardForm.diasConfig[d].fichaId      = '';
          this.wizardForm.diasConfig[d].ambienteId   = '';
        }
      });
    }
  }

  onFichaChange(dia: string, val: any) {
    if (this.applyAll.ficha) {
      this.wizardForm.dias.forEach(d => {
        this.wizardForm.diasConfig[d].fichaId = val;
      });
    }
  }

  onAmbienteChange(dia: string, val: any) {
    if (this.applyAll.ambiente) {
      this.wizardForm.dias.forEach(d => {
        if (!this.isInstructorTransversal(d)) {
          this.wizardForm.diasConfig[d].ambienteId = val;
        }
      });
    }
  }

  /** Activa/desactiva "Aplicar a todos" para una columna y propaga el valor del primer día activo */
  onToggleApplyAll(field: 'area' | 'ficha' | 'instructor' | 'ambiente', event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.applyAll[field] = checked;
    if (!checked || !this.wizardForm.dias.length) return;

    const firstDay = this.wizardForm.dias[0];
    const cfg = this.wizardForm.diasConfig[firstDay];
    if (!cfg) return;

    switch (field) {
      case 'area': {
        const val = cfg.areaFiltro;
        this.wizardForm.dias.forEach(d => {
          this.wizardForm.diasConfig[d].areaFiltro  = val;
          this.wizardForm.diasConfig[d].fichaId      = '';
          this.wizardForm.diasConfig[d].ambienteId   = '';
        });
        break;
      }
      case 'ficha': {
        const val = cfg.fichaId;
        if (!val) break;
        this.wizardForm.dias.forEach(d => { this.wizardForm.diasConfig[d].fichaId = val; });
        break;
      }
      case 'instructor': {
        const val = cfg.instructorId;
        if (!val) break;
        const instr = this.instructores().find(i => i.id === +val);
        this.wizardForm.dias.forEach(d => {
          this.wizardForm.diasConfig[d].instructorId = val;
          if (instr?.esTransversal) this.wizardForm.diasConfig[d].ambienteId = '';
        });
        break;
      }
      case 'ambiente': {
        const val = cfg.ambienteId;
        if (!val) break;
        this.wizardForm.dias.forEach(d => {
          if (!this.isInstructorTransversal(d)) {
            this.wizardForm.diasConfig[d].ambienteId = val;
          }
        });
        break;
      }
    }
  }

  // Wizard Logic
  onWizardJornadaChange() {
    const j = JORNADAS.find(x => x.key === this.wizardForm.jornada);
    if (j) {
      this.wizardForm.horaInicio = j.inicio;
      this.wizardForm.horaFin = j.fin;
    }
  }

  /**
   * Infiere la jornada a partir de horaInicio:
   *   06:00–12:59 → manana  |  13:00–17:59 → tarde  |  18:00+ → noche
   */
  detectarJornada(hora: string): string {
    if (!hora) return '';
    const [hh, mm] = hora.split(':').map(Number);
    const min = hh * 60 + (mm || 0);
    if (min >= 6 * 60  && min < 13 * 60) return 'manana';
    if (min >= 13 * 60 && min < 18 * 60) return 'tarde';
    if (min >= 18 * 60)                   return 'noche';
    return '';
  }

  jornadaDetectadaLabel(): string {
    const j = this.detectarJornada(this.wizardForm.horaInicio);
    return ({ manana: 'Mañana (6 am – 1 pm)', tarde: 'Tarde (1 pm – 6 pm)', noche: 'Noche (6 pm – 6 am)' } as any)[j] ?? '—';
  }

  abarcaDosJornadas(): boolean {
    const ini = this.detectarJornada(this.wizardForm.horaInicio);
    if (!ini || !this.wizardForm.horaFin) return false;
    const [hh, mm] = this.wizardForm.horaFin.split(':').map(Number);
    const finMin = hh * 60 + (mm || 0);
    // "Dos jornadas" solo cuando horaFin SUPERA ESTRICTAMENTE el límite de la jornada actual
    // Mañana  → límite 13:00 (tarde empieza a las 13:00)
    // Tarde   → límite 18:00 (noche empieza a las 18:00)
    // Noche   → el rango cruza medianoche; es dos jornadas si horaFin entra en zona de día (06:00-17:59)
    if (ini === 'manana') return finMin > 13 * 60;
    if (ini === 'tarde')  return finMin > 18 * 60;
    if (ini === 'noche')  return finMin >= 6 * 60 && finMin < 18 * 60; // 06:00-17:59 = cruzó a mañana/tarde
    return false;
  }

  /** Cuando el usuario cambia la hora de inicio → auto-actualiza la jornada */
  onHoraInicioChange(val: string) {
    const detected = this.detectarJornada(val ?? this.wizardForm.horaInicio);
    if (detected) this.wizardForm.jornada = detected;
  }

  /** Cuando cambia la hora de fin → solo re-evalúa si abarca dos jornadas (badge en template) */
  onHoraFinChange() {
    // La detección de jornada siempre viene del inicio; aquí solo forzamos re-renderizado
    // del badge de advertencia. Angular detecta el cambio automáticamente.
  }

  toggleWizardDay(d: string) {
    const idx = this.wizardForm.dias.indexOf(d);
    if (idx > -1) {
      // Desmarcar: solo quita del array, conserva la config por si el usuario lo reactiva
      this.wizardForm.dias.splice(idx, 1);
    } else {
      this.wizardForm.dias.push(d);
      if (!this.wizardForm.diasConfig[d]) {
        this.wizardForm.diasConfig[d] = { areaFiltro: '', fichaId: '', ambienteId: '', instructorId: '' };
      }
      // Auto-rellenar desde otro día activo si "Aplicar a todos" está activado en alguna columna
      const refDay = this.wizardForm.dias.find(dd => dd !== d);
      if (refDay) {
        const refCfg = this.wizardForm.diasConfig[refDay];
        const dCfg   = this.wizardForm.diasConfig[d];
        if (this.applyAll.area)       { dCfg.areaFiltro   = refCfg.areaFiltro; }
        if (this.applyAll.ficha)      { dCfg.fichaId       = refCfg.fichaId; }
        if (this.applyAll.instructor) { dCfg.instructorId  = refCfg.instructorId; }
        if (this.applyAll.ambiente && !this.isInstructorTransversal(d)) {
          dCfg.ambienteId = refCfg.ambienteId;
        }
      }
    }
  }

  isWizardAmbienteOcupado(ambienteId: number, dia: string): boolean {
    if (!this.wizardForm.jornada) return false;
    return this.horarios().some(h =>
      h.ambienteId === +ambienteId &&
      h.diaSemana === dia &&
      h.jornada === this.wizardForm.jornada
    );
  }

  /** Devuelve true si el instructor seleccionado para ese día es transversal */
  isInstructorTransversal(dia: string): boolean {
    const cfg = this.wizardForm.diasConfig[dia];
    if (!cfg?.instructorId) return false;
    const instr = this.instructores().find(i => String(i.id) === String(cfg.instructorId));
    return !!instr?.esTransversal;
  }

  /** Al cambiar instructor, limpia ambiente si el nuevo es transversal; propaga si applyAll.instructor */
  onInstructorChange(dia: string, instructorId: any) {
    const instr = this.instructores().find(i => String(i.id) === String(instructorId));
    if (instr?.esTransversal) {
      this.wizardForm.diasConfig[dia].ambienteId = '';
    }
    if (this.applyAll.instructor) {
      this.wizardForm.dias.forEach(d => {
        if (d !== dia) {
          this.wizardForm.diasConfig[d].instructorId = instructorId;
          if (instr?.esTransversal) this.wizardForm.diasConfig[d].ambienteId = '';
        }
      });
    }
    this.cdr.markForCheck();
  }

  esWizardValido(): boolean {
    if (!this.wizardForm.jornada || this.wizardForm.dias.length === 0) return false;
    for (const d of this.wizardForm.dias) {
      const config = this.wizardForm.diasConfig[d];
      if (!config || !config.fichaId || !config.instructorId) return false;
      // Ambiente requerido sólo para instructores no-transversales
      if (!this.isInstructorTransversal(d) && !config.ambienteId) return false;
    }
    return true;
  }

  openNew() {
    this.resetForm();
    this.formError.set('');
    this.showModal.set(true);
  }

  resetForm() {
    // Resetear "aplicar a todos"
    this.applyAll = { area: false, ficha: false, instructor: false, ambiente: false };
    // Pre-inicializar config para todos los días (necesario para la tabla)
    const diasConfig: Record<string, { areaFiltro: string; fichaId: string | number; ambienteId: string | number; instructorId: string | number }> = {};
    this.dias.forEach(d => {
      diasConfig[d] = { areaFiltro: '', fichaId: '', ambienteId: '', instructorId: '' };
    });
    this.wizardForm = {
      jornada: '',
      horaInicio: '',
      horaFin: '',
      dias: [],
      diasConfig,
    };
  }

  saveWizardHorarios() {
    if (!this.esWizardValido()) return;

    this.saving.set(true);
    this.formError.set('');

    // Obtener las horas por defecto de la jornada seleccionada
    const jornadaData = JORNADAS.find(j => j.key === this.wizardForm.jornada);

    const diasPayload = this.wizardForm.dias.map(d => {
      const transversal = this.isInstructorTransversal(d);
      const cfg = this.wizardForm.diasConfig[d];
      return {
        diaSemana: d,
        jornada:    this.wizardForm.jornada,
        // Si el wizard no tiene hora manual, usar la hora predefinida de la jornada
        horaInicio: this.wizardForm.horaInicio || jornadaData?.inicio || '07:00',
        horaFin:    this.wizardForm.horaFin    || jornadaData?.fin    || '12:00',
        // UUIDs: NO usar + (convertiría a NaN), pasar como string o null
        fichaId:      cfg.fichaId      || null,
        ambienteId:   transversal ? null : (cfg.ambienteId || null),
        instructorId: cfg.instructorId || null,
      };
    });

    const count = this.wizardForm.dias.length;
    this.api.createHorario({ dias: diasPayload }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.loadAll();
        this.toast.success(
          'Horarios creados',
          `Se registraron ${count} horario${count !== 1 ? 's' : ''} correctamente.`,
        );
      },
      error: (e) => {
        this.saving.set(false);
        const msg: string = e?.error?.message ?? 'No se pudo guardar el horario. Verifica los datos e intenta de nuevo.';
        this.toast.error('Error al crear horarios', msg);
      },
    });
  }

  // ── Disponibilidad de Ambientes ────────────────────────────────
  checkDisp() {
    this.api.getAmbientesDisponibilidad(this.dispDia || undefined, this.dispJornada || undefined)
      .subscribe(result => {
        this.zone.run(() => { this.dispResult.set(result); this.cdr.detectChanges(); });
      });
  }

  clearDisp() {
    this.dispDia = '';
    this.dispJornada = '';
    this.dispArea = '';
    this.dispResult.set([]);
  }


}
