import { Component, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { LucideAngularModule } from 'lucide-angular';
import { SearchableSelectComponent, SSOption } from '../../shared/components/searchable-select.component';

type AuthView = 'login' | 'pin' | 'register' | 'forgot' | 'verify-code' | 'reset-pass';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule, RouterLink,
    LucideAngularModule, SearchableSelectComponent,
  ],
  template: `
    <div class="login-page">
      <!-- LEFT PANEL -->
      @if (view() !== 'register') {
      <div class="left-panel">
        <div class="lp-logo">
          <lucide-icon name="calendar" [size]="28" class="lp-logo-icon"></lucide-icon>
          <div>
            <div class="lp-logo-name">ChronoGest</div>
            <div class="lp-logo-sub">SENA — Gestión de Horarios</div>
          </div>
        </div>
        <img src="assets/logo-sena-blanco.png" alt="SENA" class="lp-sena"
             onerror="this.style.opacity='0'">
        <div class="lp-modules">
          @for (m of modules; track m.title) {
          <div class="lp-module-card">
            <lucide-icon [name]="m.icon" [size]="24" class="lp-module-icon"></lucide-icon>
            <span class="lp-module-name">{{ m.title }}</span>
          </div>
          }
        </div>
        <p class="lp-footer">Sistema de Gestión Académica — v2.1</p>
      </div>
      }

      <!-- RIGHT PANEL -->
      <div class="right-panel" [class.full-page]="view() === 'register'">
        <!-- ===== LOGIN ===== -->
        @if (view() === 'login') {
        <div class="form-box">
          <a routerLink="/landing" class="back-link">← Volver al inicio</a>
          @if (sessionExpired()) {
          <div class="session-expired-banner">
            <lucide-icon name="alert-circle" [size]="16"></lucide-icon>
            Tu sesión expiró (duración máxima: 12h). Por favor inicia sesión de nuevo.
          </div>
          }
          <h2>Bienvenido de vuelta</h2>
          <p class="rp-sub">Ingresa tus credenciales para acceder al sistema</p>

          <form (ngSubmit)="doLogin()" #loginForm="ngForm">
            <div class="form-group mt-4">
              <label class="form-label">Número de documento o correo</label>
              <input class="form-control" type="text" [(ngModel)]="identifier"
                     name="identifier" placeholder="tu_documento o correo@ejemplo.com" required>
            </div>
            <div class="form-group mt-4" style="position:relative">
              <label class="form-label">Contraseña</label>
              <input class="form-control" [type]="showPass ? 'text' : 'password'"
                     [(ngModel)]="password" name="password" placeholder="••••••••" required>
              <button type="button" class="toggle-pass" (click)="showPass = !showPass">
                @if (showPass) {
                  <lucide-icon name="eye-off" [size]="16"></lucide-icon>
                } @else {
                  <lucide-icon name="eye" [size]="16"></lucide-icon>
                }
              </button>
            </div>

            @if (error()) {
            <div class="error-msg">{{ error() }}</div>
            }

            <button class="btn-submit" type="submit" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> } @else {
                <lucide-icon name="lock" [size]="16"></lucide-icon>
              }
              Iniciar Sesión
            </button>
          </form>

          <div class="login-links">
            <button class="link-btn" (click)="goToPin()">¿No tienes acceso? Registrarse</button>
          </div>
        </div>
        }

        <!-- ===== FORGOT PASSWORD ===== -->
        @if (view() === 'forgot') {
        <div class="form-box">
          <button class="back-link" (click)="view.set('login')">← Volver al login</button>
          <div class="modal-icon"><lucide-icon name="mail" [size]="40"></lucide-icon></div>
          <h2>Recuperar Contraseña</h2>
          <p class="rp-sub">Ingresa tu correo registrado para recibir el código de verificación</p>
          <div class="form-group mt-4">
            <label class="form-label">Correo electrónico</label>
            <input class="form-control" type="email" [(ngModel)]="resetEmail" placeholder="correo@ejemplo.com">
          </div>
          @if (error()) { <div class="error-msg">{{ error() }}</div> }
          <button class="btn-submit mt-4" (click)="doForgot()" [disabled]="loading()">
            Enviar código
          </button>
        </div>
        }

        <!-- ===== VERIFY CODE ===== -->
        @if (view() === 'verify-code') {
        <div class="form-box">
          <button class="back-link" (click)="view.set('forgot')">← Volver</button>
          <div class="modal-icon"><lucide-icon name="key" [size]="40"></lucide-icon></div>
          <h2>Código de Verificación</h2>
          <p class="rp-sub">Ingresa el código de 6 dígitos enviado a <strong>{{ resetEmail }}</strong></p>
          <div class="form-group mt-4">
            <label class="form-label">Código</label>
            <input class="form-control text-center" [(ngModel)]="resetCode"
                   placeholder="_ _ _ _ _ _" maxlength="6" style="letter-spacing:8px;font-size:20px">
          </div>
          @if (error()) { <div class="error-msg">{{ error() }}</div> }
          <button class="btn-submit mt-4" (click)="doVerifyCode()" [disabled]="loading()">
            Verificar Código
          </button>
        </div>
        }

        <!-- ===== RESET PASSWORD ===== -->
        @if (view() === 'reset-pass') {
        <div class="form-box">
          <div class="modal-icon"><lucide-icon name="lock" [size]="40"></lucide-icon></div>
          <h2>Nueva Contraseña</h2>
          <p class="rp-sub">Ingresa tu nueva contraseña</p>
          <div class="form-group mt-4">
            <label class="form-label">Nueva contraseña</label>
            <input class="form-control" type="password" [(ngModel)]="newPassword" placeholder="••••••••">
          </div>
          <div class="form-group mt-4">
            <label class="form-label">Confirmar contraseña</label>
            <input class="form-control" type="password" [(ngModel)]="confirmPassword" placeholder="••••••••">
          </div>
          @if (error()) { <div class="error-msg">{{ error() }}</div> }
          <button class="btn-submit mt-4" (click)="doResetPass()" [disabled]="loading()">
            Actualizar Contraseña
          </button>
        </div>
        }

        <!-- ===== REGISTER ===== -->
        @if (view() === 'register') {
        <div class="form-box form-scroll">
          <button class="back-link" (click)="goToLogin()">← Volver al login</button>
          <h2>Registro de Usuario</h2>

          <!-- Tipo de usuario -->
          <div class="role-selector">
            @for (r of roles; track r.key) {
            <div class="role-card" [class.selected]="regRol === r.key" (click)="regRol = r.key">
              <lucide-icon [name]="r.icon" [size]="22" class="role-icon"></lucide-icon>
              <span class="role-name">{{ r.label }}</span>
            </div>
            }
          </div>

          <div class="grid-2 mt-4">
            <div class="form-group">
              <label class="form-label">Nombre *</label>
              <input class="form-control" [(ngModel)]="regForm.nombre" placeholder="Nombre">
            </div>
            <div class="form-group">
              <label class="form-label">Apellido *</label>
              <input class="form-control" [(ngModel)]="regForm.apellido" placeholder="Apellido">
            </div>
            <div class="form-group">
              <label class="form-label">Tipo Documento *</label>
              <app-ss [options]="tipoDocOpts" placeholder="Tipo Documento" [(ngModel)]="regForm.tipoDoc"></app-ss>
            </div>
            <div class="form-group">
              <label class="form-label">Número Documento *</label>
              <input class="form-control" [(ngModel)]="regForm.numDoc" placeholder="Número">
            </div>
          </div>
          <div class="form-group mt-4">
            <label class="form-label">Correo Electrónico *</label>
            <input class="form-control" type="email" [(ngModel)]="regForm.correo" placeholder="correo@ejemplo.com">
          </div>
          <div class="grid-2 mt-4">
            <div class="form-group">
              <label class="form-label">Contraseña *</label>
              <input class="form-control" type="password" [(ngModel)]="regForm.password" placeholder="••••••">
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input class="form-control" [(ngModel)]="regForm.telefono" placeholder="Teléfono">
            </div>
            <div class="form-group">
              <label class="form-label">Municipio</label>
              <app-ss [options]="municipiosOpts()" placeholder="Seleccionar municipio..." [(ngModel)]="regForm.municipio"></app-ss>
            </div>
            <div class="form-group">
              <label class="form-label">Género</label>
              <app-ss [options]="generoOpts" placeholder="Seleccionar..." [(ngModel)]="regForm.genero"></app-ss>
            </div>
          </div>

          @if (regRol === 'aprendiz' && fichas().length) {
          <div class="form-group mt-4">
            <label class="form-label">Asignación de Ficha o Curso *</label>
            <!-- Filtro por área -->
            <div style="margin-bottom:8px">
              <app-ss [options]="areaFiltroOpts()" placeholder="Todas las áreas" [(ngModel)]="areaFiltroReg"></app-ss>
            </div>
            <app-ss [options]="fichasOpts()" placeholder="Buscar y seleccionar ficha..." [(ngModel)]="regForm.fichaId"></app-ss>
          </div>
          }

          @if (regError()) { <div class="error-msg mt-4">{{ regError() }}</div> }
          @if (regSuccess()) { <div class="success-msg mt-4">{{ regSuccess() }}</div> }

          <div class="btn-row mt-4">
            <button class="btn-outline" (click)="goToLogin()">Cancelar</button>
            <button class="btn-submit" (click)="doRegister()" [disabled]="loading()">
              Registrar Usuario
            </button>
          </div>
        </div>
        }

      </div>

      <!-- ===== PIN FULL SCREEN MODAL ===== -->
      @if (view() === 'pin') {
      <div class="pin-overlay">
        <div class="pin-modal-box">
          <div class="modal-icon"><lucide-icon name="lock" [size]="40"></lucide-icon></div>
          <h2>Acceso Restringido</h2>
          <p class="rp-sub text-center">Ingresa el PIN de administrador para continuar con el registro</p>
          <div class="form-group mt-4">
            <label class="form-label text-center" style="display:block">Código PIN</label>
            <input class="form-control text-center mx-auto block" type="password" [(ngModel)]="pin"
                   placeholder="• • • •" maxlength="8" style="max-width:200px">
          </div>
          @if (pinError()) {
          <div class="error-msg text-center mt-3">{{ pinError() }}</div>
          }
          <div class="btn-row justify-center mt-4" style="max-width:300px;margin:20px auto 0">
            <button class="btn-outline" (click)="view.set('login')">← Volver</button>
            <button class="btn-submit mt-0" (click)="doVerifyPin()" [disabled]="loading()" style="margin-top:0;width:auto;flex:1">
              Verificar PIN
            </button>
          </div>
        </div>
      </div>
      }
    </div>
  `,
  styles: [`
    .login-page { display: flex; min-height: 100vh; }

    /* Left panel */
    .left-panel {
      width: 420px; min-width: 320px; background: #1e3a5f;
      display: flex; flex-direction: column; align-items: center;
      padding: 48px 32px; gap: 24px;
    }
    .lp-logo { display: flex; align-items: center; gap: 12px; color: #fff; }
    .lp-logo-icon { color: #fff; }
    .lp-logo-name { font-size: 20px; font-weight: 800; }
    .lp-logo-sub { font-size: 11px; color: rgba(255,255,255,.6); }
    .lp-sena {
      width: 90px; height: 90px; object-fit: contain;
      filter: brightness(0) invert(1);
    }
    .lp-modules {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%;
    }
    .lp-module-card {
      background: rgba(255,255,255,.1); border-radius: 12px;
      padding: 16px; display: flex; flex-direction: column; align-items: center;
      gap: 8px; color: #fff; border: 1px solid rgba(255,255,255,.15);
    }
    .lp-module-icon { color: #fff; }
    .lp-module-name { font-size: 12px; font-weight: 600; text-align: center; }
    .lp-footer { color: rgba(255,255,255,.4); font-size: 11px; margin-top: auto; }

    /* Right panel */
    .right-panel {
      flex: 1; background: #fff; display: flex;
      align-items: center; justify-content: center; padding: 40px 24px;
      overflow-y: auto;
    }
    .form-box { width: 100%; max-width: 420px; }
    .form-scroll { max-height: 90vh; overflow-y: auto; padding-right: 8px; }
    .back-link {
      display: inline-block; color: #6b7280; font-size: 13px;
      margin-bottom: 24px; cursor: pointer; text-decoration: none;
      background: none; border: none; padding: 0;
    }
    .back-link:hover { color: #1e3a5f; }
    .form-box h2 { font-size: 1.6rem; color: #111827; margin-bottom: 6px; }
    .rp-sub { color: #6b7280; font-size: 14px; margin-bottom: 8px; }
    .modal-icon {
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 12px; color: #1e3a5f;
    }
    .toggle-pass {
      position: absolute; right: 12px; top: 36px;
      background: none; border: none; cursor: pointer;
      color: #6b7280; display: flex; align-items: center;
    }
    .btn-submit {
      width: 100%; margin-top: 20px; padding: 13px;
      background: #1e3a5f; color: #fff; border: none;
      border-radius: 10px; font-size: 15px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: background .15s;
    }
    .btn-submit:hover { background: #2a4d7a; }
    .btn-submit:disabled { opacity: .6; cursor: not-allowed; }
    .btn-outline {
      flex: 1; padding: 13px; background: transparent; border: 1.5px solid #d1d5db;
      border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; color: #374151;
    }
    .btn-row { display: flex; gap: 12px; margin-top: 20px; }
    .login-links {
      display: flex; gap: 8px; align-items: center; justify-content: center;
      margin-top: 16px; font-size: 13px; color: #6b7280;
    }
    .link-btn {
      background: none; border: none; color: #2563eb; cursor: pointer;
      font-size: 13px; padding: 0;
    }
    .link-btn:hover { text-decoration: underline; }
    .session-expired-banner {
      display: flex; align-items: center; gap: 8px;
      background: #fff7ed; color: #92400e; border: 1px solid #fcd34d;
      border-radius: 8px; padding: 10px 14px; font-size: 13px;
      font-weight: 600; margin-bottom: 4px;
    }
    .error-msg {
      background: #fee2e2; color: #991b1b; border-radius: 8px;
      padding: 10px 14px; font-size: 13px; margin-top: 12px;
    }
    .success-msg {
      background: #dcfce7; color: #166534; border-radius: 8px;
      padding: 10px 14px; font-size: 13px;
    }
    .spinner {
      width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.4);
      border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Role selector */
    .role-selector { display: flex; gap: 10px; margin-top: 16px; }
    .role-card {
      flex: 1; border: 2px solid #e5e7eb; border-radius: 10px;
      padding: 12px 8px; display: flex; flex-direction: column; align-items: center;
      gap: 6px; cursor: pointer; transition: all .15s;
    }
    .role-card.selected { border-color: #1e3a5f; background: #eff6ff; }
    .role-icon { color: #1e3a5f; }
    .role-name { font-size: 11px; font-weight: 700; color: #374151; }

    /* Overlay Modal PIN */
    .pin-overlay {
      position: fixed; inset: 0; background: rgba(30,58,95,0.85); backdrop-filter: blur(4px);
      display: flex; justify-content: center; align-items: center; z-index: 9999;
    }
    .pin-modal-box {
      background: #fff; padding: 40px; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      width: 100%; max-width: 400px;
    }
    .text-center { text-align: center; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .block { display: block; }
    .justify-center { justify-content: center; }
    .full-page { max-width: none !important; justify-content: center; }

    @media (max-width: 768px) {
      .left-panel { display: none; }
      .right-panel { background: #f3f4f6; }
    }
  `],
})
export class LoginComponent implements OnInit {
  view = signal<AuthView>('login');
  sessionExpired = signal(false);

