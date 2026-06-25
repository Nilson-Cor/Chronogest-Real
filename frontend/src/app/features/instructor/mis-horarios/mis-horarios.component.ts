import { Component, OnInit, signal, OnDestroy, computed, inject, NgZone, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, catchError, of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { DIAS_SEMANA, DIAS_LABELS } from '../../../core/models/user.model';
import { LucideAngularModule } from 'lucide-angular';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { SearchableSelectComponent, SSOption } from '../../../shared/components/searchable-select.component';
import { ToastService } from '../../../core/services/toast.service';

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
  selector: 'app-instructor-mis-horarios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideAngularModule, DatePipe, UpperCasePipe, SearchableSelectComponent],
  template: `
    <div class="page-header">
      <div><h2>Mis Horarios</h2><p class="text-muted text-sm">Tu programación semanal (Pantalla Completa)</p></div>
      <button class="btn btn-outline" style="display:flex;align-items:center;gap:6px;font-size:13px;" (click)="openHistorial()">
        <lucide-icon name="clock" [size]="15"></lucide-icon> Historial de Competencias
      </button>
    </div>

    <div class="matrix-wrap mt-4">
      <div class="matrix-grid">
        <!-- HEADER ROW -->
        @for (d of dias; track d) {
          <div class="matrix-header-col text-center" [class.is-today]="isToday(d)">
            {{ LABELS[d] }}
          </div>
        }

        <!-- DATA ROW -->
        @for (d of dias; track d) {
        <div class="matrix-cell" style="position: relative;">
          @if (horariosByDay()[d]?.length) {
            @let slots = horariosByDay()[d];
            @let idx = getSlotIdx(d);
            @let h = slots[idx];
            <div class="slot-wrapper">

              <div class="horario-card" [class.active-session]="isHorarioActivo(d, h)" [class.en-curso]="!isHorarioActivo(d, h) && isEnCurso(d, h, now())">
                @let fichaEvs = h.ficha?.codigo ? fichaEventoMap().get(h.ficha.codigo) : null;
                <div class="card-layout">

                  <!-- ── Columna izquierda: toda la información ── -->
                  <div class="card-main">

                    <!-- Dots de navegación -->
                    <div class="slot-nav-row" [style.visibility]="slots.length > 1 ? 'visible' : 'hidden'">
                      <div class="slot-dots">
                        @for (s of slots; track s.id; let i = $index) {
                          <span class="slot-dot"
                                [class.active]="i === idx"
                                [class.current]="isEnCurso(d, s, now()) && i !== idx"
                                (click)="setSlot(d, i)"
                                style="cursor:pointer"
                                [title]="to12h(s.horaInicio) + ' — ' + to12h(s.horaFin)"></span>
                        }
                      </div>
                      @if (slots.length > 1) {
                        <button class="slot-arrow-btn" (click)="nextSlot(d, slots.length)" title="Ver siguiente jornada">
                          <lucide-icon name="chevron-right" [size]="13"></lucide-icon>
                        </button>
                      }
                    </div>

                    <!-- TOP: info dinámica -->
                    <div class="card-top">
                      <div class="info-row"><span class="info-label">Inicio</span><span class="info-val info-time">{{ to12h(h.horaInicio) }}</span></div>
                      <div class="info-row"><span class="info-label">Fin</span><span class="info-val info-time">{{ to12h(h.horaFin) }}</span></div>
                      <div class="info-row"><span class="info-label">Jornada</span><span class="info-val">{{ h.jornada | uppercase }}</span></div>
                      <div class="info-row"><span class="info-label">Ficha</span><span class="info-val">{{ h.ficha?.codigo ?? '—' }}</span></div>
                      <div class="info-row"><span class="info-label">Programa</span><span class="info-val">{{ h.ficha?.programa ?? '—' }}</span></div>
                      <div class="info-row">
                        <span class="info-label">Ambiente</span>
                        <span class="info-val">
                          @if (ambienteSeleccionado()[h.id]) {
                            <!-- Pre-selección antes de iniciar (transversal o conflicto) -->
                            <span style="font-weight:700;color:var(--blue)">{{ ambienteSeleccionado()[h.id].nombre }}</span>
                            @if (!isHorarioActivo(d, h)) {
                              <button class="limpiar-amb-btn" title="Quitar selección" (click)="limpiarAmbiente(h)">✕</button>
                            }
                          } @else if (h.ubicacionTransversalNombre && h.ambiente?.nombre) {
                            <!-- Instructor regular con ubicación temporal — tooltip al hover -->
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
                            {{ esTransversal() ? 'Sin ambiente' : '—' }}
                          }
                        </span>
                      </div>

                      @if (h.minutosRetraso > 0 && isToday(d)) {
                        <div class="retraso-badge mt-2">Retraso: {{ h.minutosRetraso }} min</div>
                      }

                      <!-- Alerta de conflicto de ambiente (instructor regular) -->
                      @if (ambienteConflicto()[h.id]) {
                        <div class="conflicto-alert mt-2">
                          <lucide-icon name="alert-circle" [size]="11" style="flex-shrink:0;margin-top:1px;"></lucide-icon>
                          <div style="flex:1;min-width:0;">
                            <div style="font-weight:700;line-height:1.3;">Ambiente ocupado</div>
                            <div style="opacity:.85;">En uso por <strong>{{ ambienteConflicto()[h.id].instructorNombre }}</strong> en <strong>{{ ambienteConflicto()[h.id].ambienteNombre }}</strong></div>
                            <button class="btn btn-outline btn-sm btn-full"
                                    style="margin-top:6px;font-size:10px;display:flex;align-items:center;justify-content:center;gap:4px;"
                                    (click)="buscarAlternativa(h)">
                              <lucide-icon name="search" [size]="10"></lucide-icon> Buscar otro ambiente
                            </button>
                          </div>
                        </div>
                      }

                      @if (esTransversal() && !isHorarioActivo(d, h) && !ambienteSeleccionado()[h.id] && !h.ambiente?.nombre && !h.ubicacionTransversalNombre && isToday(d) && !h.motivoFinalizacion) {
                        <button [class]="'btn btn-sm btn-full mt-2 ' + (consultandoId() === h.id ? 'btn-blue' : 'btn-outline')"
                                style="font-size:11px; display:flex; align-items:center; justify-content:center; gap:5px;"
                                (click)="consultarAmbientes(h)">
                          <lucide-icon name="search" [size]="12"></lucide-icon>
                          {{ consultandoId() === h.id ? 'Consultando...' : 'Consultar Ambientes' }}
                        </button>
                      }
                    </div><!-- end card-top -->

                    <!-- BOTTOM: acciones + progreso -->
                    <div class="card-bottom">
                      <div style="display:flex; flex-direction:column; gap:8px;">
                        @if (!isHorarioActivo(d, h)) {
                          <button class="btn btn-blue btn-full btn-sm"
                                  style="display:flex; align-items:center; justify-content:center; gap:6px; font-weight: 700"
                                  [disabled]="!puedeIniciar(d, h, ambienteSeleccionado())"
                                  [class.btn-disabled]="!puedeIniciar(d, h, ambienteSeleccionado())"
                                  (click)="playHorario(h)">
                            <lucide-icon name="play" [size]="14"></lucide-icon> Iniciar Clases
                          </button>
                        } @else {
                          <button class="btn btn-outline btn-full btn-sm"
                                  style="display:flex; align-items:center; justify-content:center; gap:6px; border-color:var(--red); color:var(--red);"
                                  (click)="promptFinalizar(h)">
                            <lucide-icon name="square" [size]="14"></lucide-icon> Finalizar Clases
                          </button>
                        }
                      </div>

                      @if (isHorarioActivo(d, h)) {
                        <div class="progress-bar mt-3">
                          <div class="progress-fill" [style.width.%]="calcProgress(h)"></div>
                        </div>
                        <div class="text-xs text-muted text-right mt-1">En curso · {{ calcProgress(h) }}%</div>
                      }

                      @if(!isHorarioActivo(d, h) && !puedeIniciar(d, h, ambienteSeleccionado()) && h.ultimaActivacion) {
                        <div class="text-xs text-muted text-center mt-2">Horario finalizado</div>
                      }

                      <button class="btn btn-outline btn-sm btn-full mt-3" style="font-size: 11px;" (click)="openComp(h)">
                        + Añadir Competencia
                      </button>
                    </div><!-- end card-bottom -->

                  </div><!-- end card-main -->

                  <!-- ── Columna derecha: iconos interactivos ── -->
                  <div class="card-actions-col">
                    <div class="card-help-btn"
                         [class.card-help-active]="tooltipState()?.h?.id === h.id"
                         (click)="toggleTooltip(h, getCompetenciaVigente(h), $event)">
                      <lucide-icon name="help-circle" [size]="15"></lucide-icon>
                    </div>
                    @if (fichaEvs?.length && isToday(d)) {
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
                  </div>

                </div><!-- end card-layout -->
              </div><!-- end horario-card -->
            </div><!-- end slot-wrapper -->
          } @else {
            <span style="color:var(--border);font-size:12px; margin: auto;">—</span>
          }
        </div>
        }
      </div>
    </div>

    <!-- ═══ Panel de selección de ubicación (fuera de la tabla) ═══ -->
    @if (consultandoId() && consultandoH()) {
    @let ch = consultandoH();
    <div class="amb-section mt-4" id="amb-section">

      <!-- Header del panel -->
      <div class="amb-section-head">
        <div class="amb-section-title">
          <lucide-icon name="building-2" [size]="17"></lucide-icon>
          <div>
            <span class="amb-section-main">Seleccionar Ubicación</span>
            <span class="amb-section-sub">
              {{ to12h(ch?.horaInicio) }} — {{ to12h(ch?.horaFin) }}
              · {{ ch?.jornada | uppercase }}
              · {{ ch?.ficha?.codigo }}
            </span>
          </div>
        </div>
        <button class="btn btn-outline btn-sm" style="display:flex;align-items:center;gap:5px;" (click)="cerrarPanel()">
          <lucide-icon name="x" [size]="13"></lucide-icon> Cerrar
        </button>
      </div>

      <!-- Tabs de tipo de ubicación -->
      <div class="ubicacion-tabs mt-3">
        <button [class]="'ubi-tab' + (tipoUbicacion() === 'ambientes' ? ' ubi-tab-active' : '')"
                (click)="cambiarTipoUbicacion('ambientes', ch)">
          <lucide-icon name="building-2" [size]="13"></lucide-icon> Ambientes
        </button>
        @for (t of UBICACION_TIPOS; track t.tipo) {
          <button [class]="'ubi-tab' + (tipoUbicacion() === t.tipo ? ' ubi-tab-active' : '')"
                  (click)="cambiarTipoUbicacion(t.tipo, ch)">
            <lucide-icon [name]="t.icon" [size]="13"></lucide-icon> {{ t.label }}
          </button>
        }
      </div>

      <!-- Filtros -->
      <div class="amb-filters mt-3">
        <div class="amb-search-wrap">
          <lucide-icon name="search" [size]="13" class="amb-search-icon"></lucide-icon>
          <input class="amb-search-input"
                 [ngModel]="busquedaAmb()"
                 (ngModelChange)="busquedaAmb.set($event)"
                 placeholder="Buscar ambiente...">
        </div>
        <div style="min-width:160px;">
          <app-ss [options]="areasOpts()"
                  placeholder="Todas las áreas"
                  [ngModel]="areaFiltro()"
                  (ngModelChange)="areaFiltro.set($event)"></app-ss>
        </div>
      </div>

      @if (cargandoAmbs()) {
        <div class="amb-loading-center mt-4">
          <lucide-icon name="loader" [size]="20" style="opacity:.5;"></lucide-icon>
          <span>Cargando...</span>
        </div>

      <!-- ══ AMBIENTES ══ -->
      } @else if (tipoUbicacion() === 'ambientes') {
        @let libres     = ambsFiltradosLibres();
        @let conflictos = ambsFiltradosConflicto();

        @if (libres.length) {
          <div class="amb-group mt-3">
            <div class="amb-group-header amb-group-libre">
              <lucide-icon name="check-circle" [size]="13"></lucide-icon>
              Disponibles — {{ libres.length }}
            </div>
            <div class="amb-cards-grid">
              @for (amb of libres; track amb.id) {
                <button class="amb-card amb-card-libre" (click)="seleccionarAmbiente(ch, amb)">
                  <div class="amb-card-top-row">
                    <span class="amb-card-nombre">{{ amb.nombre }}</span>
                    @if (amb.area_nombre) { <span class="amb-area-tag">{{ amb.area_nombre }}</span> }
                  </div>
                  <span class="amb-card-libre-hint">
                    <lucide-icon name="check-circle" [size]="10"></lucide-icon> Sin conflictos
                  </span>
                </button>
              }
            </div>
          </div>
        }

        @if (conflictos.length) {
          <div class="amb-group mt-4">
            <div class="amb-group-header amb-group-conflicto">
              <lucide-icon name="alert-triangle" [size]="13"></lucide-icon>
              Con horario sin iniciar — usar con precaución ({{ conflictos.length }})
            </div>
            <div class="amb-cards-grid">
              @for (amb of conflictos; track amb.id) {
                <div class="amb-card amb-card-conflicto">
                  <div class="amb-card-top-row">
                    <span class="amb-card-nombre">{{ amb.nombre }}</span>
                    @if (amb.area_nombre) { <span class="amb-area-tag amb-area-tag-amber">{{ amb.area_nombre }}</span> }
                  </div>
                  <div class="amb-cc-details">
                    <div class="amb-cc-row">
                      <lucide-icon name="clock" [size]="10"></lucide-icon>
                      {{ to12h(amb.horario?.horaInicio) }} — {{ to12h(amb.horario?.horaFin) }}
                      @if (amb.horario?.minutosRetraso > 0) {
                        <span class="amb-retraso-tag">{{ amb.horario.minutosRetraso }} min retraso</span>
                      }
                    </div>
                    @if (amb.horario?.instructor) {
                      <div class="amb-cc-row"><lucide-icon name="user" [size]="10"></lucide-icon> {{ amb.horario.instructor }}</div>
                    }
                    @if (amb.horario?.ficha) {
                      <div class="amb-cc-row"><lucide-icon name="graduation-cap" [size]="10"></lucide-icon> {{ amb.horario.ficha }}</div>
                    }
                  </div>
                  <button class="amb-cc-select-btn" (click)="seleccionarAmbiente(ch, amb)">
                    <lucide-icon name="alert-triangle" [size]="11"></lucide-icon> Usar de todas formas
                  </button>
                </div>
              }
            </div>
          </div>
        }
        @if (!libres.length && !conflictos.length) {
          <p class="amb-loading-center mt-4">No hay ambientes que coincidan con el filtro.</p>
        }

      <!-- ══ OTRAS UBICACIONES ══ -->
      } @else {
        @let ubicLibres   = ubicFiltradosLibres();
        @let ubicOcupados = ubicFiltradosOcupados();

        @if (ubicLibres.length) {
          <div class="amb-group mt-3">
            <div class="amb-group-header amb-group-libre">
              <lucide-icon name="check-circle" [size]="13"></lucide-icon>
              Disponibles — {{ ubicLibres.length }}
            </div>
            <div class="amb-cards-grid">
              @for (u of ubicLibres; track u.id) {
                <button class="amb-card amb-card-libre" (click)="seleccionarUbicacion(ch, u)">
                  <div class="amb-card-top-row">
                    <span class="amb-card-nombre">{{ u.nombre }}</span>
                    @if (u.area_nombre) { <span class="amb-area-tag">{{ u.area_nombre }}</span> }
                  </div>
                  @if (u.capacidad) {
                    <span class="amb-card-libre-hint">
                      <lucide-icon name="users" [size]="10"></lucide-icon> Cap. {{ u.capacidad }}
                    </span>
                  }
                  <span class="amb-card-libre-hint">
                    <lucide-icon name="check-circle" [size]="10"></lucide-icon> Sin eventos
                  </span>
                </button>
              }
            </div>
          </div>
        }

        @if (ubicOcupados.length) {
          <div class="amb-group mt-4">
            <div class="amb-group-header" style="color:#dc2626;">
              <lucide-icon name="calendar-x" [size]="13"></lucide-icon>
              Ocupadas por evento ({{ ubicOcupados.length }})
            </div>
            <div class="amb-cards-grid">
              @for (u of ubicOcupados; track u.id) {
                <div class="amb-card" style="background:#fef2f2;border-color:#fca5a5;color:#991b1b;opacity:.85;cursor:not-allowed;">
                  <div class="amb-card-top-row">
                    <span class="amb-card-nombre">{{ u.nombre }}</span>
                    @if (u.area_nombre) { <span class="amb-area-tag" style="background:#fee2e2;color:#991b1b;">{{ u.area_nombre }}</span> }
                  </div>
                  <div class="amb-cc-details">
                    <div class="amb-cc-row" style="font-weight:700;">
                      <lucide-icon name="calendar-x" [size]="10"></lucide-icon>
                      {{ u.evento?.nombre }}
                    </div>
                    @if (u.evento?.horaInicio) {
                      <div class="amb-cc-row">
                        <lucide-icon name="clock" [size]="10"></lucide-icon>
                        {{ to12h(u.evento.horaInicio) }} — {{ to12h(u.evento.horaFin) }}
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (!ubicLibres.length && !ubicOcupados.length) {
          <p class="amb-loading-center mt-4">No hay ubicaciones de este tipo registradas o que coincidan con el filtro.</p>
        }
      }
    </div>
    }

    <!-- Tooltip fijo encima de todo, alineado al top del card -->
    @if (tooltipState()) {
      <div class="tt-fixed-box"
           [style.left.px]="tooltipState()!.x"
           [style.top.px]="tooltipState()!.y"
           (click)="$event.stopPropagation()">

        <!-- Cabecera con navegación y acciones -->
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;">
          <!-- Flechas de navegación (solo si hay >1 competencia) -->
          @if ((tooltipState()!.h.competencias ?? []).length > 1) {
            <button class="tt-close-btn" (click)="ttPrevComp()" title="Competencia anterior">
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
            <button class="tt-close-btn" (click)="ttNextComp()" title="Siguiente competencia">
              <lucide-icon name="chevron-right" [size]="11"></lucide-icon>
            </button>
          }
          <!-- Copiar y cerrar -->
          <button class="tt-close-btn"
                  (click)="copiarCompetencia()"
                  [title]="compCopied() ? '¡Copiado!' : 'Copiar información'"
                  [style.color]="compCopied() ? '#16a34a' : ''"
                  [style.border-color]="compCopied() ? '#86efac' : ''">
            <lucide-icon [name]="compCopied() ? 'check' : 'copy'" [size]="11"></lucide-icon>
          </button>
          <button class="tt-close-btn" (click)="hideTooltip()" title="Cerrar">
            <lucide-icon name="x" [size]="12"></lucide-icon>
          </button>
        </div>

        <!-- Nombre -->
        <p style="color:var(--text);font-weight:700;font-size:14px;margin:0 0 6px;">{{ tooltipState()!.comp.nombre }}</p>

        <!-- Resultados -->
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

        <!-- Período -->
        <p class="tt-label mt-2">PERÍODO</p>
        <p style="color:var(--text);font-size:12px;margin:2px 0 4px;">
          {{ tooltipState()!.comp.fechaInicio | date:'dd/MM/yyyy' }} — {{ tooltipState()!.comp.fechaFin | date:'dd/MM/yyyy' }}
        </p>
        <p class="tt-label mt-2">PROGRESO</p>
        <div class="progress-bar">
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

    <!-- ═══ HISTORIAL DE COMPETENCIAS ═══ -->
    @if (historialOpen()) {
    <div class="modal-overlay">
      <div class="modal hist-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3 style="margin:0">Historial de Competencias</h3>
            <p style="font-size:12px;color:var(--text-muted);margin:2px 0 0">Todas las competencias registradas en tus horarios</p>
          </div>
          <button class="btn-icon" (click)="historialOpen.set(false)"><lucide-icon name="x" [size]="18"></lucide-icon></button>
        </div>

        <!-- Filtros: búsqueda + ficha -->
        <div style="padding:12px 0 8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <div style="position:relative;flex:1;min-width:180px;">
            <lucide-icon name="search" [size]="13" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none;"></lucide-icon>
            <input class="form-control" style="padding-left:32px;font-size:13px;"
                   [ngModel]="histFiltro()" (ngModelChange)="histFiltro.set($event)"
                   placeholder="Buscar competencia...">
          </div>
          <!-- Filtro por ficha (aparece cuando hay ≥2 fichas) -->
          @if (histFichasDisponibles().length > 1) {
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              <lucide-icon name="filter" [size]="13" style="color:var(--text-muted);opacity:.7;flex-shrink:0;"></lucide-icon>
              <select class="hist-ficha-sel"
                      [value]="histFichaFilter()"
                      (change)="histFichaFilter.set($any($event.target).value)">
                <option value="">Todas las fichas</option>
                @for (f of histFichasDisponibles(); track f.codigo) {
                  <option [value]="f.codigo">{{ f.codigo }}</option>
                }
              </select>
              @if (histFichaFilter()) {
                <button class="hist-ficha-clear" (click)="histFichaFilter.set('')" title="Limpiar">
                  <lucide-icon name="x" [size]="10"></lucide-icon>
                </button>
              }
            </div>
          }
          <span style="font-size:12px;color:var(--text-muted);white-space:nowrap;">
            {{ histFiltered().length }} resultado{{ histFiltered().length !== 1 ? 's' : '' }}
          </span>
        </div>

        @if (histLoading()) {
          <div style="text-align:center;padding:32px;color:var(--text-muted);">
            <lucide-icon name="loader" [size]="22" class="spin"></lucide-icon>
          </div>
        } @else if (histByMonth().length === 0) {
          <div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">Sin competencias registradas</div>
        } @else {
          <div class="hist-sections-wrap">
            @for (group of histByMonth(); track group.key) {
              <!-- Cabecera de sección por mes -->
              <div class="hist-month-header">
                <lucide-icon name="calendar" [size]="14" style="flex-shrink:0;opacity:.7;"></lucide-icon>
                <span style="font-weight:700;font-size:13px;text-transform:capitalize;">{{ group.label }}</span>
                <span style="font-size:11px;color:var(--text-muted);margin-left:6px;">
                  {{ group.items.length }} competencia{{ group.items.length !== 1 ? 's' : '' }}
                </span>
              </div>
              <div class="hist-table-wrap" style="margin-bottom:20px;">
                <table class="hist-table">
                  <thead>
                    <tr>
                      <th style="width:36px;">#</th>
                      <th>Fecha</th>
                      <th>Día / Jornada</th>
                      <th>Ficha / Programa</th>
                      <th>Competencia</th>
                      <th>Resultado</th>
                      <th>Período</th>
                      <th>Días / Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of group.items; track c.id; let i = $index) {
                    <tr>
                      <td style="font-size:11px;color:var(--text-muted);text-align:center;font-weight:700;">{{ i + 1 }}</td>
                      <td style="font-size:11px;white-space:nowrap;">
                        <span style="font-weight:600;color:var(--text);">{{ c.createdAt | date:'dd/MM/yyyy' }}</span>
                      </td>
                      <td>
                        <span class="hist-dia-badge">{{ getDiaLabel(c.horario?.diaSemana) }}</span>
                        <span class="hist-jorn-badge">{{ c.horario?.jornada || '—' }}</span>
                      </td>
                      <td style="font-size:12px;">
                        <strong>{{ c.ficha?.codigo || '—' }}</strong><br>
                        <span style="color:var(--text-muted);font-size:11px;">{{ c.ficha?.programa || '' }}</span>
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
                        @if (c.fechaInicio) {
                          <span>{{ c.fechaInicio | date:'dd/MM/yy' }} — {{ c.fechaFin | date:'dd/MM/yy' }}</span>
                        } @else { <span>—</span> }
                      </td>
                      <!-- Días / Horas — botón icono con popover flotante -->
                      <td style="text-align:center;vertical-align:middle;">
                        @if ((c.diasClase ?? []).length > 0) {
                          <button class="hist-horas-btn"
                                  (mouseenter)="showHistDias(c, $event)"
                                  (mouseleave)="hideHistDias()">
                            <lucide-icon name="clock" [size]="13"></lucide-icon>
                            <span>{{ calcHorasCompetencia(c, c.horario) }}h</span>
                          </button>
                        } @else {
                          <span style="font-size:11px;color:var(--text-muted);">—</span>
                        }
                      </td>
                    </tr>
                    }
                  </tbody>
                </table>
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
          <span class="tt-form-lbl">Horas: <strong>{{ calcHorasCompetencia(histDiasPopover()!.c, histDiasPopover()!.c.horario) }}h</strong></span>
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

    <!-- Competencia Modal -->
    @if (compModal()) {
    <div class="modal-overlay">
      <div class="modal comp-modal-wide" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Añadir Competencia / Resultado</h3>
          <button class="btn-icon" (click)="compModal.set(null)"><lucide-icon name="x" [size]="18"></lucide-icon></button>
        </div>
        <div class="form-group mt-3">
          <label class="form-label">Nombre</label>
          <input class="form-control" [(ngModel)]="compForm.nombre">
        </div>
        <div class="form-group mt-3">
          <label class="form-label">Resultados</label>
          @for (r of compResultados(); track $index; let i = $index) {
            <div style="border:1px solid var(--border);border-radius:8px;padding:8px;margin-bottom:8px;">
              <div style="display:flex;gap:6px;align-items:center;">
                <input class="form-control" style="flex:1;"
                       [ngModel]="r.texto" (ngModelChange)="setCompResultado(i, $event)"
                       placeholder="Resultado {{ i + 1 }}">
                <button type="button" class="btn-icon" (click)="removeCompResultado(i)" title="Quitar">
                  <lucide-icon name="x" [size]="14"></lucide-icon>
                </button>
              </div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
                <button type="button" class="btn btn-outline" style="font-size:11px;padding:3px 8px;"
                        [disabled]="compDiasClase().length === 0"
                        (click)="toggleRCal(i)">
                  <lucide-icon name="calendar" [size]="11" style="vertical-align:-2px;margin-right:4px;"></lucide-icon>
                  {{ rCalOpenIdx() === i ? 'Cerrar calendario' : 'Elegir fechas' }}
                </button>
                @if (r.fechaInicio) {
                  <span style="font-size:11px;color:var(--text-muted);">
                    {{ formatDiaClaseFull(r.fechaInicio) }} @if (r.fechaFin && r.fechaFin !== r.fechaInicio) { → {{ formatDiaClaseFull(r.fechaFin) }} }
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
                           [class.r-cal-allowed]="cell.allowed && !cell.inRange && !cell.isIni && !cell.isFin"
                           [class.r-cal-inrange]="cell.allowed && cell.inRange && !cell.isIni && !cell.isFin"
                           [class.r-cal-boundary]="cell.allowed && (cell.isIni || cell.isFin)"
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
          <button type="button" class="btn btn-outline" style="font-size:12px;padding:5px 10px;" (click)="addCompResultado()">
            <lucide-icon name="plus" [size]="12" style="vertical-align:-2px;margin-right:4px;"></lucide-icon>Agregar resultado
          </button>
        </div>
        <div class="grid-2 mt-3 gap-3">
          <div class="form-group">
            <label class="form-label">Inicio</label>
            <input type="date" class="form-control"
                   [ngModel]="compForm.fechaInicio"
                   (ngModelChange)="onCompFechaInicioChange($event)">
          </div>
          <div class="form-group">
            <label class="form-label">Fin</label>
            <input type="date" class="form-control"
                   [ngModel]="compForm.fechaFin"
                   (ngModelChange)="onCompFechaFinChange($event)">
          </div>
        </div>

        <!-- Mini-calendario de días de clase -->
        @if (compForm.fechaInicio && compForm.fechaFin) {
          <div class="comp-cal-wrap mt-3">
            <div class="comp-cal-header">
              <button class="comp-cal-nav" (click)="compCalPrevMes()" title="Mes anterior">&#8249;</button>
              <span class="comp-cal-title">{{ formatCompCalMes() }}</span>
              <button class="comp-cal-nav" (click)="compCalNextMes()" title="Mes siguiente">&#8250;</button>
            </div>
            <div class="comp-cal-grid">
              @for (lbl of ['Lu','Ma','Mi','Ju','Vi','Sá','Do']; track lbl) {
                <div class="comp-cal-dayhdr">{{ lbl }}</div>
              }
              @for (cell of compCalCeldas(); track cell.iso) {
                <div class="comp-cal-cell"
                     [class.comp-cal-inrange]="cell.inRange && !cell.isIni && !cell.isFin"
                     [class.comp-cal-boundary]="cell.isIni || cell.isFin"
                     [class.comp-cal-sel]="cell.inRange && compDiasClase().includes(cell.iso)"
                     [class.comp-cal-other]="cell.otherMonth"
                     (click)="cell.inRange && toggleDiaClase(cell.iso)">
                  {{ cell.day }}
                </div>
              }
            </div>
            <div class="comp-cal-total">
              <lucide-icon name="clock" [size]="11"></lucide-icon>
              <strong>{{ compDiasClase().length }}</strong> día{{ compDiasClase().length !== 1 ? 's' : '' }} seleccionado{{ compDiasClase().length !== 1 ? 's' : '' }}
              @if (compDiasClase().length > 0) {
                &nbsp;·&nbsp;<strong>{{ calcHorasFormModal() }}h</strong> acumuladas
              }
            </div>
          </div>
        }

        <div class="btn-row mt-4">
          <button class="btn btn-outline" (click)="compModal.set(null)">Cancelar</button>
          <button class="btn btn-blue" (click)="saveComp()">Guardar</button>
        </div>
      </div>
    </div>
    }

    <!-- Finalizar Modal -->
    @if (finModal().visible) {
    <div class="modal-overlay">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 style="color:var(--red)">Cierre Anticipado</h3>
          <button class="btn-icon" (click)="closeFin()"><lucide-icon name="x" [size]="18"></lucide-icon></button>
        </div>
        <p class="text-sm mt-2 text-muted">¿Estás seguro de finalizar la clase antes del tiempo estipulado? Esto notificará a Administración.</p>
        <div class="form-group mt-3">
          <label class="form-label">Motivo (Obligatorio) *</label>
          <textarea class="form-control" [(ngModel)]="finMotivo" rows="3" placeholder="Ej: Falla eléctrica..."></textarea>
        </div>
        <div class="btn-row mt-4">
          <button class="btn btn-outline" (click)="closeFin()">Cancelar</button>
          <button class="btn btn-blue" style="background:var(--red); border-color:var(--red)" [disabled]="!finMotivo" (click)="confirmarFinalizar()">Finalizar y Notificar</button>
        </div>
      </div>
    </div>
    }
  `,
  styles: [`
    .page-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
    .page-header h2 { font-size: 1.4rem; color: var(--text); }
    .today-badge { background: var(--blue); color: #fff; border-radius: 12px; padding: 2px 8px; font-size: 10px; font-weight: 800; display:inline-block; }

    /* Matricial */
    .matrix-wrap { width: 100%; overflow: hidden; background: transparent; }
    .matrix-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      width: 100%; border: 1px solid var(--border); border-radius: 8px; background: #fff;
    }
    .matrix-header-col {
      background: var(--surface2); padding: 12px; font-weight: 800; font-size: 13px; color: var(--text);
      border-bottom: 2px solid var(--border); border-right: 1px solid var(--border); text-align: center;
    }
    .matrix-header-col:last-child { border-right: none; }
    .matrix-header-col.is-today { background: #eff6ff; border-bottom: 3px solid var(--blue); color: var(--blue); }

    .matrix-cell {
      padding: 8px; border-right: 1px solid var(--border); display: flex;
      align-items: stretch; justify-content: center; min-height: 220px;
    }
    .matrix-cell:last-child { border-right: none; }

    /* Slot wrapper (carrusel) */
    .slot-wrapper { width: 100%; height: 100%; display: flex; flex-direction: column; }
    .slot-nav-row {
      display: flex; align-items: center; justify-content: flex-start; gap: 8px;
      margin: 0 0 6px; min-height: 20px;
    }
    .slot-dots { display: flex; align-items: center; gap: 5px; }
    .slot-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--border); transition: background .2s;
    }
    .slot-dot.active { background: var(--blue); }
    /* En-curso pero NO visualizado: anillo azul (outline) para no confundir con el activo */
    .slot-dot.current { background: transparent; border: 2px solid var(--blue); width: 7px; height: 7px; }
    .slot-arrow-btn {
      background: none; border: 1px solid var(--border); border-radius: 4px;
      padding: 1px 5px; cursor: pointer; display: flex; align-items: center;
      color: var(--text-muted); transition: border-color .15s, color .15s;
    }
    .slot-arrow-btn:hover { border-color: var(--blue); color: var(--blue); }

    /* Horario Card */
    .horario-card {
      background: var(--surface); width: 100%; min-width: 0;
      border: 1.5px solid var(--border); border-radius: 6px; padding: 10px;
      font-size: 13px; color: var(--text);
      transition: border-color .2s, box-shadow .2s;
      flex: 1; display: flex; flex-direction: column;
    }
    /* Layout de dos columnas */
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
    .card-top { flex: 1; display: flex; flex-direction: column; }
    .card-bottom { display: flex; flex-direction: column; margin-top: 8px; }
    .horario-card.active-session { border-color: var(--blue); box-shadow: 0 4px 12px rgba(59,130,246,0.15); background: #f8fafc; }
    .horario-card.en-curso { border-color: var(--blue) !important; box-shadow: 0 0 0 2px rgba(37,99,235,0.13) !important; }
    .horario-card.en-curso .hb-time { color: var(--blue); }
    .btn-full { width: 100%; }
    .btn-disabled { opacity: 0.5; background: var(--surface2); color: var(--text-muted); border-color: var(--border); cursor: not-allowed; }

    .progress-bar { height: 6px; background: var(--gray-200, #e5e7eb); border-radius: 3px; overflow: hidden; }
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

    .retraso-badge {
      display: inline-block; background: #fee2e2; color: #dc2626;
      border-radius: 4px; padding: 3px 6px; font-size: 10px; font-weight: 700; border: 1px solid #fca5a5;
    }

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

    /* Limpiar ambiente inline */
    .limpiar-amb-btn {
      background: none; border: none; cursor: pointer; color: var(--text-muted);
      font-size: 10px; padding: 0 2px; line-height: 1; margin-left: 2px;
    }
    .limpiar-amb-btn:hover { color: var(--red); }

    /* Alerta de conflicto de ambiente */
    .conflicto-alert {
      display: flex; align-items: flex-start; gap: 6px;
      background: #fff7ed; border: 1.5px solid #fb923c;
      border-radius: 7px; padding: 7px 9px;
      font-size: 11px; color: #92400e;
    }

    /* ═══ Sección de ambientes disponibles (debajo de la tabla) ═══ */
    .amb-section {
      background: var(--surface); border: 1.5px solid var(--border);
      border-radius: 12px; padding: 20px 24px;
      animation: fadeIn .2s ease;
    }
    .amb-section-head {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
    }
    .amb-section-title {
      display: flex; align-items: center; gap: 10px; color: var(--text);
    }
    .amb-section-main { font-size: 15px; font-weight: 800; display: block; }
    .amb-section-sub  { font-size: 12px; color: var(--text-muted); display: block; margin-top: 2px; }

    /* Filtros */
    .amb-filters { display: flex; gap: 10px; flex-wrap: wrap; }
    .amb-search-wrap {
      position: relative; flex: 1; min-width: 160px;
    }
    .amb-search-icon {
      position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
      color: var(--text-muted); pointer-events: none;
    }
    .amb-search-input {
      width: 100%; padding: 8px 10px 8px 32px; border: 1px solid var(--border);
      border-radius: 8px; font-size: 13px; background: var(--surface2);
      color: var(--text); outline: none; transition: border-color .15s;
      box-sizing: border-box;
    }
    .amb-search-input:focus { border-color: var(--blue); }
    .amb-area-select {
      padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px;
      font-size: 13px; background: var(--surface2); color: var(--text);
      outline: none; cursor: pointer; min-width: 160px; transition: border-color .15s;
    }
    .amb-area-select:focus { border-color: var(--blue); }

    /* Grupos */
    .amb-group-header {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em;
      margin-bottom: 10px;
    }
    .amb-group-libre    { color: #166534; }
    .amb-group-conflicto { color: #b45309; }

    /* Grid de cards */
    .amb-cards-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px;
    }

    /* Card base */
    .amb-card {
      border-radius: 10px; padding: 12px 14px; border: 1.5px solid;
      display: flex; flex-direction: column; gap: 6px;
      text-align: left; transition: box-shadow .15s, transform .1s;
      cursor: pointer;
    }
    .amb-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.1); }
    .amb-card-top-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: wrap; }
    .amb-card-nombre { font-size: 13px; font-weight: 700; }

    /* Libre */
    .amb-card-libre { background: #f0fdf4; border-color: #86efac; color: #166534; }
    .amb-card-libre:hover { background: #dcfce7; border-color: #4ade80; }
    .amb-card-libre-hint { font-size: 10px; opacity: .75; display:flex; align-items:center; gap:3px; }

    /* Conflicto */
    .amb-card-conflicto { background: #fffbeb; border-color: #fcd34d; color: #92400e; }

    /* Detalles de conflicto */
    .amb-cc-details { display: flex; flex-direction: column; gap: 4px; }
    .amb-cc-row {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; font-weight: 500;
    }
    .amb-retraso-tag {
      background: #fee2e2; color: #991b1b; border-radius: 6px;
      padding: 1px 5px; font-size: 10px; font-weight: 700; margin-left: 4px;
    }
    .amb-cc-select-btn {
      margin-top: 4px; display: flex; align-items: center; gap: 5px; justify-content: center;
      background: #fef3c7; border: 1px solid #fcd34d; border-radius: 7px;
      padding: 5px 10px; font-size: 11px; font-weight: 700; color: #92400e;
      cursor: pointer; transition: background .15s;
    }
    .amb-cc-select-btn:hover { background: #f59e0b; color: #fff; border-color: #f59e0b; }

    /* Tags */
    .amb-area-tag {
      background: #e0f2fe; color: #0369a1; border-radius: 6px;
      padding: 2px 6px; font-size: 10px; font-weight: 700; white-space: nowrap;
    }
    .amb-area-tag-amber { background: #fef3c7; color: #92400e; }

    /* Estado vacío / loading */
    .amb-loading-center {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      font-size: 13px; color: var(--text-muted); padding: 24px 0;
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

    /* ── Historial de competencias ── */
    .hist-modal { width: 95vw; max-width: 920px; max-height: 88vh; overflow: hidden; display: flex; flex-direction: column; }
    .hist-sections-wrap { flex: 1; overflow-y: auto; padding: 4px 0; }
    .hist-month-header {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px; background: #f0f4ff;
      border-left: 4px solid var(--blue);
      margin-top: 8px; border-radius: 0 6px 0 0;
      color: var(--navy); font-size: 13px;
    }
    .hist-table-wrap { overflow-x: auto; }
    .hist-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .hist-table thead tr { background: var(--navy); position: sticky; top: 0; z-index: 2; }
    .hist-table th { padding: 10px 14px; color: #fff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; text-align: left; white-space: nowrap; }
    .hist-table td { padding: 10px 14px; border-bottom: 1px solid var(--border); vertical-align: top; }
    .hist-table tbody tr:hover td { background: #f8faff; }
    .hist-dia-badge { display:inline-block; background:#eff6ff; color:var(--blue); border-radius:4px; padding:2px 7px; font-size:11px; font-weight:700; text-transform:capitalize; margin-right:4px; }
    .hist-jorn-badge { display:inline-block; background:var(--surface2); color:var(--text-muted); border-radius:4px; padding:2px 7px; font-size:10px; font-weight:600; text-transform:uppercase; }

    /* ── Tabs de tipo de ubicación ── */
    .ubicacion-tabs {
      display: flex; gap: 6px; flex-wrap: wrap; border-bottom: 2px solid var(--border);
      padding-bottom: 2px;
    }
    .ubi-tab {
      display: flex; align-items: center; gap: 5px;
      padding: 6px 14px; border-radius: 8px 8px 0 0; font-size: 12px; font-weight: 700;
      border: 1.5px solid var(--border); border-bottom: none;
      background: var(--surface2); color: var(--text-muted);
      cursor: pointer; transition: background .15s, color .15s;
      position: relative; bottom: -2px;
    }
    .ubi-tab:hover { background: #eff6ff; color: var(--blue); border-color: #bfdbfe; }
    .ubi-tab-active {
      background: var(--surface); color: var(--blue);
      border-color: var(--blue); border-bottom-color: var(--surface);
      font-weight: 800;
    }

    /* ── Columna derecha — estilos compartidos con card-actions-col ── */
    .card-help-btn {
      color: var(--text-muted); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border-radius: 50%;
      transition: color .15s, background .15s;
    }
    .card-help-btn:hover { color: var(--blue); background: #eff6ff; }
    .card-help-active { color: var(--blue) !important; background: #eff6ff !important; }
    .tt-close-btn {
      display: flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border-radius: 6px;
      border: 1px solid var(--border); background: var(--surface2);
      cursor: pointer; color: var(--text-muted); transition: all .15s; flex-shrink: 0;
    }
    .tt-close-btn:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }

    /* Botón de notificación de evento */
    .ev-notif-btn {
      width: 22px; height: 22px; border-radius: 6px; border: none;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: transform .15s, opacity .2s, filter .2s;
      box-shadow: 0 1px 3px rgba(0,0,0,.12);
    }
    .ev-notif-btn:hover { transform: scale(1.18); }

    /* Estado pasado: se atenúa y pierde color */
    .ev-notif-pasado { opacity: 0.3; filter: grayscale(1); }

    /* Colores por tipo */
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
      font-size: 13px; pointer-events: none; border: 1.5px solid;
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

    /* ── Modal de competencia más ancho para acomodar calendario ── */
    .comp-modal-wide { max-width: 440px; width: 100%; }

    /* ── Mini-calendario de días de clase ── */
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
    .comp-cal-inrange { cursor: pointer; }
    .comp-cal-inrange:not(.comp-cal-sel):hover { background: #dbeafe; color: #1d4ed8; }
    /* Calendario de fechas de un RESULTADO (acotado a los días de la competencia) */
    .r-cal-allowed { cursor: pointer; background: #eff6ff; font-weight: 600; color: #1d4ed8; }
    .r-cal-allowed:hover { background: #dbeafe; }
    .r-cal-inrange { cursor: pointer; background: #bfdbfe; color: #1e40af; }
    .r-cal-boundary {
      cursor: pointer;
      background: var(--blue) !important; color: white !important;
      font-weight: 700; border-radius: 5px;
    }
    /* Días de inicio y fin del período — naranja/ámbar */
    .comp-cal-boundary {
      cursor: pointer;
      background: #fff7ed; color: #c2410c;
      font-weight: 700; outline: 2px solid #fed7aa; outline-offset: -2px;
      border-radius: 5px;
    }
    .comp-cal-boundary:hover:not(.comp-cal-sel) { background: #ffedd5; }
    .comp-cal-sel {
      background: var(--blue) !important; color: white !important;
      font-weight: 700; box-shadow: 0 1px 4px rgba(37,99,235,.3);
      outline: none !important;
    }
    .comp-cal-total {
      display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
      font-size: 11px; color: var(--text-muted);
      border-top: 1px solid var(--border); padding-top: 7px; margin-top: 7px;
    }
    .comp-cal-total strong { color: var(--text); }

    /* ── Tabla dos columnas: días de formación (tooltip y popover) ── */
    .tt-form-table {
      margin-top: 10px; border: 1px solid #bfdbfe; border-radius: 7px; overflow: hidden;
    }
    .tt-form-header-row {
      display: flex; align-items: center; justify-content: space-between; gap: 6px;
      padding: 5px 9px; background: #dbeafe; border-bottom: 1px solid #bfdbfe;
    }
    .tt-form-lbl {
      font-size: 10px; font-weight: 700; color: #1d4ed8;
      text-transform: uppercase; letter-spacing: .04em; white-space: nowrap;
    }
    .tt-form-lbl strong { color: #1e40af; font-weight: 800; }
    .tt-form-row {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 4px 9px; border-top: 1px solid #e0f2fe; background: var(--surface);
    }
    .tt-form-dia { font-size: 11px; font-weight: 700; color: var(--text); min-width: 95px; white-space: nowrap; }
    .tt-form-hrs { font-size: 10px; color: var(--text-muted); text-align: right; white-space: nowrap; }

    /* ── Card de competencia compacta: resultados / horario / clases ── */
    .tt-resultados-list { display: flex; flex-direction: column; gap: 3px; margin: 2px 0 0; }
    .tt-resultado-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text); }
    .tt-horario-compact { display: flex; flex-direction: column; gap: 3px; margin: 2px 0 0; font-size: 12px; color: var(--text); }
    .tt-horario-row { display: flex; align-items: center; gap: 6px; }
    .tt-horario-row lucide-icon { color: var(--text-muted); flex-shrink: 0; }
    .tt-clases-chips { display: flex; flex-wrap: wrap; gap: 5px; margin: 4px 0 0; }
    .tt-clase-chip { font-size: 10px; font-weight: 600; color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 5px; padding: 2px 6px; }

    /* ── Filtro de ficha en historial ── */
    .hist-ficha-sel {
      height: 28px; padding: 0 8px; font-size: 12px; font-weight: 600;
      border: 1px solid #bfdbfe; border-radius: 6px;
      background: #fff; color: #1d4ed8; cursor: pointer; outline: none; max-width: 140px;
    }
    .hist-ficha-sel:focus { border-color: var(--blue); box-shadow: 0 0 0 2px rgba(59,130,246,.15); }
    .hist-ficha-clear {
      display: flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; border-radius: 50%;
      border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8;
      cursor: pointer; flex-shrink: 0; transition: all .15s;
    }
    .hist-ficha-clear:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
    /* ── Botón horas en historial ── */
    .hist-horas-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 8px; border: 1px solid #bfdbfe; border-radius: 6px;
      background: #eff6ff; color: var(--blue); cursor: default;
      font-size: 11px; font-weight: 700; transition: all .15s;
    }
    .hist-horas-btn:hover { background: var(--blue); color: #fff; border-color: var(--blue); }

    /* ── Popover flotante días/horas del historial ── */
    .hist-dias-popover {
      position: fixed; z-index: 10000;
      min-width: 250px; max-width: 340px;
      border: 1px solid var(--border); border-radius: 7px;
      box-shadow: 0 8px 24px rgba(0,0,0,.15);
      overflow: hidden; background: var(--surface);
      pointer-events: none;
    }
  `]
})
export class InstructorMisHorariosComponent implements OnInit, OnDestroy {
  readonly LABELS = DIAS_LABELS;
  getDiaLabel(dia?: string): string {
    if (!dia) return '—';
    return (this.LABELS as Record<string, string>)[dia] || dia;
  }
  dias = [...DIAS_SEMANA] as string[];
  horariosByDay = signal<Record<string, any[]>>({});

