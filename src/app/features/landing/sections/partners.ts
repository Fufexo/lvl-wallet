import { Component } from '@angular/core';

import { Reveal } from '../../../core/motion/reveal';

/** Fictional partner brands whose offers appear in the dashboard's "Botín". */
@Component({
  selector: 'app-partners',
  imports: [Reveal],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="partners-title" class="relative z-10 pb-20">
      <div appReveal class="page-container flex flex-col items-center gap-6 text-center">
        <h2 id="partners-title" class="m-0 eyebrow text-xs font-normal text-subtle">
          Ofertas con aliados · marcas de demostración
        </h2>
        <ul class="m-0 flex list-none flex-wrap items-center justify-center gap-x-10 gap-y-4 p-0">
          @for (p of partners; track p.name) {
            <li class="flex items-center gap-2.5 text-dim">
              <span aria-hidden="true" class="grid size-8 place-items-center rounded-lg bg-white/6 font-display text-xs font-black text-soft">{{ p.mark }}</span>
              <span class="font-display text-lg font-bold tracking-tight">{{ p.name }}</span>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
})
export class Partners {
  protected readonly partners = [
    { name: 'Arena Nova', mark: 'AN' },
    { name: 'Bitforja', mark: 'BF' },
    { name: 'Lumen Play', mark: 'LP' },
    { name: 'Cofre Andino', mark: 'CA' },
  ] as const;
}
