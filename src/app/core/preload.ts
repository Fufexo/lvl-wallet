import { Service } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

/**
 * Preloads only routes marked with `data: { preload: true }` (the dashboard pages), and only
 * once their parent has been loaded: the landing never downloads dashboard code.
 * Respects the user's data saver.
 */
@Service()
export class PreloadFlagged implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    const saveData =
      typeof navigator !== 'undefined' &&
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    return route.data?.['preload'] && !saveData ? load() : of(null);
  }
}
