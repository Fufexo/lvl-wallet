import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NOW } from '../../../core/clock';
import { ExchangeRate } from '../../../core/exchange-rate';
import { Session } from '../../../core/session';
import { BankError, BankStore } from './bank-store';
import { ApiMovement, toAccount, toTransaction } from './live-bank';

const PEN = '0199d5a0-0000-7000-8000-00000000a1b2';
const USD = '0199d5a0-0000-7000-8000-00000000c3d4';

const movement = (overrides: Partial<ApiMovement>): ApiMovement => ({
  id: 'm1',
  transferId: 't1',
  kind: 'WELCOME',
  description: 'Bono de bienvenida',
  amount: 500,
  currency: 'PEN',
  balanceAfter: 500,
  createdAt: '2026-10-13T20:00:00Z',
  ...overrides,
});

/** Lets pending promise chains (refresh → retry) run before the next expectation. */
const tick = () => new Promise((resolve) => setTimeout(resolve));

describe('live bank mapping', () => {
  it('names accounts by currency and masks the id', () => {
    expect(toAccount({ id: PEN, currency: 'PEN', balance: 500 })).toEqual({
      id: PEN,
      name: 'Cuenta en soles',
      currency: 'PEN',
      number: '•••• A1B2',
      balance: 500,
    });
  });

  it('maps movement kinds to categories and mission sources', () => {
    expect(toTransaction(movement({}), PEN)).toMatchObject({
      category: 'recompensas',
      source: undefined,
      xp: 0,
    });
    expect(toTransaction(movement({ kind: 'INTERNAL', amount: -75 }), PEN)).toMatchObject({
      category: 'transferencias',
      source: 'transfer-own',
      amount: -75,
    });
    expect(toTransaction(movement({ kind: 'P2P' }), PEN).source).toBe('transfer-squad');
  });
});

describe('BankStore with a real account', () => {
  let http: HttpTestingController;

  function setup(): BankStore {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NOW, useValue: () => new Date('2026-10-13T21:00:00Z') },
        { provide: ExchangeRate, useValue: { usdToPen: signal(3.75), status: signal('ready') } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(Session).startLive('fufexo');
    return TestBed.inject(BankStore);
  }

  /** Answers the requests of one reload: accounts, then each account's movements. */
  async function respondToLoad(penBalance = 500): Promise<void> {
    http.expectOne('/api/accounts').flush([
      { id: PEN, currency: 'PEN', balance: penBalance },
      { id: USD, currency: 'USD', balance: 50 },
    ]);
    await tick();
    http
      .expectOne((r) => r.url === `/api/accounts/${PEN}/movements`)
      .flush({ items: [movement({})] });
    http
      .expectOne((r) => r.url === `/api/accounts/${USD}/movements`)
      .flush({ items: [movement({ id: 'm2', currency: 'USD', amount: 50 })] });
  }

  async function load(store: BankStore): Promise<void> {
    const done = store.reload();
    await respondToLoad();
    await done;
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => http.verify());

  it('loads accounts and movements from the API, without demo data or XP', async () => {
    const store = setup();
    expect(store.status()).toBe('idle');
    await load(store);

    expect(store.status()).toBe('ready');
    expect(store.accounts().map((a) => a.name)).toEqual(['Cuenta en soles', 'Cuenta en dólares']);
    expect(store.transactions()).toHaveLength(2);
    expect(store.totalXp()).toBe(0);
    expect(localStorage.getItem('lvl.bank.v2') ?? '').not.toContain(PEN);
  });

  it('sends transfers to the server with an idempotency key and reloads', async () => {
    const store = setup();
    await load(store);

    const receipt = store.transfer(
      { fromId: PEN, to: { kind: 'player', gamertag: 'bob_gg' }, amount: 40, note: ' pizza ' },
      'key-123',
    );
    const req = http.expectOne('/api/transfers');
    expect(req.request.headers.get('Idempotency-Key')).toBe('key-123');
    expect(req.request.body).toEqual({
      sourceAccountId: PEN,
      recipientGamertag: 'bob_gg',
      amount: 40,
      note: 'pizza',
    });
    req.flush({
      id: 'tr1',
      sourceAmount: 40,
      sourceCurrency: 'PEN',
      targetAmount: 40,
      targetCurrency: 'PEN',
      createdAt: '2026-10-13T21:00:00Z',
    });
    await tick();
    await respondToLoad(460);

    await expect(receipt).resolves.toMatchObject({ id: 'tr1', toLabel: '@bob_gg', rate: null });
    expect(store.account(PEN)?.balance).toBe(460);
  });

  it('shows the server message when a rule rejects the transfer', async () => {
    const store = setup();
    await load(store);

    const receipt = store.transfer(
      { fromId: PEN, to: { kind: 'account', id: USD }, amount: 999, note: '' },
      'k',
    );
    http
      .expectOne('/api/transfers')
      .flush(
        { detail: 'No tienes saldo suficiente en esa cuenta.', code: 'INSUFFICIENT_FUNDS' },
        { status: 422, statusText: '' },
      );
    await expect(receipt).rejects.toEqual(
      new BankError('No tienes saldo suficiente en esa cuenta.'),
    );
  });

  it('refuses demo-only operations', async () => {
    const store = setup();
    await load(store);
    expect(() => store.record([])).toThrow(BankError);
  });
});
