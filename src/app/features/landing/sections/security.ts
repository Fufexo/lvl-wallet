import { Component } from '@angular/core';

import { Reveal } from '../../../core/motion/reveal';
import { Icon, IconName } from '../../../shared/ui/icon';

@Component({
  selector: 'app-security',
  imports: [Reveal, Icon],
  host: { class: 'block' },
  template: `
    <section id="seguridad" class="relative z-10 pt-16 pb-28">
      <div class="page-container grid items-center gap-12 lg:grid-cols-2">
        <div appReveal class="flex flex-col gap-5">
          <span class="eyebrow text-[13px] text-lilac">Seguridad nivel jefe final</span>
          <h2 class="m-0 font-display text-[clamp(30px,3.8vw,52px)] leading-[1.05] font-bold tracking-[-0.03em]">
            Tu dinero no tiene<br />vidas extra.
          </h2>
          <p class="m-0 max-w-120 text-muted">
            Por eso lo protegemos como si no las tuviera: cifrado de extremo a extremo, biometría y
            alertas en tiempo real.
          </p>
        </div>

        <ul appReveal="children" class="m-0 flex list-none flex-col gap-3 p-0">
          @for (item of items; track item.icon) {
            <li class="panel flex items-center gap-4 rounded-[20px] px-6 py-5">
              <app-icon [name]="item.icon" class="size-5.5 text-lime" />
              <span>{{ item.text }}</span>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
})
export class Security {
  protected readonly items: readonly { icon: IconName; text: string }[] = [
    { icon: 'lock', text: 'Cifrado de extremo a extremo en cada operación' },
    { icon: 'fingerprint', text: 'Ingreso con huella o rostro' },
    { icon: 'bell', text: 'Alerta inmediata de cada movimiento' },
    { icon: 'freeze', text: 'Congela tu tarjeta con un toque' },
  ];
}
