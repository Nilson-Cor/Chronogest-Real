import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { DonutChartComponent, DonutSegment } from '../../../shared/components/donut-chart.component';
import { BarChartComponent, BarItem } from '../../../shared/components/bar-chart.component';
import { DIAS_LABELS } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, LucideAngularModule, DonutChartComponent, BarChartComponent],
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

    <!-- ESTADÍSTICAS GENERALES DEL SISTEMA -->
    <div class="section-title mt-6">
      <lucide-icon name="trending-up" [size]="16"></lucide-icon>
      <span>Estadísticas Generales del Sistema</span>
    </div>
    <div class="charts-grid mt-3">
      <div class="chart-card">
        <h4>Horarios por Jornada</h4>
        <app-donut-chart [data]="jornadaSegments()"></app-donut-chart>
      </div>
      <div class="chart-card">
        <h4>Clases por Día de la Semana</h4>
        <app-bar-chart [data]="diaItems()"></app-bar-chart>
      </div>
      <div class="chart-card">
        <h4>Solicitudes de Cambio por Estado</h4>
        <app-donut-chart [data]="solicitudesSegments()"></app-donut-chart>
      </div>
      <div class="chart-card">
        <h4>Ambientes por Área</h4>
        <app-bar-chart [data]="areaItems()"></app-bar-chart>
      </div>
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

    /* Estadísticas */
    .section-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--text); }
    .charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .chart-card {
      background: var(--surface); border-radius: 12px; padding: 20px 22px;
      border: 1px solid var(--border); box-shadow: var(--shadow);
    }
    .chart-card h4 { font-size: 13px; color: var(--text-muted); font-weight: 700; margin-bottom: 14px; text-transform: uppercase; letter-spacing: .03em; }

    @media (max-width: 900px) {
      .grid-4 { grid-template-columns: 1fr 1fr; }
      .charts-grid { grid-template-columns: 1fr; }
      .solicitudes-card { flex-direction: column; align-items: flex-start; }
    }
  `],
})
export class AdminDashboardComponent implements OnInit {
  stats = signal({ horarios: 0, ambientes: 0, fichas: 0, instructores: 0 });
  solicitudesPendientes = signal(0);

  private horariosData = signal<any[]>([]);
  private solicitudesData = signal<any[]>([]);
  private ambientesData = signal<any[]>([]);

  readonly LABELS = DIAS_LABELS;

  get user() { return this.auth.currentUser; }

  jornadaSegments = computed<DonutSegment[]>(() => {
    const conteo: Record<string, number> = { manana: 0, tarde: 0, noche: 0 };
    this.horariosData().forEach((h: any) => { if (h.jornada && conteo[h.jornada] !== undefined) conteo[h.jornada]++; });
    return [
      { label: 'Mañana', value: conteo['manana'], color: '#1d4ed8' },
      { label: 'Tarde', value: conteo['tarde'], color: '#f59e0b' },
      { label: 'Noche', value: conteo['noche'], color: '#1e293b' },
    ].filter(s => s.value > 0);
  });

  diaItems = computed<BarItem[]>(() => {
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const conteo: Record<string, number> = {};
    dias.forEach(d => conteo[d] = 0);
    this.horariosData().forEach((h: any) => { if (h.diaSemana && conteo[h.diaSemana] !== undefined) conteo[h.diaSemana]++; });
    return dias.map(d => ({ label: this.LABELS[d], value: conteo[d], color: 'var(--navy)' }));
  });

  solicitudesSegments = computed<DonutSegment[]>(() => {
    const conteo: Record<string, number> = { pendiente: 0, aprobado: 0, rechazado: 0, cancelada: 0 };
    this.solicitudesData().forEach((s: any) => {
      const e = s.estado === 'aprobada' ? 'aprobado' : s.estado === 'rechazada' ? 'rechazado' : s.estado;
      if (conteo[e] !== undefined) conteo[e]++;
    });
    return [
      { label: 'Pendientes', value: conteo['pendiente'], color: '#f59e0b' },
      { label: 'Aprobadas', value: conteo['aprobado'], color: '#16a34a' },
      { label: 'Rechazadas', value: conteo['rechazado'], color: '#dc2626' },
      { label: 'Canceladas', value: conteo['cancelada'], color: '#94a3b8' },
    ].filter(s => s.value > 0);
  });

  areaItems = computed<BarItem[]>(() => {
    const conteo = new Map<string, number>();
    this.ambientesData().forEach((a: any) => {
      const area = a.area_nombre || a.area?.nombre || 'Sin área';
      conteo.set(area, (conteo.get(area) ?? 0) + 1);
    });
    return [...conteo.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value, color: 'var(--blue)' }));
  });

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit() {
    forkJoin({
      horarios: this.api.getHorarios(),
      horariosStats: this.api.getHorariosStats(),
      ambientes: this.api.getAmbientes(),
      fichas: this.api.getFichas(),
      instructores: this.api.getInstructoresStats(),
      solicitudes: this.api.getSolicitudes(),
    }).subscribe({
      next: (res: any) => {
        this.stats.set({
          horarios: res.horariosStats?.total ?? 0,
          ambientes: Array.isArray(res.ambientes) ? res.ambientes.length : 0,
          fichas: Array.isArray(res.fichas) ? res.fichas.filter((f: any) => ['activo', 'activa'].includes(f.estado)).length : 0,
          instructores: res.instructores?.total ?? 0,
        });
        const pendientes = Array.isArray(res.solicitudes)
          ? res.solicitudes.filter((s: any) => s.estado === 'pendiente').length
          : 0;
        this.solicitudesPendientes.set(pendientes);

        this.horariosData.set(Array.isArray(res.horarios) ? res.horarios : []);
        this.solicitudesData.set(Array.isArray(res.solicitudes) ? res.solicitudes : []);
        this.ambientesData.set(Array.isArray(res.ambientes) ? res.ambientes : []);
      },
    });
  }
}
