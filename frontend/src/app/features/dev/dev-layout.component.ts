import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-dev-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="dev-shell">
      <header class="dev-header">
        <div class="dev-header-left">
          <span class="dev-badge">DEV</span>
          <span class="dev-title">ChronoGest — Área de Desarrollo</span>
        </div>
        <nav class="dev-nav">
          <a routerLink="/dev/formativo" routerLinkActive="active">Proyecto Formativo DB</a>
          <a routerLink="/dev/horarios" routerLinkActive="active">Horarios DB</a>
        </nav>
        <a routerLink="/landing" class="dev-back">← Volver al sistema</a>
      </header>

      <div class="dev-warning">
        Esta sección es exclusiva para desarrolladores. Los cambios afectan directamente las bases de datos
        <strong>proyecto_formativo_db</strong> y <strong>horarios_db</strong>.
      </div>

      <main class="dev-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .dev-shell {
      min-height: 100vh;
      background: #0f172a;
      color: #e2e8f0;
      font-family: 'Inter', sans-serif;
    }
    .dev-header {
      display: flex; align-items: center; gap: 24px;
      padding: 12px 24px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
    }
    .dev-header-left { display: flex; align-items: center; gap: 10px; flex: 1; }
    .dev-badge {
      background: #f59e0b; color: #000; font-size: 10px; font-weight: 800;
      padding: 2px 7px; border-radius: 4px; letter-spacing: 1px;
    }
    .dev-title { font-size: 14px; font-weight: 600; color: #cbd5e1; }
    .dev-nav { display: flex; gap: 8px; }
    .dev-nav a {
      font-size: 13px; padding: 6px 12px; border-radius: 6px;
      color: #94a3b8; text-decoration: none; transition: all .15s;
    }
    .dev-nav a:hover { background: #334155; color: #e2e8f0; }
    .dev-nav a.active { background: #1d4ed8; color: #fff; }
    .dev-back {
      font-size: 12px; color: #64748b; text-decoration: none;
      padding: 6px 10px; border-radius: 6px; transition: all .15s;
    }
    .dev-back:hover { color: #94a3b8; background: #1e293b; }
    .dev-warning {
      background: #78350f; color: #fde68a;
      padding: 8px 24px; font-size: 12px;
      border-bottom: 1px solid #92400e;
    }
    .dev-content {
      padding: 24px;
      /* override dark vars so formativo component renders with light card theme */
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text: #1e293b;
      --text-muted: #64748b;
      --navy: #1d4ed8;
      background: #f1f5f9;
      min-height: calc(100vh - 80px);
      border-radius: 0;
    }
  `],
})
export class DevLayoutComponent {}
