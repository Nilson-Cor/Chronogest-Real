import { Component, computed, signal, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ApiService } from '../../core/services/api.service';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule } from 'lucide-angular';
import { ToastComponent } from '../components/toast.component';
import { AuthSrcDirective } from '../directives/auth-src.directive';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    LucideAngularModule, ToastComponent, AuthSrcDirective,
  ],
  template: `
    <div class="app-layout" [class.dark]="theme.isDark()">

      <!-- SIDEBAR -->
      <aside class="sidebar" [class.collapsed]="collapsed()">
        <div class="sidebar-top">
          <div class="sidebar-logo">
            <lucide-icon name="calendar" [size]="22" class="sidebar-logo-icon"></lucide-icon>
            @if (!collapsed()) {
              <span class="sidebar-logo-text">ChronoGest</span>
            }
          </div>
        </div>

        <nav class="sidebar-nav">
          @for (item of navItems(); track item.label) {
            @if (item.children) {
              <div class="nav-item-group">
                <button class="nav-item submenu-toggle" (click)="toggleMenu(item.label)" [title]="collapsed() ? item.label : ''">
                  <lucide-icon [name]="item.icon" [size]="20" class="nav-icon"></lucide-icon>
                  @if (!collapsed()) {
                    <span class="nav-label">{{ item.label }}</span>
                    <lucide-icon [name]="expandedMenus()[item.label] ? 'chevron-down' : 'chevron-right'" [size]="16" style="margin-left:auto"></lucide-icon>
                  }
                </button>
                @if (expandedMenus()[item.label]) {
                  <div class="nav-submenu">
                    @for (child of item.children; track child.path) {
                      <a class="nav-item submenu-item" [routerLink]="child.path" routerLinkActive="active" [title]="collapsed() ? child.label : ''" [style.justify-content]="collapsed() ? 'center' : 'flex-start'">
                        @if (child.icon) {
                          <lucide-icon [name]="child.icon" [size]="14" class="nav-icon" style="opacity:.7"></lucide-icon>
                        } @else if (collapsed()) {
                          <lucide-icon name="chevron-right" [size]="14" class="nav-icon" style="opacity:.7"></lucide-icon>
                        }
                        @if (!collapsed()) {
                          <span class="nav-label">{{ child.label }}</span>
                        }
                      </a>
                    }
                  </div>
                }
              </div>
            } @else {
              <a class="nav-item" [routerLink]="item.path" routerLinkActive="active"
                 [title]="collapsed() ? item.label : ''">
                <lucide-icon [name]="item.icon" [size]="20" class="nav-icon"></lucide-icon>
                @if (!collapsed()) { <span class="nav-label">{{ item.label }}</span> }
              </a>
            }
          }
        </nav>

        <button class="sidebar-collapse" (click)="collapsed.update(v => !v)" [title]="collapsed() ? 'Expandir' : 'Colapsar'">
          <lucide-icon [name]="collapsed() ? 'chevron-right' : 'chevron-left'" [size]="20"></lucide-icon>
        </button>
      </aside>

      <!-- MAIN -->
      <div class="main-content" [class.collapsed]="collapsed()">

        <!-- HEADER -->
        <header class="app-header">
          <div class="header-left">
            <div class="header-sena">
              <img src="assets/logo-sena-blanco.png" alt="SENA" class="header-sena-logo"
                   onerror="this.style.display='none'">
              <span>SENA Colombia</span>
            </div>
            <span class="header-sub">Sistema de Gestión</span>
          </div>

          <div class="header-right">
            <!-- Bell (only admin) -->
            @if (role() === 'admin') {
            <button class="icon-btn" (click)="toggleNotif()" title="Notificaciones">
              <lucide-icon name="bell" [size]="20"></lucide-icon>
              @if (pendientes() > 0) {
              <span class="notif-badge">{{ pendientes() }}</span>
              }
            </button>
            }

            <!-- Dark mode -->
            <button class="icon-btn" (click)="theme.toggle()" title="Modo oscuro/claro">
              @if (theme.isDark()) {
                <lucide-icon name="sun" [size]="20"></lucide-icon>
              } @else {
                <lucide-icon name="moon" [size]="20"></lucide-icon>
              }
            </button>

            <!-- User menu -->
            <div class="user-menu" (click)="menuOpen.update(v => !v)">
              <div class="avatar">
                @if (user()?.fotoPerfil) {
                  <img [appAuthSrc]="apiOrigin + user()!.fotoPerfil" alt="avatar">
                } @else {
                  {{ initials() }}
                }
              </div>
              @if (true) {
              <div class="user-info">
                <span class="user-name">{{ user()?.nombre }}</span>
                <span class="user-role">{{ roleLabel() }}</span>
              </div>
              }
              <lucide-icon name="chevron-down" [size]="12" class="menu-arrow"></lucide-icon>
            </div>

            <!-- Dropdown -->
            @if (menuOpen()) {
            <div style="position:fixed;inset:0;z-index:98" (click)="menuOpen.set(false)"></div>
            <div class="user-dropdown">
              <div class="dropdown-item" (click)="profileOpen.set(true); menuOpen.set(false)">
                <lucide-icon name="user" [size]="15"></lucide-icon> Ver perfil
              </div>
              <div class="dropdown-item">
                <label style="cursor:pointer;display:flex;align-items:center;gap:8px">
                  <lucide-icon name="image" [size]="15"></lucide-icon> Cambiar foto
                  <input type="file" accept="image/*" style="display:none"
                         (change)="onFotoChange($event)">
                </label>
              </div>
              <div class="dropdown-item" (click)="menuOpen.set(false)">
                <lucide-icon name="key" [size]="15"></lucide-icon> Cambiar contraseña
              </div>
              <div class="dropdown-item" (click)="theme.toggle(); menuOpen.set(false)">
                @if (theme.isDark()) {
                  <lucide-icon name="sun" [size]="15"></lucide-icon> Modo claro
                } @else {
                  <lucide-icon name="moon" [size]="15"></lucide-icon> Modo oscuro
                }
              </div>
              <hr style="margin:4px 0;border-color:var(--border)">
              <div class="dropdown-item danger" (click)="menuOpen.set(false); auth.logout()">
                <lucide-icon name="log-out" [size]="15"></lucide-icon> Cerrar sesión
              </div>
            </div>
            }
          </div>
        </header>

        <!-- CONTENT -->
        <main class="page-body">
          <router-outlet />
        </main>
      </div>

      <!-- Notifications panel -->
      @if (notifOpen()) {
      <div class="notif-overlay" (click)="notifOpen.set(false)">
        <div class="notif-panel" (click)="$event.stopPropagation()">
          <div class="notif-header">
            <h3>
              <lucide-icon name="bell" [size]="16" style="vertical-align:middle;margin-right:6px"></lucide-icon>
              Notificaciones
              @if (pendientes() > 0) {
                <span style="margin-left:8px;background:#ef4444;color:#fff;border-radius:99px;padding:1px 7px;font-size:11px;font-weight:800;">{{ pendientes() }}</span>
              }
            </h3>
            <button (click)="notifOpen.set(false)">
              <lucide-icon name="x" [size]="16"></lucide-icon>
            </button>
          </div>

          <div class="notif-list">
            <!-- ── Sección 1: Solicitudes de cambio ── -->
            <div class="notif-section-label">
              <lucide-icon name="refresh-cw" [size]="11"></lucide-icon> Solicitudes de cambio
            </div>
            @if (solicitudes().length === 0) {
              <div class="notif-empty">Sin solicitudes pendientes</div>
            }
            @for (s of solicitudes(); track s.id) {
            <div class="notif-item">
              <div class="notif-item-header">
                <span class="notif-instructor">
                  <lucide-icon name="user" [size]="13" style="vertical-align:middle;margin-right:4px"></lucide-icon>
                  {{ s.instructor?.nombre }} {{ s.instructor?.apellido }}
                </span>
                <span class="notif-date">{{ formatDate(s.createdAt) }}</span>
              </div>
              <div class="notif-horario">
                <lucide-icon name="calendar" [size]="12" style="vertical-align:middle;margin-right:4px"></lucide-icon>
                {{ capitalize(s.horarioActual?.diaSemana) }} · {{ s.horarioActual?.horaInicio }} — {{ s.horarioActual?.horaFin }}
                · Ficha {{ s.horarioActual?.ficha?.codigo }}
              </div>
              <div class="notif-razon">"{{ s.razon }}"</div>
              <div class="notif-actions">
                <button class="btn-aprobar" (click)="responder(s.id, 'aprobada')">
                  <lucide-icon name="check" [size]="12"></lucide-icon> Aprobar
                </button>
                <button class="btn-rechazar" (click)="responder(s.id, 'rechazada')">
                  <lucide-icon name="x" [size]="12"></lucide-icon> Rechazar
                </button>
              </div>
            </div>
            }

            <!-- ── Sección 2: Alertas del sistema (finalizaciones anticipadas, etc.) ── -->
            @if (alertas().length > 0) {
              <div class="notif-section-label" style="margin-top:4px;">
                <lucide-icon name="alert-triangle" [size]="11"></lucide-icon> Alertas del sistema
              </div>
              @for (a of alertas(); track a.id) {
              <div [class]="'notif-alerta-item' + (a.leida ? ' leida' : '')">
                <div class="notif-item-header">
                  <span style="font-size:12px;font-weight:700;color:#b45309;display:flex;align-items:center;gap:5px;">
                    <lucide-icon name="alert-triangle" [size]="12"></lucide-icon>
                    Finalización anticipada
                  </span>
                  <span class="notif-date">{{ formatDate(a.fecha) }}</span>
                </div>
                <div style="font-size:12px;color:var(--text);margin-top:2px;">
                  {{ a.contenidoJson?.msg }}
                </div>
                @if (a.contenidoJson?.motivo) {
                  <div style="font-size:12px;color:var(--text-muted);font-style:italic;margin-top:2px;">
                    "{{ a.contenidoJson.motivo }}"
                  </div>
                }
                @if (!a.leida) {
                  <button class="btn-leer-alerta" (click)="marcarAlertaLeida(a)">
                    <lucide-icon name="check" [size]="11"></lucide-icon> Marcar como leída
                  </button>
                }
              </div>
              }
            }

            @if (solicitudes().length === 0 && alertas().length === 0) {
              <div class="notif-empty" style="padding:28px 16px;">Sin notificaciones</div>
            }
          </div>
        </div>
      </div>
      }

      <!-- Profile modal -->
      @if (profileOpen()) {
      <div class="modal-overlay" (click)="profileOpen.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Mi Perfil</h3>
            <button class="btn-icon" (click)="profileOpen.set(false)">
              <lucide-icon name="x" [size]="18"></lucide-icon>
            </button>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div class="avatar" style="width:64px;height:64px;font-size:24px;border-radius:12px">
              {{ initials() }}
            </div>
            <p><strong>Nombre:</strong> {{ user()?.nombre }} {{ user()?.apellido }}</p>
            <p><strong>Correo:</strong> {{ user()?.correo }}</p>
            <p><strong>Rol:</strong> {{ roleLabel() }}</p>
            @if (user()?.esLider) {
              <p style="display:flex;align-items:center;gap:6px">
                <strong>Rol especial:</strong>
                <lucide-icon name="star" [size]="14" style="color:#f59e0b"></lucide-icon>
                Instructor Líder
              </p>
            }
          </div>
        </div>
      </div>
      }

      <!-- Backdrop for menus (migrado arriba) -->

      <!-- Global toast notifications -->
      <app-toast></app-toast>
    </div>
  `,
  styles: [`
    .app-layout { display: flex; min-height: 100vh; position: relative; background: var(--bg); }

    /* Sidebar */
    .sidebar {
      width: var(--sidebar-w); min-width: var(--sidebar-w);
      background: var(--navy); display: flex; flex-direction: column;
      position: fixed; left: 0; top: 0; bottom: 0; z-index: 50;
      transition: width .25s, min-width .25s;
    }
    .sidebar.collapsed { width: var(--sidebar-collapsed-w); min-width: var(--sidebar-collapsed-w); }
    .sidebar-top { padding: 20px 16px; border-bottom: 1px solid rgba(255,255,255,.1); }
    .sidebar-logo { display: flex; align-items: center; gap: 10px; }
    .sidebar-logo-icon { color: #fff; flex-shrink: 0; }
    .sidebar-logo-text { color: #fff; font-weight: 800; font-size: 16px; white-space: nowrap; }
    .sidebar-nav { flex: 1; padding: 16px 8px; display: flex; flex-direction: column; gap: 4px; }
    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 8px; color: rgba(255,255,255,.7);
      text-decoration: none; font-size: 14px; font-weight: 500; transition: all .15s;
      white-space: nowrap; overflow: hidden; background: transparent; border: none; cursor: pointer;
      width: 100%; text-align: left; font-family: inherit;
    }
    .nav-item:hover { background: rgba(255,255,255,.1); color: #fff; }
    .nav-item.active { background: rgba(255,255,255,.18); color: #fff; font-weight: 700; }
    .nav-icon { flex-shrink: 0; }
    .nav-submenu {
      display: flex; flex-direction: column; gap: 2px;
      margin-top: 4px; margin-bottom: 4px; border-radius: 8px;
    }
    
    /* Conectores si está extendido */
    .sidebar:not(.collapsed) .nav-submenu {
      margin-left: 22px; padding-left: 6px;
      border-left: 1.5px solid rgba(255,255,255,.1);
    }
    .sidebar:not(.collapsed) .submenu-item {
      position: relative;
    }
    .sidebar:not(.collapsed) .submenu-item::before {
      content: ''; position: absolute; left: -6px; top: 16px;
      width: 10px; height: 1.5px; background: rgba(255,255,255,.1);
    }

    /* Centrado y fondo si está colapsado */
    .sidebar.collapsed .nav-submenu {
      margin-left: 0; align-items: center; background: rgba(0,0,0,.15); padding: 4px 0;
    }
    
    .submenu-item {
      padding: 8px 12px; font-size: 13px; border-radius: 6px;
      color: rgba(255,255,255,.6); display: flex; align-items: center; gap: 8px;
    }
    .submenu-item:hover { color: rgba(255,255,255,.9); background: rgba(255,255,255,.05); }
    .submenu-item.active { color: #fff; font-weight: 600; background: rgba(255,255,255,.1); }
    .sidebar-collapse {
      margin: 8px; padding: 10px; border-radius: 8px;
      background: rgba(255,255,255,.08); color: rgba(255,255,255,.7);
      border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background .15s;
    }
    .sidebar-collapse:hover { background: rgba(255,255,255,.15); }

    /* Header */
    .app-header {
      height: var(--header-h); background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px; position: sticky; top: 0; z-index: 40;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
    }
    .header-left { display: flex; flex-direction: column; gap: 1px; }
    .header-sena {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; font-weight: 700; color: var(--text);
    }
    .header-sena-logo {
      height: 22px; width: auto; object-fit: contain;
      filter: none;
    }
    .header-sub { font-size: 11px; color: var(--text-muted); }
    .header-right { display: flex; align-items: center; gap: 8px; position: relative; }
    .icon-btn {
      width: 36px; height: 36px; border-radius: 8px; border: none;
      background: transparent; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      position: relative; color: var(--text);
    }
    .icon-btn:hover { background: var(--gray-100); }
    .notif-badge {
      position: absolute; top: 2px; right: 2px;
      background: #dc2626; color: #fff; border-radius: 10px;
      font-size: 9px; font-weight: 700; padding: 1px 4px; min-width: 14px; text-align: center;
    }
    .user-menu {
      display: flex; align-items: center; gap: 8px; cursor: pointer;
      padding: 4px 8px; border-radius: 8px; transition: background .15s;
    }
    .user-menu:hover { background: var(--gray-100); }
    .avatar {
      width: 36px; height: 36px; border-radius: 50%; background: var(--navy);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 13px; font-weight: 700; flex-shrink: 0; overflow: hidden;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .user-info { display: flex; flex-direction: column; }
    .user-name { font-size: 13px; font-weight: 700; color: var(--text); }
    .user-role { font-size: 11px; color: var(--text-muted); }
    .menu-arrow { color: var(--text-muted); }
    .user-dropdown {
      position: fixed; top: 60px; right: 12px; z-index: 300;
      background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
      box-shadow: var(--shadow-lg); min-width: 200px; overflow: hidden;
    }
    .dropdown-item {
      padding: 10px 16px; font-size: 13px; cursor: pointer; color: var(--text);
      transition: background .1s; display: flex; align-items: center; gap: 8px;
    }
    .dropdown-item:hover { background: var(--gray-100); }
    .dropdown-item.danger { color: var(--red); }

    /* Main content */
    .main-content {
      flex: 1; margin-left: var(--sidebar-w); transition: margin-left .25s;
      display: flex; flex-direction: column; min-width: 0;
    }
    .main-content.collapsed { margin-left: var(--sidebar-collapsed-w); }
    .page-body { padding: 24px; flex: 1; }

    /* Notif panel */
    .notif-overlay { position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,.2); }
    .notif-panel {
      position: absolute; right: 16px; top: 72px; width: 380px;
      background: var(--surface); border-radius: 12px; border: 1px solid var(--border);
      box-shadow: var(--shadow-lg);
    }
    .notif-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px; border-bottom: 1px solid var(--border);
    }
    .notif-header h3 { font-size: 15px; color: var(--text); display: flex; align-items: center; }
    .notif-header button {
      background: none; border: none; cursor: pointer; color: var(--text-muted);
      display: flex; align-items: center;
    }
    .notif-list { max-height: 420px; overflow-y: auto; }
    .notif-empty { padding: 24px 16px; color: var(--text-muted); font-size: 13px; text-align: center; }
    .notif-item {
      padding: 14px 16px; border-bottom: 1px solid var(--border);
      display: flex; flex-direction: column; gap: 6px;
    }
    .notif-item:last-child { border-bottom: none; }
    .notif-item-header { display: flex; justify-content: space-between; align-items: center; }
    .notif-instructor { font-size: 13px; font-weight: 700; color: var(--text); display: flex; align-items: center; }
    .notif-date { font-size: 11px; color: var(--text-muted); }
    .notif-horario { font-size: 12px; color: var(--blue); display: flex; align-items: center; }
    .notif-razon { font-size: 12px; color: var(--text-muted); font-style: italic; }
    .notif-actions { display: flex; gap: 8px; margin-top: 4px; }
    .btn-aprobar {
      flex: 1; padding: 6px; border: none; border-radius: 6px; font-size: 12px;
      font-weight: 700; cursor: pointer; background: #dcfce7; color: #166534;
      transition: background .15s; display: flex; align-items: center; justify-content: center; gap: 4px;
    }
    .btn-aprobar:hover { background: #bbf7d0; }
    .btn-rechazar {
      flex: 1; padding: 6px; border: none; border-radius: 6px; font-size: 12px;
      font-weight: 700; cursor: pointer; background: #fee2e2; color: #991b1b;
      transition: background .15s; display: flex; align-items: center; justify-content: center; gap: 4px;
    }
    .btn-rechazar:hover { background: #fecaca; }
    .notif-section-label {
      padding: 8px 16px 4px; font-size: 10px; font-weight: 800; letter-spacing: .06em;
      text-transform: uppercase; color: var(--text-muted); background: var(--gray-100);
      border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 5px;
    }
    .notif-alerta-item {
      padding: 12px 16px; border-bottom: 1px solid var(--border);
      display: flex; flex-direction: column; gap: 4px;
      background: #fffbeb;
      transition: background .2s;
    }
    .notif-alerta-item.leida { background: var(--surface); opacity: .7; }
    .notif-alerta-item:last-child { border-bottom: none; }
    .btn-leer-alerta {
      align-self: flex-start; margin-top: 4px; padding: 3px 10px;
      border: 1px solid #d97706; border-radius: 5px; background: none; cursor: pointer;
      font-size: 11px; font-weight: 700; color: #b45309;
      display: flex; align-items: center; gap: 4px; transition: background .15s;
    }
    .btn-leer-alerta:hover { background: #fef3c7; }
  `],
})
export class AppLayoutComponent implements OnDestroy {
  readonly apiOrigin = environment.apiOrigin;
  collapsed = signal(false);
  menuOpen = signal(false);
  notifOpen = signal(false);
  profileOpen = signal(false);
  solicitudes = signal<any[]>([]);
  alertas     = signal<any[]>([]);
  // Badge = solicitudes pendientes + alertas no leídas
  pendientes  = computed(() =>
    this.solicitudes().length + this.alertas().filter((a: any) => !a.leida).length
  );
  private _alertasTimer: any;

