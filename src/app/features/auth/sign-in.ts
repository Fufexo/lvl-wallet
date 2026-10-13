import { Component, afterNextRender, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, FormRoot, form, maxLength, minLength, pattern, required } from '@angular/forms/signals';

import { Session } from '../../core/session';
import { Button } from '../../shared/ui/button';
import { FieldError } from '../../shared/ui/field-error';
import { Icon } from '../../shared/ui/icon';

/** Only same-app dashboard paths are accepted as a return target (no open redirects). */
export function safeReturn(url: string | undefined): string {
  return url && /^\/app(\/|\?|$)/.test(url) ? url : '/app';
}

@Component({
  selector: 'app-sign-in',
  imports: [Button, FieldError, FormField, FormRoot, Icon, RouterLink],
  host: { class: 'relative block min-h-dvh overflow-x-clip bg-ink text-fg' },
  template: `
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -top-44 -left-40 size-155 animate-float rounded-full bg-violet opacity-40 blur-[90px]"></div>
      <div class="absolute -right-32 bottom-0 size-120 animate-float rounded-full bg-lime opacity-15 blur-[90px] [animation-delay:-6s]"></div>
    </div>

    <main class="page-container relative grid min-h-dvh content-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div class="flex flex-col gap-6">
        <a routerLink="/" class="inline-flex min-h-11 items-center gap-2 self-start text-dim no-underline transition-colors hover:text-fg">
          <app-icon name="arrow-left" class="size-4.5" />
          Volver al inicio
        </a>
        <span class="eyebrow text-[13px] text-lime">Press start</span>
        <h1 class="m-0 font-display text-[clamp(40px,6vw,80px)] leading-[0.95] font-black tracking-[-0.035em] uppercase">
          Entra a tu<br /><span class="text-lime">panel.</span>
        </h1>
        <p class="m-0 max-w-120 text-[18px] text-muted">
          Cuentas en soles y dólares, transferencias con tipo de cambio en vivo y un simulador de
          préstamos que premia tu nivel.
        </p>
      </div>

      <section aria-labelledby="form-title" class="glass flex flex-col gap-6 rounded-card p-7 sm:p-9">
        <div class="flex flex-col gap-2">
          <h2 id="form-title" class="m-0 font-display text-2xl font-bold">Crea tu perfil de demo</h2>
          <p class="m-0 text-[15px] text-muted">
            No pedimos contraseña ni datos reales: elige un gamertag y listo. Todo se guarda solo
            en este navegador.
          </p>
        </div>

        @if (returning(); as tag) {
          <div class="panel flex flex-wrap items-center justify-between gap-3 rounded-panel px-5 py-4">
            <p class="m-0 text-[15px]">Ya tienes una sesión como <strong class="text-lime">{{ tag }}</strong></p>
            <a appButton [routerLink]="target()" size="md">Continuar</a>
          </div>
        }

        <form [formRoot]="profile" class="flex flex-col gap-5">
          <div>
            <label for="gamertag" class="mb-2 block font-medium">Gamertag</label>
            <input
              id="gamertag"
              type="text"
              autocomplete="nickname"
              autocapitalize="off"
              spellcheck="false"
              aria-describedby="gamertag-hint gamertag-error"
              class="panel min-h-13 w-full rounded-panel px-4 font-mono text-lg text-fg outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-lime"
              placeholder="ej. fufexo_gg"
              [formField]="profile.gamertag"
              [attr.aria-invalid]="profile.gamertag().touched() && profile.gamertag().invalid()"
            />
            <p id="gamertag-hint" class="m-0 mt-2 text-sm text-subtle">De 3 a 16 caracteres: letras, números, punto o guion bajo.</p>
            <app-field-error id="gamertag-error" [state]="profile.gamertag()" />
          </div>

          <button
            type="submit"
            class="inline-flex min-h-13 items-center justify-center gap-2.5 rounded-full bg-lime px-7 font-semibold text-ink shadow-glow-lime transition hover:bg-lime-soft"
          >
            Entrar al panel
            <app-icon name="arrow-right" class="size-4.5" [strokeWidth]="2.2" />
          </button>
        </form>
      </section>
    </main>
  `,
})
export class SignIn {
  /** `?volver=` query param: where the guard was sending the visitor. */
  readonly volver = input<string>();

  private readonly session = inject(Session);
  private readonly router = inject(Router);

  /** Read after hydration only, so the prerendered page never depends on browser storage. */
  protected readonly returning = signal<string | null>(null);
  protected readonly target = () => safeReturn(this.volver());

  private readonly model = signal({ gamertag: '' });
  protected readonly profile = form(
    this.model,
    (p) => {
      required(p.gamertag, { message: 'Escribe un gamertag para continuar.' });
      minLength(p.gamertag, 3, { message: 'Usa al menos 3 caracteres.' });
      maxLength(p.gamertag, 16, { message: 'Usa como máximo 16 caracteres.' });
      pattern(p.gamertag, /^[\p{L}\d_.]+$/u, { message: 'Solo letras, números, punto o guion bajo.' });
    },
    {
      submission: {
        action: async () => {
          this.session.signIn(this.model().gamertag);
          await this.router.navigateByUrl(this.target());
          return undefined;
        },
      },
    },
  );

  constructor() {
    afterNextRender(() => this.returning.set(this.session.gamertag()));
  }
}
