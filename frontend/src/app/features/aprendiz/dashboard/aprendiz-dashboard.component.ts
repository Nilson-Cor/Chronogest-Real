import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-aprendiz-dashboard',
  imports: [
    RouterLink,
    LucideAngularModule,
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
    .quick-card {
      background: var(--surface); border-radius: 12px; padding: 24px;
      border: 1px solid var(--border); box-shadow: var(--shadow);
      display: flex; flex-direction: column; gap: 10px; text-decoration: none; transition: all .2s;
    }
    .quick-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
    .quick-icon { color: var(--navy); }
    .quick-card h4 { font-size: 15px; color: var(--text); margin-bottom: 4px; }
    .quick-card p { font-size: 13px; color: var(--text-muted); }
    .quick-link { font-size: 13px; color: var(--blue); font-weight: 600; }
    @media (max-width: 900px) { .grid-4 { grid-template-columns: 1fr 1fr; } }
  `],
})
export class AprendizDashboardComponent implements OnInit {
  stats = signal({ instructores: 0, ambientes: 0, horas: 0, dias: 0 });
  get user() { return this.auth.currentUser; }

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit() {
    const fichaId = this.auth.currentUser()?.fichaId;
    if (!fichaId) return;
    this.api.getHorariosByFicha(fichaId).subscribe(horarios => {
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