  user = computed(() => this.auth.currentUser());
  role = computed(() => this.auth.currentUser()?.rol ?? '');
  initials = computed(() => {
    const u = this.auth.currentUser();
    if (!u) return '?';
    return `${u.nombre[0]}${u.apellido?.[0] ?? ''}`.toUpperCase();
  });
  roleLabel = computed(() => {
    const r = this.role();
    if (r === 'admin') return 'Administrador';
    if (r === 'instructor') return this.user()?.esLider ? 'Instructor Líder' : 'Instructor';
    return 'Aprendiz';
  });

  expandedMenus = signal<Record<string, boolean>>({});
  private _routerSub: Subscription | null = null;

  toggleMenu(label: string) {
    this.expandedMenus.update(m => ({ ...m, [label]: !m[label] }));
  }

  /** Auto-expande el grupo del sidebar cuya ruta hija esté activa */
  private autoExpandForUrl(url: string) {
    const items = this.navItems();
    const toExpand: Record<string, boolean> = {};
    items.forEach(item => {
      if (item.children) {
        const hasActive = item.children.some((c: any) => url.startsWith(c.path));
        if (hasActive) toExpand[item.label] = true;
      }
    });
    if (Object.keys(toExpand).length > 0) {
      this.expandedMenus.update(m => ({ ...m, ...toExpand }));
    }
  }

