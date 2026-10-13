import { Service, computed, effect, inject, signal } from '@angular/core';

import { NOW } from '../../../core/clock';
import { ExchangeRate } from '../../../core/exchange-rate';
import { LocalStore } from '../../../core/local-store';
import { Account, Contact, Currency, Transaction } from './models';
import { progressFor } from './progression';
import { CONTACTS, GAMES_MONTHLY_LIMIT, PREVIOUS_XP, SEED_ACCOUNTS, seedTransactions } from './seed';

const KEY = 'lvl.bank.v2';

interface BankState {
  readonly accounts: readonly Account[];
  readonly transactions: readonly Transaction[];
}

export type Destination =
  | { readonly kind: 'account'; readonly id: string }
  | { readonly kind: 'contact'; readonly id: string };

export interface TransferRequest {
  readonly fromId: string;
  readonly to: Destination;
  readonly amount: number;
  readonly note: string;
}

export interface TransferQuote {
  readonly debit: number;
  readonly debitCurrency: Currency;
  readonly credit: number;
  readonly creditCurrency: Currency;
  /** Soles per dollar used, or null when no conversion is needed. */
  readonly rate: number | null;
}

export interface TransferReceipt extends TransferQuote {
  readonly id: string;
  readonly date: string;
  readonly toLabel: string;
}

/** A business rule rejected the operation; the message is shown to the player as is. */
export class BankError extends Error {}

/** A movement about to be recorded: id and date are assigned by the store. */
export type NewMovement = Omit<Transaction, 'id' | 'date'>;

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Simulated network latency so the UI has real pending states. */
export const LATENCY_MS = 700;

export function simulateLatency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
}

@Service()
export class BankStore {
  private readonly storage = inject(LocalStore);
  private readonly now = inject(NOW);
  private readonly fx = inject(ExchangeRate);

  private readonly state = signal<BankState>(this.restore());

  readonly accounts = computed(() => this.state().accounts);
  readonly contacts: readonly Contact[] = CONTACTS;
  readonly usdToPen = this.fx.usdToPen;

  /** Newest first; movements recorded at the same instant keep "last recorded on top". */
  readonly transactions = computed(() =>
    this.state()
      .transactions.map((t, i) => ({ t, i }))
      .sort((a, b) => b.t.date.localeCompare(a.t.date) || b.i - a.i)
      .map(({ t }) => t),
  );

  readonly totalXp = computed(
    () => PREVIOUS_XP + this.state().transactions.reduce((sum, t) => sum + t.xp, 0),
  );
  readonly progress = computed(() => progressFor(this.totalXp()));

  /** Everything expressed in soles, or null until the exchange rate arrives. */
  readonly netWorthPen = computed(() => {
    const rate = this.usdToPen();
    if (rate === null) return null;
    return round2(this.accounts().reduce((sum, a) => sum + this.convert(a.balance, a.currency, rate), 0));
  });

  /** Games spending in the current calendar month, in soles (USD converted when the rate is known). */
  readonly gamesSpentThisMonth = computed(() => {
    const now = this.now();
    const rate = this.usdToPen() ?? 0;
    return round2(
      this.state()
        .transactions.filter((t) => {
          const d = new Date(t.date);
          return t.category === 'juegos' && t.amount < 0 && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, t) => sum - this.convert(t.amount, this.currencyOf(t.accountId), rate), 0),
    );
  });
  readonly gamesMonthlyLimit = GAMES_MONTHLY_LIMIT;

  constructor() {
    effect(() => this.storage.set(KEY, this.state()));
  }

  account(id: string): Account | undefined {
    return this.accounts().find((a) => a.id === id);
  }

  /** What leaves the source account and what arrives at the destination. */
  quote(fromId: string, to: Destination, amount: number): TransferQuote | null {
    const from = this.account(fromId);
    if (!from) return null;
    const creditCurrency = to.kind === 'account' ? this.account(to.id)?.currency : from.currency;
    if (!creditCurrency) return null;
    if (creditCurrency === from.currency) {
      return { debit: amount, debitCurrency: from.currency, credit: amount, creditCurrency, rate: null };
    }
    const rate = this.usdToPen();
    if (rate === null) return null;
    const credit = from.currency === 'PEN' ? amount / rate : amount * rate;
    return { debit: amount, debitCurrency: from.currency, credit: round2(credit), creditCurrency, rate };
  }

