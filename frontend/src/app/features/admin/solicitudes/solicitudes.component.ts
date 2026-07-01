import { Component, OnInit, signal, computed, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { DIAS_LABELS } from '../../../core/models/user.model';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../../core/services/toast.service';
import { AuthSrcDirective } from '../../../shared/directives/auth-src.directive';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-solicitudes',
  imports: [FormsModule, DatePipe, UpperCasePipe, LucideAngularModule, AuthSrcDirective],
  template: `
    <div class="page-header">
      <div>
        <h2>Solicitudes de Cambio</h2>
        <p class="text-muted text-sm">Gestión de solicitudes de modificación de horarios enviadas por instructores</p>
      </div>
      <button class="btn btn-outline-sm" (click)="cargar()">
        <lucide-icon name="refresh-cw" [size]="13"></lucide-icon> Actualizar
      </button>
    </div>

    <!-- Barra de filtros -->
    <div class="filter-bar mt-4">
      <div class="filter-chips">
        @for (opt of estadoOpts; track opt.value) {
          <button class="chip" [class.active]="filtroEstado() === opt.value" (click)="filtroEstado.set(opt.value)">
            {{ opt.label }}
            @if (opt.value !== 'todas' && countByEstado(opt.value) > 0) {
              <span class="chip-count">{{ countByEstado(opt.value) }}</span>
            }
          </button>
        }
      </div>
      <div class="search-wrap">
        <lucide-icon name="search" [size]="13" class="search-icon"></lucide-icon>
        <input class="search-input" placeholder="Buscar instructor, ficha, motivo..."
               [value]="searchQ()" (input)="searchQ.set($any($event.target).value)">
        @if (searchQ()) {
          <button class="search-clear" (click)="searchQ.set('')">
            <lucide-icon name="x" [size]="11"></lucide-icon>
          </button>
        }
      </div>
    </div>

    <!-- Tabla -->
    <div class="table-card mt-3">
      <div class="table-wrap">
        <table class="sol-table">
          <thead>
            <tr>
              <th style="width:28px"></th>
              <th>Instructor</th>
              <th>Estado</th>
              <th>Cambio propuesto</th>
              <th>Motivo</th>
              <th>Fecha</th>
              <th style="width:130px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr><td colspan="7" class="empty-cell">
                <lucide-icon name="loader" [size]="16" class="spin"></lucide-icon> Cargando...
              </td></tr>
            } @else if (!solicitudesFiltradas().length) {
              <tr><td colspan="7" class="empty-cell">
                <lucide-icon name="inbox" [size]="22" style="opacity:.35;display:block;margin:0 auto 6px"></lucide-icon>
                Sin solicitudes{{ filtroEstado() !== 'todas' ? ' en este estado' : '' }}
              </td></tr>
            } @else {
              @for (s of solicitudesFiltradas(); track s.id) {
                <!-- Fila principal -->
                <tr class="sol-row" [class.expanded]="expandedId() === s.id" [class.pending-row]="normalizeEstado(s.estado) === 'pendiente'">
                  <td>
                    <button class="expand-btn" (click)="toggleExpand(s.id)" [title]="expandedId()===s.id ? 'Contraer' : 'Expandir detalle'">
                      <lucide-icon [name]="expandedId()===s.id ? 'chevron-up' : 'chevron-down'" [size]="13"></lucide-icon>
                    </button>
                  </td>
                  <td>
                    <div class="instr-cell">
                      <div class="instr-avatar">{{ (s.instructor?.nombre ?? '?')[0] }}{{ (s.instructor?.apellido ?? '')[0] }}</div>
                      <span class="instr-name">{{ s.instructor?.nombre ?? '—' }} {{ s.instructor?.apellido ?? '' }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="estado-badge {{ normalizeEstado(s.estado) }}">
                      @if (normalizeEstado(s.estado) === 'pendiente') { <lucide-icon name="clock" [size]="10"></lucide-icon> }
                      @if (normalizeEstado(s.estado) === 'aprobado')  { <lucide-icon name="check-circle" [size]="10"></lucide-icon> }
                      @if (normalizeEstado(s.estado) === 'rechazado') { <lucide-icon name="x-circle" [size]="10"></lucide-icon> }
                      @if (normalizeEstado(s.estado) === 'cancelado') { <lucide-icon name="ban" [size]="10"></lucide-icon> }
                      {{ estadoLabel(s.estado) }}
                    </span>
                  </td>
                  <td class="cambio-cell">
                    @if (s.horarioPropuesto) {
                      <div class="cambio-row">
                        <span class="cambio-actual">{{ (LABELS[getActualDia(s)] || getActualDia(s) || '?') | uppercase }} · {{ getActualHoras(s) }}</span>
                        <lucide-icon name="arrow-right" [size]="11" style="color:var(--blue);flex-shrink:0"></lucide-icon>
                        <span class="cambio-prop">{{ (LABELS[getPropDia(s)] || getPropDia(s) || '?') | uppercase }} · {{ getPropHoras(s) }}</span>
                      </div>
                    } @else {
                      <span class="text-muted text-xs">Sin propuesta específica</span>
                    }
                    <div class="cambio-ficha">
                      <lucide-icon name="book-open" [size]="10"></lucide-icon>
                      Ficha {{ getActualFicha(s) }}
                    </div>
                  </td>
                  <td class="motivo-cell">
                    <span [title]="s.razon ?? ''" class="motivo-text-short">{{ s.razon ? truncateMotivo(s.razon) : '—' }}</span>
                  </td>
                  <td class="fecha-cell">{{ s.fecha | date:'dd/MM/yy HH:mm' }}</td>
                  <td>
                    @if (normalizeEstado(s.estado) === 'pendiente') {
                      <div class="action-btns">
                        <button class="btn-sm-green" (click)="expandToRespond(s)" title="Aprobar">
                          <lucide-icon name="check" [size]="12"></lucide-icon>
                        </button>
                        <button class="btn-sm-red" (click)="responder(s, 'rechazado')" title="Rechazar">
                          <lucide-icon name="x" [size]="12"></lucide-icon>
                        </button>
                        <button class="btn-sm-gray" (click)="eliminar(s)" title="Eliminar">
                          <lucide-icon name="trash-2" [size]="12"></lucide-icon>
                        </button>
                      </div>
                    } @else {
                      <div class="action-btns">
                        @if (s.respuestaAdmin) {
                          <span class="resp-badge" [title]="s.respuestaAdmin">
                            <lucide-icon name="message-circle" [size]="11"></lucide-icon>
                          </span>
                        }
                        <button class="btn-sm-gray" (click)="eliminar(s)" title="Eliminar registro">
                          <lucide-icon name="trash-2" [size]="12"></lucide-icon>
                        </button>
                      </div>
                    }
                  </td>
                </tr>

                <!-- Fila expandida -->
                @if (expandedId() === s.id) {
                <tr class="expand-row">
                  <td colspan="7" style="padding:0">
                    <div class="expand-panel">

                      <!-- Comparación horarios -->
                      <div class="horarios-compare">
                        <div class="horario-side actual">
                          <div class="side-label"><lucide-icon name="calendar" [size]="10"></lucide-icon> Horario Actual</div>
                          <div class="side-day">{{ LABELS[getActualDia(s)] || getActualDia(s) || '—' }}</div>
                          <div class="side-time">{{ getActualHoras(s) }}</div>
                          <div class="side-detail"><lucide-icon [name]="jornadaIcon(getActualJornada(s))" [size]="11"></lucide-icon>Jornada {{ getActualJornada(s) || '—' }}</div>
                          <div class="side-detail"><lucide-icon name="user" [size]="11"></lucide-icon>{{ getActualInstructor(s) }}</div>
                          <div class="side-detail"><lucide-icon name="building-2" [size]="11"></lucide-icon>{{ getActualAmbiente(s) }}</div>
                          <div class="side-detail"><lucide-icon name="book-open" [size]="11"></lucide-icon>Ficha {{ getActualFicha(s) }}</div>
                        </div>
                        <div class="compare-arrow"><lucide-icon name="arrow-right" [size]="22" style="color:var(--blue)"></lucide-icon></div>
                        <div class="horario-side propuesta">
                          @if (s.horarioPropuesto) {
                            <div class="side-label" style="color:var(--blue)"><lucide-icon name="git-branch" [size]="10"></lucide-icon> Nueva Propuesta</div>
                            <div class="side-day" [class.changed]="diaChanged(s)">{{ LABELS[getPropDia(s)] || getPropDia(s) || '—' }}</div>
                            <div class="side-time" [class.changed]="horasChanged(s)">{{ getPropHoras(s) }}</div>
                            <div class="side-detail" [class.changed]="jornadaChanged(s)"><lucide-icon [name]="jornadaIcon(getPropJornada(s))" [size]="11"></lucide-icon>Jornada {{ getPropJornada(s) || '—' }}</div>
                            <div class="side-detail" [class.changed]="instructorChanged(s)"><lucide-icon name="user" [size]="11"></lucide-icon>{{ getPropInstructor(s) }}</div>
                            <div class="side-detail" [class.changed]="ambienteChanged(s)"><lucide-icon name="building-2" [size]="11"></lucide-icon>{{ getPropAmbiente(s) }}</div>
                            <div class="side-detail" [class.changed]="fichaChanged(s)"><lucide-icon name="book-open" [size]="11"></lucide-icon>Ficha {{ getPropFicha(s) }}</div>
                          } @else {
                            <div class="side-label">Sin propuesta específica</div>
                            <div class="text-muted text-sm mt-2">El instructor no especificó un horario alternativo.</div>
                          }
                        </div>
                      </div>

                      <!-- Motivo completo -->
                      @if (s.razon) {
                        <div class="motivo-box">
                          <span class="motivo-lbl"><lucide-icon name="message-square" [size]="12"></lucide-icon> Motivo</span>
                          <span class="motivo-txt">"{{ s.razon }}"</span>
                        </div>
                      }

                      <!-- Respuesta admin (si ya respondió) -->
                      @if (s.respuestaAdmin) {
                        <div class="resp-box">
                          <lucide-icon name="shield-check" [size]="13"></lucide-icon>
                          <strong>Respuesta:</strong> {{ s.respuestaAdmin }}
                        </div>
                      }

                      <!-- Adjunto -->
                      @if (s.archivoAdjuntoUrl) {
                        <div class="adjunto-row">
                          <lucide-icon name="paperclip" [size]="12"></lucide-icon>
                          @if (esImagen(s.archivoAdjuntoUrl)) {
                            <div class="img-preview-wrap">
                              <img [appAuthSrc]="urlCompleta(s.archivoAdjuntoUrl)" class="adjunto-img"
                                   (click)="abrirImagen(s.archivoAdjuntoUrl)" alt="Adjunto" title="Clic para ampliar">
                              <div class="img-overlay" (click)="abrirImagen(s.archivoAdjuntoUrl)">
                                <lucide-icon name="zoom-in" [size]="18"></lucide-icon>
                              </div>
                            </div>
                          } @else {
                            <a [href]="urlCompleta(s.archivoAdjuntoUrl)" target="_blank" class="file-link">
                              <lucide-icon name="download" [size]="13"></lucide-icon>
                              Descargar adjunto
                              <span class="file-ext">{{ getExtension(s.archivoAdjuntoUrl) | uppercase }}</span>
                            </a>
                          }
                        </div>
                      }

                      <!-- Acción de aprobar (si está pendiente) -->
                      @if (normalizeEstado(s.estado) === 'pendiente') {
                        <div class="resp-action-row">
                          <input class="form-control resp-input" [(ngModel)]="respuestas[s.id]"
                                 placeholder="Comentario para el instructor (opcional)...">
                          <button class="btn-aprobar" (click)="responder(s, 'aprobado')">
                            <lucide-icon name="check-circle" [size]="14"></lucide-icon> Aprobar y Aplicar
                          </button>
                          <button class="btn-rechazar" (click)="responder(s, 'rechazado')">
                            <lucide-icon name="x-circle" [size]="14"></lucide-icon> Rechazar
                          </button>
                        </div>
                      }

                    </div>
                  </td>
                </tr>
                }
              }
            }
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <span class="text-muted text-xs">{{ solicitudesFiltradas().length }} solicitud{{ solicitudesFiltradas().length !== 1 ? 'es' : '' }}</span>
      </div>
    </div>

    <!-- LIGHTBOX -->
    @if (imagenAmpliada()) {
    <div class="lightbox-overlay" (click)="imagenAmpliada.set(null)">
      <div class="lightbox-box" (click)="$event.stopPropagation()">
        <button class="lightbox-close" (click)="imagenAmpliada.set(null)">
          <lucide-icon name="x" [size]="20"></lucide-icon>
        </button>
        <img [appAuthSrc]="urlCompleta(imagenAmpliada()!)" class="lightbox-img" alt="Vista ampliada">
        <a [href]="urlCompleta(imagenAmpliada()!)" target="_blank" class="lightbox-download">
          <lucide-icon name="download" [size]="13"></lucide-icon> Descargar
        </a>
      </div>
    </div>
    }
  `,
  styles: [`
    .page-header { display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px; }
    .btn-outline-sm { display:inline-flex;align-items:center;gap:5px;background:transparent;border:1px solid var(--border);color:var(--text-muted);padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;transition:.15s; }
    .btn-outline-sm:hover { background:var(--surface2);color:var(--text); }

    /* ── Filtros ── */
    .filter-bar { display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px; }
    .filter-chips { display:flex;gap:4px;flex-wrap:wrap; }
    .chip { display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:20px;border:1.5px solid var(--border);background:var(--surface);color:var(--text-muted);cursor:pointer;font-size:12px;font-weight:600;transition:.15s; }
    .chip:hover { border-color:var(--navy);color:var(--navy); }
    .chip.active { background:var(--navy);color:#fff;border-color:var(--navy); }
    .chip-count { background:rgba(255,255,255,.25);border-radius:10px;padding:1px 6px;font-size:10px; }
    .chip.active .chip-count { background:rgba(255,255,255,.3); }

    /* Search */
    .search-wrap { position:relative;display:flex;align-items:center; }
    .search-icon { position:absolute;left:10px;color:var(--text-muted); }
    .search-input { padding:7px 32px 7px 30px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:var(--surface);color:var(--text);outline:none;width:280px; }
    .search-input:focus { border-color:var(--blue); }
    .search-clear { position:absolute;right:8px;background:none;border:none;cursor:pointer;color:var(--text-muted);display:flex;padding:2px; }

    /* ── Tabla ── */
    .table-card { background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden; }
    .table-wrap { overflow-x:auto; }
    .sol-table { width:100%;border-collapse:collapse;font-size:13px; }
    .sol-table th { background:var(--surface2);padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;border-bottom:1.5px solid var(--border); }
    .sol-table td { padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:middle; }
    .sol-row:last-child td { border-bottom:none; }
    .sol-row:hover td { background:var(--surface2); }
    .sol-row.pending-row td { background:#fffbeb; }
    .sol-row.pending-row:hover td { background:#fef3c7; }
    .sol-row.expanded td { background:#f0f9ff !important; }
    .empty-cell { text-align:center;padding:40px 20px;color:var(--text-muted);font-size:13px; }
    .table-footer { padding:8px 14px;border-top:1px solid var(--border);background:var(--surface2); }

    /* Expand button */
    .expand-btn { background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:3px;color:var(--text-muted);transition:.15s; }
    .expand-btn:hover { background:var(--surface2);border-color:var(--navy);color:var(--navy); }

    /* Cells */
    .instr-cell { display:flex;align-items:center;gap:8px; }
    .instr-avatar { width:30px;height:30px;border-radius:50%;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;flex-shrink:0; }
    .instr-name { font-weight:600;color:var(--text); }

    /* Estado badge */
    .estado-badge { display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:10px;font-size:11px;font-weight:700; }
    .estado-badge.pendiente { background:#fef3c7;color:#92400e; }
    .estado-badge.aprobado  { background:#dcfce7;color:#166534; }
    .estado-badge.rechazado { background:#fee2e2;color:#991b1b; }
    .estado-badge.cancelado { background:#f1f5f9;color:#64748b; }

    /* Cambio cell */
    .cambio-row { display:flex;align-items:center;gap:5px;font-size:12px; }
    .cambio-actual { color:var(--text-muted); }
    .cambio-prop { color:var(--blue);font-weight:700; }
    .cambio-ficha { display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);margin-top:2px; }
    .motivo-text-short { font-size:12px;color:var(--text-muted);max-width:180px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .fecha-cell { font-size:11px;color:var(--text-muted);white-space:nowrap; }

    /* Action buttons */
    .action-btns { display:flex;align-items:center;gap:4px; }
    .btn-sm-green { display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;border:1.5px solid #86efac;background:#dcfce7;color:#166534;cursor:pointer;transition:.15s; }
    .btn-sm-green:hover { background:#bbf7d0; }
    .btn-sm-red   { display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;border:1.5px solid #fca5a5;background:#fee2e2;color:#991b1b;cursor:pointer;transition:.15s; }
    .btn-sm-red:hover { background:#fecaca; }
    .btn-sm-gray  { display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;border:1.5px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;transition:.15s; }
    .btn-sm-gray:hover { background:#fee2e2;border-color:#fca5a5;color:#991b1b; }
    .resp-badge { display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;border:1.5px solid #86efac;background:#dcfce7;color:#166534; }

    /* ── Panel expandido ── */
    .expand-panel { padding:16px 20px;background:#f8fafc;border-top:1px solid #bfdbfe; }
    .horarios-compare { display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:start;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px; }
    @media (max-width:620px) { .horarios-compare { grid-template-columns:1fr; } }
    .compare-arrow { display:flex;justify-content:center;align-items:center;padding-top:24px; }
    .horario-side { padding:12px;border-radius:6px; }
    .horario-side.actual   { background:#f8fafc;border:1px solid #e2e8f0; }
    .horario-side.propuesta { background:#eff6ff;border:1px solid #bfdbfe; }
    .side-label { font-size:10px;text-transform:uppercase;font-weight:800;color:#64748b;margin-bottom:6px;display:flex;align-items:center;gap:3px;letter-spacing:.5px; }
    .side-day  { font-size:16px;font-weight:800;color:var(--text);margin-bottom:1px; }
    .side-time { font-size:13px;font-weight:700;color:var(--navy);margin-bottom:6px; }
    .side-detail { font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:4px;margin-top:4px; }
    .changed { color:var(--navy) !important;font-weight:700 !important; }

    .motivo-box { background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px 14px;margin-bottom:10px;display:flex;align-items:baseline;gap:8px;font-size:13px; }
    .motivo-lbl { display:flex;align-items:center;gap:4px;font-size:10px;font-weight:700;text-transform:uppercase;color:#92400e;white-space:nowrap; }
    .motivo-txt { color:#78350f;font-style:italic; }

    .resp-box { display:flex;align-items:center;gap:6px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:8px 12px;font-size:12px;color:#166534;margin-bottom:10px; }

    .adjunto-row { display:flex;align-items:center;gap:8px;margin-bottom:10px; }
    .img-preview-wrap { position:relative;display:inline-block;cursor:pointer; }
    .adjunto-img { max-width:200px;max-height:140px;object-fit:cover;border-radius:6px;border:1.5px solid var(--border);display:block; }
    .img-overlay { position:absolute;inset:0;background:rgba(0,0,0,.4);border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;opacity:0;transition:.2s; }
    .img-preview-wrap:hover .img-overlay { opacity:1; }
    .file-link { display:inline-flex;align-items:center;gap:6px;background:#f1f5f9;border:1.5px solid #cbd5e1;color:var(--navy);padding:6px 12px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;transition:.15s; }
    .file-link:hover { background:#e2e8f0; }
    .file-ext { background:var(--navy);color:#fff;border-radius:4px;padding:1px 5px;font-size:10px; }

    /* Acción inline aprobar */
    .resp-action-row { display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--border); }
    .resp-input { flex:1;min-width:200px; }
    .btn-aprobar { display:flex;align-items:center;gap:5px;background:#dcfce7;border:1.5px solid #86efac;color:#166534;padding:7px 14px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700;transition:.15s;white-space:nowrap; }
    .btn-aprobar:hover { background:#bbf7d0; }
    .btn-rechazar { display:flex;align-items:center;gap:5px;background:#fee2e2;border:1.5px solid #fca5a5;color:#991b1b;padding:7px 14px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700;transition:.15s;white-space:nowrap; }
    .btn-rechazar:hover { background:#fecaca; }

    /* Lightbox */
    .lightbox-overlay { position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px; }
    .lightbox-box { position:relative;background:#000;border-radius:12px;overflow:hidden;max-width:90vw;max-height:90vh;display:flex;flex-direction:column;align-items:center; }
    .lightbox-close { position:absolute;top:10px;right:10px;background:rgba(0,0,0,.6);border:none;color:#fff;cursor:pointer;border-radius:50%;padding:5px;display:flex;align-items:center;justify-content:center;z-index:10; }
    .lightbox-img { max-width:90vw;max-height:80vh;object-fit:contain;display:block; }
    .lightbox-download { display:flex;align-items:center;gap:5px;color:#fff;text-decoration:none;padding:8px 14px;font-size:12px;background:rgba(255,255,255,.1); }
    .spin { animation:spin .8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
  `],
})
export class AdminSolicitudesComponent implements OnInit {
  readonly LABELS = DIAS_LABELS;
  readonly BASE_URL = environment.apiOrigin;

