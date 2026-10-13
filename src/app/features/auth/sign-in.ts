import { Component, afterNextRender, inject, input, linkedSignal, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  FormField,
  FormRoot,
  TreeValidationResult,
  email,
  form,
  maxLength,
  minLength,
  pattern,
  required,
} from '@angular/forms/signals';

import { ApiError, toApiError } from '../../core/api/api-error';
import { AuthApi } from '../../core/api/auth-api';
import { Session, SessionMode } from '../../core/session';
import { Button } from '../../shared/ui/button';
import { FieldError } from '../../shared/ui/field-error';
import { Icon } from '../../shared/ui/icon';

/** Only same-app dashboard paths are accepted as a return target (no open redirects). */
export function safeReturn(url: string | undefined): string {
  return url && /^\/app(\/|\?|$)/.test(url) ? url : '/app';
}

type Mode = 'demo' | 'login' | 'register';

/** After this long, a pending sign-in explains that the free API server is waking up. */
const SLOW_MS = 3000;

@Component({
  selector: 'app-sign-in',
  imports: [Button, FieldError, FormField, FormRoot, Icon, NgTemplateOutlet, RouterLink],
  host: { class: 'relative block min-h-dvh overflow-x-clip bg-ink text-fg' },
  templateUrl: './sign-in.html',
})
export class SignIn {
  /** `?volver=` query param: where the guard was sending the visitor. */
  readonly volver = input<string>();
  /** `?sesion=expirada`: a real account's session could not be renewed. */
  readonly sesion = input<string>();

  private readonly session = inject(Session);
  private readonly auth = inject(AuthApi);
  private readonly router = inject(Router);

  protected readonly modes = [
    { id: 'demo', label: 'Probar demo' },
    { id: 'login', label: 'Ingresar' },
    { id: 'register', label: 'Crear cuenta' },
  ] as const;
  protected readonly mode = linkedSignal<Mode>(() => (this.sesion() === 'expirada' ? 'login' : 'demo'));

  /** Read after hydration only, so the prerendered page never depends on browser storage. */
  protected readonly returning = signal<{ gamertag: string; mode: SessionMode } | null>(null);
  protected readonly target = () => safeReturn(this.volver());

  protected readonly showPassword = signal(false);
  protected readonly busy = signal(false);
  protected readonly slow = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly demoModel = signal({ gamertag: '' });
  protected readonly profile = form(
    this.demoModel,
    (p) => {
      required(p.gamertag, { message: 'Escribe un gamertag para continuar.' });
      minLength(p.gamertag, 3, { message: 'Usa al menos 3 caracteres.' });
      maxLength(p.gamertag, 16, { message: 'Usa como máximo 16 caracteres.' });
      pattern(p.gamertag, /^[\p{L}\d_.]+$/u, { message: 'Solo letras, números, punto o guion bajo.' });
    },
    {
      submission: {
        action: async () => {
          this.session.signIn(this.demoModel().gamertag);
          await this.router.navigateByUrl(this.target());
          return undefined;
        },
      },
    },
  );

  private readonly loginModel = signal({ login: '', password: '' });
  protected readonly loginForm = form(
    this.loginModel,
    (p) => {
      required(p.login, { message: 'Escribe tu gamertag o tu correo.' });
      required(p.password, { message: 'Escribe tu contraseña.' });
    },
    {
      submission: {
        action: (f) =>
          this.liveSubmit(
            () => this.auth.login(this.loginModel().login.trim(), this.loginModel().password),
            // Wrong credentials: shown on the password, without saying which part was wrong.
            (e) => (e.status === 401 ? [{ kind: 'server', message: e.message, fieldTree: f.password }] : []),
          ),
      },
    },
  );

  private readonly registerModel = signal({ gamertag: '', email: '', password: '' });
  protected readonly registerForm = form(
    this.registerModel,
    (p) => {
      required(p.gamertag, { message: 'Elige un gamertag.' });
      pattern(p.gamertag, /^[A-Za-z0-9_]{3,16}$/, { message: 'Usa de 3 a 16 letras, números o guion bajo.' });
      required(p.email, { message: 'Escribe tu correo.' });
      email(p.email, { message: 'Escribe un correo válido, como nombre@correo.com.' });
      required(p.password, { message: 'Crea una contraseña.' });
      minLength(p.password, 10, { message: 'Usa al menos 10 caracteres.' });
      maxLength(p.password, 72, { message: 'Usa como máximo 72 caracteres.' });
    },
    {
      submission: {
        action: (f) =>
          this.liveSubmit(
            () => {
              const { gamertag, email: address, password } = this.registerModel();
              return this.auth.register({ gamertag: gamertag.trim(), email: address.trim(), password });
            },
            (e) => {
              const fields = { gamertag: f.gamertag, email: f.email, password: f.password };
              const mapped = e.fields
                .filter((x): x is typeof x & { field: keyof typeof fields } => x.field in fields)
                .map((x) => ({ kind: 'server', message: x.message, fieldTree: fields[x.field] }));
              // "Gamertag or email already in use" after a race: point at the gamertag.
              return mapped.length || e.status !== 409
                ? mapped
                : [{ kind: 'server', message: e.message, fieldTree: f.gamertag }];
            },
          ),
      },
    },
  );

  constructor() {
    afterNextRender(() => {
      const gamertag = this.session.gamertag();
      const mode = this.session.mode();
      this.returning.set(gamertag && mode ? { gamertag, mode } : null);
    });
  }

  protected setMode(mode: Mode): void {
    this.mode.set(mode);
    this.formError.set(null);
  }

  /**
   * Runs a sign-in against the API. Errors the API tied to a field are returned to the form
   * (shown next to that field); anything else, such as the server being unreachable, is shown
   * above the submit button.
   */
  private async liveSubmit(
    run: () => Promise<unknown>,
    toFieldErrors: (error: ApiError) => TreeValidationResult,
  ): Promise<TreeValidationResult> {
    this.formError.set(null);
    this.busy.set(true);
    const timer = setTimeout(() => this.slow.set(true), SLOW_MS);
    try {
      await run();
      await this.router.navigateByUrl(this.target());
      return undefined;
    } catch (e) {
      const error = toApiError(e);
      const fieldErrors = toFieldErrors(error);
      if (Array.isArray(fieldErrors) && fieldErrors.length) return fieldErrors;
      this.formError.set(error.message);
      return undefined;
    } finally {
      clearTimeout(timer);
      this.busy.set(false);
      this.slow.set(false);
    }
  }
}
