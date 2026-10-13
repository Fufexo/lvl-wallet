import { Pipe, PipeTransform } from '@angular/core';

export type CurrencyCode = 'PEN' | 'USD';

const SYMBOLS: Record<CurrencyCode, string> = { PEN: 'S/', USD: 'US$' };
const NUMBER = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * "S/ 1,284.50", "-US$ 29.99", or "+S/ 25.00" with `signed`.
 * Uses the same notation as the landing instead of the es-PE locale ("USD 210.00").
 */
export function formatMoney(amount: number, currency: CurrencyCode, signed = false): string {
  const sign = amount < 0 ? '-' : signed && amount > 0 ? '+' : '';
  return `${sign}${SYMBOLS[currency]} ${NUMBER.format(Math.abs(amount))}`;
}

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(amount: number, currency: CurrencyCode, signed = false): string {
    return formatMoney(amount, currency, signed);
  }
}
