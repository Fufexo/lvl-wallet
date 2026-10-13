import { PLATFORM_ID, Service, computed, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';

interface RatesResponse {
  result: 'success' | 'error';
  rates: Record<string, number>;
  time_last_update_utc: string;
}

/**
 * Live USD → PEN rate from a free, key-less public API.
 * Only fetched in the browser so the prerendered page never ships a stale rate.
 */
@Service()
export class ExchangeRate {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly rates = httpResource<RatesResponse>(() =>
    this.isBrowser ? 'https://open.er-api.com/v6/latest/USD' : undefined,
  );

  /** Soles per 1 US dollar, or `null` while loading / on error. */
  readonly usdToPen = computed<number | null>(() =>
    this.rates.hasValue() ? (this.rates.value().rates['PEN'] ?? null) : null,
  );

  readonly status = computed<'loading' | 'ready' | 'error'>(() => {
    if (this.usdToPen() !== null) return 'ready';
    return this.rates.status() === 'error' ? 'error' : 'loading';
  });
}