  // Login
  identifier = '';
  password = '';
  showPass = false;
  loading = signal(false);
  error = signal('');

  // PIN
  pin = '';
  pinError = signal('');

  // Register
  regRol = 'aprendiz';
  regForm: any = { tipoDoc: 'CC', genero: '' };
  regError = signal('');
  regSuccess = signal('');
  fichas = signal<any[]>([]);
  areas = signal<string[]>([]);
  municipios = signal<any[]>([]);
  searchFicha = '';
  areaFiltroReg = '';

  readonly tipoDocOpts: SSOption[] = [
    { value: 'CC', label: 'Cédula (CC)' },
    { value: 'TI', label: 'Tarjeta Identidad (TI)' },
    { value: 'CE', label: 'Cédula Extranjería (CE)' },
    { value: 'PA', label: 'Pasaporte (PA)' },
  ];

  readonly generoOpts: SSOption[] = [
    { value: '', label: 'Seleccionar...' },
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Femenino' },
    { value: 'O', label: 'Otro' },
  ];

  municipiosOpts = computed<SSOption[]>(() => [
    { value: '', label: 'Seleccionar municipio...' },
    ...this.municipios().map(m => ({
      value: m.id ?? m.idMunicipio,     // UUID del municipio (requerido por el backend)
      label: `${m.nombre} ${m.departamento_nombre ? '(' + m.departamento_nombre + ')' : ''}`
    }))
  ]);

