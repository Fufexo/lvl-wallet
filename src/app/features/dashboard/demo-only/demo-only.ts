import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthApi } from '../../../core/api/auth-api';
import { Session } from '../../../core/session';
import { Button } from '../../../shared/ui/button';
import { Icon } from '../../../shared/ui/icon';

/**
 * Shown to real accounts on sections the API does not back yet (cards, loot, missions,
 * savings, squad). Offers to open the same section in the demo instead of a dead end.
 */
@Component({
  selector: 'app-demo-only',
  imports: [Button, Icon, RouterLink],
  host: { class: 'mx-auto flex w-full max-w-2xl flex-col gap-6' },
  template: `
    <header class="flex flex-col gap-2">
      <span class="eyebrow text-xs text-lime">Solo en la demo</span>
      <h1
        tabindex="-1"
        class="m-0 font-display text-[clamp(28px,4vw,44px)] leading-none font-bold tracking-[-0.02em] outline-none"
      >
        {{ section() }}
      </h1>
    </header>

    <section class="glass flex flex-col gap-5 rounded-card p-6 sm:p-8">
      <span class="grid size-12 place-items-center rounded-xl bg-violet/18 text-lilac">
        <app-icon name="cloud" class="size-6" />
      </span>
      <p class="m-0 text-lg">Esta sección todavía funciona solo en el modo demo.</p>
      <p class="m-0 text-muted">
        Tu cuenta real ya tiene el resumen, los movimientos y las transferencias conectados al
        servidor.
        {{ section() }} es de las próximas en migrarse. Mientras tanto, puedes probarla en la demo
        con datos de ejemplo.
      </p>
      <div class="flex flex-col gap-3 sm:flex-row">
        <button type="button" appButton size="lg" [disabled]="switching()" (click)="openDemo()">
          Probar en la demo
          <app-icon name="arrow-right" class="size-4.5" [strokeWidth]="2.2" />
        </button>
        <a appButton="glass" size="lg" routerLink="/app">Volver al resumen</a>
      </div>
      <p class="m-0 text-sm text-subtle">
        Al pasar a la demo se cierra la sesión de tu cuenta real.
      </p>
    </section>
  `,
})
export class DemoOnly {
  /** Route data: the section's name. */
  readonly section = input('Esta sección');

  private readonly auth = inject(AuthApi);
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  protected readonly switching = signal(false);

  protected async openDemo(): Promise<void> {
    const gamertag = this.session.gamertag() ?? 'jugador';
    const here = this.router.url;
    this.switching.set(true);
    await this.auth.logout();
    this.session.signIn(gamertag);
    await this.router.navigateByUrl(here);
  }
}
