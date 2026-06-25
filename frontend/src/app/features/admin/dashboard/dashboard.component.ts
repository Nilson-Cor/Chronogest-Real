import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, LucideAngularModule],
  template: `
    <!-- WELCOME BANNER -->
    <div class="welcome-banner">
      <div class="banner-text">
        <h2>¡Bienvenido, {{ user()?.nombre }}!</h2>
        <p>Panel de Administrador — ChronoGest SENA</p>
      </div>
      <lucide-icon name="settings" [size]="52" class="banner-icon"></lucide-icon>
    </div>

    <!-- STATS -->
    <div class="grid-4 mt-6">
      <div class="stat-card">
        <div class="stat-icon" style="background:#dbeafe;color:#1d4ed8">
          <lucide-icon name="calendar" [size]="24"></lucide-icon>
        </div>
        <div>
          <div class="stat-value">{{ stats().horarios }}</div>
          <div class="stat-label">Horarios</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#dcfce7;color:#166534">
          <lucide-icon name="building-2" [size]="24"></lucide-icon>
        </div>
        <div>
          <div class="stat-value">{{ stats().ambientes }}</div>
          <div class="stat-label">Ambientes</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fef9c3;color:#92400e">
          <lucide-icon name="layout-dashboard" [size]="24"></lucide-icon>
        </div>
        <div>
          <div class="stat-value">{{ stats().fichas }}</div>
          <div class="stat-label">Fichas Activas</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fce7f3;color:#9d174d">
          <lucide-icon name="graduation-cap" [size]="24"></lucide-icon>
        </div>
        <div>
          <div class="stat-value">{{ stats().instructores }}</div>
          <div class="stat-label">Instructores</div>
        </div>
      </div>
    </div>

    <!-- CARD de Solicitudes (Acceso rápido con indicador de pendientes) -->
    <a class="solicitudes-card mt-6" routerLink="/app/admin/solicitudes">
      <div class="sol-card-left">
        <div class="sol-icon-wrap">
          <lucide-icon name="clipboard-list" [size]="28" style="color:#fff"></lucide-icon>
        </div>
        <div>
          <div class="sol-card-title">Solicitudes de Cambio de Horario</div>
          <div class="sol-card-sub">
            Revisa y aprueba las solicitudes enviadas por los instructores líderes.
          </div>
        </div>
      </div>
      <div class="sol-card-right">
        @if (solicitudesPendientes() > 0) {
          <div class="pendientes-badge">
            <span class="pendientes-count">{{ solicitudesPendientes() }}</span>
            <span class="pendientes-label">pendiente{{ solicitudesPendientes() !== 1 ? 's' : '' }}</span>
          </div>
        } @else {
          <div class="sin-pendientes">
            <lucide-icon name="check-circle" [size]="20"></lucide-icon>
            Al día
          </div>
        }
        <lucide-icon name="arrow-right" [size]="20" style="color:rgba(255,255,255,.7)"></lucide-icon>
      </div>
    </a>

    <!-- QUICK ACCESS -->
    <div class="grid-3 mt-6 cards-grid">
      @for (card of quickCards; track card.title) {
      <a class="quick-card" [routerLink]="card.path">
        <div class="quick-icon">
          <lucide-icon [name]="card.icon" [size]="28"></lucide-icon>
        </div>
        <div>
          <h4>{{ card.title }}</h4>
          <p>{{ card.desc }}</p>
        </div>
        <span class="quick-link">Ir al módulo →</span>
      </a>
      }
    </div>
  `,
  styles: [`
    .welcome-banner {
      background: linear-gradient(135deg, var(--navy) 0%, #2a4d7a 100%);
      border-radius: 16px; padding: 32px; color: #fff;
      display: flex; align-items: center; justify-content: space-between;
    }
    .banner-text h2 { font-size: 1.6rem; margin-bottom: 6px; }
    .banner-text p { color: rgba(255,255,255,.75); font-size: 14px; }
    .banner-icon { opacity: .5; color: #fff; }

    /* Card Solicitudes */
    .solicitudes-card {
      display: flex; align-items: center; justify-content: space-between;
      background: #1d4ed8;
      border-radius: 14px; padding: 20px 24px; color: #fff;
      text-decoration: none; transition: all .2s; gap: 16px;
      box-shadow: 0 4px 20px rgba(29, 78, 216, .3);
    }
    .solicitudes-card:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(29, 78, 216, .4); }
    .sol-card-left { display: flex; align-items: center; gap: 16px; flex: 1; }
    .sol-icon-wrap { background: rgba(255,255,255,.2); border-radius: 12px; padding: 12px; flex-shrink: 0; }
    .sol-card-title { font-size: 16px; font-weight: 800; }
    .sol-card-sub { font-size: 13px; color: rgba(255,255,255,.75); margin-top: 3px; }
    .sol-card-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .pendientes-badge { display: flex; flex-direction: column; align-items: center; background: #f59e0b; border-radius: 10px; padding: 6px 14px; }
    .pendientes-count { font-size: 22px; font-weight: 900; color: #fff; line-height: 1; }
    .pendientes-label { font-size: 10px; color: rgba(255,255,255,.85); font-weight: 700; text-transform: uppercase; }
    .sin-pendientes { display: flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,.8); }

    /* Quick cards */
    .quick-card {
      background: var(--surface); border-radius: 12px; padding: 24px;
      border: 1px solid var(--border); box-shadow: var(--shadow);
      display: flex; flex-direction: column; gap: 10px; text-decoration: none;
      transition: all .2s; cursor: pointer;
    }
    .quick-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
    .quick-icon { color: var(--navy); }
    .quick-card h4 { font-size: 15px; color: var(--text); margin-bottom: 4px; }
    .quick-card p { font-size: 13px; color: var(--text-muted); }
    .quick-link { font-size: 13px; color: var(--blue); font-weight: 600; margin-top: auto; }
    @media (max-width: 900px) {
      .grid-4 { grid-template-columns: 1fr 1fr; }
      .cards-grid { grid-template-columns: 1fr; }
      .solicitudes-card { flex-direction: column; align-items: flex-start; }
    }
    .cards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  `],
})
export class AdminDashboardComponent implements OnInit {
  stats = signal({ horarios: 0, ambientes: 0, fichas: 0, instructores: 0 });
  solicitudesPendientes = signal(0);

