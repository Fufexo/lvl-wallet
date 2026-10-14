import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { toApiError } from '../../../core/api/api-error';
import { Account, Currency, Transaction } from './models';

/** Shapes returned by the LVL API (amounts are decimals in the account's currency). */
export interface ApiAccount {
  readonly id: string;
  readonly currency: Currency;
  readonly balance: number;
}

export type ApiTransferKind = 'WELCOME' | 'INTERNAL' | 'P2P';

export interface ApiMovement {
  readonly id: string;
  readonly transferId: string;
  readonly kind: ApiTransferKind;
  readonly description: string;
  readonly amount: number;
  readonly currency: Currency;
  readonly balanceAfter: number;
  readonly createdAt: string;
}

interface ApiMovementPage {
  readonly items: readonly ApiMovement[];
  readonly nextCursor?: string;
}

export interface ApiTransfer {
  readonly id: string;
  readonly sourceAmount: number;
  readonly sourceCurrency: Currency;
  readonly targetAmount: number;
  readonly targetCurrency: Currency;
  readonly fxRate?: number;
  readonly createdAt: string;
}

export interface ApiTransferRequest {
  readonly sourceAccountId: string;
  readonly targetAccountId?: string;
  readonly recipientGamertag?: string;
  readonly amount: number;
  readonly note?: string;
}

export interface LiveSnapshot {
  readonly accounts: readonly Account[];
  readonly transactions: readonly Transaction[];
  /** The rate the server will apply to transfers, so previews match the result. */
  readonly usdToPen: number | null;
}

const ACCOUNT_NAMES: Record<Currency, string> = {
  PEN: 'Cuenta en soles',
  USD: 'Cuenta en dólares',
};

/** Movements shown per account; the panel lists recent activity, not the full history. */
const MOVEMENTS_PER_ACCOUNT = 100;

export function toAccount(account: ApiAccount): Account {
  return {
    id: account.id,
    name: ACCOUNT_NAMES[account.currency],
    currency: account.currency,
    number: `•••• ${account.id.replace(/-/g, '').slice(-4).toUpperCase()}`,
    balance: account.balance,
  };
}

export function toTransaction(movement: ApiMovement, accountId: string): Transaction {
  return {
    id: movement.id,
    accountId,
    date: movement.createdAt,
    description: movement.description,
    category: movement.kind === 'WELCOME' ? 'recompensas' : 'transferencias',
    amount: movement.amount,
    xp: 0,
    source:
      movement.kind === 'P2P'
        ? 'transfer-squad'
        : movement.kind === 'INTERNAL'
          ? 'transfer-own'
          : undefined,
  };
}

/** HTTP access to accounts, movements and transfers of the signed-in player. */
@Service()
export class LiveBank {
  private readonly http = inject(HttpClient);

  async load(): Promise<LiveSnapshot> {
    try {
      const [accounts, usdToPen] = await Promise.all([
        firstValueFrom(this.http.get<ApiAccount[]>('/api/accounts')),
        this.serverRate(),
      ]);
      const pages = await Promise.all(
        accounts.map((a) =>
          firstValueFrom(
            this.http.get<ApiMovementPage>(`/api/accounts/${a.id}/movements`, {
              params: { limit: MOVEMENTS_PER_ACCOUNT },
            }),
          ),
        ),
      );
      return {
        accounts: accounts.map(toAccount),
        usdToPen,
        transactions: pages.flatMap((page, i) =>
          page.items.map((m) => toTransaction(m, accounts[i].id)),
        ),
      };
    } catch (error) {
      throw toApiError(error);
    }
  }

  /** Optional: without it the browser's own live rate is shown. */
  private async serverRate(): Promise<number | null> {
    try {
      const quote = await firstValueFrom(
        this.http.get<{ usdToPen: number; fallback?: boolean }>('/api/fx/usd-pen'),
      );
      return quote.fallback ? null : quote.usdToPen;
    } catch {
      return null;
    }
  }

  /** The same key on a retry returns the original transfer instead of paying twice. */
  async transfer(request: ApiTransferRequest, idempotencyKey: string): Promise<ApiTransfer> {
    try {
      return await firstValueFrom(
        this.http.post<ApiTransfer>('/api/transfers', request, {
          headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
        }),
      );
    } catch (error) {
      throw toApiError(error);
    }
  }
}
