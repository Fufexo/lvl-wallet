import { Service, computed, effect, inject, signal } from '@angular/core';

import { LocalStore } from '../../../core/local-store';
import { BankError, BankStore, round2, simulateLatency } from './bank-store';
import { SavingsGoal } from './models';
import { SEED_SAVINGS } from './seed';

const KEY = 'lvl.savings.v1';
export const MAX_GOALS = 4;

export interface NewGoal {
  readonly name: string;
  readonly target: number;
  readonly accountId: string;
  readonly roundUp: boolean;
}

/**
 * Savings goals ("cofres"). Money moved into a goal leaves its account as an `ahorro`
 * movement and comes back the same way, so balances and history always agree.
 */
@Service()
export class SavingsStore {
  private readonly storage = inject(LocalStore);
  private readonly bank = inject(BankStore);

  private readonly state = signal<readonly SavingsGoal[]>(this.restore());

  readonly goals = this.state.asReadonly();
  readonly canCreate = computed(() => this.state().length < MAX_GOALS);

  /** Everything saved, in soles (null until a USD goal can be valued). */
  readonly totalPen = computed(() => {
    let total = 0;
    for (const goal of this.state()) {
      const pen = this.bank.inPen(goal.saved, this.bank.currencyOf(goal.accountId));
      if (pen === null) return null;
      total += pen;
    }
    return round2(total);
  });

  constructor() {
    effect(() => this.storage.set(KEY, this.state()));
  }

  goal(id: string): SavingsGoal | undefined {
    return this.state().find((g) => g.id === id);
  }

  async create(request: NewGoal): Promise<SavingsGoal> {
    await simulateLatency();
    if (!this.canCreate()) throw new BankError(`Puedes tener hasta ${MAX_GOALS} cofres a la vez.`);
    const goal: SavingsGoal = {
      id: `goal-${Date.now().toString(36)}`,
      name: request.name.trim(),
      target: request.target,
      saved: 0,
      accountId: request.accountId,
      roundUp: request.roundUp,
    };
    this.state.update((goals) => [...goals, goal]);
    return goal;
  }

  /** Moves money from the goal's account into it. Returns true when the goal is reached. */
  async deposit(id: string, amount: number): Promise<boolean> {
    await simulateLatency();
    const goal = this.require(id);
    if (!(amount > 0)) throw new BankError('El monto debe ser mayor a cero.');
    this.bank.assertFunds(goal.accountId, amount);
    this.move(goal, -amount, `Ahorro · ${goal.name}`);
    const updated = this.require(id);
    return goal.saved < goal.target && updated.saved >= updated.target;
  }

  /** Moves money from the goal back to its account. */
  async withdraw(id: string, amount: number): Promise<void> {
    await simulateLatency();
    const goal = this.require(id);
    if (!(amount > 0)) throw new BankError('El monto debe ser mayor a cero.');
    if (amount > goal.saved) throw new BankError('No tienes tanto guardado en este cofre.');
    this.move(goal, amount, `Retiro de cofre · ${goal.name}`);
  }

  toggleRoundUp(id: string): void {
    this.state.update((goals) => goals.map((g) => (g.id === id ? { ...g, roundUp: !g.roundUp } : g)));
  }

  /** Deletes the goal; anything saved goes back to its account first. */
  remove(id: string): void {
    const goal = this.require(id);
    if (goal.saved > 0) this.move(goal, goal.saved, `Cierre de cofre · ${goal.name}`);
    this.state.update((goals) => goals.filter((g) => g.id !== id));
  }

  /**
   * After a card purchase: rounds the price up to the next whole unit and saves the
   * difference in the first round-up goal of that account. Returns what was saved.
   */
  roundUp(accountId: string, amount: number): number {
    const goal = this.state().find((g) => g.roundUp && g.accountId === accountId);
    const diff = round2(Math.ceil(amount) - amount);
    const account = this.bank.account(accountId);
    if (!goal || diff <= 0 || !account || account.balance < diff) return 0;
    this.move(goal, -diff, `Redondeo · ${goal.name}`);
    return diff;
  }

  reset(): void {
    this.state.set(SEED_SAVINGS);
  }

  /** Records the movement (negative = into the goal) and updates the saved amount. */
  private move(goal: SavingsGoal, accountDelta: number, description: string): void {
    this.bank.record([
      { accountId: goal.accountId, description, category: 'ahorro', amount: accountDelta, xp: 0, source: 'savings' },
    ]);
    this.state.update((goals) =>
      goals.map((g) => (g.id === goal.id ? { ...g, saved: round2(g.saved - accountDelta) } : g)),
    );
  }

  private require(id: string): SavingsGoal {
    const goal = this.goal(id);
    if (!goal) throw new BankError('Ese cofre ya no existe.');
    return goal;
  }

  private restore(): readonly SavingsGoal[] {
    const saved = this.storage.get(KEY);
    return Array.isArray(saved) ? (saved as SavingsGoal[]) : SEED_SAVINGS;
  }
}
