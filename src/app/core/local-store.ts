import { PLATFORM_ID, Service, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * JSON wrapper around localStorage. A no-op on the server, and silent when storage is
 * blocked (private mode, disabled site data) so the app keeps working in memory.
 */
@Service()
export class LocalStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  get(key: string): unknown {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  }

  set(key: string, value: unknown): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked: keep the in-memory state only.
    }
  }

  remove(key: string): void {
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore: nothing to clean up.
    }
  }
}
