import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NOW } from '../../../core/clock';
import { ExchangeRate } from '../../../core/exchange-rate';
import { BankStore, TRANSFER_LATENCY_MS, TransferError } from './bank-store';

describe('BankStore', () => {
  const rate = signal<number | null>(4);

  function setup(): BankStore {
    TestBed.configureTestingModule({
      providers: [
        { provide: NOW, useValue: () => new Date('2026-10-12T15:00:00') },
        { provide: ExchangeRate, useValue: { usdToPen: rate, status: signal('ready') } },
      ],
    });
    return TestBed.inject(BankStore);
  }

  async function settle<T>(promise: Promise<T>): Promise<T> {
    await vi.advanceTimersByTimeAsync(TRANSFER_LATENCY_MS);
    return promise;
  }

  beforeEach(() => {
    localStorage.clear();
    rate.set(4);
    vi.useFakeTimers({ toFake: ['setTimeout'] });
  });

  afterEach(() => vi.useRealTimers());

  it('starts from the demo data, newest movement first', () => {
    const store = setup();
    expect(store.account('pen')?.balance).toBe(1284.5);
    const dates = store.transactions().map((t) => t.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(store.progress().level).toBe(12);
  });

  it('values everything in soles once the rate is known', () => {
    const store = setup();
    expect(store.netWorthPen()).toBe(1284.5 + 210 * 4);
    rate.set(null);
    expect(store.netWorthPen()).toBeNull();
  });

  it('converts soles to dollars between own accounts and records both sides', async () => {
    const store = setup();
    const receipt = await settle(
      store.transfer({ fromId: 'pen', to: { kind: 'account', id: 'usd' }, amount: 100, note: 'ahorro' }),
    );

    expect(receipt).toMatchObject({ debit: 100, credit: 25, rate: 4, debitCurrency: 'PEN', creditCurrency: 'USD' });
    expect(store.account('pen')?.balance).toBe(1184.5);
    expect(store.account('usd')?.balance).toBe(235);
    expect(store.transactions().slice(0, 2).map((t) => t.description)).toEqual(
      expect.arrayContaining(['Transferencia a cuenta en dólares · ahorro']),
    );
  });

  it('only debits the source when paying a squad member', async () => {
    const store = setup();
    await settle(store.transfer({ fromId: 'usd', to: { kind: 'contact', id: 'vale' }, amount: 10, note: '' }));
    expect(store.account('usd')?.balance).toBe(200);
    expect(store.account('pen')?.balance).toBe(1284.5);
    expect(store.transactions()[0].description).toBe('Transferencia a @vale.gg');
  });

  it('rejects transfers above the balance or without a rate', async () => {
    const store = setup();
    const tooMuch = expect(
      store.transfer({ fromId: 'usd', to: { kind: 'contact', id: 'ana' }, amount: 999, note: '' }),
    ).rejects.toBeInstanceOf(TransferError);
    await vi.advanceTimersByTimeAsync(TRANSFER_LATENCY_MS);
    await tooMuch;

    rate.set(null);
    const noRate = expect(
      store.transfer({ fromId: 'pen', to: { kind: 'account', id: 'usd' }, amount: 10, note: '' }),
    ).rejects.toThrow('tipo de cambio');
    await vi.advanceTimersByTimeAsync(TRANSFER_LATENCY_MS);
    await noRate;
    expect(store.account('pen')?.balance).toBe(1284.5);
  });

  it('persists to localStorage and restores the demo on reset', async () => {
    const store = setup();
    await settle(store.transfer({ fromId: 'pen', to: { kind: 'contact', id: 'diego' }, amount: 50, note: '' }));
    TestBed.tick();
    expect(JSON.parse(localStorage.getItem('lvl.bank.v1')!).accounts[0].balance).toBe(1234.5);

    store.reset();
    expect(store.account('pen')?.balance).toBe(1284.5);
  });
});
