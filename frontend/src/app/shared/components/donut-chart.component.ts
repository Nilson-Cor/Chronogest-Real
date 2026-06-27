import { Component, Input, computed, signal } from '@angular/core';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-donut-chart',
  template: `
    <div class="donut-wrap">
      <div class="donut-svg-box">
        <svg viewBox="0 0 120 120" class="donut-svg">
          <circle cx="60" cy="60" r="48" fill="none" stroke="var(--border)" stroke-width="16"></circle>
          @for (seg of segmentos(); track seg.label) {
            <circle cx="60" cy="60" r="48" fill="none" [attr.stroke]="seg.color" stroke-width="16"
                    [attr.stroke-dasharray]="seg.dash" [attr.stroke-dashoffset]="seg.offset"
                    stroke-linecap="butt" transform="rotate(-90 60 60)"
                    class="donut-seg" (mouseenter)="hovered.set(seg.label)" (mouseleave)="hovered.set(null)"></circle>
          }
        </svg>
        <div class="donut-center">
          @if (hovered()) {
            <div class="donut-center-val">{{ hoveredValue() }}</div>
            <div class="donut-center-lbl">{{ hovered() }}</div>
          } @else {
            <div class="donut-center-val">{{ total() }}</div>
            <div class="donut-center-lbl">Total</div>
          }
        </div>
      </div>
      <div class="donut-legend">
        @for (seg of data; track seg.label) {
          <div class="donut-legend-item">
            <span class="donut-dot" [style.background]="seg.color"></span>
            <span class="donut-legend-lbl">{{ seg.label }}</span>
            <span class="donut-legend-val">{{ seg.value }}</span>
          </div>
        }
        @if (!data.length) {
          <div class="donut-empty">Sin datos disponibles</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .donut-wrap { display: flex; align-items: center; gap: 20px; }
    .donut-svg-box { position: relative; width: 120px; height: 120px; flex-shrink: 0; }
    .donut-svg { width: 100%; height: 100%; }
    .donut-seg { transition: opacity .15s; cursor: pointer; }
    .donut-seg:hover { opacity: .8; }
    .donut-center {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; pointer-events: none;
    }
    .donut-center-val { font-size: 22px; font-weight: 800; color: var(--text); line-height: 1; }
    .donut-center-lbl { font-size: 10px; color: var(--text-muted); margin-top: 2px; text-align: center; max-width: 70px; }
    .donut-legend { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0; }
    .donut-legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
    .donut-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .donut-legend-lbl { color: var(--text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .donut-legend-val { color: var(--text-muted); font-weight: 700; }
    .donut-empty { color: var(--text-muted); font-size: 13px; }
  `],
})
export class DonutChartComponent {
  private _data = signal<DonutSegment[]>([]);
  @Input() set data(v: DonutSegment[] | null | undefined) { this._data.set(v ?? []); }
  get data(): DonutSegment[] { return this._data(); }

  hovered = signal<string | null>(null);

  total = computed(() => this._data().reduce((acc, s) => acc + s.value, 0));
  hoveredValue = computed(() => this._data().find(s => s.label === this.hovered())?.value ?? 0);

  segmentos = computed(() => {
    const circumference = 2 * Math.PI * 48;
    const total = this.total() || 1;
    let acumulado = 0;
    return this._data().map(seg => {
      const frac = seg.value / total;
      const dash = `${frac * circumference} ${circumference}`;
      const offset = -acumulado * circumference;
      acumulado += frac;
      return { ...seg, dash, offset };
    });
  });
}