  tooltipState = signal<{ h: any; comp: any; compIdx: number; x: number; y: number } | null>(null);
  histDiasPopover = signal<{ c: any; x: number; y: number } | null>(null);
  histResultadosPopover = signal<{ c: any; x: number; y: number } | null>(null);
  eventoTooltip = signal<{ ev: any; x: number; y: number; pasado: boolean; noIniciado: boolean } | null>(null);
  eventos   = signal<any[]>([]);
  /** Fichas cargadas para enriquecer horarios e historial */
  fichas    = signal<any[]>([]);
  /** Ambientes cargados para enriquecer horarios */
  ambientes = signal<any[]>([]);

  // ── Mapa ficha → eventos del día ─────────────────────────────
  // Clave = CÓDIGO de ficha ("3063290") en lugar de UUID para evitar
  // desajustes entre UUIDs de horarios_db y epsas_db.
  fichaEventoMap = computed(() => {
    // Fecha LOCAL — toISOString() devuelve UTC y puede diferir en zonas GMT-
    const d = this.now();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    // Construir lookup UUID → codigo usando las fichas ya cargadas
    const fichas = this.fichas();
    // Mapa UUID → código; filtramos entradas con código vacío para evitar el fallback erróneo
    const uuidToCodigo = new Map<string, string>(
      fichas
        .filter((f: any) => f.codigo)
        .map((f: any) => [String(f.id), String(f.codigo)])
    );
    const map = new Map<string, any[]>();
    this.eventos().forEach(ev => {
      if (!ev.fechaInicio) return;
      const start = ev.fechaInicio.split('T')[0];
      const end   = (ev.fechaFin ?? ev.fechaInicio).split('T')[0];
      if (today < start || today > end) return;
      const seen = new Set<string>();
      (ev.fichasParticipantes ?? []).forEach((fid: any) => {
        // Resolver UUID → código; si no hay mapeo para este UUID, ignorar la entrada
        const key = uuidToCodigo.get(String(fid));
        if (!key || seen.has(key)) return;
        seen.add(key);
        if (!map.has(key)) map.set(key, []);
        // Guard de deduplicación: el mismo evento nunca aparece dos veces en la misma ficha
        if (!map.get(key)!.some(e => e.id === ev.id)) {
          map.get(key)!.push(ev);
        }
      });
    });
    return map;
  });

