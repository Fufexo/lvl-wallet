import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  FormField,
  FormRoot,
  form,
  max,
  maxLength,
  min,
  required,
  validate,
} from '@angular/forms/signals';

import { Button } from '../../../shared/ui/button';
import { FieldError } from '../../../shared/ui/field-error';
import { Icon } from '../../../shared/ui/icon';
import { MoneyPipe, formatMoney } from '../../../shared/ui/money';
import { Select, SelectOption } from '../../../shared/ui/select';
import { BankStore, Destination, BankError, TransferReceipt } from '../data/bank-store';

type Step = 'form' | 'confirm' | 'done';

interface TransferModel {
  from: string;
  toKind: Destination['kind'];
  to: string;
  amount: number | null;
  note: string;
}

const STEPS: readonly { id: Step; label: string }[] = [
  { id: 'form', label: 'Datos' },
  { id: 'confirm', label: 'Confirmar' },
  { id: 'done', label: 'Listo' },
];

@Component({
  selector: 'app-transfer',
  imports: [Button, DecimalPipe, FieldError, FormField, FormRoot, Icon, MoneyPipe, RouterLink, Select],
  host: { class: 'mx-auto flex w-full max-w-2xl flex-col gap-6' },
  templateUrl: './transfer.html',
})
export class Transfer {
  protected readonly bank = inject(BankStore);
  private readonly injector = inject(Injector);
  private readonly stepHeading = viewChild<ElementRef<HTMLElement>>('stepHeading');
  private readonly summaryBox = viewChild<ElementRef<HTMLElement>>('summaryBox');

  protected readonly steps = STEPS;
  /** Demo players pay their sample squad; real accounts pay any player by gamertag. */
  protected readonly kinds = computed(() =>
    this.bank.live()
      ? ([{ id: 'account', label: 'Mis cuentas' }, { id: 'player', label: 'Otro jugador' }] as const)
      : ([{ id: 'account', label: 'Mis cuentas' }, { id: 'contact', label: 'Mi squad' }] as const),
  );
  protected readonly toneClass = { violet: 'bg-violet', lime: 'bg-lime', ember: 'bg-ember' } as const;


  protected readonly step = signal<Step>('form');
  protected readonly stepIndex = computed(() => STEPS.findIndex((s) => s.id === this.step()));
  protected readonly showSummary = signal(false);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly receipt = signal<TransferReceipt | null>(null);
  /** One key per confirmed attempt: retrying after an error can never pay twice. */
  private attemptKey = '';

  protected readonly model = signal<TransferModel>(this.blank());
  protected readonly transfer = form(
    this.model,
    (p) => {
      required(p.to, { message: 'Elige a quién le envías.' });
      validate(p.to, ({ value, valueOf }) =>
        valueOf(p.toKind) === 'player' && value() && !/^[A-Za-z0-9_]{3,16}$/.test(value().trim())
          ? { kind: 'gamertag', message: 'Escribe el gamertag exacto: de 3 a 16 letras, números o guion bajo.' }
          : undefined,
      );
      validate(p.to, ({ value, valueOf }) =>
        valueOf(p.toKind) === 'account' && value() === valueOf(p.from)
          ? { kind: 'same-account', message: 'Elige una cuenta distinta a la de origen.' }
          : undefined,
      );
      required(p.amount, { message: 'Escribe cuánto quieres enviar.' });
      min(p.amount, 1, { message: 'El monto mínimo es 1.' });
      max(p.amount, 100_000, { message: 'El monto máximo por transferencia es 100,000.' });
      validate(p.amount, ({ value }) => {
        const amount = value();
        return amount !== null && Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6
          ? { kind: 'decimals', message: 'Usa como máximo dos decimales.' }
          : undefined;
      });
      validate(p.amount, ({ value, valueOf }) => {
        const account = this.bank.account(valueOf(p.from));
        const amount = value();
        return account && amount !== null && amount > account.balance
          ? { kind: 'balance', message: `Tu saldo disponible es ${formatMoney(account.balance, account.currency)}.` }
          : undefined;
      });
      validate(p.amount, () =>
        this.needsRate() && this.bank.usdToPen() === null
          ? { kind: 'rate', message: 'Esperando el tipo de cambio en vivo para convertir el monto.' }
          : undefined,
      );
      maxLength(p.note, 40, { message: 'Usa como máximo 40 caracteres.' });
    },
    {
      submission: {
        action: async () => {
          this.showSummary.set(false);
          this.attemptKey = crypto.randomUUID();
          this.goTo('confirm');
          return undefined;
        },
        onInvalid: () => {
          this.showSummary.set(true);
          afterNextRender(() => this.summaryBox()?.nativeElement.focus(), { injector: this.injector });
        },
      },
    },
  );

