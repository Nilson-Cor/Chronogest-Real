import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-landing',
  imports: [
    RouterLink,
    LucideAngularModule,
  ],
  template: `
    <!-- NAVBAR -->
    <nav class="landing-nav">
      <div class="nav-logo">
        <lucide-icon name="calendar" [size]="22" class="logo-icon"></lucide-icon>
        <span class="logo-text">ChronoGest</span>
      </div>
      <div class="nav-actions">
        <a routerLink="/login" class="btn-login">Iniciar sesión</a>
      </div>
    </nav>

    <!-- HERO -->
    <section class="hero">
      <div class="hero-content">
        <!-- SENA logo centrado entre el badge y el título -->
        <div class="sena-badge">
          <img src="assets/logo-sena-blanco.png" alt="SENA" class="sena-badge-logo"
               onerror="this.style.display='none'">
          <span>Servicio Nacional de Aprendizaje — SENA</span>
        </div>

        <img src="assets/logo-sena-blanco.png" alt="SENA" class="sena-logo"
             onerror="this.style.display='none'">

        <h1>Gestión Eficiente<br>de Horarios</h1>
        <p class="hero-sub">
          Sistema centralizado para la planificación, asignación y seguimiento
          de horarios académicos del SENA. Coordina instructores, fichas y ambientes en tiempo real.
        </p>
        <div class="hero-actions">
          <a routerLink="/login" class="btn-hero-primary">
            <lucide-icon name="lock" [size]="18"></lucide-icon>
            Ingresar a la Plataforma
          </a>
          <button class="btn-hero-secondary" (click)="scrollToFeatures()">
            <lucide-icon name="sparkles" [size]="18"></lucide-icon>
            Conoce más
          </button>
        </div>
      </div>
    </section>

    <!-- FUNCIONALIDADES -->
    <section class="features" id="features">
      <div class="features-inner">
        <div class="features-header">
          <h2>Funcionalidades Clave</h2>
          <p>Todo lo que necesitas para gestionar los horarios del SENA de forma eficiente</p>
        </div>
        <div class="features-grid">
          @for (f of features; track f.title) {
          <div class="feature-card">
            <div class="feature-icon">
              <lucide-icon [name]="f.icon" [size]="40"></lucide-icon>
            </div>
            <h3>{{ f.title }}</h3>
            <p>{{ f.desc }}</p>
          </div>
          }
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="landing-footer">
      <div class="footer-inner">
        <div class="footer-left">
          <div class="footer-logo">
            <lucide-icon name="calendar" [size]="18"></lucide-icon>
            <span>ChronoGest v2.1-V</span>
          </div>
          <p>Servicio Nacional de Aprendizaje — SENA Colombia</p>
        </div>
        <div class="footer-right">
          <p>© {{ year }} SENA. Todos los derechos reservados.</p>
          <p class="footer-sub">Uso exclusivamente institucional</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    :host { display: block; }

    /* Navbar */
    .landing-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 40px; height: 64px;
      background: rgba(30,58,95,.95); backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(255,255,255,.1);
    }
    .nav-logo { display: flex; align-items: center; gap: 10px; color: #fff; }
    .logo-icon { color: #fff; }
    .logo-text { color: #fff; font-weight: 800; font-size: 18px; letter-spacing: -.3px; }
    .btn-login {
      padding: 8px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;
      background: rgba(255,255,255,.15); color: #fff; border: 1.5px solid rgba(255,255,255,.3);
      cursor: pointer; text-decoration: none; transition: all .15s;
    }
    .btn-login:hover { background: rgba(255,255,255,.25); }

    /* Hero */
    .hero {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f2340 0%, #1e3a5f 40%, #2a4d7a 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 80px 24px 40px;
    }
    .hero-content {
      text-align: center; max-width: 680px;
      display: flex; flex-direction: column; align-items: center; gap: 20px;
    }
    .sena-badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2);
      border-radius: 20px; padding: 6px 16px; color: rgba(255,255,255,.85); font-size: 13px;
    }
    .sena-badge-logo {
      height: 20px; width: auto; object-fit: contain;
      filter: brightness(0) invert(1);
    }
    .sena-logo {
      width: 90px; height: 90px; object-fit: contain;
      filter: brightness(0) invert(1);
    }
    .hero h1 {
      color: #fff; font-size: clamp(2rem, 5vw, 3.2rem);
      line-height: 1.15; font-weight: 900; letter-spacing: -.5px;
    }
    .hero-sub {
      color: rgba(255,255,255,.75); font-size: 16px;
      line-height: 1.6; max-width: 520px;
    }
    .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
    .btn-hero-primary {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 13px 28px; border-radius: 10px; font-size: 15px; font-weight: 700;
      background: #fff; color: #1e3a5f; border: none; cursor: pointer;
      text-decoration: none; transition: all .15s; box-shadow: 0 4px 16px rgba(0,0,0,.2);
    }
    .btn-hero-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.3); }
    .btn-hero-secondary {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 13px 28px; border-radius: 10px; font-size: 15px; font-weight: 700;
      background: rgba(255,255,255,.15); color: #fff;
      border: 1.5px solid rgba(255,255,255,.4); cursor: pointer; transition: all .15s;
    }
    .btn-hero-secondary:hover { background: rgba(255,255,255,.25); }

    /* Features */
    .features { background: #f3f4f6; padding: 80px 24px; }
    .features-inner { max-width: 1100px; margin: 0 auto; }
    .features-header { text-align: center; margin-bottom: 48px; }
    .features-header h2 { font-size: 2rem; color: #1e3a5f; margin-bottom: 8px; }
    .features-header p { color: #6b7280; font-size: 16px; }
    .features-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px;
    }
    .feature-card {
      background: #fff; border-radius: 16px; padding: 32px 24px; text-align: center;
      box-shadow: 0 2px 12px rgba(0,0,0,.06); border: 1px solid #e5e7eb;
      transition: all .2s;
    }
    .feature-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,.12); }
    .feature-icon {
      display: flex; justify-content: center; align-items: center;
      margin-bottom: 16px; color: #1e3a5f;
    }
    .feature-card h3 { font-size: 16px; color: #1e3a5f; margin-bottom: 8px; }
    .feature-card p { font-size: 13px; color: #6b7280; line-height: 1.6; }

    /* Footer */
    .landing-footer { background: #1e3a5f; padding: 32px 40px; }
    .footer-inner {
      max-width: 1100px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
    }
    .footer-logo {
      display: flex; align-items: center; gap: 8px;
      color: #fff; font-weight: 700; margin-bottom: 4px;
    }
    .footer-left p { color: rgba(255,255,255,.6); font-size: 13px; }
    .footer-right { text-align: right; }
    .footer-right p { color: rgba(255,255,255,.6); font-size: 13px; }
    .footer-sub { font-size: 11px !important; margin-top: 4px; }

    @media (max-width: 600px) {
      .landing-nav { padding: 0 16px; }
      .footer-inner { flex-direction: column; text-align: center; }
      .footer-right { text-align: center; }
    }
  `],
})
export class LandingComponent {
  year = new Date().getFullYear();

  features = [
    { icon: 'calendar', title: 'Horarios', desc: 'Gestiona horarios semanales por instructor, ficha y ambiente con vista matricial en tiempo real.' },
    { icon: 'building-2', title: 'Ambientes', desc: 'Controla la disponibilidad de aulas y laboratorios por jornada, evitando conflictos de ocupación.' },
    { icon: 'graduation-cap', title: 'Instructores', desc: 'Asigna instructores líderes, gestiona áreas de liderazgo y monitorea sesiones activas.' },
    { icon: 'layout-dashboard', title: 'Fichas', desc: 'Administra fichas formativas con todos sus horarios, instructores y competencias asignadas.' },
  ];

  scrollToFeatures() {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  }
}