  // ── Historial de competencias ────────────────────────────────
  historialOpen   = signal(false);
  histLoading     = signal(false);
  histItems       = signal<any[]>([]);
  histFiltro      = signal('');
  histFichaFilter = signal('');   // filtro global por código de ficha

  /** Fichas únicas disponibles en el historial cargado */
  histFichasDisponibles = computed((): { codigo: string; programa: string }[] => {
    const map = new Map<string, string>();
    this.histItems().forEach(c => {
      const cod = c.ficha?.codigo;
      if (cod) map.set(cod, c.ficha.programa ?? '');
    });
    return Array.from(map.entries())
      .map(([codigo, programa]) => ({ codigo, programa }))
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  });

  histFiltered = computed(() => {
    const q     = this.histFiltro().trim().toLowerCase();
    const ficha = this.histFichaFilter();
    return this.histItems().filter(c => {
      if (ficha && c.ficha?.codigo !== ficha) return false;
      if (!q) return true;
      return (
        (c.nombre ?? '').toLowerCase().includes(q) ||
        this.resultadosDe(c).some(r => r.texto.toLowerCase().includes(q)) ||
        (c.ficha?.codigo ?? '').toLowerCase().includes(q)
      );
    });
  });

  /** Historial agrupado por mes (desc), ítems numerados por fecha */
  histByMonth = computed(() => {
    const map = new Map<string, { key: string; label: string; items: any[] }>();
    const sorted = [...this.histFiltered()].sort((a, b) =>
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    );
    for (const c of sorted) {
      const d    = new Date(c.createdAt ?? Date.now());
      const key  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
      if (!map.has(key)) map.set(key, { key, label, items: [] });
      map.get(key)!.items.push(c);
    }
    return Array.from(map.values());
  });

