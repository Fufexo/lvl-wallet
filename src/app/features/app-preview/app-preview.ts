import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonLink } from '../../shared/ui/button-link';
import { Icon, IconName } from '../../shared/ui/icon';

interface Upcoming {
  readonly icon: IconName;
  readonly title: string;
  readonly text: string;
}

/** Placeholder for the upcoming banking dashboard (the target of "Ingresar" / "Crear cuenta"). */
@Component({
  selector: 'app-preview',
  imports: [ButtonLink, Icon, RouterLink],
  host: { class: 'relative block min-h-dvh overflow-x-clip bg-ink text-fg' },
  template: `
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -top-44 -left-40 size-155 animate-float rounded-full bg-violet opacity-40 blur-[90px]"></div>
      <div class="absolute -right-32 bottom-0 size-120 animate-float rounded-full bg-lime opacity-15 blur-[90px] [animation-delay:-6s]"></div>
    </div>

    <main class="page-container relative flex min-h-dvh flex-col justify-center gap-10 py-16">
      <a routerLink="/" class="inline-flex min-h-11 items-center gap-2 self-start text-dim no-underline transition-colors hover:text-fg">
        <app-icon name="arrow-left" class="size-4.5" />
        Volver al inicio
      </a>

      <div class="flex max-w-170 flex-col gap-6">
        <span class="eyebrow text-[13px] text-lime">Nivel 2 · En construcción</span>
        <h1 class="m-0 font-display text-[clamp(40px,6vw,80px)] leading-[0.95] font-black tracking-[-0.035em] uppercase">
          Tu panel está<br /><span class="text-lime">cargando.</span>
        </h1>
        <p class="m-0 max-w-130 text-[18px] text-muted">
          LVL es un proyecto de portafolio y el panel bancario es su siguiente fase. Esto es lo que
          vas a poder hacer cuando esté listo:
        </p>
      </div>

      <ul class="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
        @for (item of upcoming; track item.title) {
          <li class="glass flex flex-col gap-4 rounded-card p-7">
            <span class="grid size-12 place-items-center rounded-[14px] bg-lime/14 text-lime">
              <app-icon [name]="item.icon" class="size-6" />
            </span>
            <h2 class="m-0 font-display text-xl font-bold">{{ item.title }}</h2>
            <p class="m-0 text-[15px] text-muted">{{ item.text }}</p>
          </li>
        }
      </ul>

      <div class="flex flex-wrap gap-3">
        <a appButton routerLink="/" size="lg">Explorar la landing</a>
        <a appButton="glass" href="https://github.com/Fufexo" target="_blank" rel="noopener noreferrer" size="lg">
          Seguir el proyecto en GitHub<span class="sr-only"> (se abre en una pestaña nueva)</span>
        </a>
      </div>
    </main>
  `,
})
export class AppPreview {
  protected readonly upcoming: readonly Upcoming[] = [
    { icon: 'swap', title: 'Cuentas PEN y USD', text: 'Saldo y movimientos de cada cuenta, con filtros y búsqueda.' },
    { icon: 'arrow-right', title: 'Transferencias', text: 'Entre tus cuentas o a tu squad, con tipo de cambio en vivo.' },
    { icon: 'shield-check', title: 'Simulador de préstamos', text: 'Cuota mensual y tabla de amortización antes de decidir.' },
  ];
}