  areaFiltroOpts = computed<SSOption[]>(() => [
    { value: '', label: 'Todas las áreas' },
    ...this.areas().map(a => ({ value: a, label: a }))
  ]);

  fichasOpts = computed<SSOption[]>(() => [
    { value: '', label: 'Seleccionar ficha...' },
    ...this.filteredFichas().map(f => ({
      value: f.id,
      label: `${f.codigo} — ${f.programa}`
    }))
  ]);

  filteredFichas() {
    let list = this.fichas();
    if (this.areaFiltroReg) list = list.filter((f: any) => f.area === this.areaFiltroReg);
    return list;
  }

  // Reset password
  resetEmail = '';
  resetCode = '';
  newPassword = '';
  confirmPassword = '';

  roles = [
    { key: 'aprendiz', icon: 'graduation-cap', label: 'Aprendiz' },
    { key: 'instructor', icon: 'book-open', label: 'Instructor' },
    { key: 'admin', icon: 'shield', label: 'Administrador' },
  ];

  modules = [
    { icon: 'calendar', title: 'Horarios' },
    { icon: 'building-2', title: 'Ambientes' },
    { icon: 'graduation-cap', title: 'Instructores' },
    { icon: 'layout-dashboard', title: 'Fichas' },
  ];

  constructor(
    private auth: AuthService,
    private router: Router,
    private api: ApiService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      if (params.get('expired') === '1') {
        this.sessionExpired.set(true);
      }
    });
  }

  goToPin() {
    this.pin = '';
    this.pinError.set('');
    this.view.set('pin');
  }

  goToLogin() {
    this.resetRegForm();
    this.view.set('login');
    this.regSuccess.set('');
  }

  resetRegForm() {
    this.regRol = 'aprendiz';
    this.regForm = {
      nombre: '', apellido: '', tipoDoc: 'CC', numDoc: '',
      correo: '', password: '', telefono: '', municipio: '',
      genero: '', fichaId: ''
    };
    this.searchFicha = '';
    this.areaFiltroReg = '';
    this.regError.set('');
  }

  doLogin() {
    if (!this.identifier || !this.password) {
      this.error.set('Completa todos los campos'); return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.identifier, this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        const role = res.user.rol;
        if (role === 'admin') this.router.navigate(['/app/admin/dashboard']);
        else if (role === 'instructor') this.router.navigate(['/app/instructor/dashboard']);
        else this.router.navigate(['/app/aprendiz/dashboard']);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e?.error?.message ?? 'Credenciales inválidas');
      },
    });
  }

  doVerifyPin() {
    if (!this.pin) { this.pinError.set('Ingresa el PIN'); return; }
    this.loading.set(true);
    this.auth.verifyPin(this.pin).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.valid) {
          this.loadFichas();
          this.loadMunicipios();
          this.view.set('register');
        } else {
          this.pinError.set('PIN incorrecto');
        }
      },
      error: () => { this.loading.set(false); this.pinError.set('Error verificando PIN'); },
    });
  }

  loadFichas() {
    this.api.getFichas().subscribe({
      next: (f) => {
        this.fichas.set(f ?? []);
        const unique = [...new Set((f ?? []).map((x: any) => x.area).filter(Boolean))].sort() as string[];
        this.areas.set(unique);
      },
      error: () => this.fichas.set([]),
    });
  }

  loadMunicipios() {
    this.api.getMunicipios().subscribe({
      next: (m) => this.municipios.set(m ?? []),
      error: () => this.municipios.set([]),
    });
  }

  doRegister() {
    this.regError.set('');
    const data = { ...this.regForm, rol: this.regRol };
    if (!data.nombre || !data.apellido || !data.numDoc || !data.correo || !data.password) {
      this.regError.set('Completa todos los campos obligatorios'); return;
    }
    if (this.regRol === 'aprendiz' && !data.fichaId) {
      this.regError.set('Por favor, selecciona a qué Ficha o Curso perteneces para poder registrarte.'); return;
    }
    this.loading.set(true);
    this.auth.register(data).subscribe({
      next: () => {
        this.loading.set(false);
        this.regSuccess.set('Usuario registrado exitosamente. Los campos han sido borrados por si necesitas ingresar otro.');
        this.resetRegForm();
        setTimeout(() => this.regSuccess.set(''), 5000);
      },
      error: (e) => {
        this.loading.set(false);
        this.regError.set(e?.error?.message ?? 'Error al registrar');
      },
    });
  }

  doForgot() {
    if (!this.resetEmail) { this.error.set('Ingresa tu correo'); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.forgotPassword(this.resetEmail).subscribe({
      next: () => { this.loading.set(false); this.view.set('verify-code'); },
      error: (e) => { this.loading.set(false); this.error.set(e?.error?.message ?? 'Correo no encontrado'); },
    });
  }

  doVerifyCode() {
    if (!this.resetCode) { this.error.set('Ingresa el código'); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.verifyResetCode(this.resetEmail, this.resetCode).subscribe({
      next: () => { this.loading.set(false); this.view.set('reset-pass'); },
      error: () => { this.loading.set(false); this.error.set('Código inválido o expirado'); },
    });
  }

  doResetPass() {
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Las contraseñas no coinciden'); return;
    }
    if (!this.newPassword) { this.error.set('Ingresa la nueva contraseña'); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.resetPassword(this.resetEmail, this.resetCode, this.newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.view.set('login');
        this.error.set('');
      },
      error: (e) => { this.loading.set(false); this.error.set(e?.error?.message ?? 'Error'); },
    });
  }
}