  openHistorial() {
    this.tooltipState.set(null);
    this.historialOpen.set(true);
    this.histFiltro.set('');
    this.histFichaFilter.set('');
    this.histLoading.set(true);
    const id = this.auth.currentUser()?.id;
    if (!id) { this.histLoading.set(false); return; }
    this.api.getCompetenciasByInstructor(id).subscribe({
      next: data => this.zone.run(() => {
        // El backend devuelve la relación anidada en c.asignacion.horario (no c.horario)
        // y la ficha solo como fichaId — se resuelve aquí con las fichas ya cargadas.
        const fichaMap = new Map<string, any>(this.fichas().map(f => [String(f.id), f]));
        const enriched = (data as any[]).map(c => {
          const fichaId = c.fichaId ?? c.asignacion?.fichaId ?? null;
          return {
            ...c,
            horario: c.asignacion?.horario ?? null,
            ficha: fichaId ? (fichaMap.get(String(fichaId)) ?? null) : null,
          };
        });
        this.histItems.set(enriched);
        this.histLoading.set(false);
        this.cdr.detectChanges();
      }),
      error: () => this.zone.run(() => { this.histItems.set([]); this.histLoading.set(false); this.cdr.detectChanges(); }),
    });
  }

  compModal = signal<any>(null);
  compForm: any = {};
  compResultados = signal<Resultado[]>([]);
  readonly hoyIso = new Date().toISOString().slice(0, 10);
  compDiasClase = signal<string[]>([]);
  compCalMes   = signal<Date>(new Date());
  compCopied   = signal<boolean>(false);

