import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated) return true;
  router.navigate(['/login']);
  return false;
};

export const roleGuard = (allowedRoles: string[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated) { router.navigate(['/login']); return false; }
    if (allowedRoles.includes(auth.role)) return true;
    router.navigate(['/app/dashboard']);
    return false;
  };

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated) return true;
  const role = auth.role;
  if (role === 'admin') router.navigate(['/app/admin/dashboard']);
  else if (role === 'instructor') router.navigate(['/app/instructor/dashboard']);
  else router.navigate(['/app/aprendiz/dashboard']);
  return false;
};
