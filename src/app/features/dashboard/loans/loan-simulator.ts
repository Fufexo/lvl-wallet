import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { FormField, form, max, min, required } from '@angular/forms/signals';

import { FieldError } from '../../../shared/ui/field-error';
import { MoneyPipe } from '../../../shared/ui/money';
import { Select, SelectOption } from '../../../shared/ui/select';
import { BankStore } from '../data/bank-store';
import { amortize, annualRateForLevel } from '../data/loan';
import { AmortizationChart } from './amortization-chart';

interface LoanModel {
  amount: number | null;
  months: string;
}

const MIN_AMOUNT = 500;
const MAX_AMOUNT = 30_000;

@Component({
  selector: 'app-loan-simulator',
  imports: [AmortizationChart, DecimalPipe, FieldError, FormField, MoneyPipe, PercentPipe, Select],
  host: { class: 'flex flex-col gap-6' },
  templateUrl: './loan-simulator.html',
})
export class LoanSimulator {
  private readonly bank = inject(BankStore);

  protected readonly minAmount = MIN_AMOUNT;
  protected readonly maxAmount = MAX_AMOUNT;
  protected readonly presets = [2000, 5000, 10000] as const;
  protected readonly termOptions: SelectOption<string>[] = ['6', '12', '18', '24', '36', '48'].map((m) => ({
    value: m,
    label: `${m} meses`,
  }));

  protected readonly model = signal<LoanModel>({ amount: 5000, months: '24' });
  protected readonly loan = form(this.model, (p) => {
    required(p.amount, { message: 'Escribe cuánto necesitas.' });
    min(p.amount, MIN_AMOUNT, { message: `El monto mínimo es S/ ${MIN_AMOUNT}.` });
    max(p.amount, MAX_AMOUNT, { message: 'El monto máximo es S/ 30,000.' });
  });

  /** Errors show while typing here: results update live, so stale input must be explained at once. */
  protected readonly amountErrors = computed(() => ({
    touched: () => true,
    invalid: () => this.loan.amount().invalid(),
    errors: () => this.loan.amount().errors(),
  }));

  protected readonly level = computed(() => this.bank.progress().level);
  protected readonly annualRate = computed(() => annualRateForLevel(this.level()));

  protected readonly result = computed(() => {
    const amount = this.model().amount;
    if (amount === null || this.loan.amount().invalid()) return null;
    return amortize(amount, this.annualRate(), Number(this.model().months));
  });

  protected setAmount(amount: number): void {
    this.model.update((m) => ({ ...m, amount }));
  }
}
