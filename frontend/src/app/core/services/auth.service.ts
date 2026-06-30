import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { User, LoginResponse } from '../models/user.model';
import { environment } from '../../../environments/environment';
import { TenantService } from './tenant.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'cg_token';
  private readonly USER_KEY = 'cg_user';

  currentUser = signal<User | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router, private tenant: TenantService) {}

  get token(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  get role(): string {
    return this.currentUser()?.rol ?? '';
  }

  login(identifier: string, password: string) {
    return this.http.post<LoginResponse>(`${this.API}/login`, { identifier, password }).pipe(
      tap((res) => {
        localStorage.setItem(this.TOKEN_KEY, res.access_token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        this.currentUser.set(res.user);
      }),
    );
  }

  /**
   * Login para usuarios finales: no requiere saber ni escribir el slug del
   * Centro de Formación — el backend busca en qué tenant existen esas
   * credenciales. Al resolverse, fija el tenant detectado (`centroSlug`)
   * para que todas las peticiones siguientes usen el centro correcto.
   */
  loginAuto(identifier: string, password: string) {
    return this.http.post<LoginResponse & { centroSlug: string }>(`${this.API}/login-auto`, { identifier, password }).pipe(
      tap((res) => {
        localStorage.setItem(this.TOKEN_KEY, res.access_token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        this.currentUser.set(res.user);
        if (res.centroSlug) this.tenant.setSlug(res.centroSlug);
      }),
    );
  }

  logout() {
    const token = this.token;
    
    const cleanupAndRedirect = () => {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      this.currentUser.set(null);
      this.router.navigate(['/landing']);
    };

    if (token) {
      // Fire backend call first, then clean UI and redirect to avoid request cancellation
      this.http.post(`${this.API}/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: () => cleanupAndRedirect(),
        error: () => cleanupAndRedirect()
      });
    } else {
      cleanupAndRedirect();
    }
  }

  verifyPin(pin: string) {
    return this.http.post<{ valid: boolean }>(`${this.API}/verify-pin`, { pin });
  }

  register(data: any) {
    return this.http.post(`${this.API}/register`, data);
  }

  forgotPassword(correo: string) {
    return this.http.post(`${this.API}/forgot-password`, { correo });
  }

  verifyResetCode(correo: string, code: string) {
    return this.http.post(`${this.API}/verify-reset-code`, { correo, code });
  }

  resetPassword(correo: string, code: string, newPassword: string) {
    return this.http.post(`${this.API}/reset-password`, { correo, code, newPassword });
  }

  me() {
    return this.http.get<User>(`${this.API}/me`).pipe(
      tap((user) => {
        this.currentUser.set({ ...this.currentUser()!, ...user });
      }),
    );
  }

  updateCurrentUser(partial: Partial<User>) {
    const updated = { ...this.currentUser()!, ...partial };
    this.currentUser.set(updated);
    localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
  }

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
}
