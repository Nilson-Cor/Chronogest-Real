import { Injectable, signal, computed } from '@angular/core';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration: number; // ms
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _idCounter = 0;
  private _toasts = signal<Toast[]>([]);

  readonly toasts = this._toasts.asReadonly();

  /** Error crítico — persiste 7 s */
  error(title: string, message?: string) {
    this._add('error', title, message, 7000);
  }

  /** Operación exitosa — persiste 4 s */
  success(title: string, message?: string) {
    this._add('success', title, message, 4000);
  }

  /** Advertencia — persiste 6 s */
  warning(title: string, message?: string) {
    this._add('warning', title, message, 6000);
  }

  /** Información neutral — persiste 4 s */
  info(title: string, message?: string) {
    this._add('info', title, message, 4000);
  }

  dismiss(id: number) {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }

  private _add(type: ToastType, title: string, message: string | undefined, duration: number) {
    const id = ++this._idCounter;
    this._toasts.update(list => [...list, { id, type, title, message, duration }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
