import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Icon } from '../../../shared/ui/icon';
import { ProgressBar } from '../../../shared/ui/progress-bar';
import { BankError } from '../data/bank-store';
import { MissionView, MissionsStore } from '../data/missions-store';

@Component({
  selector: 'app-missions',
  imports: [Icon, ProgressBar, RouterLink],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-2">
        <span class="eyebrow text-xs text-lime">Misiones semanales</span>
        <h1 tabindex="-1" class="m-0 font-display text-[clamp(28px,4vw,44px)] leading-none font-bold tracking-[-0.02em] outline-none">
          Misiones
        </h1>
        <p class="m-0 max-w-150 text-muted">
          Cada semana hay nuevas. Complétalas usando el panel y reclama el XP.
          Se renuevan en {{ store.daysLeft() }} {{ store.daysLeft() === 1 ? 'día' : 'días' }}.
        </p>
      </div>
      <div class="panel rounded-panel px-5 py-3">
        <p class="m-0 text-sm text-label">XP de la semana</p>
        <p class="m-0 font-mono text-2xl font-bold text-lilac">{{ earned() }} / {{ total() }}</p>
      </div>
    </header>

    <p role="status" class="m-0 min-h-6 text-sm text-lime">{{ notice() }}</p>

    <ul class="m-0 flex list-none flex-col gap-3 p-0">
      @for (m of store.missions(); track m.id) {
        <li class="glass flex flex-col gap-4 rounded-card p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6" [class]="m.done && !m.claimed ? 'border-lime/40!' : ''">
          <span
            class="grid size-12 flex-none place-items-center rounded-xl"
            [class]="m.claimed ? 'bg-lime text-ink' : m.done ? 'bg-lime/14 text-lime' : 'bg-violet/18 text-lilac'"
          >
            <app-icon [name]="m.claimed ? 'check' : 'flag'" class="size-5" />
          </span>

          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 class="m-0 font-display text-lg font-bold">{{ m.title }}</h2>
              <span class="rounded-full bg-violet/18 px-2.5 py-0.5 font-mono text-xs text-lilac">+{{ m.reward }} XP</span>
            </div>
            <p class="m-0 text-sm text-muted">{{ m.description }}</p>
            <div class="flex items-center gap-3">
              <app-progress-bar
                class="h-2 flex-1"
                [label]="'Progreso de ' + m.title"
                [fillClass]="m.done ? 'bg-lime' : 'bg-violet'"
                [value]="m.progress"
                [max]="m.target"
                [valueText]="progressText(m)"
              />
              <span class="font-mono text-xs text-subtle">{{ progressText(m) }}</span>
            </div>
          </div>

          <div class="flex flex-none items-center gap-2">
            @if (m.claimed) {
              <span class="inline-flex items-center gap-1.5 text-sm text-lime"><app-icon name="check" class="size-4" /> Reclamada</span>
            } @else if (m.done) {
              <button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-full bg-lime px-5 font-semibold text-ink shadow-glow-lime transition hover:bg-lime-soft" (click)="claim(m)">
                <app-icon name="sparkle" class="size-4.5" /> Reclamar {{ m.reward }} XP
              </button>
            } @else {
              <a [routerLink]="m.link" class="inline-flex min-h-11 items-center gap-1 rounded-full border border-white/12 px-4 text-sm text-fg no-underline hover:bg-white/8">
                {{ m.linkLabel }} <app-icon name="chevron-right" class="size-4" />
              </a>
            }
          </div>
        </li>
      }
    </ul>
  `,
})
export class Missions {
  protected readonly store = inject(MissionsStore);
  protected readonly notice = signal('');

  protected readonly total = computed(() => this.store.missions().reduce((sum, m) => sum + m.reward, 0));
  protected readonly earned = computed(() =>
    this.store.missions().reduce((sum, m) => sum + (m.claimed ? m.reward : 0), 0),
  );

  protected progressText(m: MissionView): string {
    return m.unit === 'soles' ? `S/ ${m.progress} de S/ ${m.target}` : `${m.progress} de ${m.target}`;
  }

  protected claim(m: MissionView): void {
    try {
      const level = this.store.claim(m.id);
      this.notice.set(
        level ? `¡+${m.reward} XP! Subiste al nivel ${level}.` : `¡+${m.reward} XP por «${m.title}»!`,
      );
    } catch (e) {
      this.notice.set(e instanceof BankError ? e.message : 'No pudimos reclamar la recompensa.');
    }
  }
}
