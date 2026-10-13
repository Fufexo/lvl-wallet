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
import { FormField, FormRoot, form, maxLength, min, required, validate } from '@angular/forms/signals';

import { ButtonLink } from '../../../shared/ui/button-link';
import { FieldError } from '../../../shared/ui/field-error';
import { Icon } from '../../../shared/ui/icon';
import { MoneyPipe, formatMoney } from '../../../shared/ui/money';
import { BankStore, Destination, TransferError, TransferReceipt } from '../data/bank-store';

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
  imports: [ButtonLink, DecimalPipe, FieldError, FormField, FormRoot, Icon, MoneyPipe, RouterLink],
  host: { class: 'mx-auto flex w-full max-w-2xl flex-col gap-6' },
  template: `
    <header class="flex flex-col gap-2">
      <span class="eyebrow text-xs text-lime">Mover dinero</span>
      <h1 tabindex="-1" class="m-0 font-display text-[clamp(28px,4vw,44px)] leading-none font-bold tracking-[-0.02em] outline-none">
        Transferir
      </h1>
    </header>

    <ol aria-label="Pasos de la transferencia" class="m-0 grid list-none grid-cols-3 gap-2 p-0">
      @for (s of steps; track s.id; let i = $index) {
        <li
          [attr.aria-current]="step() === s.id ? 'step' : null"
          class="flex flex-col gap-2 text-sm"
          [class]="i <= stepIndex() ? 'text-fg' : 'text-subtle'"
        >
          <span class="h-1.5 rounded-full" [class]="i <= stepIndex() ? 'bg-lime' : 'bg-white/10'"></span>
          <span><span class="sr-only">Paso {{ i + 1 }} de 3: </span>{{ s.label }}</span>
        </li>
      }
    </ol>

    @switch (step()) {
      @case ('form') {
        <form [formRoot]="transfer" class="glass flex flex-col gap-6 rounded-card p-6 sm:p-8">
          <h2 #stepHeading tabindex="-1" class="m-0 font-display text-xl font-bold outline-none">¿Cuánto y a quién?</h2>

          @if (showSummary() && summary().length) {
            <div #summaryBox role="alert" tabindex="-1" aria-labelledby="summary-title" class="rounded-panel border border-ember/40 bg-ember/10 p-4 outline-none">
              <p id="summary-title" class="m-0 mb-2 flex items-center gap-2 font-semibold text-ember">
                <app-icon name="alert" class="size-4.5" /> Revisa estos datos
              </p>
              <ul class="m-0 flex list-none flex-col gap-1 p-0 text-sm">
                @for (e of summary(); track e.id) {
                  <li><a [href]="'#' + e.id" class="text-fg underline underline-offset-2" (click)="focusField($event, e.id)">{{ e.message }}</a></li>
                }
              </ul>
            </div>
          }

          <div>
            <label for="from" class="mb-2 block font-medium">Desde</label>
            <select id="from" [class]="control" [formField]="transfer.from">
              @for (a of bank.accounts(); track a.id) {
                <option [value]="a.id">{{ a.name }} · {{ a.balance | money: a.currency }}</option>
              }
            </select>
          </div>

          <fieldset class="m-0 flex flex-col gap-3 border-0 p-0">
            <legend class="mb-2 p-0 font-medium">Para</legend>
            <div class="panel grid grid-cols-2 gap-1 rounded-full p-1">
              @for (k of kinds; track k.id) {
                <label
                  class="flex min-h-11 cursor-pointer items-center justify-center rounded-full text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lime"
                  [class]="model().toKind === k.id ? 'bg-lime font-semibold text-ink' : 'text-dim hover:text-fg'"
                >
                  <input type="radio" name="toKind" class="sr-only" [value]="k.id" [checked]="model().toKind === k.id" (change)="setKind(k.id)" />
                  {{ k.label }}
                </label>
              }
            </div>

            @if (model().toKind === 'account') {
              <label for="to" class="sr-only">Cuenta de destino</label>
              <select id="to" aria-describedby="to-error" [class]="control" [formField]="transfer.to">
                <option value="" disabled>Elige una cuenta</option>
                @for (a of bank.accounts(); track a.id) {
                  <option [value]="a.id">{{ a.name }}</option>
                }
              </select>
            } @else {
              <div id="to" tabindex="-1" role="radiogroup" aria-label="Integrante de tu squad" aria-describedby="to-error" class="grid gap-2 outline-none sm:grid-cols-3">
                @for (c of bank.contacts; track c.id) {
                  <label
                    class="panel flex min-h-14 cursor-pointer items-center gap-3 rounded-panel px-4 transition-colors has-[:checked]:border-lime/60 has-[:checked]:bg-lime/8 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lime"
                  >
                    <input type="radio" name="contact" class="sr-only" [value]="c.id" [checked]="model().to === c.id" (change)="setTo(c.id)" />
                    <span aria-hidden="true" class="size-8 flex-none rounded-full" [class]="toneClass[c.tone]"></span>
                    <span class="flex min-w-0 flex-col">
                      <span class="font-medium">{{ c.name }}</span>
                      <span class="truncate font-mono text-xs text-subtle">{{ c.handle }}</span>
                    </span>
                  </label>
                }
              </div>
            }
            <app-field-error id="to-error" [state]="transfer.to()" />
          </fieldset>

          <div>
            <label for="amount" class="mb-2 block font-medium">Monto</label>
            <div class="panel flex min-h-14 items-center gap-2 rounded-panel px-4 font-mono text-xl font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-lime">
              <span aria-hidden="true" class="text-subtle">{{ fromSymbol() }}</span>
              <input
                id="amount"
                type="number"
                inputmode="decimal"
                step="0.01"
                placeholder="0.00"
                aria-describedby="amount-preview amount-error"
                class="w-full min-w-0 bg-transparent text-fg outline-none placeholder:text-faint [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                [formField]="transfer.amount"
                [attr.aria-invalid]="transfer.amount().touched() && transfer.amount().invalid()"
              />
            </div>
            <p id="amount-preview" class="m-0 mt-2 text-sm text-subtle" aria-live="polite">
              @if (quote(); as q) {
                @if (q.rate) {
                  Llegan {{ q.credit | money: q.creditCurrency }} · US$ 1 = S/ {{ q.rate | number: '1.3-3' }}
                } @else {
                  Disponible: {{ fromAccount()?.balance ?? 0 | money: q.debitCurrency }}
                }
              } @else if (needsRate() && bank.usdToPen() === null) {
                Esperando el tipo de cambio en vivo…
              } @else {
                Disponible: {{ fromAccount()?.balance ?? 0 | money: fromAccount()?.currency ?? 'PEN' }}
              }
            </p>
            <app-field-error id="amount-error" [state]="transfer.amount()" />
          </div>

          <div>
            <label for="note" class="mb-2 block font-medium">Mensaje <span class="font-normal text-subtle">(opcional)</span></label>
            <input id="note" type="text" aria-describedby="note-error" placeholder="ej. pizza del viernes" [class]="control" [formField]="transfer.note" />
            <app-field-error id="note-error" [state]="transfer.note()" />
          </div>

          <button type="submit" [class]="primary">
            Revisar transferencia
            <app-icon name="arrow-right" class="size-4.5" [strokeWidth]="2.2" />
          </button>
        </form>
      }

      @case ('confirm') {
        <section class="glass flex flex-col gap-6 rounded-card p-6 sm:p-8" aria-labelledby="confirm-title">
          <h2 #stepHeading id="confirm-title" tabindex="-1" class="m-0 font-display text-xl font-bold outline-none">Confirma los datos</h2>

          @if (quote(); as q) {
            <dl class="m-0 grid gap-4 sm:grid-cols-2">
              <div class="panel flex flex-col gap-1 rounded-panel p-4">
                <dt class="text-sm text-label">Sale de</dt>
                <dd class="m-0 font-medium">{{ fromAccount()?.name }}</dd>
                <dd class="m-0 font-mono text-2xl font-bold">{{ q.debit | money: q.debitCurrency }}</dd>
              </div>
              <div class="flex flex-col gap-1 rounded-panel border border-lime/25 bg-lime/7 p-4">
                <dt class="text-sm text-label">Llega a</dt>
                <dd class="m-0 font-medium">{{ toTitle() }}</dd>
                <dd class="m-0 font-mono text-2xl font-bold text-lime">{{ q.credit | money: q.creditCurrency }}</dd>
              </div>
              @if (q.rate) {
                <div class="sm:col-span-2">
                  <dt class="text-sm text-label">Tipo de cambio</dt>
                  <dd class="m-0 font-mono">US$ 1 = S/ {{ q.rate | number: '1.3-3' }}</dd>
                </div>
              }
              @if (model().note.trim()) {
                <div class="sm:col-span-2">
                  <dt class="text-sm text-label">Mensaje</dt>
                  <dd class="m-0">{{ model().note }}</dd>
                </div>
              }
            </dl>
          }

          @if (error(); as message) {
            <p role="alert" class="m-0 flex items-start gap-2 rounded-panel border border-ember/40 bg-ember/10 p-4 text-sm">
              <app-icon name="alert" class="mt-0.5 size-4.5 text-ember" /> {{ message }}
            </p>
          }

          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" [disabled]="pending()" [class]="secondary" (click)="edit()">Editar datos</button>
            <button type="button" [disabled]="pending()" [attr.aria-busy]="pending()" [class]="primary" (click)="send()">
              @if (pending()) {
                <span aria-hidden="true" class="size-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink"></span>
                Enviando…
              } @else {
                Confirmar y enviar
              }
            </button>
          </div>
        </section>
      }

      @case ('done') {
        @if (receipt(); as r) {
          <section class="glass flex flex-col items-center gap-5 rounded-card p-8 text-center" aria-labelledby="done-title">
            <span class="grid size-16 place-items-center rounded-full bg-lime text-ink shadow-glow-lime">
              <app-icon name="check" class="size-8" [strokeWidth]="2.6" />
            </span>
            <h2 #stepHeading id="done-title" tabindex="-1" class="m-0 font-display text-2xl font-bold outline-none">¡Transferencia enviada!</h2>
            <p class="m-0 max-w-100 text-muted">
              Enviaste {{ r.debit | money: r.debitCurrency }} a {{ r.toLabel }}{{ r.rate ? ' y llegaron ' + (r.credit | money: r.creditCurrency) : '' }}.
              Tu nuevo saldo es {{ fromAccount()?.balance ?? 0 | money: r.debitCurrency }}.
            </p>
            <p class="m-0 font-mono text-xs text-subtle">Operación {{ r.id }}</p>
            <div class="flex flex-wrap justify-center gap-3">
              <button type="button" [class]="primary" (click)="restart()">Hacer otra transferencia</button>
              <a appButton="glass" routerLink="/app/movimientos" size="lg">Ver movimientos</a>
            </div>
          </section>
        }
      }
    }
  `,
})
export class Transfer {
  protected readonly bank = inject(BankStore);
  private readonly injector = inject(Injector);
  private readonly stepHeading = viewChild<ElementRef<HTMLElement>>('stepHeading');
  private readonly summaryBox = viewChild<ElementRef<HTMLElement>>('summaryBox');

