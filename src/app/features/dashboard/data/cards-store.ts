import { Service, computed, effect, inject, signal } from '@angular/core';

import { NOW } from '../../../core/clock';
import { LocalStore } from '../../../core/local-store';
import { formatMoney } from '../../../shared/ui/money';
import { BankError, BankStore, round2, simulateLatency } from './bank-store';
import { Category, Currency, VirtualCard } from './models';
import { SEED_CARDS } from './seed';

const KEY = 'lvl.cards.v1';
export const MAX_CARDS = 3;

export interface Merchant {
  readonly id: string;
  readonly label: string;
  readonly category: Category;
}

export const MERCHANTS: readonly Merchant[] = [
  { id: 'tienda', label: 'Tienda de juegos', category: 'juegos' },
  { id: 'pase', label: 'Pase de batalla', category: 'juegos' },
  { id: 'gift', label: 'Gift card', category: 'gift-cards' },
  { id: 'streaming', label: 'Suscripción de streaming', category: 'suscripciones' },
];

export interface NewCard {
  readonly label: string;
  readonly accountId: string;
  readonly limit: number;
}

export interface PurchaseReceipt {
  readonly merchant: string;
  readonly amount: number;
  readonly currency: Currency;
  readonly xp: number;
  readonly cashback: number;
  readonly cashbackRate: number;
  /** The new level when this purchase levelled the player up. */
  readonly levelUp: number | null;
}

/**
 * Disposable virtual cards. Each card spends from one account, up to its own limit,
 * and every purchase earns XP and cashback at the player's current level.
 */
@Service()
export class CardsStore {
  private readonly storage = inject(LocalStore);
  private readonly now = inject(NOW);
  private readonly bank = inject(BankStore);

  private readonly state = signal<readonly VirtualCard[]>(this.restore());

  readonly cards = this.state.asReadonly();
  readonly canCreate = computed(() => this.state().length < MAX_CARDS);

  constructor() {
    effect(() => this.storage.set(KEY, this.state()));
  }

  card(id: string): VirtualCard | undefined {
    return this.state().find((c) => c.id === id);
  }

  async create(request: NewCard): Promise<VirtualCard> {
    await simulateLatency();
    if (!this.canCreate()) throw new BankError(`Puedes tener hasta ${MAX_CARDS} tarjetas a la vez.`);
    if (!this.bank.account(request.accountId)) throw new BankError('La cuenta no existe.');

    const card: VirtualCard = {
      id: `card-${Date.now().toString(36)}`,
      label: request.label.trim(),
      accountId: request.accountId,
      last4: String(1000 + Math.floor(Math.random() * 9000)),
      expiry: this.expiry(),
      limit: request.limit,
      spent: 0,
      frozen: false,
    };
    this.state.update((cards) => [...cards, card]);
    return card;
  }

  toggleFreeze(id: string): void {
    this.state.update((cards) => cards.map((c) => (c.id === id ? { ...c, frozen: !c.frozen } : c)));
  }

  remove(id: string): void {
    this.state.update((cards) => cards.filter((c) => c.id !== id));
  }

  async purchase(cardId: string, merchantId: string, amount: number): Promise<PurchaseReceipt> {
    await simulateLatency();

    const card = this.card(cardId);
    const merchant = MERCHANTS.find((m) => m.id === merchantId);
    if (!card || !merchant) throw new BankError('Elige una tarjeta y una tienda.');
    if (card.frozen) throw new BankError('Esta tarjeta está congelada. Descongélala para usarla.');
    if (!(amount > 0)) throw new BankError('El monto debe ser mayor a cero.');

    const currency = this.bank.currencyOf(card.accountId);
    const left = round2(card.limit - card.spent);
    if (amount > left) {
      throw new BankError(`Supera el tope de esta tarjeta: te quedan ${formatMoney(left, currency)}.`);
    }

    const amountPen = this.bank.inPen(amount, currency);
    if (amountPen === null) throw new BankError('El tipo de cambio no está disponible. Intenta en unos segundos.');

    if (merchant.category === 'juegos') {
      const remaining = round2(this.bank.gamesMonthlyLimit - this.bank.gamesSpentThisMonth());
      if (amountPen > remaining) {
        throw new BankError(
          `Supera tu límite mensual de juegos: te quedan ${formatMoney(Math.max(0, remaining), 'PEN')}.`,
        );
      }
    }

    this.bank.assertFunds(card.accountId, amount);

    const levelBefore = this.bank.progress().level;
    const cashbackRate = this.bank.progress().cashback;
    const xp = Math.round(amountPen);
    const cashback = round2((amount * cashbackRate) / 100);

    this.bank.record([
      {
        accountId: card.accountId,
        description: `${merchant.label} · tarjeta ${card.label}`,
        category: merchant.category,
        amount: -amount,
        xp,
      },
      ...(cashback > 0
        ? [
            {
              accountId: card.accountId,
              description: `Cashback ${cashbackRate}% · ${merchant.label}`,
              category: 'cashback' as const,
              amount: cashback,
              xp: 0,
            },
          ]
        : []),
    ]);
    this.state.update((cards) =>
      cards.map((c) => (c.id === card.id ? { ...c, spent: round2(c.spent + amount) } : c)),
    );

    const levelAfter = this.bank.progress().level;
    return {
      merchant: merchant.label,
      amount,
      currency,
      xp,
      cashback,
      cashbackRate,
      levelUp: levelAfter > levelBefore ? levelAfter : null,
    };
  }

  reset(): void {
    this.state.set(this.seed());
  }

  /** Cards expire three years after they are issued. */
  private expiry(): string {
    const now = this.now();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${month}/${String((now.getFullYear() + 3) % 100).padStart(2, '0')}`;
  }

  private seed(): VirtualCard[] {
    return SEED_CARDS.map((c) => ({ ...c, expiry: this.expiry() }));
  }

  private restore(): readonly VirtualCard[] {
    const saved = this.storage.get(KEY);
    return Array.isArray(saved) ? (saved as VirtualCard[]) : this.seed();
  }
}
