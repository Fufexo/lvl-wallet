import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Reveal } from '../../../core/motion/reveal';
import { Button } from '../../../shared/ui/button';

@Component({
  selector: 'app-final-cta',
  imports: [Reveal, Button, RouterLink],
  host: { class: 'block' },
  template: `
    <section id="unete" class="relative z-10 pt-8 pb-24">
      <div class="page-container">
        <div
          appReveal
          class="glass relative flex flex-col items-center gap-7 overflow-hidden rounded-hero px-[clamp(24px,5vw,72px)] py-[clamp(40px,7vw,96px)] text-center"
        >
          <div
            aria-hidden="true"
            class="pointer-events-none absolute -bottom-80 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-lime opacity-28 blur-[100px]"
          ></div>

          <span class="relative font-mono text-[13px] tracking-[0.14em] text-soft uppercase">Press start</span>
          <h2 class="relative m-0 font-display text-[clamp(40px,7vw,96px)] leading-[0.95] font-black tracking-[-0.035em] uppercase">
            ¿Listo para<br /><span class="text-lime">el nivel 1?</span>
          </h2>
          <p class="relative m-0 max-w-115 text-dim">
            Abre tu cuenta gratis y recibe tus primeros 500 XP de bienvenida.
          </p>
          <a
            appButton
            routerLink="/ingresar"
            size="xl"
            class="relative shadow-[0_0_50px_rgb(198_255_61/0.45)] hover:scale-[1.03]"
          >
            Crear mi cuenta
          </a>
        </div>
      </div>
    </section>
  `,
})
export class FinalCta {}