  finModal = signal<{ h: any, visible: boolean }>({ h: null, visible: false });
  finMotivo = '';

  // ── Transversal ──────────────────────────────────────────────
  // Se carga desde DB en cargarDatos() — no depende del JWT ni del localStorage
  private _esTransversalDB = signal<boolean | null>(null);
  esTransversal = computed(() => {
    const fromDB = this._esTransversalDB();
    if (fromDB !== null) return fromDB;
    return !!(this.auth.currentUser() as any)?.esTransversal;
  });

  /** Ambientes clasificados cargados al consultar */
  ambientesLibres  = signal<any[]>([]);
  cargandoAmbs     = signal(false);
  /** ID y objeto del horario cuyo panel está abierto */
  consultandoId    = signal<number | null>(null);
  consultandoH     = signal<any>(null);
  /** Filtros de búsqueda en el panel */
  busquedaAmb      = signal('');
  areaFiltro       = signal('');

  /** Áreas únicas de los ambientes cargados */
  areasDisponibles = computed(() => {
    const areas = new Set<string>();
    this.ambientesLibres().forEach((a: any) => { if (a.area_nombre) areas.add(a.area_nombre); });
    return [...areas].sort();
  });

  areasOpts = computed<SSOption[]>(() => [
    { value: '', label: 'Todas las áreas' },
    ...this.areasDisponibles().map((a: string) => ({ value: a, label: a })),
  ]);
  /** Listas base por estado */
  ambsLibres    = computed(() => this.ambientesLibres().filter((a: any) => a.estado === 'libre'));
  ambsConflicto = computed(() => this.ambientesLibres().filter((a: any) => a.estado === 'conflicto'));
  /** Listas con búsqueda + área aplicadas */
  ambsFiltradosLibres = computed(() => this._filtrarAmbs(this.ambsLibres()));
  ambsFiltradosConflicto = computed(() => this._filtrarAmbs(this.ambsConflicto()));

