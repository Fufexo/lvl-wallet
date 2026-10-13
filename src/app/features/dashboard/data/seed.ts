import { Account, Category, Contact, Transaction } from './models';

/** XP the demo profile carries over from "previous seasons". */
export const PREVIOUS_XP = 2480;

/** Monthly spending cap for the games category, in soles. */
export const GAMES_MONTHLY_LIMIT = 200;

export const SEED_ACCOUNTS: readonly Account[] = [
  { id: 'pen', name: 'Cuenta en soles', currency: 'PEN', number: '•••• 4821', balance: 1284.5 },
  { id: 'usd', name: 'Cuenta en dólares', currency: 'USD', number: '•••• 7390', balance: 210 },
];

export const CONTACTS: readonly Contact[] = [
  { id: 'vale', name: 'Valeria', handle: '@vale.gg', tone: 'violet' },
  { id: 'diego', name: 'Diego', handle: '@dfrag', tone: 'lime' },
  { id: 'ana', name: 'Ana', handle: '@anitapro', tone: 'ember' },
];

interface SeedMovement {
  readonly accountId: string;
  readonly daysAgo: number;
  readonly description: string;
  readonly category: Category;
  readonly amount: number;
  readonly xp?: number;
}

// Relative dates keep the demo fresh no matter when it is opened.
const MOVEMENTS: readonly SeedMovement[] = [
  { accountId: 'pen', daysAgo: 0, description: 'Pase de temporada', category: 'juegos', amount: -45.9, xp: 46 },
  { accountId: 'usd', daysAgo: 0, description: 'Tienda de juegos', category: 'juegos', amount: -29.99, xp: 112 },
  { accountId: 'pen', daysAgo: 1, description: 'Suscripción de anime · dividida con 3', category: 'suscripciones', amount: -6.25, xp: 6 },
  { accountId: 'pen', daysAgo: 2, description: 'Recarga por billetera móvil', category: 'recargas', amount: 300 },
  { accountId: 'pen', daysAgo: 4, description: 'Gift card de S/ 50', category: 'gift-cards', amount: -50, xp: 50 },
  { accountId: 'pen', daysAgo: 6, description: 'Cashback del nivel', category: 'cashback', amount: 8.4 },
  { accountId: 'usd', daysAgo: 7, description: 'Suscripción de juegos en la nube', category: 'suscripciones', amount: -14.99, xp: 56 },
  { accountId: 'pen', daysAgo: 7, description: 'Transferencia de @vale.gg', category: 'transferencias', amount: 25 },
  { accountId: 'pen', daysAgo: 9, description: 'Skins y cosméticos', category: 'juegos', amount: -32, xp: 32 },
  { accountId: 'pen', daysAgo: 11, description: 'Suscripción de música', category: 'suscripciones', amount: -21.9, xp: 22 },
  { accountId: 'usd', daysAgo: 12, description: 'Cambio de soles a dólares', category: 'transferencias', amount: 100 },
  { accountId: 'pen', daysAgo: 12, description: 'Cambio de soles a dólares', category: 'transferencias', amount: -375 },
  { accountId: 'pen', daysAgo: 15, description: 'Inscripción a torneo online', category: 'juegos', amount: -15, xp: 15 },
  { accountId: 'usd', daysAgo: 18, description: 'Expansión descargable', category: 'juegos', amount: -19.99, xp: 75 },
  { accountId: 'pen', daysAgo: 21, description: 'Recarga en agente', category: 'recargas', amount: 150 },
  { accountId: 'pen', daysAgo: 26, description: 'Gift card de S/ 30', category: 'gift-cards', amount: -30, xp: 30 },
];

export function seedTransactions(now: Date): Transaction[] {
  const DAY = 24 * 60 * 60 * 1000;
  return MOVEMENTS.map((m, i) => {
    // Always in the past, even for "today" movements, so new transfers sort on top.
    const date = new Date(now.getTime() - m.daysAgo * DAY - (i + 1) * 47 * 60 * 1000);
    return {
      id: `seed-${i}`,
      accountId: m.accountId,
      date: date.toISOString(),
      description: m.description,
      category: m.category,
      amount: m.amount,
      xp: m.xp ?? 0,
    };
  });
}
