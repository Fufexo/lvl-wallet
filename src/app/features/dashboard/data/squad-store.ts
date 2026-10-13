import { Service, computed, effect, inject, signal } from '@angular/core';

import { LocalStore } from '../../../core/local-store';
import { BankError, BankStore, round2, simulateLatency } from './bank-store';
import { Contact, SharedSubscription } from './models';
import { SEED_SUBSCRIPTIONS } from './seed';

const KEY = 'lvl.squad.v1';

export interface NewSubscription {
  readonly name: string;
  readonly amount: number;
  readonly accountId: string;
  readonly memberIds: readonly string[];
}

/** What each person pays, the player included. */
export function shareOf(subscription: Pick<SharedSubscription, 'amount' | 'members'>): number {
  return round2(subscription.amount / (subscription.members.length + 1));
}

/**
 * Subscriptions the player pays in full and splits evenly with the squad.
 * Each member's payment is recorded as an incoming transfer when it arrives.
 */
@Service()
export class SquadStore {
  private readonly storage = inject(LocalStore);
  private readonly bank = inject(BankStore);

  private readonly state = signal<readonly SharedSubscription[]>(this.restore());

  readonly subscriptions = this.state.asReadonly();

  /** Money the squad still owes the player, in soles (null until a USD amount can be valued). */
  readonly pendingPen = computed(() => {
    let total = 0;
    for (const sub of this.state()) {
      const unpaid = sub.members.filter((m) => !m.paid).length;
      const pen = this.bank.inPen(shareOf(sub) * unpaid, this.bank.currencyOf(sub.accountId));
      if (pen === null) return null;
      total += pen;
    }
    return round2(total);
  });

  constructor() {
    effect(() => this.storage.set(KEY, this.state()));
  }

  contact(id: string): Contact | undefined {
    return this.bank.contacts.find((c) => c.id === id);
  }

  /** Pays the subscription in full now; each member's share stays pending until it arrives. */
  async create(request: NewSubscription): Promise<SharedSubscription> {
    await simulateLatency();
    if (request.memberIds.length === 0) throw new BankError('Elige al menos a una persona de tu squad.');
    if (!(request.amount > 0)) throw new BankError('El monto debe ser mayor a cero.');
    this.bank.assertFunds(request.accountId, request.amount);

    const name = request.name.trim();
    const pen = this.bank.inPen(request.amount, this.bank.currencyOf(request.accountId));
    this.bank.record([
      {
        accountId: request.accountId,
        description: `${name} · squad`,
        category: 'suscripciones',
        amount: -request.amount,
        xp: pen === null ? 0 : Math.round(pen),
      },
    ]);

    const subscription: SharedSubscription = {
      id: `sub-${Date.now().toString(36)}`,
      name,
      amount: request.amount,
      accountId: request.accountId,
      members: request.memberIds.map((contactId) => ({ contactId, paid: false })),
    };
    this.state.update((subs) => [...subs, subscription]);
    return subscription;
  }

  /** Records a member's share as an incoming transfer. */
  async markPaid(subscriptionId: string, contactId: string): Promise<void> {
    await simulateLatency();
    const sub = this.state().find((s) => s.id === subscriptionId);
    const member = sub?.members.find((m) => m.contactId === contactId);
    if (!sub || !member) throw new BankError('Ese pago ya no existe.');
    if (member.paid) return;

    this.bank.record([
      {
        accountId: sub.accountId,
        description: `Pago de ${this.contact(contactId)?.handle ?? 'tu squad'} · ${sub.name}`,
        category: 'transferencias',
        amount: shareOf(sub),
        xp: 0,
      },
    ]);
    this.state.update((subs) =>
      subs.map((s) =>
        s.id !== sub.id
          ? s
          : { ...s, members: s.members.map((m) => (m.contactId === contactId ? { ...m, paid: true } : m)) },
      ),
    );
  }

  /** Stops tracking a subscription. Money already moved stays in the history. */
  remove(subscriptionId: string): void {
    this.state.update((subs) => subs.filter((s) => s.id !== subscriptionId));
  }

  reset(): void {
    this.state.set(SEED_SUBSCRIPTIONS);
  }

  private restore(): readonly SharedSubscription[] {
    const saved = this.storage.get(KEY);
    return Array.isArray(saved) ? (saved as SharedSubscription[]) : SEED_SUBSCRIPTIONS;
  }
}
