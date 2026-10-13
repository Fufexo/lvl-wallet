import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NOW } from '../../../core/clock';
import { ExchangeRate } from '../../../core/exchange-rate';
import { BankError, BankStore, LATENCY_MS } from './bank-store';
import { CardsStore } from './cards-store';
import { SquadStore, shareOf } from './squad-store';

describe('cards & squad', () => {
  let bank: BankStore;
  let cards: CardsStore;
  let squad: SquadStore;

  /** Runs an async store call through the simulated latency. */
  async function run<T>(call: () => Promise<T>): Promise<T> {
    const promise = call();
    await vi.advanceTimersByTimeAsync(LATENCY_MS);
    return promise;
  }

  async function expectError(call: () => Promise<unknown>, message: string): Promise<void> {
    const assertion = expect(call()).rejects.toThrow(message);
    await vi.advanceTimersByTimeAsync(LATENCY_MS);
    await assertion;
  }

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    TestBed.configureTestingModule({
      providers: [
        { provide: NOW, useValue: () => new Date('2026-10-12T15:00:00') },
        { provide: ExchangeRate, useValue: { usdToPen: signal(4), status: signal('ready') } },
      ],
    });
    bank = TestBed.inject(BankStore);
    cards = TestBed.inject(CardsStore);
    squad = TestBed.inject(SquadStore);
  });

  afterEach(() => vi.useRealTimers());

  describe('virtual cards', () => {
    it('issues cards that expire in three years, up to three at a time', async () => {
      const card = await run(() => cards.create({ label: 'Torneo', accountId: 'usd', limit: 50 }));
      expect(card.expiry).toBe('10/29');
      expect(card.last4).toMatch(/^\d{4}$/);

      await run(() => cards.create({ label: 'Otra', accountId: 'pen', limit: 20 }));
      expect(cards.canCreate()).toBe(false);
      await expectError(() => cards.create({ label: 'Una más', accountId: 'pen', limit: 20 }), 'hasta 3 tarjetas');
    });

    it('pays, earns XP and gets cashback at the current level', async () => {
      const receipt = await run(() => cards.purchase('card-1', 'gift', 100));

      expect(receipt).toMatchObject({ xp: 100, cashback: 2, cashbackRate: 2, currency: 'PEN' });
      expect(bank.account('pen')?.balance).toBe(1284.5 - 100 + 2);
      expect(cards.card('card-1')?.spent).toBe(100);
      expect(bank.transactions().slice(0, 2).map((t) => t.description)).toEqual([
        'Cashback 2% · Gift card',
        'Gift card · tarjeta Tienda nueva',
      ]);
    });

    it('reports a level up', async () => {
      // 2,943 XP today: 57 more reaches level 13.
      const receipt = await run(() => cards.purchase('card-1', 'streaming', 60));
      expect(receipt.levelUp).toBe(13);
    });

    it('blocks frozen cards, the card limit and the monthly games limit', async () => {
      cards.toggleFreeze('card-1');
      await expectError(() => cards.purchase('card-1', 'gift', 10), 'congelada');

      cards.toggleFreeze('card-1');
      await expectError(() => cards.purchase('card-1', 'gift', 301), 'tope de esta tarjeta');
      await expectError(() => cards.purchase('card-1', 'tienda', 50), 'límite mensual de juegos');
      expect(bank.account('pen')?.balance).toBe(1284.5);
    });
  });

  describe('squad subscriptions', () => {
    it('splits evenly with the player included', () => {
      expect(shareOf({ amount: 25, members: [{ contactId: 'a', paid: false }, { contactId: 'b', paid: false }, { contactId: 'c', paid: false }] })).toBe(6.25);
    });

    it('pays in full, then records each share as it arrives', async () => {
      const sub = await run(() => squad.create({ name: 'Música', amount: 30, accountId: 'pen', memberIds: ['diego', 'ana'] }));
      expect(bank.account('pen')?.balance).toBe(1254.5);
      expect(squad.pendingPen()).toBe(12.5 + 20); // seed: 2 × 6.25 pending; new: 2 × 10

      await run(() => squad.markPaid(sub.id, 'ana'));
      expect(bank.account('pen')?.balance).toBe(1264.5);
      expect(bank.transactions()[0].description).toBe('Pago de @anitapro · Música');
      expect(squad.subscriptions().at(-1)?.members.find((m) => m.contactId === 'ana')?.paid).toBe(true);
    });

    it('needs at least one squad member', async () => {
      await expectError(() => squad.create({ name: 'Solo', amount: 10, accountId: 'pen', memberIds: [] }), 'al menos a una persona');
      expect(BankError).toBeDefined();
    });
  });
});
