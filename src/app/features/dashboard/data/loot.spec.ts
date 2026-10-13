// Partner offers, savings goals and weekly missions.
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NOW } from '../../../core/clock';
import { ExchangeRate } from '../../../core/exchange-rate';
import { BankStore, LATENCY_MS } from './bank-store';
import { CardsStore } from './cards-store';
import { MissionsStore, weekStart } from './missions-store';
import { OffersStore, offerBadge } from './offers-store';
import { SavingsStore } from './savings-store';

/** Monday, 2 Nov 2026: games spending this month is only today's seed purchases. */
const MONDAY = new Date('2026-11-02T15:00:00');

describe('offers, savings & missions', () => {
  let bank: BankStore;
  let cards: CardsStore;
  let offers: OffersStore;
  let savings: SavingsStore;
  let missions: MissionsStore;

  async function run<T>(call: () => Promise<T>): Promise<T> {
    const promise = call();
    await vi.advanceTimersByTimeAsync(LATENCY_MS);
    return promise;
  }

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    TestBed.configureTestingModule({
      providers: [
        { provide: NOW, useValue: () => MONDAY },
        { provide: ExchangeRate, useValue: { usdToPen: signal(4), status: signal('ready') } },
      ],
    });
    bank = TestBed.inject(BankStore);
    cards = TestBed.inject(CardsStore);
    offers = TestBed.inject(OffersStore);
    savings = TestBed.inject(SavingsStore);
    missions = TestBed.inject(MissionsStore);
  });

  afterEach(() => vi.useRealTimers());

  describe('partner offers', () => {
    it('unlocks by level and shows how long they last', () => {
      const byId = Object.fromEntries(offers.offers().map((o) => [o.id, o]));
      expect(byId['arena-xp']).toMatchObject({ status: 'available', daysLeft: 3 });
      expect(byId['lumen-xp']).toMatchObject({ status: 'locked', xpToUnlock: 3500 - 2943 });
      expect(() => offers.activate('lumen-xp')).toThrow('nivel 15');
      expect(offerBadge(byId['bitforja-pase'])).toBe('-15%');
    });

    it('doubles XP at the partner store once activated', async () => {
      offers.activate('arena-xp');
      const receipt = await run(() => cards.purchase('card-1', 'tienda', 30));
      expect(receipt.xp).toBe(60);
      expect(receipt.offers[0]).toMatchObject({ partner: 'Arena Nova', effect: '+30 XP extra' });
      expect(bank.transactions().find((t) => t.source === 'card')?.offerIds).toEqual(['arena-xp']);
    });

    it('applies discounts to the charge and caps extra cashback', async () => {
      offers.activate('cofre-gift');
      const gift = await run(() => cards.purchase('card-1', 'gift', 200));
      expect(gift.cashback).toBe(4 + 15); // 2% level cashback + capped 10% bonus

      offers.activate('bitforja-pase');
      const pass = await run(() => cards.purchase('card-1', 'pase', 20));
      expect(pass).toMatchObject({ price: 20, amount: 17 });
    });
  });

  describe('savings goals', () => {
    it('moves money in and out of a goal through the account', async () => {
      const reached = await run(() => savings.deposit('goal-1', 50));
      expect(reached).toBe(false);
      expect(savings.goal('goal-1')?.saved).toBe(290);
      expect(bank.account('pen')?.balance).toBe(1234.5);

      await run(() => savings.withdraw('goal-1', 90));
      expect(savings.goal('goal-1')?.saved).toBe(200);
      expect(bank.account('pen')?.balance).toBe(1324.5);
    });

    it('rounds card purchases up into the goal and returns everything when closed', async () => {
      const receipt = await run(() => cards.purchase('card-1', 'gift', 10.4));
      expect(receipt.roundUp).toBe(0.6);
      expect(savings.goal('goal-1')?.saved).toBe(240.6);

      const before = bank.account('pen')!.balance;
      savings.remove('goal-1');
      expect(bank.account('pen')?.balance).toBe(before + 240.6);
      expect(savings.goals()).toHaveLength(0);
    });
  });

  describe('weekly missions', () => {
    it('weeks start on Monday', () => {
      expect(weekStart(new Date('2026-11-08T22:00:00')).getDate()).toBe(2);
      expect(missions.daysLeft()).toBe(7);
    });

    it('tracks progress from this week’s movements and pays the reward once', async () => {
      expect(missions.claimable()).toBe(0);
      await run(() => bank.transfer({ fromId: 'pen', to: { kind: 'contact', id: 'vale' }, amount: 10, note: '' }));
      await run(() => savings.deposit('goal-1', 60));

      const view = Object.fromEntries(missions.missions().map((m) => [m.id, m]));
      expect(view['send-squad']).toMatchObject({ done: true, progress: 1 });
      expect(view['save-50']).toMatchObject({ done: true, progress: 50 });
      expect(missions.claimable()).toBe(2);

      const xp = bank.totalXp();
      missions.claim('save-50');
      expect(bank.totalXp()).toBe(xp + 200);
      expect(missions.claim('save-50')).toBeNull();
      expect(bank.totalXp()).toBe(xp + 200);
      expect(() => missions.claim('card-3')).toThrow('Todavía no');
    });
  });
});
