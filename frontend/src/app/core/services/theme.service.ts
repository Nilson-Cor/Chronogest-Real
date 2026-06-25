import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal<boolean>(localStorage.getItem('cg_theme') === 'dark');

  constructor() {
    this.applyTheme(this.isDark());
  }

  toggle() {
    this.isDark.update((v) => !v);
    this.applyTheme(this.isDark());
    localStorage.setItem('cg_theme', this.isDark() ? 'dark' : 'light');
  }

  private applyTheme(dark: boolean) {
    document.body.classList.toggle('dark', dark);
  }
}