  /** The source account can't receive its own transfer. */
  protected readonly destinationOptions = computed<SelectOption<string>[]>(() =>
    this.bank.accounts().map((a) => ({ value: a.id, label: a.name, disabled: a.id === this.model().from })),
  );

  protected readonly fromAccount = computed(() => this.bank.account(this.model().from));
  protected readonly fromSymbol = computed(() => (this.fromAccount()?.currency === 'USD' ? 'US$' : 'S/'));
  private readonly destination = computed<Destination>(() => {
    const { toKind, to } = this.model();
    return toKind === 'player' ? { kind: 'player', gamertag: to.trim() } : { kind: toKind, id: to };
  });
  /** Destination as a standalone title: "Cuenta en dólares" or "Valeria · @vale.gg". */
  protected readonly toTitle = computed(() => {
    const to = this.destination();
    if (to.kind === 'account') return this.bank.account(to.id)?.name ?? '';
    if (to.kind === 'player') return `@${to.gamertag}`;
    const contact = this.bank.contacts.find((c) => c.id === to.id);
    return contact ? `${contact.name} · ${contact.handle}` : '';
  });

  protected readonly needsRate = computed(() => {
    const { toKind, to } = this.model();
    return toKind === 'account' && !!to && this.bank.currencyOf(to) !== this.fromAccount()?.currency;
  });

  protected readonly quote = computed(() => {
    const amount = this.model().amount;
    if (!this.model().to || amount === null || !(amount > 0)) return null;
    return this.bank.quote(this.model().from, this.destination(), amount);
  });

  protected readonly summary = computed(() => {
    const fields = [
      { id: 'to', state: this.transfer.to() },
      { id: 'amount', state: this.transfer.amount() },
      { id: 'note', state: this.transfer.note() },
    ];
    return fields
      .filter((f) => f.state.invalid())
      .map((f) => ({ id: f.id, message: f.state.errors()[0]?.message ?? 'Revisa este campo.' }));
  });

  protected setKind(kind: Destination['kind']): void {
    this.model.update((m) => ({ ...m, toKind: kind, to: kind === 'account' ? this.otherAccount(m.from) : '' }));
  }

  protected setTo(id: string): void {
    this.model.update((m) => ({ ...m, to: id }));
    this.transfer.to().markAsTouched();
  }

  protected focusField(event: Event, id: string): void {
    event.preventDefault();
    document.getElementById(id)?.focus();
  }

  protected edit(): void {
    this.error.set(null);
    this.goTo('form');
  }

  protected async send(): Promise<void> {
    const { from, note } = this.model();
    const amount = this.model().amount;
    if (amount === null) return;

    this.pending.set(true);
    this.error.set(null);
    try {
      this.receipt.set(
        await this.bank.transfer({ fromId: from, to: this.destination(), amount, note }, this.attemptKey),
      );
      this.goTo('done');
    } catch (e) {
      this.error.set(e instanceof BankError ? e.message : 'No pudimos completar la transferencia. Intenta de nuevo.');
    } finally {
      this.pending.set(false);
    }
  }

  protected restart(): void {
    this.model.set(this.blank());
    this.transfer().reset();
    this.receipt.set(null);
    this.goTo('form');
  }

  private goTo(step: Step): void {
    this.step.set(step);
    afterNextRender(() => this.stepHeading()?.nativeElement.focus(), { injector: this.injector });
  }

  private otherAccount(fromId: string): string {
    return this.bank.accounts().find((a) => a.id !== fromId)?.id ?? '';
  }

  /** From soles to dollars by default (demo ids or the real account's ids). */
  private blank(): TransferModel {
    const idOf = (currency: string) => this.bank.accounts().find((a) => a.currency === currency)?.id ?? '';
    return { from: idOf('PEN'), toKind: 'account', to: idOf('USD'), amount: null, note: '' };
  }
}
