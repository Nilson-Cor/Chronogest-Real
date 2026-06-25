import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-configuracion',
  imports: [FormsModule, LucideAngularModule],
  template: `
    <h2>Configuración del Sistema</h2>

    <div class="card p-6 mt-4" style="max-width:480px">
      <h4 style="margin-bottom:20px;display:flex;align-items:center;gap:8px">
        <lucide-icon name="lock" [size]="18"></lucide-icon> PIN de Registro
      </h4>
      <p class="text-muted text-sm mb-4">
        Este PIN es requerido para registrar nuevos usuarios en el sistema.
      </p>
      <div class="form-group">
        <label class="form-label">PIN Actual</label>
        <div class="flex gap-2">
          <input class="form-control" [type]="showPin ? 'text' : 'password'"
                 [value]="currentPin()" readonly style="letter-spacing:4px;font-size:18px">
          <button class="btn btn-outline btn-sm" (click)="showPin = !showPin"
                  style="display:flex;align-items:center;gap:4px">
            @if (showPin) {
              <lucide-icon name="eye-off" [size]="15"></lucide-icon>
            } @else {
              <lucide-icon name="eye" [size]="15"></lucide-icon>
            }
          </button>
        </div>
      </div>
      <div class="form-group mt-4">
        <label class="form-label">Nuevo PIN</label>
        <input class="form-control" [(ngModel)]="newPin" placeholder="Ingresa nuevo PIN"
               style="letter-spacing:4px;font-size:18px" maxlength="8">
      </div>
      @if (msg()) { <div [class]="msg().includes('Error') ? 'error-msg' : 'success-msg'" style="margin-top:12px">{{ msg() }}</div> }
      <button class="btn btn-blue mt-4" (click)="save()" [disabled]="!newPin">
        Actualizar PIN
      </button>
    </div>
  `,
  styles: [`.success-msg{background:#dcfce7;color:#166534;border-radius:8px;padding:10px 14px;font-size:13px} .error-msg{background:#fee2e2;color:#991b1b;border-radius:8px;padding:10px 14px;font-size:13px} .mb-4{margin-bottom:16px}`],
})
export class AdminConfiguracionComponent implements OnInit {
  currentPin = signal('');
  newPin = '';
  showPin = false;
  msg = signal('');
  private toast = inject(ToastService);

  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getConfiguracion().subscribe(c => this.currentPin.set(c.pinRegistro));
  }
  save() {
    this.api.updatePin(this.newPin).subscribe({
      next: () => {
        this.currentPin.set(this.newPin);
        this.newPin = '';
        this.msg.set('PIN actualizado correctamente');
        setTimeout(() => this.msg.set(''), 3000);
        this.toast.success('PIN actualizado', 'El PIN de registro fue actualizado correctamente.');
      },
      error: (e) => {
        this.msg.set('Error al actualizar PIN');
        this.toast.error('Error al actualizar PIN', e?.error?.message ?? 'No se pudo guardar el nuevo PIN. Intenta de nuevo.');
      },
    });
  }
}
