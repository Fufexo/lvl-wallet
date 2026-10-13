import { Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthApi } from '../../../core/api/auth-api';
import { SmoothScroll } from '../../../core/motion/smooth-scroll';
import { Session } from '../../../core/session';
import { Button } from '../../../shared/ui/button';
import { Icon, IconName } from '../../../shared/ui/icon';
import { ProgressBar } from '../../../shared/ui/progress-bar';
import { BankStore } from '../data/bank-store';
import { DemoData } from '../data/demo-data';
import { MissionsStore } from '../data/missions-store';

interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: IconName;
  readonly exact: boolean;
  /** Runs on demo data only for now (see DemoOnly). */
  readonly demo?: boolean;
}

@Component({
  selector: 'app-dashboard-shell',
  imports: [Button, Icon, ProgressBar, RouterLink, RouterLinkActive, RouterOutlet],
  host: {
    class: 'block min-h-dvh bg-ink text-fg lg:grid lg:grid-cols-[272px_minmax(0,1fr)]',
    '(document:keydown.escape)': 'closeMore(true)',
  },
  templateUrl: './dashboard-shell.html',
})
export class DashboardShell {
  protected readonly session = inject(Session);
  protected readonly bank = inject(BankStore);
  private readonly router = inject(Router);
  private readonly scroll = inject(SmoothScroll);
  private readonly demo = inject(DemoData);
  private readonly auth = inject(AuthApi);
  protected readonly missions = inject(MissionsStore);
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');
  private readonly moreToggle = viewChild<ElementRef<HTMLButtonElement>>('moreToggle');

  protected readonly groups: readonly { title: string; items: readonly (NavItem & { short: string })[] }[] = [
    {
      title: 'Dinero',
      items: [
        { path: '/app', label: 'Resumen', short: 'Resumen', icon: 'home', exact: true },
        { path: '/app/movimientos', label: 'Movimientos', short: 'Movim.', icon: 'list', exact: false },
        { path: '/app/transferir', label: 'Transferir', short: 'Transferir', icon: 'send', exact: false },
        { path: '/app/cofres', demo: true, label: 'Cofres de ahorro', short: 'Cofres', icon: 'target', exact: false },
      ],
    },
    {
      title: 'Juego',
      items: [
        { path: '/app/tarjetas', demo: true, label: 'Tarjetas virtuales', short: 'Tarjetas', icon: 'card', exact: false },
        { path: '/app/botin', demo: true, label: 'Botín de aliados', short: 'Botín', icon: 'tag', exact: false },
        { path: '/app/misiones', demo: true, label: 'Misiones', short: 'Misiones', icon: 'flag', exact: false },
        { path: '/app/squad', demo: true, label: 'Squad', short: 'Squad', icon: 'users', exact: false },
      ],
    },
    {
      title: 'Crédito',
      items: [
        { path: '/app/prestamos', label: 'Simulador de préstamos', short: 'Préstamos', icon: 'calculator', exact: false },
      ],
    },
  ];
  protected readonly nav = this.groups.flatMap((g) => g.items);

  /** Mobile: four destinations in the bar, the rest behind "Más" (max five items). */
  private readonly inBar = ['/app', '/app/movimientos', '/app/transferir', '/app/tarjetas'];
  protected readonly bottomItems = this.nav.filter((i) => this.inBar.includes(i.path));
  protected readonly moreItems = this.nav.filter((i) => !this.inBar.includes(i.path));
  protected readonly moreOpen = signal(false);
  private readonly url = signal(this.router.url);
  protected readonly moreActive = computed(() => this.moreItems.some((i) => this.url().startsWith(i.path)));

  protected readonly secondaryAction =
    'flex min-h-11 w-full items-center gap-3 rounded-panel px-4 text-left text-sm text-dim transition-colors hover:bg-white/5 hover:text-fg';
  protected readonly confirmingReset = signal(false);
  protected readonly initial = () => this.session.gamertag()?.charAt(0) ?? '?';
  /** Missions are demo-only for now: no badge for real accounts. */
  protected readonly claimable = computed(() => (this.bank.live() ? 0 : this.missions.claimable()));
  /** The free API server sleeps when idle: explain the wait once loading takes a while. */
  protected readonly slow = signal(false);

  constructor() {
    effect(() => this.bank.ensureLoaded());
    effect((onCleanup) => {
      if (this.bank.status() !== 'loading') {
        this.slow.set(false);
        return;
      }
      const timer = setTimeout(() => this.slow.set(true), 3000);
      onCleanup(() => clearTimeout(timer));
    });

    // After each in-panel navigation: back to the top and focus on the new page's heading,
    // so screen reader and keyboard users land on the new content.
    // On a fresh page load the browser already starts at the top: skip that first focus move.
    // Arriving from another page of the app (e.g. after signing in) still moves focus.
    let first = !this.router.navigated;
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((e) => {
        this.url.set(e.urlAfterRedirects);
        this.moreOpen.set(false);
        if (first) {
          first = false;
          return;
        }
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
    this.demo.reset();
    this.confirmingReset.set(false);
  }

  protected closeMore(restoreFocus = false): void {
    if (!this.moreOpen()) return;
    this.moreOpen.set(false);
    if (restoreFocus) this.moreToggle()?.nativeElement.focus();
  }

  protected async signOut(): Promise<void> {
    if (this.session.isLive()) await this.auth.logout();
    this.session.signOut();
    void this.router.navigateByUrl('/');
  }
}
