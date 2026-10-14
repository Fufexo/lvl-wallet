import { HttpClient } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';

import { Session } from '../session';
import { toApiError } from './api-error';

export interface Profile {
  readonly id: string;
  readonly gamertag: string;
  readonly email: string;
}

interface AuthResponse {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly user: Profile;
}

export interface RegisterRequest {
  readonly gamertag: string;
  readonly email: string;
  readonly password: string;
}

/**
 * Every tab shares the refresh cookie. A Web Lock makes tabs renew one after another, so no tab
 * ever presents a token that another tab has just rotated (which would look like a replay and
 * end the session). Browsers without Web Locks renew directly.
 */
function acrossTabs<T>(work: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  return locks ? locks.request('lvl-auth-refresh', work) : work();
}

/**
 * Sign-in against the LVL API. The access token stays in memory only (a page reload gets a new
 * one through the HttpOnly refresh cookie), so a script injected into the page cannot steal a
 * long-lived credential from storage.
 */
@Service()
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly session = inject(Session);

  private readonly token = signal<string | null>(null);
  readonly accessToken = this.token.asReadonly();

  private refreshing: Promise<boolean> | null = null;

  register(request: RegisterRequest): Promise<Profile> {
    return this.start(this.http.post<AuthResponse>('/api/auth/register', request));
  }

  /** `login` is a gamertag or an email. */
  login(login: string, password: string): Promise<Profile> {
    return this.start(this.http.post<AuthResponse>('/api/auth/login', { login, password }));
  }

  /**
   * Gets a new access token from the refresh cookie. Concurrent callers share one request:
   * refresh tokens rotate, so two parallel refreshes would look like a replayed token and
   * end the session.
   */
  refresh(): Promise<boolean> {
    this.refreshing ??= acrossTabs(() => this.renew()).finally(() => (this.refreshing = null));
    return this.refreshing;
  }

  /** Revokes the session on the server; the local session is cleared even if that fails. */
  async logout(): Promise<void> {
    this.token.set(null);
    try {
      await firstValueFrom(this.http.post('/api/auth/logout', null));
    } catch {
      // Offline or already expired: nothing else to revoke.
    }
  }

  private async renew(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>('/api/auth/refresh', null),
      );
      this.token.set(response.accessToken);
      return true;
    } catch {
      this.token.set(null);
      return false;
    }
  }

  private async start(request: Observable<AuthResponse>): Promise<Profile> {
    try {
      const response = await firstValueFrom(request);
      this.token.set(response.accessToken);
      this.session.startLive(response.user.gamertag);
      return response.user;
    } catch (error) {
      throw toApiError(error);
    }
  }
}
