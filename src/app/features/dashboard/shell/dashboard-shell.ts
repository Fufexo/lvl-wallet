import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, skip } from 'rxjs';

import { SmoothScroll } from '../../../core/motion/smooth-scroll';
import { Session } from '../../../core/session';
import { Icon, IconName } from '../../../shared/ui/icon';
import { ProgressBar } from '../../../shared/ui/progress-bar';
import { BankStore } from '../data/bank-store';

interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
  readonly exact: boolean;
}

@Component({
  selector: 'app-dashboard-shell',
  imports: [Icon, ProgressBar, RouterLink, RouterLinkActive, RouterOutlet],
  host: { class: 'block min-h-dvh bg-ink text-fg lg:grid lg:grid-cols-[272px_minmax(0,1fr)]' },
  template: `
    <a
      href="#contenido"
      class="sr-only z-[60] rounded-full bg-lime px-5 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
    >
      Saltar al contenido
    </a>

    <!-- Desktop sidebar -->
    <aside class="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-white/8 bg-ink-2/40 p-6 lg:flex">
      <a routerLink="/" class="flex items-center gap-2.5 text-fg no-underline">
        <span aria-hidden="true" class="grid size-8 place-items-center rounded-[10px] bg-lime font-display text-[13px] font-black text-ink">L</span>
        <span class="font-display text-lg font-bold tracking-wider">LVL</span>
        <span class="sr-only">— ir a la página de inicio</span>
      </a>

      <nav aria-label="Panel">
        <ul class="m-0 flex list-none flex-col gap-1 p-0">
          @for (item of nav; track item.path) {
            <li>
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-white/8 text-fg"
                ariaCurrentWhenActive="page"
                [routerLinkActiveOptions]="{ exact: item.exact }"
                class="flex min-h-12 items-center gap-3 rounded-panel px-4 text-dim no-underline transition-colors hover:bg-white/5 hover:text-fg"
              >
                <app-icon [name]="item.icon" class="size-5" />
                {{ item.label }}
              </a>
            </li>
          }
        </ul>
      </nav>

      <div class="mt-auto flex flex-col gap-4">
        <div class="panel flex flex-col gap-3 rounded-panel p-4">
          <div class="flex items-center gap-3">
            <span aria-hidden="true" class="grid size-10 place-items-center rounded-xl bg-lime font-display font-black text-ink uppercase">
              {{ initial() }}
            </span>
            <div class="min-w-0">
              <p class="m-0 truncate font-medium">{{ session.gamertag() }}</p>
              <p class="m-0 text-[13px] text-subtle">Nivel {{ bank.progress().level }} · {{ bank.progress().rank }}</p>
            </div>
          </div>
          <app-progress-bar
            class="h-2"
            label="Progreso al siguiente nivel"
            fillClass="bg-linear-to-r from-violet to-lime"
            [value]="bank.progress().xpInLevel"
            [max]="bank.progress().xpForNext"
            [valueText]="bank.progress().xpInLevel + ' de ' + bank.progress().xpForNext + ' XP'"
          />
        </div>

        <div class="flex flex-col gap-1">
          <button type="button" [class]="secondaryAction" (click)="resetDemo()">
            <app-icon name="refresh" class="size-4.5" />
            {{ confirmingReset() ? 'Confirmar: borrar mis cambios' : 'Reiniciar datos de demo' }}
          </button>
          <button type="button" [class]="secondaryAction" (click)="signOut()">
            <app-icon name="logout" class="size-4.5" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>

    <div class="flex min-w-0 flex-col">
      <!-- Mobile top bar -->
      <header class="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-white/8 bg-ink/85 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <a routerLink="/" class="flex min-h-11 items-center gap-2.5 text-fg no-underline">
          <span aria-hidden="true" class="grid size-8 place-items-center rounded-[10px] bg-lime font-display text-[13px] font-black text-ink">L</span>
          <span class="font-display font-bold tracking-wider">LVL</span>
          <span class="sr-only">— ir a la página de inicio</span>
        </a>
        <div class="flex items-center gap-1">
          <span class="rounded-full bg-violet/18 px-3 py-1.5 font-mono text-xs text-lilac">Nv. {{ bank.progress().level }}</span>
          <button
            type="button"
            class="grid size-11 place-items-center rounded-full text-dim transition-colors hover:bg-white/8 hover:text-fg"
            (click)="signOut()"
          >
            <app-icon name="logout" class="size-5" />
            <span class="sr-only">Cerrar sesión</span>
          </button>
        </div>
      </header>

      <main #main id="contenido" tabindex="-1" class="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-32 outline-none sm:px-6 lg:px-10 lg:pb-12">
        <router-outlet />
      </main>
    </div>

    <!-- Mobile bottom navigation -->
    <nav aria-label="Panel" class="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-ink-2/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul class="m-0 grid list-none grid-cols-4 p-0">
        @for (item of nav; track item.path) {
          <li>
            <a
              [routerLink]="item.path"
              routerLinkActive="text-lime"
              ariaCurrentWhenActive="page"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              class="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-dim no-underline"
            >
              <app-icon [name]="item.icon" class="size-5.5" />
              {{ item.short }}
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class DashboardShell {
  protected readonly session = inject(Session);
  protected readonly bank = inject(BankStore);
  private readonly router = inject(Router);
  private readonly scroll = inject(SmoothScroll);
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  protected readonly nav: readonly (NavItem & { short: string })[] = [
    { path: '/app', label: 'Resumen', short: 'Resumen', icon: 'home', exact: true },
    { path: '/app/movimientos', label: 'Movimientos', short: 'Movim.', icon: 'list', exact: false },
    { path: '/app/transferir', label: 'Transferir', short: 'Transferir', icon: 'send', exact: false },
    { path: '/app/prestamos', label: 'Simulador de préstamos', short: 'Préstamos', icon: 'calculator', exact: false },
  ];

  protected readonly secondaryAction =
    'flex min-h-11 w-full items-center gap-3 rounded-panel px-4 text-left text-sm text-dim transition-colors hover:bg-white/5 hover:text-fg';
  protected readonly confirmingReset = signal(false);
  protected readonly initial = () => this.session.gamertag()?.charAt(0) ?? '?';

  constructor() {
    // After each in-panel navigation: back to the top and focus on the new page's heading,
    // so screen reader and keyboard users land on the new content.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => {
        this.scroll.scrollToTop();
        requestAnimationFrame(() => {
          const heading = this.main().nativeElement.querySelector<HTMLElement>('h1');
          (heading ?? this.main().nativeElement).focus({ preventScroll: true });
        });
      });
  }

  protected resetDemo(): void {
    if (!this.confirmingReset()) {
      this.confirmingReset.set(true);
      setTimeout(() => this.confirmingReset.set(false), 4000);
      return;
    }
    this.bank.reset();
    this.confirmingReset.set(false);
  }

  protected signOut(): void {
    this.session.signOut();
    void this.router.navigateByUrl('/');
  }
}
