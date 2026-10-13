import { Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, max, maxLength, min, required, submit } from '@angular/forms/signals';

import { Button } from '../../../shared/ui/button';
import { FieldError } from '../../../shared/ui/field-error';
import { Icon } from '../../../shared/ui/icon';
import { MoneyPipe, formatMoney } from '../../../shared/ui/money';
import { ProgressBar } from '../../../shared/ui/progress-bar';
import { Select, SelectOption } from '../../../shared/ui/select';
import { BankError, BankStore } from '../data/bank-store';
import { SavingsGoal } from '../data/models';
import { MAX_GOALS, SavingsStore } from '../data/savings-store';

const playerError = (e: unknown) =>
  e instanceof BankError ? e.message : 'No pudimos completar la operación. Intenta de nuevo.';

@Component({
  selector: 'app-savings',
  imports: [Button, FieldError, FormField, FormRoot, Icon, MoneyPipe, ProgressBar, Select],
  host: { class: 'flex flex-col gap-6' },
  templateUrl: './savings.html',
})
export class Savings {
  protected readonly store = inject(SavingsStore);
  protected readonly bank = inject(BankStore);

  protected readonly maxGoals = MAX_GOALS;

  protected readonly notice = signal('');
  protected readonly confirmingRemove = signal<string | null>(null);

  protected readonly goalOptions = computed<SelectOption<string>[]>(() =>
    this.store.goals().map((g) => ({ value: g.id, label: g.name, hint: this.money(g.saved, g) })),
  );

  private readonly moveModel = signal({ goalId: this.store.goals()[0]?.id ?? '', amount: null as number | null });
  protected readonly move = form(this.moveModel, (p) => {
    required(p.goalId, { message: 'Elige un cofre.' });
    required(p.amount, { message: 'Escribe un monto.' });
    min(p.amount, 1, { message: 'El monto mínimo es 1.' });
  });

  private readonly newModel = signal({ name: '', target: 500 as number | null, accountId: 'pen', roundUp: false });
  protected readonly newGoal = form(
    this.newModel,
    (p) => {
      required(p.name, { message: 'Ponle un nombre a tu cofre.' });
      maxLength(p.name, 24, { message: 'Usa como máximo 24 caracteres.' });
      required(p.target, { message: 'Define una meta.' });
      min(p.target, 20, { message: 'La meta mínima es 20.' });
      max(p.target, 20000, { message: 'La meta máxima es 20,000.' });
    },
    {
      submission: {
        action: async (f) => {
          const { name, target, accountId, roundUp } = this.newModel();
          try {
            const goal = await this.store.create({ name, target: target ?? 0, accountId, roundUp });
            this.newModel.set({ name: '', target: 500, accountId: 'pen', roundUp: false });
            f().reset();
            this.moveModel.update((m) => ({ ...m, goalId: m.goalId || goal.id }));
            this.notice.set(`Creaste el cofre «${goal.name}».`);
            return undefined;
          } catch (e) {
            return { kind: 'server', message: playerError(e), fieldTree: f.name };
          }
        },
      },
    },
  );

  protected currencyOf(goal: SavingsGoal) {
    return this.bank.currencyOf(goal.accountId);
  }

  protected percent(goal: SavingsGoal): number {
    return Math.min(100, Math.floor((goal.saved / goal.target) * 100));
  }

  /** Deposit or withdraw with the same form; business errors land on the amount field. */
  protected save(kind: 'deposit' | 'withdraw'): void {
    void submit(this.move, async (f) => {
      const { goalId, amount } = this.moveModel();
      const goal = this.store.goal(goalId);
      try {
        if (kind === 'deposit') {
          const reached = await this.store.deposit(goalId, amount ?? 0);
          this.notice.set(
            reached
              ? `¡Llegaste a la meta de «${goal?.name}»!`
              : `Guardaste ${this.money(amount ?? 0, goal)} en «${goal?.name}».`,
          );
        } else {
          await this.store.withdraw(goalId, amount ?? 0);
          this.notice.set(`Retiraste ${this.money(amount ?? 0, goal)} de «${goal?.name}».`);
        }
        this.moveModel.update((m) => ({ ...m, amount: null }));
        f.amount().reset();
        return undefined;
      } catch (e) {
        return { kind: 'server', message: playerError(e), fieldTree: f.amount };
      }
    });
  }

  protected remove(goal: SavingsGoal): void {
    this.store.remove(goal.id);
    this.confirmingRemove.set(null);
    if (this.moveModel().goalId === goal.id) {
      this.moveModel.update((m) => ({ ...m, goalId: this.store.goals()[0]?.id ?? '' }));
    }
    this.notice.set(`Cerraste el cofre «${goal.name}».`);
  }

  private money(amount: number, goal?: SavingsGoal): string {
    return formatMoney(amount, goal ? this.currencyOf(goal) : 'PEN');
  }
}
