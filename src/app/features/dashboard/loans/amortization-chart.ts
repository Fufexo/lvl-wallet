import { Component, computed, input, signal } from '@angular/core';

import { formatMoney } from '../../../shared/ui/money';
import { LoanRow } from '../data/loan';

const W = 640;
const H = 260;
const PAD = { top: 12, right: 8, bottom: 28, left: 56 };
const GAP = 2;
const RADIUS = 4;

interface Bar {
  readonly row: LoanRow;
  readonly x: number;
  readonly width: number;
  readonly principalY: number;
  readonly principalH: number;
  readonly interestPath: string;
  readonly slotX: number;
  readonly slotW: number;
}

const TICKS = 4;

/** A tick step of 1, 2, 2.5 or 5 × 10ⁿ that splits `max` into about four intervals. */
function niceStep(max: number): number {
  const raw = max / TICKS;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw)!;
}

/** Rectangle with only its top corners rounded (the data end away from the baseline). */
function topRounded(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/** Monthly installment split into principal and interest, one stacked bar per month. */
@Component({
  selector: 'app-amortization-chart',
  host: { class: 'relative block' },
  template: `
    <ul class="m-0 mb-3 flex list-none flex-wrap gap-5 p-0 text-sm text-muted" aria-hidden="true">
      <li class="flex items-center gap-2"><span class="size-3 rounded-sm bg-chart-principal"></span>Capital</li>
      <li class="flex items-center gap-2"><span class="size-3 rounded-sm bg-chart-interest"></span>Interés</li>
    </ul>

    <svg
      class="block h-auto w-full overflow-visible"
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      role="img"
      [attr.aria-label]="summary()"
      (pointerleave)="active.set(null)"
    >
      @for (t of ticks(); track t.value) {
        <line [attr.x1]="pad.left" [attr.x2]="width - pad.right" [attr.y1]="t.y" [attr.y2]="t.y" stroke="rgb(255 255 255 / 0.07)" />
        <text [attr.x]="pad.left - 10" [attr.y]="t.y + 4" text-anchor="end" class="fill-subtle font-mono text-[11px]">{{ t.label }}</text>
      }

      @for (b of bars(); track b.row.month) {
        <g [attr.opacity]="active() && active() !== b ? 0.45 : 1">
          <rect [attr.x]="b.x" [attr.y]="b.principalY" [attr.width]="b.width" [attr.height]="b.principalH" fill="var(--color-chart-principal)" />
          <path [attr.d]="b.interestPath" fill="var(--color-chart-interest)" />
        </g>
        <!-- Hit target: the whole column, wider and taller than the mark. -->
        <rect [attr.x]="b.slotX" [attr.y]="pad.top" [attr.width]="b.slotW" [attr.height]="plotBottom - pad.top" fill="transparent" (pointerenter)="active.set(b)" />
      }

      <line [attr.x1]="pad.left" [attr.x2]="width - pad.right" [attr.y1]="plotBottom" [attr.y2]="plotBottom" stroke="rgb(255 255 255 / 0.18)" />
      @for (b of labeledBars(); track b.row.month) {
        <text [attr.x]="b.x + b.width / 2" [attr.y]="height - 8" text-anchor="middle" class="fill-subtle font-mono text-[11px]">{{ b.row.month }}</text>
      }
    </svg>
    <p class="m-0 mt-1 text-center text-xs text-subtle" aria-hidden="true">Mes</p>

    @if (active(); as b) {
      <div
        class="pointer-events-none absolute top-8 z-10 w-44 -translate-x-1/2 rounded-panel border border-white/12 bg-ink-2 p-3 text-sm shadow-float"
        [style.left.%]="tooltipLeft(b)"
        aria-hidden="true"
      >
        <p class="m-0 mb-1.5 font-semibold">Mes {{ b.row.month }}</p>
        <p class="m-0 flex justify-between gap-3"><span class="flex items-center gap-1.5 text-muted"><span class="size-2.5 rounded-sm bg-chart-principal"></span>Capital</span><span class="font-mono">{{ money(b.row.principal) }}</span></p>
        <p class="m-0 flex justify-between gap-3"><span class="flex items-center gap-1.5 text-muted"><span class="size-2.5 rounded-sm bg-chart-interest"></span>Interés</span><span class="font-mono">{{ money(b.row.interest) }}</span></p>
        <p class="m-0 mt-1.5 flex justify-between gap-3 border-t border-white/10 pt-1.5"><span class="text-muted">Cuota</span><span class="font-mono">{{ money(b.row.payment) }}</span></p>
      </div>
    }
  `,
})
export class AmortizationChart {
  readonly rows = input.required<readonly LoanRow[]>();

  protected readonly width = W;
  protected readonly height = H;
  protected readonly pad = PAD;
  protected readonly plotBottom = H - PAD.bottom;
  protected readonly active = signal<Bar | null>(null);

  private readonly step = computed(() => niceStep(Math.max(1, ...this.rows().map((r) => r.payment))));
  private readonly yMax = computed(() => {
    const peak = Math.max(1, ...this.rows().map((r) => r.payment));
    return Math.ceil(peak / this.step()) * this.step();
  });
  private readonly y = (value: number) =>
    this.plotBottom - (value / this.yMax()) * (this.plotBottom - PAD.top);

  protected readonly ticks = computed(() => {
    const count = Math.round(this.yMax() / this.step());
    return Array.from({ length: count + 1 }, (_, i) => {
      const value = i * this.step();
      return { value, y: this.y(value), label: value >= 1000 ? `${value / 1000}k` : `${value}` };
    });
  });

  protected readonly bars = computed<Bar[]>(() => {
    const rows = this.rows();
    const slotW = (W - PAD.left - PAD.right) / rows.length;
    const width = Math.max(2, slotW - GAP);
    return rows.map((row, i) => {
      const slotX = PAD.left + i * slotW;
      const x = slotX + GAP / 2;
      const principalY = this.y(row.principal);
      const principalH = this.plotBottom - principalY;
      // The interest segment sits on top, separated by a 2px surface gap.
      const interestBottom = principalY - GAP;
      const interestH = Math.max(0, interestBottom - this.y(row.principal + row.interest));
      return {
        row,
        x,
        width,
        principalY,
        principalH,
        interestPath: topRounded(x, interestBottom - interestH, width, interestH, RADIUS),
        slotX,
        slotW,
      };
    });
  });

  /** Month labels thin out as the term grows, so they never collide. */
  protected readonly labeledBars = computed(() => {
    const bars = this.bars();
    const every = bars.length <= 12 ? 1 : bars.length <= 24 ? 3 : 6;
    return bars.filter((b) => b.row.month === 1 || b.row.month % every === 0);
  });

  protected readonly summary = computed(() => {
    const rows = this.rows();
    const first = rows[0];
    const last = rows.at(-1);
    if (!first || !last) return 'Sin datos';
    return (
      `Cuotas de ${rows.length} meses. En el mes 1 pagas ${this.money(first.interest)} de interés y ` +
      `${this.money(first.principal)} de capital; en el mes ${last.month}, ${this.money(last.interest)} de interés ` +
      `y ${this.money(last.principal)} de capital. El detalle está en el cronograma.`
    );
  });

  protected tooltipLeft(bar: Bar): number {
    const center = ((bar.x + bar.width / 2) / W) * 100;
    return Math.min(85, Math.max(15, center));
  }

  protected money(value: number): string {
    return formatMoney(value, 'PEN');
  }
}
