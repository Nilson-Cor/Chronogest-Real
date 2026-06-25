import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'landing', pathMatch: 'full' },
  {
    path: 'landing',
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layout/app-layout.component').then((m) => m.AppLayoutComponent),
    children: [
      // Admin
      {
        path: 'admin',
        canActivate: [roleGuard(['admin'])],
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./features/admin/dashboard/dashboard.component').then((m) => m.AdminDashboardComponent),
          },
          {
            path: 'horarios-instructor',
            loadComponent: () =>
              import('./features/admin/horarios/horarios.component').then((m) => m.AdminHorariosComponent),
            data: { tab: 'instructor' }
          },
          {
            path: 'horarios-fichas',
            loadComponent: () =>
              import('./features/admin/horarios/horarios.component').then((m) => m.AdminHorariosComponent),
            data: { tab: 'ficha' }
          },
          {
            path: 'horarios-ambientes',
            loadComponent: () =>
              import('./features/admin/horarios/horarios.component').then((m) => m.AdminHorariosComponent),
            data: { tab: 'ambiente' }
          },
          {
            path: 'programador-eventos',
            loadComponent: () =>
              import('./features/admin/programador-eventos/programador-eventos.component').then((m) => m.ProgramadorEventosComponent),
          },
          {
            path: 'programador-fichas',
            loadComponent: () =>
              import('./features/admin/programador-fichas/programador-fichas.component').then((m) => m.ProgramadorFichasComponent),
          },

          {
            path: 'usuarios',
            loadComponent: () =>
              import('./features/admin/usuarios/usuarios.component').then((m) => m.AdminUsuariosComponent),
          },
          {
            path: 'solicitudes',
            loadComponent: () =>
              import('./features/admin/solicitudes/solicitudes.component').then((m) => m.AdminSolicitudesComponent),
          },
          {
            path: 'configuracion',
            loadComponent: () =>
              import('./features/admin/configuracion/configuracion.component').then((m) => m.AdminConfiguracionComponent),
          },
        ],
      },
      // Instructor
      {
        path: 'instructor',
        canActivate: [roleGuard(['instructor'])],
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./features/instructor/dashboard/instructor-dashboard.component').then((m) => m.InstructorDashboardComponent),
          },
          {
            path: 'mis-horarios',
            loadComponent: () =>
              import('./features/instructor/mis-horarios/mis-horarios.component').then((m) => m.InstructorMisHorariosComponent),
          },
          {
            path: 'solicitudes',
            loadComponent: () =>
              import('./features/instructor/solicitudes/solicitudes.component').then((m) => m.InstructorSolicitudesComponent),
          },
        ],
      },
      // Aprendiz
      {
        path: 'aprendiz',
        canActivate: [roleGuard(['aprendiz'])],
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./features/aprendiz/dashboard/aprendiz-dashboard.component').then((m) => m.AprendizDashboardComponent),
          },
          {
            path: 'mis-horarios',
            loadComponent: () =>
              import('./features/aprendiz/mis-horarios/aprendiz-mis-horarios.component').then((m) => m.AprendizMisHorariosComponent),
          },
        ],
      },
      // Redirect based on role
      { path: 'dashboard', redirectTo: '/app/admin/dashboard' },
    ],
  },
  // ── Dev-admin (solo desarrolladores) ─────────────────────────────────────
  {
    path: 'dev',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dev/dev-layout.component').then((m) => m.DevLayoutComponent),
    children: [
      { path: '', redirectTo: 'formativo', pathMatch: 'full' },
      {
        path: 'formativo',
        loadComponent: () =>
          import('./features/admin/formativo/formativo.component').then((m) => m.AdminFormativoComponent),
      },
      {
        path: 'horarios',
        loadComponent: () =>
          import('./features/dev/horarios-admin.component').then((m) => m.HorariosAdminComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'landing' },
];
