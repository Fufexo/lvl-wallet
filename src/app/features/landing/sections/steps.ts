import { Component } from '@angular/core';

import { Reveal } from '../../../core/motion/reveal';

@Component({
  selector: 'app-steps',
  imports: [Reveal],
  host: { class: 'block' },
  template: `
    <section id="como-funciona" class="relative z-10 pt-16 pb-28">
      <div class="page-container flex flex-col gap-12">
        <h2 appReveal class="m-0 font-display text-[clamp(34px,4.6vw,64px)] leading-none font-bold tracking-[-0.03em]">
          Tres pasos.<br /><span class="text-faint">Cero tutorial.</span>
        </h2>

        <ol appReveal="children" class="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
          @for (step of steps; track step.n; let last = $last) {
            <li class="glass flex flex-col gap-4 rounded-card p-8" [class]="last ? 'border-lime/35!' : ''">
              <span
                class="font-display text-[64px] leading-none font-black"
                [class]="last ? 'text-lime [text-shadow:0_0_30px_rgb(198_255_61/0.4)]' : 'text-outline'"
                aria-hidden="true"
                >{{ step.n }}</span
              >
              <h3 class="m-0 font-display text-[22px] font-bold">
                <span class="sr-only">Paso {{ step.n }}: </span>{{ step.title }}
              </h3>
              <p class="m-0 text-muted">{{ step.text }}</p>
            </li>
          }
        </ol>
      </div>
    </section>
  `,
})
export class Steps {
  protected readonly steps = [
    { n: '01', title: 'Crea tu perfil', text: 'Valida tu DNI desde el celular en menos de cinco minutos.' },
    { n: '02', title: 'Recarga tu saldo', text: 'Por transferencia, billetera móvil o en efectivo en agentes.' },
    { n: '03', title: 'Juega y gana XP', text: 'Paga con tu tarjeta LVL y mira cómo sube tu nivel.' },
  ] as const;
}