  get user() { return this.auth.currentUser; }

  quickCards = [
    { icon: 'user', title: 'Horarios Instructor', desc: 'Gestiona los horarios específicos de cada instructor.', path: '/app/admin/horarios-instructor' },
    { icon: 'layout-dashboard', title: 'Horarios Fichas', desc: 'Consulta y gestiona los horarios asignados a las fichas.', path: '/app/admin/horarios-fichas' },
    { icon: 'building-2', title: 'Horarios Ambientes', desc: 'Administra y verifica la ocupación de ambientes.', path: '/app/admin/horarios-ambientes' },
    { icon: 'calendar-plus', title: 'Programador Eventos', desc: 'Programa creación rápida de eventos en matriz.', path: '/app/admin/programador-eventos' },
    { icon: 'layout-list', title: 'Programador de Fichas', desc: 'Seguimiento de competencias e intensidad horaria por ficha.', path: '/app/admin/programador-fichas' },
    { icon: 'users', title: 'Usuarios', desc: 'Administra los usuarios del sistema.', path: '/app/admin/usuarios' },
  ];

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit() {
    forkJoin({
      horarios: this.api.getHorariosStats(),
      ambientes: this.api.getAmbientes(),
      fichas: this.api.getFichas(),
      instructores: this.api.getInstructoresStats(),
      solicitudes: this.api.getSolicitudes(),
    }).subscribe({
      next: (res: any) => {
        this.stats.set({
          horarios: res.horarios?.total ?? 0,
          ambientes: Array.isArray(res.ambientes) ? res.ambientes.length : 0,
          fichas: Array.isArray(res.fichas) ? res.fichas.filter((f: any) => ['activo', 'activa'].includes(f.estado)).length : 0,
          instructores: res.instructores?.total ?? 0,
        });
        const pendientes = Array.isArray(res.solicitudes)
          ? res.solicitudes.filter((s: any) => s.estado === 'pendiente').length
          : 0;
        this.solicitudesPendientes.set(pendientes);
      },
    });
  }
}
