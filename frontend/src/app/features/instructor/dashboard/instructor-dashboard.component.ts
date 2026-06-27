import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { LucideAngularModule } from 'lucide-angular';
import { DonutChartComponent, DonutSegment } from '../../../shared/components/donut-chart.component';
import { BarChartComponent, BarItem } from '../../../shared/components/bar-chart.component';
import { DIAS_LABELS } from '../../../core/models/user.model';

@Component({
  selector: 'app-instructor-dashboard',
  imports: [
    RouterLink,
    LucideAngularModule,
    DonutChartComponent,
    BarChartComponent,
  ],
  template: `
    <!-- Welcome Banner -->
    <div class="welcome-banner">
      <div class="banner-text">
        <h2>¡Bienvenido, {{ user()?.nombre }}!</h2>
        <p>Panel de Instructor — ChronoGest SENA</p>
        @if (user()?.esLider) {
        <span class="leader-badge">
          <lucide-icon name="star" [size]="12"></lucide-icon>
          Instructor Líder
        </span>
        }
      </div>
      <lucide-icon name="book-open" [size]="48" class="banner-icon"></lucide-icon>
    </div>

    <!-- Stats -->
    <div class="grid-3 mt-6">
      <div class="stat-card">
        <div class="stat-icon" style="background:#dbeafe;color:#1d4ed8">
          <lucide-icon name="layout-dashboard" [size]="24"></lucide-icon>
        </div>
        <div>
          <div class="stat-value">{{ stats().fichas }}</div>
          <div class="stat-label">Fichas Asignadas</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#dcfce7;color:#166534">
          <lucide-icon name="clock" [size]="24"></lucide-icon>
        </div>
        <div>
          <div class="stat-value">{{ stats().horas }}h</div>
          <div class="stat-label">Horas Semanales</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fef9c3;color:#92400e">
          <lucide-icon name="book-open" [size]="24"></lucide-icon>
        </div>
        <div>
          <div class="stat-value">{{ stats().competencias }}</div>
          <div class="stat-label">Competencias Asignadas</div>
        </div>
      </div>
    </div>

    <!-- ESTADÍSTICAS -->
    <div class="section-title mt-6">
      <lucide-icon name="trending-up" [size]="16"></lucide-icon>
      <span>Tu Actividad Semanal</span>
    </div>
    <div class="charts-grid mt-3">
      <div class="chart-card">
        <h4>Horas por Jornada</h4>
        <app-donut-chart [data]="jornadaSegments()"></app-donut-chart>
      </div>
      <div class="chart-card">
        <h4>Clases por Día de la Semana</h4>
        <app-bar-chart [data]="diaItems()"></app-bar-chart>
      </div>
    </div>

    <!-- Quick access -->
    <div class="grid-2 mt-6" style="max-width:640px">
      <a class="quick-card" routerLink="/app/instructor/mis-horarios">
        <div class="quick-icon"><lucide-icon name="calendar" [size]="28"></lucide-icon></div>
        <div>
          <h4>Mis Horarios</h4>
          <p>Ver y gestionar tu horario semanal</p>
        </div>
        <span class="quick-link">Ver →</span>
      </a>
      @if (user()?.esLider) {
      <a class="quick-card" routerLink="/app/instructor/solicitudes">
        <div class="quick-icon"><lucide-icon name="refresh-cw" [size]="28"></lucide-icon></div>
        <div>
          <h4>Solicitar Cambio</h4>
          <p>Proponer cambios de horario al administrador</p>
        </div>
        <span class="quick-link">Ver →</span>
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
    .banner-text h2 { font-size: 1.5rem; margin-bottom: 6px; }
    .banner-text p { color: rgba(255,255,255,.75); font-size: 14px; }
    .banner-icon { opacity: .5; color: #fff; }
    .leader-badge {
      display: inline-flex; align-items: center; gap: 5px;
      background: rgba(255,255,255,.2); border-radius: 20px;
      padding: 3px 12px; font-size: 12px; font-weight: 700; margin-top: 8px;
    }
    .section-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--text); }
    .charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .chart-card {
      background: var(--surface); border-radius: 12px; padding: 20px 22px;
      border: 1px solid var(--border); box-shadow: var(--shadow);
    }
    .chart-card h4 { font-size: 13px; color: var(--text-muted); font-weight: 700; margin-bottom: 14px; text-transform: uppercase; letter-spacing: .03em; }
    .quick-card {
      background: var(--surface); border-radius: 12px; padding: 24px;
      border: 1px solid var(--border); box-shadow: var(--shadow);
      display: flex; flex-direction: column; gap: 10px; text-decoration: none; transition: all .2s;
    }
    .quick-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
    .quick-icon { color: var(--navy); }
    .quick-card h4 { font-size: 15px; color: var(--text); margin-bottom: 4px; text-transform: none; letter-spacing: 0; }
    .quick-card p { font-size: 13px; color: var(--text-muted); }
    .quick-link { font-size: 13px; color: var(--blue); font-weight: 600; margin-top: auto; }
    @media (max-width: 900px) { .charts-grid { grid-template-columns: 1fr; } }
  `],
})
export class InstructorDashboardComponent implements OnInit {
  stats = signal({ fichas: 0, horas: 0, competencias: 0 });
  private horariosData = signal<any[]>([]);

  readonly LABELS = DIAS_LABELS;

  get user() { return this.auth.currentUser; }

  jornadaSegments = computed<DonutSegment[]>(() => {
    const conteo: Record<string, number> = { manana: 0, tarde: 0, noche: 0 };
    this.horariosData().forEach((h: any) => {
      if (!h.jornada || !h.horaInicio || !h.horaFin) return;
      const [sh, sm] = h.horaInicio.split(':').map(Number);
      const [eh, em] = h.horaFin.split(':').map(Number);
      const horas = (eh * 60 + em - sh * 60 - sm) / 60;
      conteo[h.jornada] = (conteo[h.jornada] ?? 0) + horas;
    });
    return [
      { label: 'Mañana', value: Math.round(conteo['manana']), color: '#1d4ed8' },
      { label: 'Tarde', value: Math.round(conteo['tarde']), color: '#f59e0b' },
      { label: 'Noche', value: Math.round(conteo['noche']), color: '#1e293b' },
    ].filter(s => s.value > 0);
  });

  diaItems = computed<BarItem[]>(() => {
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const conteo: Record<string, number> = {};
    dias.forEach(d => conteo[d] = 0);
    this.horariosData().forEach((h: any) => { if (h.diaSemana && conteo[h.diaSemana] !== undefined) conteo[h.diaSemana]++; });
    return dias.map(d => ({ label: this.LABELS[d], value: conteo[d], color: 'var(--navy)' }));
  });

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit() {
    const userId = this.user()?.id;
    if (!userId) return;
    this.api.getHorariosByInstructor(userId).subscribe(horarios => {
      this.horariosData.set(horarios);
      const fichasSet = new Set(horarios.map((h: any) => h.fichaId));
      let horas = 0;
      let competencias = 0;
      horarios.forEach((h: any) => {
        if (h.horaInicio && h.horaFin) {
          const [sh, sm] = h.horaInicio.split(':').map(Number);
          const [eh, em] = h.horaFin.split(':').map(Number);
          horas += (eh * 60 + em - sh * 60 - sm) / 60;
        }
        competencias += h.competencias?.length ?? 0;
      });
      this.stats.set({
        fichas: fichasSet.size,
        horas: Math.round(horas),
        competencias,
      });
    });
  }
}
