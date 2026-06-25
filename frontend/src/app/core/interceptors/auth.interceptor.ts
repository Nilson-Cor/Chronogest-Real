import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && auth.isAuthenticated) {
        // Token expirado o inválido — limpiar sesión y redirigir al login
        localStorage.removeItem('cg_token');
        localStorage.removeItem('cg_user');
        auth.currentUser.set(null);
        router.navigate(['/login'], {
          queryParams: { expired: '1' },
        });
      }
      return throwError(() => error);
    }),
  );
};
