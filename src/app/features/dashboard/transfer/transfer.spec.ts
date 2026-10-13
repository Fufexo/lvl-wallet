import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NOW } from '../../../core/clock';
import { ExchangeRate } from '../../../core/exchange-rate';
import { BankStore, TRANSFER_LATENCY_MS } from '../data/bank-store';
import { Transfer } from './transfer';

describe('Transfer wizard', () => {
  let fixture: ComponentFixture<Transfer>;
  let el: HTMLElement;

  const text = () => el.textContent!.replace(/\s+/g, ' ');
  const button = (label: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.includes(label))!;

  async function type(selector: string, value: string): Promise<void> {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: NOW, useValue: () => new Date('2026-10-12T15:00:00') },
        { provide: ExchangeRate, useValue: { usdToPen: signal(4), status: signal('ready') } },
      ],
    });
    fixture = TestBed.createComponent(Transfer);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('blocks an incomplete form with an inline error and a focusable summary', async () => {
    button('Revisar transferencia').click();
    await fixture.whenStable();

    const summary = el.querySelector('[role="alert"]');
    expect(summary?.textContent).toContain('Escribe cuánto quieres enviar.');
    expect(el.querySelector('#amount-error')?.textContent).toContain('Escribe cuánto quieres enviar.');
    expect(text()).toContain('¿Cuánto y a quién?');
  });

  it('rejects amounts above the balance before reaching the confirmation', async () => {
    await type('#amount', '5000');
    button('Revisar transferencia').click();
    await fixture.whenStable();

    expect(el.querySelector('#amount-error')?.textContent).toContain('Tu saldo disponible es S/ 1,284.50.');
  });

  it('previews the conversion, confirms and sends', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    try {
      await type('#amount', '100');
      expect(text()).toContain('Llegan US$ 25.00');

      button('Revisar transferencia').click();
      await fixture.whenStable();
      expect(text()).toContain('Confirma los datos');
      expect(text()).toContain('Cuenta en dólares');

      button('Confirmar y enviar').click();
      await fixture.whenStable();
      expect(text()).toContain('Enviando…');

      await vi.advanceTimersByTimeAsync(TRANSFER_LATENCY_MS);
      await fixture.whenStable();

      expect(text()).toContain('¡Transferencia enviada!');
      expect(text()).toContain('Enviaste S/ 100.00 a cuenta en dólares y llegaron US$ 25.00.');
      const bank = TestBed.inject(BankStore);
      expect(bank.account('pen')?.balance).toBe(1184.5);
      expect(bank.account('usd')?.balance).toBe(235);
    } finally {
      vi.useRealTimers();
    }
  });
});