  navItems = computed(() => {
    const r = this.role();
    if (r === 'admin') return [
      { icon: 'house', label: 'Inicio', path: '/app/admin/dashboard' },
      { 
        icon: 'calendar', label: 'Horarios', children: [
          { label: 'Horarios Instructor', path: '/app/admin/horarios-instructor', icon: 'user' },
          { label: 'Horarios Fichas', path: '/app/admin/horarios-fichas', icon: 'layout-dashboard' },
          { label: 'Horarios Ambientes', path: '/app/admin/horarios-ambientes', icon: 'building-2' },
          { label: 'Programador de Eventos', path: '/app/admin/programador-eventos', icon: 'calendar-plus' },
          { label: 'Programador de Fichas',  path: '/app/admin/programador-fichas',  icon: 'layout-list' },
        ]
      },
      { icon: 'clipboard-list', label: 'Solicitudes', path: '/app/admin/solicitudes' },
      { icon: 'users', label: 'Usuarios', path: '/app/admin/usuarios' },
      { icon: 'settings', label: 'Configuración', path: '/app/admin/configuracion' },
    ];
    if (r === 'instructor') return [
      { icon: 'house', label: 'Inicio', path: '/app/instructor/dashboard' },
      { icon: 'calendar', label: 'Mis Horarios', path: '/app/instructor/mis-horarios' },
      ...(this.user()?.esLider ? [{ icon: 'refresh-cw', label: 'Solicitudes', path: '/app/instructor/solicitudes' }] : []),
    ];
    return [
      { icon: 'house', label: 'Inicio', path: '/app/aprendiz/dashboard' },
      { icon: 'calendar', label: 'Mis Horarios', path: '/app/aprendiz/mis-horarios' },
    ];
  });

