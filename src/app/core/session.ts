import { CanActivateFn, Router } from '@angular/router';
import { Service, computed, inject, signal } from '@angular/core';

import { LocalStore } from './local-store';

const KEY = 'lvl.session.v1';

/**
 * Demo session: only a gamertag, no credentials. It lives in the browser and is read by
 * client-rendered routes only, so it never affects prerendered HTML.
 */
@Service()
export class Session {
  private readonly store = inject(LocalStore);
  private readonly tag = signal(this.restore());

  readonly gamertag = this.tag.asReadonly();
  readonly signedIn = computed(() => this.tag() !== null);

  signIn(gamertag: string): void {
    const tag = gamertag.trim();
    this.tag.set(tag);
    this.store.set(KEY, tag);
  }

  signOut(): void {
    this.tag.set(null);
    this.store.remove(KEY);
  }

  private restore(): string | null {
    const saved = this.store.get(KEY);
    return typeof saved === 'string' && saved.length > 0 ? saved : null;
  }
}

/** Sends visitors without a session to /ingresar, remembering where they were going. */
export const requireSession: CanActivateFn = (_route, state) =>
  inject(Session).signedIn() ||
  inject(Router).createUrlTree(['/ingresar'], { queryParams: { volver: state.url } });