  // ── Ubicaciones (auditorios, biblioteca, etc.) ───────────────
  readonly UBICACION_TIPOS = [
    { tipo: 'auditorio',        label: 'Auditorios',       icon: 'mic' },
    { tipo: 'biblioteca',       label: 'Biblioteca',       icon: 'book-open' },
    { tipo: 'restaurante',      label: 'Restaurante',      icon: 'coffee' },
    { tipo: 'centro_deportivo', label: 'Centro Deportivo', icon: 'activity' },
  ];
  tipoUbicacion        = signal('ambientes');
  ubicacionesDisponibles = signal<any[]>([]);
  ubicFiltradosLibres    = computed(() => this._filtrarAmbs(this.ubicacionesDisponibles().filter((u: any) => u.estado === 'libre')));
  ubicFiltradosOcupados  = computed(() => this._filtrarAmbs(this.ubicacionesDisponibles().filter((u: any) => u.estado === 'ocupado')));

  private _filtrarAmbs(list: any[]): any[] {
    const q    = this.busquedaAmb().toLowerCase();
    const area = this.areaFiltro();
    return list.filter(a => {
      if (area && a.area_nombre !== area) return false;
      if (q && !a.nombre.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  /** Ambiente seleccionado por ID de horario: { [horarioId]: ambiente } */
  ambienteSeleccionado = signal<Record<number, any>>({});

  /** Conflicto de ambiente al intentar iniciar: { [horarioId]: { instructorNombre, ambienteNombre } } */
  ambienteConflicto = signal<Record<number, { instructorNombre: string; ambienteNombre: string }>>({});

  // Carrusel multi-jornada
  activeSlotMap = signal<Record<string, number>>({});
  /** Días donde el usuario navegó manualmente — autoSwitchSlots no los sobreescribe */
  private manualOverrides = new Set<string>();

  timer: any;
  now = signal<Date>(new Date());

  private toast = inject(ToastService);

  constructor(private api: ApiService, public auth: AuthService, private zone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarDatos();
    this.timer = setInterval(() => {
      this.now.set(new Date());
      this.autoSwitchSlots();
      // Recargar eventos solo para las fichas del instructor (no todos los eventos del sistema)
      const fichaIds = [...new Set(
        Object.values(this.horariosByDay()).flat().map((h: any) => h.fichaId).filter(Boolean)
      )];
      if (fichaIds.length) {
        forkJoin(fichaIds.map((fid: string) => this.api.getEventosByFicha(fid).pipe(catchError(() => of([])))))
          .subscribe((results: any[]) => {
            const evMap = new Map<string, any>();
            results.flat().forEach((ev: any) => { if (ev?.id) evMap.set(ev.id, ev); });
            this.eventos.set([...evMap.values()]);
          });
      }
    }, 30000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  getSlotIdx(day: string): number {
    return this.activeSlotMap()[day] ?? 0;
  }

  nextSlot(day: string, total: number) {
    this.manualOverrides.add(day);
    const curr = this.activeSlotMap()[day] ?? 0;
    this.activeSlotMap.update(m => ({ ...m, [day]: (curr + 1) % total }));
    this.hideTooltip();
    this.hideEventoTooltip();
  }

  setSlot(day: string, idx: number) {
    this.manualOverrides.add(day);
    this.activeSlotMap.update(m => ({ ...m, [day]: idx }));
    this.hideTooltip();
    this.hideEventoTooltip();
  }

  autoSwitchSlots() {
    const curr = this.now();
    const nowMin = curr.getHours() * 60 + curr.getMinutes();
    const updates: Record<string, number> = {};

    Object.entries(this.horariosByDay()).forEach(([day, slots]: [string, any]) => {
      // No sobreescribir días donde el usuario navegó manualmente
      if (this.manualOverrides.has(day)) return;
      if (!slots?.length || slots.length <= 1) return;
      const matchIdx = slots.findIndex((h: any) => {
        if (!h.horaInicio || !h.horaFin) return false;
        const [sh, sm] = h.horaInicio.split(':').map(Number);
        const [eh, em] = h.horaFin.split(':').map(Number);
        const sMin = sh * 60 + sm, eMin = eh * 60 + em;
        return eMin < sMin
          ? nowMin >= sMin || nowMin <= eMin
          : nowMin >= sMin && nowMin <= eMin;
      });
      if (matchIdx > -1) updates[day] = matchIdx;
    });

    if (Object.keys(updates).length > 0) {
      this.activeSlotMap.update(m => ({ ...m, ...updates }));
    }
  }

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
    const comps = h.competencias ?? [];
    const compIdx = Math.max(0, comps.findIndex((c: any) => c.id === comp.id));
    this.tooltipState.set({ h, comp, compIdx, x, y });
  }

  showTooltip(h: any, comp: any, event: MouseEvent) {
    this.toggleTooltip(h, comp, event);
  }

  hideTooltip() { this.tooltipState.set(null); }

  /** Navega a la competencia anterior del mismo horario */
  ttPrevComp() {
    const s = this.tooltipState();
    if (!s) return;
    const comps: any[] = s.h.competencias ?? [];
    if (comps.length <= 1) return;
    const newIdx = (s.compIdx - 1 + comps.length) % comps.length;
    this.tooltipState.set({ ...s, comp: comps[newIdx], compIdx: newIdx });
  }

  /** Navega a la competencia siguiente del mismo horario */
  ttNextComp() {
    const s = this.tooltipState();
    if (!s) return;
    const comps: any[] = s.h.competencias ?? [];
    if (comps.length <= 1) return;
    const newIdx = (s.compIdx + 1) % comps.length;
    this.tooltipState.set({ ...s, comp: comps[newIdx], compIdx: newIdx });
  }

  /** Formatea una fecha ISO "YYYY-MM-DD" como "dd/MM" con abreviatura del día */
  formatDiaClase(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dias = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];
    return `${dias[date.getDay()]} ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}`;
  }

  /** Formatea fecha ISO como "Viernes: 12/04" (nombre completo + fecha) */
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
    const durMin = this._duracionHorarioMin(h);
    const horas = durMin / 60;
    const horasStr = Number.isInteger(horas) ? String(horas) : horas.toFixed(1);
    return `${horasStr}h`;
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
    // Aparece a la derecha de la card; si no cabe, a la izquierda
    const x = cardRect.right + 12 + tooltipW > window.innerWidth
      ? cardRect.left - tooltipW - 12
      : cardRect.right + 12;
    // Alineado verticalmente con el ícono, clampeado al viewport
    const y = Math.min(Math.max(rect.top - 8, 8), window.innerHeight - 210);
    this.eventoTooltip.set({
      ev, x, y,
      pasado: this.isEventoPasado(ev, this.now()),
      noIniciado: this.isEventoNoIniciado(ev, this.now()),
    });
  }
  hideEventoTooltip() { this.eventoTooltip.set(null); }

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

  tipoLabelEvento(t: string): string {
    return ({ formativo: 'Formativo', institucional: 'Institucional', evaluacion: 'Evaluación', festivo: 'Festivo / No lectivo' } as any)[t] ?? t;
  }
  tipoIconEvento(t: string): string {
    return ({ formativo: 'book-open', institucional: 'building', evaluacion: 'clipboard-check', festivo: 'umbrella' } as any)[t] ?? 'calendar';
  }

  cargarDatos() {
    const id = this.auth.currentUser()?.id;
    if (!id) return;
    // Al recargar horarios se limpia el registro de navegación manual
    this.manualOverrides.clear();

    // Cargar horarios + fichas + ambientes + perfil del instructor en paralelo
    forkJoin({
      horarios:   this.api.getHorariosByInstructor(id),
      fichas:     this.api.getFichas(),
      ambientes:  this.api.getAmbientes(),
      instructor: this.api.getInstructor(id).pipe(catchError(() => of(null))),
    }).subscribe(({ horarios, fichas, ambientes, instructor }) => {
      // Establecer esTransversal desde DB — independiente del JWT almacenado
      if (instructor !== null) {
        this._esTransversalDB.set(!!(instructor as any)?.esTransversal);
      }
      // Guardar en signals para reutilizar en historial
      this.fichas.set(fichas as any[]);
      this.ambientes.set(ambientes as any[]);

      const fichaMap = new Map<string, any>((fichas as any[]).map(f => [String(f.id), f]));
      const ambMap   = new Map<string, any>((ambientes as any[]).map(a => [String(a.id), a]));

      const byDay: Record<string, any[]> = {};
      this.dias.forEach(d => byDay[d] = []);
      (horarios as any[]).forEach((hor: any) => {
        const enriched = {
          ...hor,
          ficha:    hor.fichaId    ? (fichaMap.get(String(hor.fichaId))    ?? null) : null,
          ambiente: hor.ambienteId ? (ambMap.get(String(hor.ambienteId))   ?? null) : null,
        };
        if (!byDay[enriched.diaSemana]) byDay[enriched.diaSemana] = [];
        byDay[enriched.diaSemana].push(enriched);
      });
      Object.keys(byDay).forEach(k => {
        byDay[k].sort((a: any, b: any) => a.horaInicio.localeCompare(b.horaInicio));
      });

      // Una vez que conocemos las fichas del instructor, cargar sus eventos por cada ficha
      // (filtrado en el backend con JSONB @> para exactitud total)
      const fichaIds = [...new Set(
        (horarios as any[]).map((h: any) => h.fichaId).filter(Boolean)
      )];
      if (fichaIds.length) {
        forkJoin(fichaIds.map((fid: string) => this.api.getEventosByFicha(fid).pipe(catchError(() => of([])))))
          .subscribe((results: any[]) => {
            // Aplanar y deduplicar por id
            const evMap = new Map<string, any>();
            results.flat().forEach((ev: any) => { if (ev?.id) evMap.set(ev.id, ev); });
            this.eventos.set([...evMap.values()]);
          });
      } else {
        this.eventos.set([]);
      }
      this.horariosByDay.set(byDay);
    });
  }

  isToday(dia: string): boolean {
    const days = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
    return days[this.now().getDay()] === dia;
  }

  isHorarioActivo(dia: string, h: any): boolean {
    if (!h.activo) return false;
    if (!this.isToday(dia)) return false;
    if (h.horaFin) {
      const now = this.now();
      const [eh, em] = h.horaFin.split(':').map(Number);
      if (now.getHours() * 60 + now.getMinutes() > eh * 60 + em) return false;
    }
    return true;
  }

  /** True si la columna es hoy Y la hora actual cae dentro del rango del horario.
   *  Recibe `currentTime` como parámetro para que Angular rastree la señal `now`
   *  directamente en la expresión del template y re-evalúe en cada tick. */
  isEnCurso(dia: string, h: any, currentTime: Date): boolean {
    if (!this.isToday(dia)) return false;
    if (!h?.horaInicio || !h?.horaFin) return false;
    const [sh, sm] = h.horaInicio.split(':').map(Number);
    const [eh, em] = h.horaFin.split(':').map(Number);
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    const startMin = sh * 60 + sm;
    const endMin   = eh * 60 + em;
    // Horarios de noche pueden cruzar medianoche (endMin < startMin, e.g. 19:00-00:00)
    return endMin < startMin
      ? nowMin >= startMin || nowMin <= endMin   // cruza medianoche: activo desde inicio O antes del fin
      : nowMin >= startMin && nowMin <= endMin;
  }

  puedeIniciar(dia: string, h: any, selectedAmbs?: Record<number, any>): boolean {
    if (!this.isToday(dia)) return false;
    if (this.isHorarioActivo(dia, h)) return false;
    if (h.motivoFinalizacion) return false;

    // Transversal: necesita haber seleccionado un ambiente/ubicación primero.
    // También se acepta si ya hay un ambiente o ubicación persistida en DB (h.ambienteId o h.ubicacionTransversalId).
    // Se recibe el mapa como parámetro para que Angular rastree la señal en el template.
    const ambs = selectedAmbs ?? this.ambienteSeleccionado();
    if (this.esTransversal() && !ambs[h.id] && !h.ambienteId && !h.ubicacionTransversalId) return false;

    const curr = this.now();
    const [sh, sm] = h.horaInicio.split(':').map(Number);
    const [eh, em] = h.horaFin.split(':').map(Number);
    const nowMin   = curr.getHours() * 60 + curr.getMinutes();
    const startMin = sh * 60 + sm;
    const endMin   = eh * 60 + em;
    // Horarios de noche pueden cruzar medianoche (e.g. 19:00-00:00 → endMin=0 < startMin=1140)
    return endMin < startMin
      ? nowMin >= startMin || nowMin <= endMin
      : nowMin >= startMin && nowMin <= endMin;
  }

  playHorario(h: any) {
    const onPlay = () => {
      this.limpiarConflicto(h);
      this.limpiarAmbiente(h);
      this.cargarDatos();
      this.toast.success('Clase iniciada', 'La clase fue marcada como activa correctamente.');
    };
    const onErr = (e: any) => {
      if (e?.error?.ambienteOcupado === true) {
        // Mostrar alerta de conflicto en la card — no abrir toast
        this.ambienteConflicto.update(m => ({
          ...m,
          [h.id]: {
            instructorNombre: e.error.instructorNombre ?? 'Otro instructor',
            ambienteNombre:   e.error.ambienteNombre   ?? '—',
          },
        }));
        this.cdr.markForCheck();
        return;
      }
      this.toast.error('Error al iniciar clase', e?.error?.message ?? 'No se pudo activar la clase.');
    };

    // ── Instructor transversal ────────────────────────────────────────────────
    if (this.esTransversal()) {
      const selected = this.ambienteSeleccionado()[h.id];
      if (selected?._esUbicacion) {
        this.api.playHorario(h.id, { ubicacionId: selected.id, ubicacionNombre: selected.nombre }).subscribe({ next: onPlay, error: onErr });
      } else {
        this.api.playHorario(h.id, { ambienteId: selected?.id }).subscribe({ next: onPlay, error: onErr });
      }
      return;
    }

    // ── Instructor regular: si escogió alternativa en resolución de conflicto, enviarla ──
    const altAmbiente = this.ambienteSeleccionado()[h.id];
    if (altAmbiente?._esUbicacion) {
      // Ubicación transversal elegida como alternativa (auditorio, restaurante, etc.)
      this.api.playHorario(h.id, { ubicacionId: altAmbiente.id, ubicacionNombre: altAmbiente.nombre }).subscribe({ next: onPlay, error: onErr });
    } else if (altAmbiente) {
      // Ambiente alternativo (por conflicto con el asignado)
      this.api.playHorario(h.id, { ambienteId: altAmbiente.id }).subscribe({ next: onPlay, error: onErr });
    } else {
      this.api.playHorario(h.id).subscribe({ next: onPlay, error: onErr });
    }
  }

  promptFinalizar(h: any) {
    this.finMotivo = '';
    this.finModal.set({ h, visible: true });
  }

  closeFin() {
    this.finModal.set({ h: null, visible: false });
  }

  confirmarFinalizar() {
    const h = this.finModal().h;
    if (!h) return;
    this.api.finalizarHorario(h.id, this.finMotivo).subscribe({
      next: () => {
        // Limpiar ambiente seleccionado al finalizar
        if (this.esTransversal()) this.limpiarAmbiente(h);
        this.closeFin();
        this.cargarDatos();
        this.toast.info('Clase finalizada', 'La jornada fue cerrada y el administrador fue notificado.');
      },
      error: (e) => this.toast.error('Error al finalizar', e?.error?.message ?? 'No se pudo finalizar la clase.'),
    });
  }

  // ── Transversal: gestión de ambientes ────────────────────────

  consultarAmbientes(h: any) {
    // Si ya está consultando este horario, cerrar el panel (toggle)
    if (this.consultandoId() === h.id) { this.cerrarPanel(); return; }
    this.consultandoId.set(h.id);
    this.consultandoH.set(h);
    this.busquedaAmb.set('');
    this.areaFiltro.set('');
    this.tipoUbicacion.set('ambientes');
    this.ubicacionesDisponibles.set([]);
    this.cargandoAmbs.set(true);
    const diaHoy = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][new Date().getDay()];
    this.api.getAmbientesDisponiblesTransversal(diaHoy, h.jornada).subscribe({
      next: list => {
        const visibles = (list as any[]).sort((a, b) => {
          if (a.estado === b.estado) return a.nombre.localeCompare(b.nombre);
          return a.estado === 'libre' ? -1 : 1;
        });
        this.ambientesLibres.set(visibles);
        this.cargandoAmbs.set(false);
        // Hacer scroll al panel
        setTimeout(() => document.getElementById('amb-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      },
      error: () => this.cargandoAmbs.set(false),
    });
  }

  cerrarPanel() {
    this.consultandoId.set(null);
    this.consultandoH.set(null);
    this.busquedaAmb.set('');
    this.areaFiltro.set('');
    this.tipoUbicacion.set('ambientes');
    this.ambientesLibres.set([]);
    this.ubicacionesDisponibles.set([]);
  }

  seleccionarAmbiente(h: any, amb: any) {
    if (!h) return;
    const current = { ...this.ambienteSeleccionado() };
    current[h.id] = amb;
    this.ambienteSeleccionado.set(current);
    this.limpiarConflicto(h); // limpiar conflicto previo si existía
    this.cerrarPanel();
  }

  /** Cambia la pestaña activa de tipo de ubicación y carga los datos correspondientes */
  cambiarTipoUbicacion(tipo: string, h: any) {
    if (this.tipoUbicacion() === tipo) return;
    this.tipoUbicacion.set(tipo);
    this.busquedaAmb.set('');
    this.areaFiltro.set('');
    if (tipo === 'ambientes') return; // ya cargados en consultarAmbientes
    this.cargandoAmbs.set(true);
    const diaHoy = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][new Date().getDay()];
    this.api.getUbicacionesDisponiblesTransversal(tipo, diaHoy, h.jornada).subscribe({
      next: list => {
        this.ubicacionesDisponibles.set(list);
        this.cargandoAmbs.set(false);
      },
      error: () => this.cargandoAmbs.set(false),
    });
  }

  /** Seleccionar una ubicación no-ambiente (auditorios, etc.) — marca con _esUbicacion para distinguirla */
  seleccionarUbicacion(h: any, u: any) {
    this.seleccionarAmbiente(h, { ...u, _esUbicacion: true });
  }

  limpiarAmbiente(h: any) {
    const current = { ...this.ambienteSeleccionado() };
    delete current[h.id];
    this.ambienteSeleccionado.set(current);
    this.limpiarConflicto(h);
  }

  limpiarConflicto(h: any) {
    const m = { ...this.ambienteConflicto() };
    delete m[h.id];
    this.ambienteConflicto.set(m);
  }

  /** Abre el panel de selección de ambientes para resolver un conflicto (funciona para cualquier rol) */
  buscarAlternativa(h: any) {
    this.limpiarConflicto(h);
    this.consultarAmbientes(h);
  }

  // ── Progreso / Competencias ──────────────────────────────────

  calcProgress(h: any): number {
    if (!h.horaInicio || !h.horaFin) return 0;
    const curr = this.now();
    const [sh, sm] = h.horaInicio.split(':').map(Number);
    const [eh, em] = h.horaFin.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin   = eh * 60 + em;
    // Para noche que cruza medianoche, desplazar endMin +24h para cálculo lineal
    const effectiveEnd = endMin < startMin ? endMin + 24 * 60 : endMin;
    let nowMin = curr.getHours() * 60 + curr.getMinutes();
    // Si ya pasó medianoche y estamos antes del fin, desplazar nowMin también
    if (endMin < startMin && nowMin < startMin) nowMin += 24 * 60;
    if (nowMin < startMin)    return 0;
    if (nowMin > effectiveEnd) return 100;
    return Math.round(((nowMin - startMin) / (effectiveEnd - startMin)) * 100);
  }

  getCompetenciaVigente(h: any): any | null {
    if (!h.competencias || h.competencias.length === 0) return null;
    const current = this.now();
    // Solo la competencia VIGENTE (dentro de su período); si ya venció no debe
    // seguir mostrándose como si estuviera activa.
    return h.competencias.find((c: any) => {
      if (!c.fechaInicio) return true;
      const start = new Date(c.fechaInicio);
      const end = c.fechaFin ? new Date(c.fechaFin) : new Date('2099-01-01');
      return current >= start && current <= end;
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

  openComp(h: any) {
    this.compModal.set(h);
    this.compForm = { asignacionId: h.id };
    this.compResultados.set([{ texto: '', fechaInicio: null, fechaFin: null }]);
    this.compDiasClase.set([]);
    this.compCalMes.set(new Date());
  }

  addCompResultado() {
    this.compResultados.set([...this.compResultados(), { texto: '', fechaInicio: null, fechaFin: null }]);
  }

  removeCompResultado(i: number) {
    this.compResultados.set(this.compResultados().filter((_, idx) => idx !== i));
  }

  setCompResultado(i: number, texto: string) {
    const arr = [...this.compResultados()];
    arr[i] = { ...arr[i], texto };
    this.compResultados.set(arr);
  }

  /** Días permitidos para las fechas de un resultado: los ya asignados a la competencia */
  resultadoDiasPermitidos(): string[] {
    return [...this.compDiasClase()].sort();
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
    const r = this.compResultados()[i];
    const ref = r?.fechaInicio ?? permitidos[0];
    if (ref) {
      const d = new Date(ref + 'T00:00:00');
      this.rCalMes.set(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    this.rCalOpenIdx.set(i);
  }

  formatRCalMes(): string {
    const m = this.rCalMes();
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${meses[m.getMonth()]} ${m.getFullYear()}`;
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
    const r = i !== null ? this.compResultados()[i] : null;
    const ini = r?.fechaInicio ?? '';
    const fin = r?.fechaFin ?? '';
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const cells: ReturnType<typeof this.rCalCeldas> = [];

    const startDow = (firstDay.getDay() + 6) % 7;
    for (let d = startDow - 1; d >= 0; d--) {
      const date = new Date(year, month, -d);
      cells.push({ day: date.getDate(), iso: this._isoDate(date), allowed: false, inRange: false, isIni: false, isFin: false, otherMonth: true });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const iso = this._isoDate(date);
      cells.push({
        day: d, iso, allowed: permitidos.has(iso),
        inRange: !!(ini && fin && iso >= ini && iso <= fin),
        isIni: iso === ini, isFin: iso === fin, otherMonth: false,
      });
    }
    let after = 1;
    while (cells.length < 42) {
      const date = new Date(year, month + 1, after++);
      cells.push({ day: date.getDate(), iso: this._isoDate(date), allowed: false, inRange: false, isIni: false, isFin: false, otherMonth: true });
    }
    return cells;
  }

  pickRCalDay(i: number, iso: string) {
    const arr = [...this.compResultados()];
    const actual = { ...arr[i] };
    if (!actual.fechaInicio || (actual.fechaInicio && actual.fechaFin)) {
      actual.fechaInicio = iso;
      actual.fechaFin = null;
    } else if (iso < actual.fechaInicio) {
      actual.fechaInicio = iso;
      actual.fechaFin = null;
    } else {
      actual.fechaFin = iso;
    }
    arr[i] = actual;
    this.compResultados.set(arr);
  }

  /** Normaliza c.resultados (puede venir en formato legado string[]) para mostrarlos */
  resultadosDe(c: any): Resultado[] {
    return normalizarResultados(c.resultados);
  }

  estadoResultadoInfo(r: Resultado) {
    return RESULTADO_ESTADO_INFO[estadoResultado(r, this.hoyIso)];
  }

  saveComp() {
    const resultados = this.compResultados()
      .map(r => ({ ...r, texto: r.texto.trim() }))
      .filter(r => r.texto);
    const body = { ...this.compForm, resultados, diasClase: this.compDiasClase().length ? this.compDiasClase() : null };
    this.api.createCompetencia(body).subscribe({
      next: () => {
        this.compModal.set(null);
        this.cargarDatos();
        this.toast.success('Competencia registrada', 'La competencia fue añadida al horario correctamente.');
      },
      error: (e) => this.toast.error('Error al guardar competencia', e?.error?.message ?? 'No se pudo registrar la competencia.'),
    });
  }

  // ── Calendario de días de clase ─────────────────────────────────────────

  onCompFechaInicioChange(val: string) {
    this.compForm = { ...this.compForm, fechaInicio: val };
    if (val) {
      const d = new Date(val + 'T00:00:00');
      this.compCalMes.set(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    // Quitar días que quedaron fuera del nuevo rango
    this._limpiarDiasFueraRango();
  }

  onCompFechaFinChange(val: string) {
    this.compForm = { ...this.compForm, fechaFin: val };
    this._limpiarDiasFueraRango();
  }

  private _limpiarDiasFueraRango() {
    const ini = this.compForm.fechaInicio ?? '';
    const fin = this.compForm.fechaFin ?? '';
    if (!ini || !fin) return;
    this.compDiasClase.update(dias => dias.filter(d => d >= ini && d <= fin));
  }

  /** Celdas del mes actual para el mini-calendario */
  compCalCeldas(): { day: number; iso: string; inRange: boolean; isIni: boolean; isFin: boolean; otherMonth: boolean }[] {
    const mes   = this.compCalMes();
    const year  = mes.getFullYear();
    const month = mes.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const ini = this.compForm.fechaInicio ?? '';
    const fin = this.compForm.fechaFin   ?? '';
    const cells: { day: number; iso: string; inRange: boolean; isIni: boolean; isFin: boolean; otherMonth: boolean }[] = [];

    // Desplazamiento lunes-based (0=Lun … 6=Dom)
    const startDow = (firstDay.getDay() + 6) % 7;
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({ day: d.getDate(), iso: this._isoDate(d), inRange: false, isIni: false, isFin: false, otherMonth: true });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const iso  = this._isoDate(date);
      const inRange = !!(ini && fin && iso >= ini && iso <= fin);
      cells.push({ day: d, iso, inRange, isIni: iso === ini, isFin: iso === fin, otherMonth: false });
    }
    // Completar hasta 42 celdas (6 filas × 7)
    let after = 1;
    while (cells.length < 42) {
      const d = new Date(year, month + 1, after++);
      cells.push({ day: d.getDate(), iso: this._isoDate(d), inRange: false, isIni: false, isFin: false, otherMonth: true });
    }
    return cells;
  }

  private _isoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  formatCompCalMes(): string {
    const m = this.compCalMes();
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${meses[m.getMonth()]} ${m.getFullYear()}`;
  }

  compCalPrevMes() {
    const m   = this.compCalMes();
    const ini = this.compForm.fechaInicio;
    if (ini) {
      const iniD = new Date(ini + 'T00:00:00');
      if (m.getFullYear() === iniD.getFullYear() && m.getMonth() === iniD.getMonth()) return;
    }
    this.compCalMes.set(new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  compCalNextMes() {
    const m   = this.compCalMes();
    const fin = this.compForm.fechaFin;
    if (fin) {
      const finD = new Date(fin + 'T00:00:00');
      if (m.getFullYear() === finD.getFullYear() && m.getMonth() === finD.getMonth()) return;
    }
    this.compCalMes.set(new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  toggleDiaClase(iso: string) {
    this.compDiasClase.update(dias => {
      const arr = [...dias];
      const idx = arr.indexOf(iso);
      if (idx > -1) arr.splice(idx, 1);
      else arr.push(iso);
      arr.sort();
      return arr;
    });
  }

  // ── Cálculo de horas ────────────────────────────────────────────────────

  private _duracionHorarioMin(h: any): number {
    if (!h?.horaInicio || !h?.horaFin) return 0;
    const [sh, sm] = h.horaInicio.split(':').map(Number);
    const [eh, em] = h.horaFin.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin   = eh * 60 + em;
    return endMin < startMin ? (endMin + 1440) - startMin : endMin - startMin;
  }

  private _formatHoras(totalMin: number): string {
    const h = totalMin / 60;
    return Number.isInteger(h) ? String(h) : h.toFixed(1);
  }

  /** Horas acumuladas en el formulario del modal (usa dias seleccionados + horario actual) */
  calcHorasFormModal(): string {
    const dias = this.compDiasClase().length;
    if (!dias) return '0';
    return this._formatHoras(dias * this._duracionHorarioMin(this.compModal()));
  }

  /** Horas acumuladas de una competencia ya guardada (tooltip) */
  calcHorasCompetencia(comp: any, h: any): string {
    const dias = (comp?.diasClase ?? []).length;
    if (!dias) return '0';
    return this._formatHoras(dias * this._duracionHorarioMin(h));
  }

  // ── Copiar competencia al portapapeles ──────────────────────────────────

  copiarCompetencia() {
    const state = this.tooltipState();
    if (!state) return;
    const { comp, h } = state;
    const horas   = this.calcHorasCompetencia(comp, h);
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
      this.compCopied.set(true);
      setTimeout(() => this.compCopied.set(false), 2000);
    });
  }
}

/** Helper puro para evitar llamar signal().id dentro de template */
function ambienteSeleccionadoForHorario(map: Record<number, any>, id: number): any {
  return map[id] ?? null;
}
