import { Service, computed, effect, inject, signal, untracked } from '@angular/core';

import { ApiError } from '../../../core/api/api-error';
import { NOW } from '../../../core/clock';
import { ExchangeRate } from '../../../core/exchange-rate';
import { LocalStore } from '../../../core/local-store';
import { Session } from '../../../core/session';
import { formatMoney } from '../../../shared/ui/money';
import { SelectOption } from '../../../shared/ui/select';
import { LiveBank } from './live-bank';
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
  | { readonly kind: 'contact'; readonly id: string }
  /** Another LVL player, by gamertag (real accounts only). */
  | { readonly kind: 'player'; readonly gamertag: string };

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

/** Loading state of the real account's data; demo data is always `ready`. */
export type LiveStatus = 'idle' | 'loading' | 'ready' | 'error';

const EMPTY: BankState = { accounts: [], transactions: [] };

/** A movement about to be recorded: id and date are assigned by the store. */
export type NewMovement = Omit<Transaction, 'id' | 'date'>;

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Simulated network latency so the UI has real pending states. */
export const LATENCY_MS = 700;

export function simulateLatency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
}

/**
 * Accounts and movements of the panel, in either mode:
 * - demo: kept in this browser, every rule applied here;
 * - live: loaded from the LVL API, which applies the rules; transfers go to the server.
 */
@Service()
export class BankStore {
  private readonly storage = inject(LocalStore);
  private readonly now = inject(NOW);
  private readonly fx = inject(ExchangeRate);
  private readonly session = inject(Session);
  private readonly api = inject(LiveBank);

  readonly live = this.session.isLive;
  private readonly demoState = signal<BankState>(this.restore());
  private readonly liveState = signal<BankState>(EMPTY);
  private readonly state = computed(() => (this.live() ? this.liveState() : this.demoState()));

  private readonly liveStatus = signal<LiveStatus>('idle');
  readonly status = computed<LiveStatus>(() => (this.live() ? this.liveStatus() : 'ready'));
  readonly loadError = signal<string | null>(null);

  readonly accounts = computed(() => this.state().accounts);
  readonly contacts: readonly Contact[] = CONTACTS;

  /** Accounts as select options, with the balance as a hint. */
  readonly accountOptions = computed<SelectOption<string>[]>(() =>
    this.accounts().map((a) => ({ value: a.id, label: a.name, hint: formatMoney(a.balance, a.currency) })),
  );
  readonly usdToPen = this.fx.usdToPen;

  /** Newest first; movements recorded at the same instant keep "last recorded on top". */
  readonly transactions = computed(() =>
    this.state()
      .transactions.map((t, i) => ({ t, i }))
      .sort((a, b) => b.t.date.localeCompare(a.t.date) || b.i - a.i)
      .map(({ t }) => t),
  );

  /** Demo players start with some history; real accounts start from zero. */
  readonly totalXp = computed(
    () => (this.live() ? 0 : PREVIOUS_XP) + this.state().transactions.reduce((sum, t) => sum + t.xp, 0),
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
    effect(() => this.storage.set(KEY, this.demoState()));
    // Leaving the real account (sign out, session expired) drops its data from memory.
    effect(() => {
      if (!this.live()) {
        untracked(() => {
          this.liveState.set(EMPTY);
          this.liveStatus.set('idle');
        });
      }
    });
  }

  /** Loads the real account's data once; does nothing in demo mode. */
  ensureLoaded(): void {
    if (this.live() && this.liveStatus() === 'idle') void this.reload();
  }

  /**
   * Fetches the latest data. The first load shows a loading state; later refreshes (after a
   * transfer) update in place, so the page on screen is never unmounted, and if one fails the
   * last data stays visible.
   */
  async reload(): Promise<void> {
    if (!this.live()) return;
    const firstLoad = this.liveStatus() !== 'ready';
    if (firstLoad) {
      this.liveStatus.set('loading');
      this.loadError.set(null);
    }
    try {
      this.liveState.set(await this.api.load());
      this.liveStatus.set('ready');
    } catch (error) {
      if (!firstLoad) return;
      this.loadError.set(error instanceof ApiError ? error.message : 'No pudimos cargar tus cuentas.');
      this.liveStatus.set('error');
    }
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

  /** `idempotencyKey` identifies this attempt in live mode: retrying it never pays twice. */
  async transfer(request: TransferRequest, idempotencyKey: string = crypto.randomUUID()): Promise<TransferReceipt> {
    if (this.live()) return this.transferLive(request, idempotencyKey);
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
        source: request.to.kind === 'contact' ? 'transfer-squad' : 'transfer-own',
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

  private async transferLive(request: TransferRequest, idempotencyKey: string): Promise<TransferReceipt> {
    const { to } = request;
    const note = request.note.trim();
    try {
      const t = await this.api.transfer(
        {
          sourceAccountId: request.fromId,
          targetAccountId: to.kind === 'account' ? to.id : undefined,
          recipientGamertag: to.kind === 'player' ? to.gamertag : undefined,
          amount: round2(request.amount),
          note: note || undefined,
        },
        idempotencyKey,
      );
      await this.reload();
      return {
        id: t.id,
        date: t.createdAt,
        toLabel: this.destinationLabel(to),
        debit: t.sourceAmount,
        debitCurrency: t.sourceCurrency,
        credit: t.targetAmount,
        creditCurrency: t.targetCurrency,
        rate: t.fxRate ?? null,
      };
    } catch (error) {
      throw new BankError(error instanceof ApiError ? error.message : 'No pudimos completar la transferencia.');
    }
  }

  /**
   * Records movements and applies them to the account balances in one update.
   * Business rules (funds, limits) are the caller's job; see `assertFunds`.
   * Demo only: in live mode the server records movements.
   */
  record(movements: readonly NewMovement[]): Transaction[] {
    if (this.live()) throw new BankError('Esta función está disponible solo en la demo por ahora.');
    const date = this.now().toISOString();
    const id = `tx-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const recorded = movements.map((m, i) => ({ ...m, id: `${id}-${i}`, date }));
    this.demoState.update((s) => ({
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
    this.demoState.set(this.seed());
  }

  destinationLabel(to: Destination): string {
    if (to.kind === 'account') return this.account(to.id)?.name.toLowerCase() ?? 'cuenta';
    if (to.kind === 'player') return `@${to.gamertag}`;
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