  async transfer(request: TransferRequest): Promise<TransferReceipt> {
    await simulateLatency();

    const from = this.account(request.fromId);
    if (!from) throw new BankError('La cuenta de origen no existe.');
    if (request.to.kind === 'account' && request.to.id === from.id) {
      throw new BankError('Elige una cuenta de destino distinta a la de origen.');
    }
    if (!(request.amount > 0)) throw new BankError('El monto debe ser mayor a cero.');
    this.assertFunds(from.id, request.amount);

    const quote = this.quote(from.id, request.to, request.amount);
    if (!quote) throw new BankError('El tipo de cambio no está disponible. Intenta en unos segundos.');

    const toLabel = this.destinationLabel(request.to);
    const note = request.note.trim();
    const description = (label: string) => (note ? `${label} · ${note}` : label);

    const movements: NewMovement[] = [
      {
        accountId: from.id,
        description: description(`Transferencia a ${toLabel}`),
        category: 'transferencias',
        amount: -quote.debit,
        xp: 0,
      },
    ];
    if (request.to.kind === 'account') {
      movements.push({
        accountId: request.to.id,
        description: description(`Transferencia desde ${from.name.toLowerCase()}`),
        category: 'transferencias',
        amount: quote.credit,
        xp: 0,
      });
    }

    const [out] = this.record(movements);
    return { ...quote, id: out.id, date: out.date, toLabel };
  }

  /**
   * Records movements and applies them to the account balances in one update.
   * Business rules (funds, limits) are the caller's job; see `assertFunds`.
   */
  record(movements: readonly NewMovement[]): Transaction[] {
    const date = this.now().toISOString();
    const id = `tx-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const recorded = movements.map((m, i) => ({ ...m, id: `${id}-${i}`, date }));
    this.state.update((s) => ({
      transactions: [...s.transactions, ...recorded],
      accounts: s.accounts.map((a) => {
        const delta = recorded.filter((m) => m.accountId === a.id).reduce((sum, m) => sum + m.amount, 0);
        return delta === 0 ? a : { ...a, balance: round2(a.balance + delta) };
      }),
    }));
    return recorded;
  }

  /** Throws a player-facing error when the account cannot cover `amount`. */
  assertFunds(accountId: string, amount: number): void {
    const account = this.account(accountId);
    if (!account) throw new BankError('La cuenta no existe.');
    if (amount > account.balance) throw new BankError('No tienes saldo suficiente en esa cuenta.');
  }

  /** `amount` of `currency` in soles, or null when a USD amount needs the (still missing) rate. */
  inPen(amount: number, currency: Currency): number | null {
    if (currency === 'PEN') return amount;
    const rate = this.usdToPen();
    return rate === null ? null : round2(amount * rate);
  }

  /** Restores the demo data. */
  reset(): void {
    this.state.set(this.seed());
  }

  destinationLabel(to: Destination): string {
    if (to.kind === 'account') return this.account(to.id)?.name.toLowerCase() ?? 'cuenta';
    return this.contacts.find((c) => c.id === to.id)?.handle ?? 'contacto';
  }

  currencyOf(accountId: string): Currency {
    return this.account(accountId)?.currency ?? 'PEN';
  }

  private convert(amount: number, currency: Currency, rate: number): number {
    return currency === 'PEN' ? amount : amount * rate;
  }

  private seed(): BankState {
    return { accounts: SEED_ACCOUNTS, transactions: seedTransactions(this.now()) };
  }

  private restore(): BankState {
    const saved = this.storage.get(KEY);
    if (
      saved &&
      typeof saved === 'object' &&
      Array.isArray((saved as BankState).accounts) &&
      Array.isArray((saved as BankState).transactions)
    ) {
      return saved as BankState;
    }
    return this.seed();
  }
}
