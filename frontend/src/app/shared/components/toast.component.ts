import { Component, inject } from '@angular/core';
import { ToastService, Toast } from '../../core/services/toast.service';
import { LucideAngularModule } from 'lucide-angular';

const ICONS: Record<string, string> = {
  error:   'x-circle',
  success: 'check-circle',
  warning: 'alert-triangle',
  info:    'info',
};

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast-item toast-{{ t.type }}" (click)="toast.dismiss(t.id)" role="alert">
          <lucide-icon [name]="icon(t.type)" [size]="18" class="toast-icon"></lucide-icon>
          <div class="toast-body">
            <span class="toast-title">{{ t.title }}</span>
            @if (t.message) {
              <span class="toast-msg">{{ t.message }}</span>
            }
          </div>
          <button class="toast-close" (click)="$event.stopPropagation(); toast.dismiss(t.id)" aria-label="Cerrar">
            <lucide-icon name="x" [size]="14"></lucide-icon>
          </button>
          <!-- Barra de progreso -->
          <div class="toast-progress" [style.animation-duration]="t.duration + 'ms'"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      max-width: 420px;
      width: calc(100vw - 48px);
    }

    .toast-item {
      pointer-events: all;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px 18px;
      border-radius: 12px;
      border: 1.5px solid;
      box-shadow: 0 8px 24px rgba(0,0,0,.18);
      cursor: pointer;
      position: relative;
      overflow: hidden;
      animation: toastIn .25s cubic-bezier(.34,1.56,.64,1) both;
      transition: opacity .2s, transform .2s;
    }
    .toast-item:hover { opacity: .92; }

    @keyframes toastIn {
      from { opacity: 0; transform: translateX(60px) scale(.95); }
      to   { opacity: 1; transform: translateX(0) scale(1); }
    }

    /* Tipos */
    .toast-error {
      background: #fff1f2;
      border-color: #fca5a5;
      color: #991b1b;
    }
    .toast-success {
      background: #f0fdf4;
      border-color: #86efac;
      color: #166534;
    }
    .toast-warning {
      background: #fffbeb;
      border-color: #fcd34d;
      color: #92400e;
    }
    .toast-info {
      background: #eff6ff;
      border-color: #bfdbfe;
      color: #1d4ed8;
    }

    .toast-icon { flex-shrink: 0; margin-top: 1px; }

    .toast-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .toast-title {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.3;
    }
    .toast-msg {
      font-size: 12px;
      opacity: .85;
      line-height: 1.4;
      word-break: break-word;
    }

    .toast-close {
      flex-shrink: 0;
      background: none;
      border: none;
      cursor: pointer;
      color: inherit;
      opacity: .6;
      padding: 0;
      display: flex;
      align-items: center;
      transition: opacity .15s;
    }
    .toast-close:hover { opacity: 1; }

    /* Barra de progreso */
    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 100%;
      background: currentColor;
      opacity: .3;
      animation: progressBar linear forwards;
      transform-origin: left;
    }
    @keyframes progressBar {
      from { transform: scaleX(1); }
      to   { transform: scaleX(0); }
    }
  `],
})
export class ToastComponent {
  toast = inject(ToastService);
  icon(type: string) { return ICONS[type] ?? 'info'; }
}
