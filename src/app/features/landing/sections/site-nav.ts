import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonLink } from '../../../shared/ui/button-link';
import { Icon } from '../../../shared/ui/icon';

@Component({
  selector: 'app-site-nav',
  imports: [ButtonLink, Icon, RouterLink],
  host: {
    class: 'sticky top-4 z-50 block px-4 sm:px-6 lg:px-12',
    '(document:keydown.escape)': 'onEscape()',
  },
  template: `
    <nav
      aria-label="Principal"
      class="glass relative mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-full py-2 pr-2 pl-5"
    >
      <a href="#inicio" class="flex items-center gap-2.5 text-fg no-underline">
        <span
          aria-hidden="true"
          class="grid size-8 place-items-center rounded-[10px] bg-lime font-display text-[13px] font-black text-ink"
          >L</span
        >
        <span class="font-display text-lg font-bold tracking-wider">LVL</span>
      </a>

      <ul class="m-0 hidden list-none gap-8 p-0 text-[15px] md:flex">
        @for (link of links; track link.href) {
          <li>
            <a [href]="link.href" class="text-dim no-underline transition-colors hover:text-fg">
              {{ link.label }}
            </a>
          </li>
        }
      </ul>

      <div class="flex items-center gap-1">
        <a
          routerLink="/app"
          class="hidden min-h-11 items-center px-4 text-[15px] text-fg no-underline transition-colors hover:text-lime sm:inline-flex"
        >
          Ingresar
        </a>
        <a appButton href="#unete">Crear cuenta</a>
        <button
          #toggle
          type="button"
          class="grid size-11 place-items-center rounded-full text-fg transition-colors hover:bg-white/10 md:hidden"
          aria-controls="menu-movil"
          [attr.aria-expanded]="open()"
          (click)="open.set(!open())"
        >
          <span class="sr-only">{{ open() ? 'Cerrar menú' : 'Abrir menú' }}</span>
          <app-icon [name]="open() ? 'close' : 'menu'" class="size-5" />
        </button>
      </div>

      <!-- Solid surface: a nested backdrop-filter would not blur inside the glass nav. -->
      <div
        id="menu-movil"
        class="absolute inset-x-0 top-full mt-2 rounded-card border border-white/12 bg-ink-2/97 p-2 shadow-float md:hidden"
        [hidden]="!open()"
      >
        <ul class="m-0 flex list-none flex-col p-0 text-base">
          @for (link of links; track link.href) {
            <li>
              <a
                [href]="link.href"
                class="flex min-h-12 items-center rounded-panel px-4 text-fg no-underline hover:bg-white/6"
                (click)="open.set(false)"
              >
                {{ link.label }}
              </a>
            </li>
          }
          <li class="mt-1 border-t border-white/8 pt-1">
            <a
              routerLink="/app"
              class="flex min-h-12 items-center rounded-panel px-4 text-fg no-underline hover:bg-white/6"
            >
              Ingresar
            </a>
          </li>
        </ul>
      </div>
    </nav>
  `,
})
export class SiteNav {
  protected readonly links = [
    { href: '#funciones', label: 'Funciones' },
    { href: '#como-funciona', label: 'Cómo funciona' },
    { href: '#seguridad', label: 'Seguridad' },
  ] as const;

  protected readonly open = signal(false);
  private readonly toggle = viewChild.required<ElementRef<HTMLButtonElement>>('toggle');

  protected onEscape(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.toggle().nativeElement.focus();
  }
}
