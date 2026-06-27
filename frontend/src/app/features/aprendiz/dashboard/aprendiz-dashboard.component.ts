import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { LucideAngularModule } from 'lucide-angular';
import { DonutChartComponent, DonutSegment } from '../../../shared/components/donut-chart.component';
import { BarChartComponent, BarItem } from '../../../shared/components/bar-chart.component';
import { DIAS_LABELS } from '../../../core/models/user.model';

@Component({
  selector: 'app-aprendiz-dashboard',
  imports: [
    RouterLink,
    LucideAngularModule,
    DonutChartComponent,
    BarChartComponent,
  ],
  template: `
    <div class="welcome-banner">
      <div class="banner-text">
        <h2>¡Bienvenido, {{ user()?.nombre }}!</h2>
        <p>Panel de Aprendiz — ChronoGest SENA</p>
      </div>
      <lucide-icon name="graduation-cap" [size]="48" class="banner-icon"></lucide-icon>
    </div>

    <div class="grid-4 mt-6">
      <div class="stat-card">
        <div class="stat-icon" style="background:#dbeafe;color:#1d4ed8">
          <lucide-icon name="graduation-cap" [size]="24"></lucide-icon>
        </div>
        <div><div class="stat-value">{{ stats().instructores }}</div>
             <div class="stat-label">Instructores</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#dcfce7;color:#166534">
          <lucide-icon name="building-2" [size]="24"></lucide-icon>
        </div>
        <div><div class="stat-value">{{ stats().ambientes }}</div>
             <div class="stat-label">Ambientes</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fef9c3;color:#92400e">
          <lucide-icon name="clock" [size]="24"></lucide-icon>
        </div>
        <div><div class="stat-value">{{ stats().horas }}h</div>
             <div class="stat-label">Horas Semanales</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#fce7f3;color:#9d174d">
          <lucide-icon name="calendar" [size]="24"></lucide-icon>
        </div>
        <div><div class="stat-value">{{ stats().dias }}</div>
             <div class="stat-label">Días con Clase</div></div>
      </div>
    </div>

    <!-- ESTADÍSTICAS -->
    <div class="section-title mt-6">
      <lucide-icon name="trending-up" [size]="16"></lucide-icon>
      <span>Resumen de tu Horario</span>
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

    <div class="mt-6" style="max-width:320px">
      <a class="quick-card" routerLink="/app/aprendiz/mis-horarios">
        <div class="quick-icon"><lucide-icon name="calendar" [size]="28"></lucide-icon></div>
        <div><h4>Mis Horarios</h4><p>Ver el horario de tu ficha asignada</p></div>
        <span class="quick-link">Ver →</span>
      </a>
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
    .quick-link { font-size: 13px; color: var(--blue); font-weight: 600; }
    @media (max-width: 900px) { .grid-4 { grid-template-columns: 1fr 1fr; } .charts-grid { grid-template-columns: 1fr; } }
  `],
})
export class AprendizDashboardComponent implements OnInit {
  stats = signal({ instructores: 0, ambientes: 0, horas: 0, dias: 0 });
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
    const fichaId = this.auth.currentUser()?.fichaId;
    if (!fichaId) return;
    this.api.getHorariosByFicha(fichaId).subscribe(horarios => {
      this.horariosData.set(horarios);
      const instructoresSet = new Set(horarios.map((h: any) => h.instructorId));
      const ambientesSet = new Set(horarios.map((h: any) => h.ambienteId));
      const diasSet = new Set(horarios.map((h: any) => h.diaSemana));
      let horas = 0;
      horarios.forEach((h: any) => {
        if (h.horaInicio && h.horaFin) {
          const [sh, sm] = h.horaInicio.split(':').map(Number);
          const [eh, em] = h.horaFin.split(':').map(Number);
          horas += (eh * 60 + em - sh * 60 - sm) / 60;
        }
      });
      this.stats.set({
        instructores: instructoresSet.size,
        ambientes: ambientesSet.size,
        horas: Math.round(horas),
        dias: diasSet.size,
      });
    });
  }
}
