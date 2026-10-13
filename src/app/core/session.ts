import { CanActivateFn, Router } from '@angular/router';
import { Service, computed, inject, signal } from '@angular/core';

import { LocalStore } from './local-store';

const KEY = 'lvl.session.v1';

/**
 * - `demo`: only a gamertag; every number lives in this browser.
 * - `live`: an account on the LVL API. Tokens are never stored here: the access token lives
 *   in memory (AuthApi) and the refresh token in an HttpOnly cookie.
 */
export type SessionMode = 'demo' | 'live';

interface SessionState {
  readonly mode: SessionMode;
  readonly gamertag: string;
}

/**
 * Who is using the panel and in which mode. Read by client-rendered routes only, so it never
 * affects prerendered HTML.
 */
@Service()
export class Session {
  private readonly store = inject(LocalStore);
  private readonly state = signal<SessionState | null>(this.restore());

  readonly gamertag = computed(() => this.state()?.gamertag ?? null);
  readonly mode = computed(() => this.state()?.mode ?? null);
  readonly isLive = computed(() => this.mode() === 'live');
  readonly signedIn = computed(() => this.state() !== null);

  /** Demo profile: just a gamertag. */
  signIn(gamertag: string): void {
    this.save({ mode: 'demo', gamertag: gamertag.trim() });
  }

  /** Called by AuthApi once the API accepted the credentials. */
  startLive(gamertag: string): void {
    this.save({ mode: 'live', gamertag });
  }

  signOut(): void {
    this.state.set(null);
    this.store.remove(KEY);
  }

  private save(state: SessionState): void {
    this.state.set(state);
    // Demo sessions keep the original format (a plain string) so existing browsers stay signed in.
    this.store.set(KEY, state.mode === 'demo' ? state.gamertag : state);
  }

  private restore(): SessionState | null {
    const saved = this.store.get(KEY);
    if (typeof saved === 'string' && saved.length > 0) return { mode: 'demo', gamertag: saved };
    const live = saved as Partial<SessionState> | null;
    if (live?.mode === 'live' && typeof live.gamertag === 'string') return { mode: 'live', gamertag: live.gamertag };
    return null;
  }
}

/** Sends visitors without a session to /ingresar, remembering where they were going. */
export const requireSession: CanActivateFn = (_route, state) =>
  inject(Session).signedIn() ||
  inject(Router).createUrlTree(['/ingresar'], { queryParams: { volver: state.url } });

/** Lets a route match only in demo mode (features not yet backed by the API). */
export const demoOnly = () => inject(Session).mode() === 'demo';