  solicitudes      = signal<any[]>([]);
  ambientesList    = signal<any[]>([]);
  instructoresList = signal<any[]>([]);
  fichasList       = signal<any[]>([]);
  filtroEstado     = signal<string>('todas');
  imagenAmpliada   = signal<string | null>(null);
  expandedId       = signal<number | null>(null);
  searchQ          = signal('');
  loading          = signal(false);
  respuestas: Record<number, string> = {};

  readonly estadoOpts = [
    { value: 'todas',     label: 'Todas'     },
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'aprobado',  label: 'Aprobadas'  },
    { value: 'rechazado', label: 'Rechazadas' },
    { value: 'cancelado', label: 'Canceladas' },
  ];

  private toast = inject(ToastService);

  /** Normaliza variantes de género: 'aprobada'→'aprobado', 'rechazada'→'rechazado', 'cancelada'→'cancelado' */
  normalizeEstado(e: string): string {
    const map: Record<string, string> = {
      aprobada: 'aprobado', aprobado: 'aprobado',
      rechazada: 'rechazado', rechazado: 'rechazado',
      cancelada: 'cancelado', cancelado: 'cancelado',
      pendiente: 'pendiente',
    };
    return map[(e ?? '').toLowerCase()] ?? (e ?? '').toLowerCase();
  }

  estadoLabel(e: string): string {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente', aprobado: 'Aprobada', rechazado: 'Rechazada', cancelado: 'Cancelada',
    };
    return labels[this.normalizeEstado(e)] ?? e;
  }

  countByEstado(estado: string): number {
    return this.solicitudes().filter(s => this.normalizeEstado(s.estado) === estado).length;
  }

  solicitudesFiltradas = computed(() => {
    let list = this.solicitudes();
    // Filtro por estado
    if (this.filtroEstado() !== 'todas') {
      const f = this.filtroEstado();
      list = list.filter(s => this.normalizeEstado(s.estado) === f);
    }
    // Filtro por búsqueda
    const q = this.searchQ().trim().toLowerCase();
    if (q) {
      list = list.filter(s =>
        (`${s.instructor?.nombre ?? ''} ${s.instructor?.apellido ?? ''}`).toLowerCase().includes(q) ||
        (s.razon ?? '').toLowerCase().includes(q) ||
        this.getActualFicha(s).toLowerCase().includes(q)
      );
    }
    return list;
  });

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.loading.set(true);
    forkJoin({
      solicitudes:  this.api.getSolicitudes(),
      instructores: this.api.getInstructores(),
      ambientes:    this.api.getAmbientes(),
      fichas:       this.api.getFichas(),
    }).subscribe(({ solicitudes, instructores, ambientes, fichas }) => {
      this.instructoresList.set(instructores as any[]);
      this.ambientesList.set(ambientes as any[]);
      this.fichasList.set(fichas as any[]);
      const instMap = new Map<string, any>((instructores as any[]).map(i => [String(i.id), i]));
      this.solicitudes.set((solicitudes as any[]).map(s => ({
        ...s,
        instructor: s.instructorId ? (instMap.get(String(s.instructorId)) ?? null) : null,
      })));
      this.loading.set(false);
      this.cdr.detectChanges();
    });
  }

  toggleExpand(id: number) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  /** Al aprobar desde el botón rápido, expandir la fila para mostrar el input de respuesta */
  expandToRespond(s: any) {
    this.expandedId.set(s.id);
    // Scroll suave al panel expandido
    setTimeout(() => {
      document.querySelector('.expand-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }

  // ── Helpers: resolución de nombres ──────────────────────────
  ambienteNombre(id: any): string {
    if (!id) return 'Sin ambiente';
    const a = this.ambientesList().find((x: any) => String(x.id) === String(id));
    return a ? a.nombre : `Ambiente #${id}`;
  }
  instructorNombre(id: any): string {
    if (!id) return 'Sin instructor';
    const i = this.instructoresList().find((x: any) => String(x.id) === String(id));
    return i ? `${i.nombre} ${i.apellido}` : `Instructor #${id}`;
  }
  fichaLabel(id: any): string {
    if (!id) return '—';
    const f = this.fichasList().find((x: any) => String(x.id) === String(id));
    return f ? f.codigo : `Ficha #${id}`;
  }
  jornadaIcon(jornada: string): string {
    switch (jornada) {
      case 'manana': return 'sunrise';
      case 'tarde':  return 'sun';
      case 'noche':  return 'moon';
      default:       return 'clock';
    }
  }
  truncateMotivo(t: string, n = 45): string {
    return t && t.length > n ? t.slice(0, n) + '…' : t;
  }

  // ── Helpers: valores horario ACTUAL ─────────────────────────
  getActualDia(s: any): string { return s.snapshotActual?.diaSemana ?? s.horarioActual?.diaSemana ?? ''; }
  getActualHoras(s: any): string {
    const ini = (s.snapshotActual?.horaInicio ?? s.horarioActual?.horaInicio ?? '').slice(0, 5);
    const fin = (s.snapshotActual?.horaFin    ?? s.horarioActual?.horaFin    ?? '').slice(0, 5);
    return ini && fin ? `${ini} — ${fin}` : '—';
  }
  getActualJornada(s: any): string { return s.snapshotActual?.jornada ?? s.horarioActual?.jornada ?? ''; }
  getActualInstructor(s: any): string {
    if (s.snapshotActual?.instructorNombre) return s.snapshotActual.instructorNombre;
    const h = s.horarioActual;
    if (h?.instructor) return `${h.instructor.nombre} ${h.instructor.apellido}`;
    return this.instructorNombre(h?.instructorId);
  }
  getActualAmbiente(s: any): string {
    if (s.snapshotActual?.ambienteNombre) return s.snapshotActual.ambienteNombre;
    return s.horarioActual?.ambiente?.nombre ?? this.ambienteNombre(s.horarioActual?.ambienteId);
  }
  getActualFicha(s: any): string {
    if (s.snapshotActual?.fichaCodigo) return s.snapshotActual.fichaCodigo;
    return s.horarioActual?.ficha?.codigo ?? this.fichaLabel(s.horarioActual?.fichaId);
  }

  // ── Helpers: valores PROPUESTA ───────────────────────────────
  getPropDia(s: any): string { return s.horarioPropuesto?.diaSemana ?? this.getActualDia(s); }
  getPropHoras(s: any): string {
    const ini = (s.horarioPropuesto?.horaInicio ?? s.snapshotActual?.horaInicio ?? s.horarioActual?.horaInicio ?? '').slice(0, 5);
    const fin = (s.horarioPropuesto?.horaFin    ?? s.snapshotActual?.horaFin    ?? s.horarioActual?.horaFin    ?? '').slice(0, 5);
    return ini && fin ? `${ini} — ${fin}` : '—';
  }
  getPropJornada(s: any): string { return s.horarioPropuesto?.jornada ?? this.getActualJornada(s); }
  getPropInstructor(s: any): string {
    if (s.horarioPropuesto?.instructorId) return this.instructorNombre(s.horarioPropuesto.instructorId);
    return this.getActualInstructor(s);
  }
  getPropAmbiente(s: any): string {
    if (s.horarioPropuesto?.ambienteId) return this.ambienteNombre(s.horarioPropuesto.ambienteId);
    return this.getActualAmbiente(s);
  }
  getPropFicha(s: any): string {
    if (s.horarioPropuesto?.fichaId) return this.fichaLabel(s.horarioPropuesto.fichaId);
    return this.getActualFicha(s);
  }

  // ── Helpers: ¿cambió? ────────────────────────────────────────
  diaChanged(s: any): boolean { const p = s.horarioPropuesto?.diaSemana; return !!p && p !== this.getActualDia(s); }
  horasChanged(s: any): boolean { return this.getPropHoras(s) !== this.getActualHoras(s); }
  jornadaChanged(s: any): boolean { const p = s.horarioPropuesto?.jornada; return !!p && p !== this.getActualJornada(s); }
  instructorChanged(s: any): boolean { const p = s.horarioPropuesto?.instructorId; return !!p && this.getPropInstructor(s) !== this.getActualInstructor(s); }
  ambienteChanged(s: any): boolean { const p = s.horarioPropuesto?.ambienteId; return !!p && this.getPropAmbiente(s) !== this.getActualAmbiente(s); }
  fichaChanged(s: any): boolean { const p = s.horarioPropuesto?.fichaId; return !!p && this.getPropFicha(s) !== this.getActualFicha(s); }

  // ── Helpers: adjunto ─────────────────────────────────────────
  esImagen(url: string): boolean { return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url); }
  getExtension(url: string): string { const m = url.match(/\.([a-zA-Z0-9]+)(\?|$)/); return m ? m[1] : 'archivo'; }
  urlCompleta(url: string): string {
    if (!url) return '';
    const encodedUrl = encodeURI(url);
    return url.startsWith('http') ? encodedUrl : `${this.BASE_URL}${encodedUrl.startsWith('/') ? '' : '/'}${encodedUrl}`;
  }
  abrirImagen(url: string) { this.imagenAmpliada.set(url); }

  // ── Acciones ─────────────────────────────────────────────────
  responder(s: any, estado: string) {
    const resp = this.respuestas[s.id];
    this.api.responderSolicitud(s.id, estado, resp || undefined).subscribe({
      next: () => {
        this.respuestas[s.id] = '';
        this.expandedId.set(null);
        this.cargar();
        const label = estado === 'aprobado' ? 'aprobada' : 'rechazada';
        this.toast.success(
          `Solicitud ${label}`,
          estado === 'aprobado'
            ? 'El cambio fue aprobado y aplicado automáticamente al horario del instructor.'
            : 'El instructor fue notificado del rechazo.',
        );
      },
      error: (e) => this.toast.error('Error al responder', e?.error?.message ?? 'No se pudo procesar la respuesta.'),
    });
  }

  eliminar(s: any) {
    if (!confirm('¿Eliminar este registro de solicitud permanentemente?')) return;
    this.api.deleteSolicitud(s.id).subscribe({
      next: () => {
        this.solicitudes.set(this.solicitudes().filter(x => x.id !== s.id));
        this.toast.success('Solicitud eliminada', 'El registro fue eliminado del sistema.');
      },
      error: (e) => this.toast.error('Error al eliminar', e?.error?.message ?? 'No se pudo eliminar la solicitud.'),
    });
  }
}