  protected readonly steps = STEPS;
  protected readonly kinds = [
    { id: 'account', label: 'Mis cuentas' },
    { id: 'contact', label: 'Mi squad' },
  ] as const;
  protected readonly toneClass = { violet: 'bg-violet', lime: 'bg-lime', ember: 'bg-ember' } as const;

  protected readonly control =
    'panel min-h-12 w-full rounded-panel bg-ink-2 px-4 text-fg outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime';
  protected readonly primary =
    'inline-flex min-h-13 items-center justify-center gap-2.5 rounded-full bg-lime px-7 font-semibold text-ink transition hover:bg-lime-soft disabled:opacity-60';
  protected readonly secondary =
    'glass inline-flex min-h-13 items-center justify-center rounded-full px-7 font-medium text-fg transition hover:bg-white/10 disabled:opacity-60';

  protected readonly step = signal<Step>('form');
  protected readonly stepIndex = computed(() => STEPS.findIndex((s) => s.id === this.step()));
  protected readonly showSummary = signal(false);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly receipt = signal<TransferReceipt | null>(null);

  protected readonly model = signal<TransferModel>(this.blank());
  protected readonly transfer = form(
    this.model,
    (p) => {
      required(p.to, { message: 'Elige a quién le envías.' });
      validate(p.to, ({ value, valueOf }) =>
        valueOf(p.toKind) === 'account' && value() === valueOf(p.from)
          ? { kind: 'same-account', message: 'Elige una cuenta distinta a la de origen.' }
          : undefined,
      );
      required(p.amount, { message: 'Escribe cuánto quieres enviar.' });
      min(p.amount, 1, { message: 'El monto mínimo es 1.' });
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

  protected readonly fromAccount = computed(() => this.bank.account(this.model().from));
  protected readonly fromSymbol = computed(() => (this.fromAccount()?.currency === 'USD' ? 'US$' : 'S/'));
  private readonly destination = computed<Destination>(() => ({ kind: this.model().toKind, id: this.model().to }));
  /** Destination as a standalone title: "Cuenta en dólares" or "Valeria · @vale.gg". */
  protected readonly toTitle = computed(() => {
    const { kind, id } = this.destination();
    if (kind === 'account') return this.bank.account(id)?.name ?? '';
    const contact = this.bank.contacts.find((c) => c.id === id);
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
      this.receipt.set(await this.bank.transfer({ fromId: from, to: this.destination(), amount, note }));
      this.goTo('done');
    } catch (e) {
      this.error.set(e instanceof TransferError ? e.message : 'No pudimos completar la transferencia. Intenta de nuevo.');
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

  private blank(): TransferModel {
    return { from: 'pen', toKind: 'account', to: 'usd', amount: null, note: '' };
  }
}
