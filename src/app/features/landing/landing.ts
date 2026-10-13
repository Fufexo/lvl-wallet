import { Component } from '@angular/core';

import { Bento } from './sections/bento';
import { FinalCta } from './sections/final-cta';
import { Hero } from './sections/hero';
import { Security } from './sections/security';
import { SiteFooter } from './sections/site-footer';
import { SiteNav } from './sections/site-nav';
import { Stats } from './sections/stats';
import { Steps } from './sections/steps';

@Component({
  selector: 'app-landing',
  imports: [SiteNav, Hero, Stats, Bento, Steps, Security, FinalCta, SiteFooter],
  host: { class: 'relative block min-h-dvh overflow-x-clip bg-ink pt-6 text-fg' },
  template: `
    <a
      href="#contenido"
      class="sr-only z-[60] rounded-full bg-lime px-5 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
    >
      Saltar al contenido
    </a>

    <!-- Ambient glow -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -top-44 -left-40 size-[620px] animate-float rounded-full bg-violet opacity-45 blur-[90px]"></div>
      <div class="absolute top-40 -right-32 size-[480px] animate-float rounded-full bg-lime opacity-20 blur-[90px] [animation-delay:-6s]"></div>
      <div class="absolute top-[2100px] left-[30%] size-[520px] animate-float rounded-full bg-violet opacity-25 blur-[90px] [animation-delay:-3s]"></div>
    </div>

    <app-site-nav />

    <main id="contenido" tabindex="-1" class="outline-none">
      <app-hero />
      <app-stats />
      <app-bento />
      <app-steps />
      <app-security />
      <app-final-cta />
    </main>

    <app-site-footer />
  `,
})
export class Landing {}
