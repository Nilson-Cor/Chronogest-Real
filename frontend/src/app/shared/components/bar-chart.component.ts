import { Component, Input, computed, signal } from '@angular/core';

export interface BarItem {
  label: string;
  value: number;
  color?: string;
}

@Component({
  selector: 'app-bar-chart',
  template: `
    <div class="bars-wrap">
      @for (item of data; track item.label) {
        <div class="bar-row">
          <span class="bar-label">{{ item.label }}</span>
          <div class="bar-track">
            <div class="bar-fill" [style.width.%]="pct(item.value)" [style.background]="item.color || 'var(--navy)'"></div>
          </div>
          <span class="bar-value">{{ item.value }}</span>
        </div>
      }
      @if (!data.length) {
        <div class="bar-empty">Sin datos disponibles</div>
      }
    </div>
  `,
  styles: [`
    .bars-wrap { display: flex; flex-direction: column; gap: 12px; }
    .bar-row { display: grid; grid-template-columns: 88px 1fr 34px; align-items: center; gap: 10px; }
    .bar-label { font-size: 12px; color: var(--text-muted); text-transform: capitalize; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar-track { background: var(--border); border-radius: 6px; height: 10px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 6px; transition: width .4s ease; }
    .bar-value { font-size: 12px; font-weight: 700; color: var(--text); text-align: right; }
    .bar-empty { color: var(--text-muted); font-size: 13px; }
  `],
})
export class BarChartComponent {
  private _data = signal<BarItem[]>([]);
  @Input() set data(v: BarItem[] | null | undefined) { this._data.set(v ?? []); }
  get data(): BarItem[] { return this._data(); }

  private max = computed(() => Math.max(1, ...this._data().map(d => d.value)));

  pct(value: number): number {
    const m = this.max();
    return m ? Math.max(2, (value / m) * 100) : 0;
  }
}
