export type Currency = 'PEN' | 'USD';

export type Category =
  | 'juegos'
  | 'suscripciones'
  | 'gift-cards'
  | 'transferencias'
  | 'recargas'
  | 'cashback';

export interface Account {
  readonly id: string;
  readonly name: string;
  readonly currency: Currency;
  readonly number: string;
  readonly balance: number;
}

export interface Transaction {
  readonly id: string;
  readonly accountId: string;
  /** ISO 8601 date-time. */
  readonly date: string;
  readonly description: string;
  readonly category: Category;
  /** Signed amount in the account's currency (negative = money out). */
  readonly amount: number;
  /** XP earned by this movement (purchases only). */
  readonly xp: number;
}

export interface Contact {
  readonly id: string;
  readonly name: string;
  readonly handle: string;
  readonly tone: 'violet' | 'lime' | 'ember';
}

export const CATEGORY_LABELS: Record<Category, string> = {
  juegos: 'Juegos',
  suscripciones: 'Suscripciones',
  'gift-cards': 'Gift cards',
  transferencias: 'Transferencias',
  recargas: 'Recargas',
  cashback: 'Cashback',
};
