import { InjectionToken } from '@angular/core';

/** Current time, injectable so tests can freeze it. */
export const NOW = new InjectionToken<() => Date>('NOW', {
  providedIn: 'root',
  factory: () => () => new Date(),
});
