import { Component } from '@angular/core';

@Component({
  selector: 'app-site-footer',
  host: { class: 'block' },
  template: `
    <footer class="relative z-10 border-t border-white/8 pt-8 pb-10">
      <div
        class="page-container flex flex-wrap items-center justify-between gap-4 text-sm text-subtle"
      >
        <span class="font-display font-bold text-fg">LVL</span>
        <span>Proyecto de portafolio · marca ficticia · Lima, Perú</span>
        <nav aria-label="Pie de página" class="flex gap-6">
          <a href="https://github.com/Fufexo/lvl-wallet" target="_blank" rel="noopener noreferrer" class="text-dim no-underline hover:text-fg">
            Código en GitHub<span class="sr-only"> (se abre en una pestaña nueva)</span>
          </a>
          <a href="#inicio" class="text-dim no-underline hover:text-fg">Volver arriba</a>
        </nav>
      </div>
    </footer>
  `,
})
export class SiteFooter {}