  constructor(
    public auth: AuthService,
    public theme: ThemeService,
    private api: ApiService,
    private http: HttpClient,
    private router: Router,
  ) {
    if (this.role() === 'admin') {
      this.loadPendientes();
      // Refresca alertas automáticamente cada 30s para admin
      this._alertasTimer = setInterval(() => this.loadAlertas(), 30_000);
    }
    // Auto-expandir submenu activo en la carga inicial
    this.autoExpandForUrl(this.router.url);
    // Auto-expandir en cada navegación
    this._routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
    ).subscribe(e => this.autoExpandForUrl((e as NavigationEnd).urlAfterRedirects));
  }

  ngOnDestroy() {
    if (this._alertasTimer) clearInterval(this._alertasTimer);
    this._routerSub?.unsubscribe();
  }

  /** Carga solicitudes de cambio pendientes */
  loadSolicitudes() {
    this.api.getSolicitudes().subscribe((list: any[]) => {
      this.solicitudes.set(list.filter((s: any) => s.estado === 'pendiente'));
    });
  }

  /** Carga notificaciones de sistema para admin (finalizaciones anticipadas, etc.)
   *  Las notificaciones broadcast usan destinatarioId=0 en DB, por eso pasamos 0.
   *  El backend devuelve las del adminId actual Y las de destinatarioId=0. */
  loadAlertas() {
    if (this.role() !== 'admin') return;
    const uid = this.user()?.id ?? 0;
    this.api.getNotificaciones(uid, 'admin').subscribe({
      next: (list: any[]) => {
        this.alertas.set(
          (list ?? [])
            .filter((n: any) => n.tipo === 'finalizacion_horario')
            .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
        );
      },
      error: () => { /* silencioso — no bloquea la UI */ },
    });
  }

  /** Carga todo de una vez */
  loadPendientes() {
    this.loadSolicitudes();
    this.loadAlertas();
  }

  toggleNotif() {
    const opening = !this.notifOpen();
    this.notifOpen.set(opening);
    if (opening) this.loadPendientes();
  }

  responder(id: number, estado: string) {
    this.api.responderSolicitud(id, estado).subscribe(() => {
      this.loadSolicitudes();
    });
  }

  marcarAlertaLeida(a: any) {
    this.api.marcarNotificacionLeida(a.id).subscribe(() => {
      this.alertas.update((list: any[]) => list.map(n => n.id === a.id ? { ...n, leida: true } : n));
    });
  }

  formatDate(d: string) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  }

  capitalize(s?: string) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  onFotoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadFoto(file).subscribe({
      next: (res) => {
        const url = res.url;
        const u = this.user()!;
        const endpoint = u.rol === 'admin'
          ? `${environment.apiUrl}/administradores/${u.id}`
          : u.rol === 'instructor'
          ? `${environment.apiUrl}/instructores/${u.id}`
          : `${environment.apiUrl}/aprendices/${u.id}`;
        this.http.put(endpoint, { fotoPerfil: url }).subscribe();
        this.auth.updateCurrentUser({ fotoPerfil: url });
      },
    });
  }
}
