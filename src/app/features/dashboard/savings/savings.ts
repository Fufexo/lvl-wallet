import { Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, max, maxLength, min, required, submit } from '@angular/forms/signals';

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
  imports: [FieldError, FormField, FormRoot, Icon, MoneyPipe, ProgressBar, Select],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-2">
        <span class="eyebrow text-xs text-lime">Ahorro</span>
        <h1 tabindex="-1" class="m-0 font-display text-[clamp(28px,4vw,44px)] leading-none font-bold tracking-[-0.02em] outline-none">
          Cofres de ahorro
        </h1>
        <p class="m-0 max-w-150 text-muted">
          Separa plata para lo que quieres. Con el redondeo automático, cada compra con tarjeta se
          redondea y la diferencia cae en tu cofre.
        </p>
      </div>
      <div class="panel rounded-panel px-5 py-3">
        <p class="m-0 text-sm text-label">Guardado</p>
        <p class="m-0 font-mono text-2xl font-bold text-lime">{{ store.totalPen() ?? 0 | money: 'PEN' }}</p>
      </div>
    </header>

    <p role="status" class="m-0 min-h-6 text-sm text-lime">{{ notice() }}</p>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
      <section aria-labelledby="goals-title" class="flex flex-col gap-4">
        <h2 id="goals-title" class="sr-only">Tus cofres</h2>
        @for (goal of store.goals(); track goal.id) {
          <article class="glass flex flex-col gap-5 rounded-card p-6" [attr.aria-labelledby]="goal.id + '-name'">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="grid size-11 place-items-center rounded-xl bg-lime/14 text-lime"><app-icon name="target" class="size-5" /></span>
                <div>
                  <h3 [id]="goal.id + '-name'" class="m-0 font-display text-xl font-bold">{{ goal.name }}</h3>
                  <p class="m-0 text-sm text-muted">Meta: {{ goal.target | money: currencyOf(goal) }}</p>
                </div>
              </div>
              @if (goal.saved >= goal.target) {
                <span class="inline-flex items-center gap-1 rounded-full bg-lime/14 px-2.5 py-1 text-xs text-lime">
                  <app-icon name="sparkle" class="size-3.5" /> ¡Meta cumplida!
                </span>
              }
            </div>

            <div class="flex flex-col gap-2">
              <p class="m-0 flex items-baseline justify-between gap-3">
                <span class="font-mono text-2xl font-bold">{{ goal.saved | money: currencyOf(goal) }}</span>
                <span class="font-mono text-sm text-subtle">{{ percent(goal) }}%</span>
              </p>
              <app-progress-bar
                class="h-3"
                [label]="'Progreso de ' + goal.name"
                fillClass="bg-linear-to-r from-violet to-lime"
                [value]="goal.saved"
                [max]="goal.target"
              />
              @if (goal.saved < goal.target) {
                <p class="m-0 text-sm text-muted">Te faltan {{ goal.target - goal.saved | money: currencyOf(goal) }}.</p>
              }
            </div>

            @if (confirmingRemove() === goal.id) {
              <div role="group" aria-label="Confirmar" class="flex flex-col gap-3 rounded-panel border border-ember/40 bg-ember/10 p-4">
                <p class="m-0 text-sm">
                  ¿Cerrar «{{ goal.name }}»?
                  @if (goal.saved > 0) { Los {{ goal.saved | money: currencyOf(goal) }} guardados vuelven a tu cuenta. }
                </p>
                <div class="flex flex-wrap gap-2">
                  <button type="button" [class]="secondary" (click)="confirmingRemove.set(null)">Cancelar</button>
                  <button type="button" class="inline-flex min-h-11 items-center rounded-full bg-ember px-5 font-semibold text-ink" (click)="remove(goal)">Sí, cerrar cofre</button>
                </div>
              </div>
            } @else {
              <div class="flex flex-wrap gap-2">
                <button type="button" [class]="secondary" [attr.aria-pressed]="goal.roundUp" (click)="store.toggleRoundUp(goal.id)">
                  <app-icon name="coins" class="size-4.5" /> Redondeo automático
                </button>
                <button type="button" [class]="secondary" (click)="confirmingRemove.set(goal.id)">
                  <app-icon name="trash" class="size-4.5" /> Cerrar cofre
                </button>
              </div>
            }
          </article>
        } @empty {
          <div class="glass flex flex-col items-center gap-3 rounded-card px-6 py-12 text-center">
            <span class="grid size-14 place-items-center rounded-2xl bg-lime/14 text-lime"><app-icon name="target" class="size-6" /></span>
            <h3 class="m-0 font-display text-xl font-bold">Sin cofres por ahora</h3>
            <p class="m-0 max-w-80 text-muted">Crea uno con el formulario: una consola, un viaje o tu próximo setup.</p>
          </div>
        }
      </section>

      <div class="flex flex-col gap-4">
        @if (store.goals().length) {
          <section aria-labelledby="move-title" class="glass flex flex-col gap-5 rounded-card p-6">
            <h2 id="move-title" class="m-0 font-display text-xl font-bold">Mover dinero</h2>
            <form [formRoot]="move" class="flex flex-col gap-4">
              <div>
                <label for="move-goal" class="mb-2 block font-medium">Cofre</label>
                <app-select inputId="move-goal" label="Cofre" [options]="goalOptions()" [formField]="move.goalId" />
              </div>
              <div>
                <label for="move-amount" class="mb-2 block font-medium">Monto</label>
                <input id="move-amount" type="number" inputmode="decimal" step="0.01" placeholder="0.00" aria-describedby="move-amount-error" [class]="control + ' font-mono'" [formField]="move.amount" [attr.aria-invalid]="move.amount().touched() && move.amount().invalid()" />
                <app-field-error id="move-amount-error" [state]="move.amount()" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" [disabled]="move().submitting()" [class]="primary" (click)="save('deposit')">Guardar</button>
                <button type="button" [disabled]="move().submitting()" [class]="secondary + ' justify-center min-h-13'" (click)="save('withdraw')">Retirar</button>
              </div>
            </form>
          </section>
        }

        <section aria-labelledby="new-goal-title" class="glass flex flex-col gap-5 rounded-card p-6">
          <h2 id="new-goal-title" class="m-0 font-display text-xl font-bold">Nuevo cofre</h2>
          @if (store.canCreate()) {
            <form [formRoot]="newGoal" class="flex flex-col gap-4">
              <div>
                <label for="goal-name" class="mb-2 block font-medium">¿Para qué ahorras?</label>
                <input id="goal-name" type="text" placeholder="ej. Silla gamer" aria-describedby="goal-name-error" [class]="control" [formField]="newGoal.name" [attr.aria-invalid]="newGoal.name().touched() && newGoal.name().invalid()" />
                <app-field-error id="goal-name-error" [state]="newGoal.name()" />
              </div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label for="goal-target" class="mb-2 block font-medium">Meta</label>
                  <input id="goal-target" type="number" inputmode="decimal" step="1" aria-describedby="goal-target-error" [class]="control + ' font-mono'" [formField]="newGoal.target" [attr.aria-invalid]="newGoal.target().touched() && newGoal.target().invalid()" />
                  <app-field-error id="goal-target-error" [state]="newGoal.target()" />
                </div>
                <div>
                  <label for="goal-account" class="mb-2 block font-medium">Desde</label>
                  <app-select inputId="goal-account" label="Desde" [options]="bank.accountOptions()" [formField]="newGoal.accountId" />
                </div>
              </div>
              <label class="panel flex min-h-12 cursor-pointer items-center gap-3 rounded-panel px-4 has-[:checked]:border-lime/50 has-[:checked]:bg-lime/8">
                <input type="checkbox" class="size-4.5 accent-lime" [formField]="newGoal.roundUp" />
                <span>Redondear mis compras con tarjeta y guardar la diferencia</span>
              </label>
              <button type="submit" [disabled]="newGoal().submitting()" [class]="primary">
                {{ newGoal().submitting() ? 'Creando…' : 'Crear cofre' }}
              </button>
            </form>
          } @else {
            <p class="m-0 text-muted">Tienes {{ maxGoals }} cofres, el máximo. Cierra uno para crear otro.</p>
          }
        </section>
      </div>
    </div>
  `,
})
export class Savings {
  protected readonly store = inject(SavingsStore);
  protected readonly bank = inject(BankStore);

  protected readonly maxGoals = MAX_GOALS;
  protected readonly control =
    'panel min-h-12 w-full rounded-panel bg-ink-2 px-4 text-fg outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime';
  protected readonly primary =
    'inline-flex min-h-13 items-center justify-center rounded-full bg-lime px-6 font-semibold text-ink transition hover:bg-lime-soft disabled:opacity-60';
  protected readonly secondary =
    'inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-4 text-sm text-fg transition-colors hover:bg-white/8 disabled:opacity-60 aria-pressed:border-lime/50 aria-pressed:bg-lime/10 aria-pressed:text-lime';

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
