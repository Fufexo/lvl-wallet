import { Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, max, maxLength, min, required, validate } from '@angular/forms/signals';

import { FieldError } from '../../../shared/ui/field-error';
import { Icon } from '../../../shared/ui/icon';
import { MoneyPipe } from '../../../shared/ui/money';
import { ProgressBar } from '../../../shared/ui/progress-bar';
import { Select } from '../../../shared/ui/select';
import { BankError, BankStore, round2 } from '../data/bank-store';
import { SharedSubscription } from '../data/models';
import { SquadStore, shareOf } from '../data/squad-store';

type MemberFlags = Record<string, boolean>;

@Component({
  selector: 'app-squad',
  imports: [FieldError, FormField, FormRoot, Icon, MoneyPipe, ProgressBar, Select],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-2">
        <span class="eyebrow text-xs text-lime">Modo squad</span>
        <h1 tabindex="-1" class="m-0 font-display text-[clamp(28px,4vw,44px)] leading-none font-bold tracking-[-0.02em] outline-none">
          Suscripciones compartidas
        </h1>
        <p class="m-0 max-w-150 text-muted">Pagas tú el total y cada quien te devuelve su parte. Aquí ves quién ya pagó.</p>
      </div>
      <div class="panel rounded-panel px-5 py-3">
        <p class="m-0 text-sm text-label">Por cobrar</p>
        <p class="m-0 font-mono text-2xl font-bold text-lime">
          @if (squad.pendingPen(); as pending) { {{ pending | money: 'PEN' }} } @else { S/ 0.00 }
        </p>
      </div>
    </header>

    <p role="status" class="m-0 min-h-6 text-sm text-lime">{{ notice() }}</p>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
      <section aria-labelledby="subs-title" class="flex flex-col gap-4">
        <h2 id="subs-title" class="sr-only">Tus suscripciones compartidas</h2>
        @for (sub of squad.subscriptions(); track sub.id) {
          <article class="glass flex flex-col gap-5 rounded-card p-6" [attr.aria-labelledby]="sub.id + '-name'">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 [id]="sub.id + '-name'" class="m-0 font-display text-xl font-bold">{{ sub.name }}</h3>
                <p class="m-0 text-sm text-muted">
                  {{ sub.amount | money: currencyOf(sub) }} al mes · {{ share(sub) | money: currencyOf(sub) }} por persona
                </p>
              </div>
              <span class="rounded-full bg-white/7 px-3 py-1 font-mono text-xs">{{ paidCount(sub) }} de {{ sub.members.length }} pagaron</span>
            </div>

            <app-progress-bar
              class="h-2"
              [label]="'Pagos recibidos de ' + sub.name"
              [value]="paidCount(sub)"
              [max]="sub.members.length"
              [valueText]="paidCount(sub) + ' de ' + sub.members.length + ' pagaron'"
            />

            <ul class="m-0 flex list-none flex-col divide-y divide-white/6 p-0">
              @for (m of sub.members; track m.contactId) {
                @let contact = squad.contact(m.contactId);
                <li class="flex flex-wrap items-center gap-3 py-3">
                  <span aria-hidden="true" class="size-9 flex-none rounded-full" [class]="toneClass[contact?.tone ?? 'violet']"></span>
                  <span class="flex min-w-0 flex-1 flex-col">
                    <span class="font-medium">{{ contact?.name }}</span>
                    <span class="font-mono text-xs text-subtle">{{ contact?.handle }}</span>
                  </span>
                  @if (m.paid) {
                    <span class="inline-flex items-center gap-1 rounded-full bg-lime/14 px-2.5 py-1 text-xs text-lime">
                      <app-icon name="check" class="size-3.5" /> Pagó
                    </span>
                  } @else {
                    <span class="rounded-full bg-ember/14 px-2.5 py-1 text-xs text-ember">Pendiente</span>
                    <button
                      type="button"
                      [class]="secondary"
                      [disabled]="busy() === sub.id + m.contactId"
                      (click)="markPaid(sub, m.contactId)"
                    >
                      {{ busy() === sub.id + m.contactId ? 'Registrando…' : 'Registrar pago' }}
                      <span class="sr-only"> de {{ contact?.name }}</span>
                    </button>
                  }
                </li>
              }
            </ul>

            @if (confirmingRemove() === sub.id) {
              <div role="group" aria-label="Confirmar" class="flex flex-col gap-3 rounded-panel border border-ember/40 bg-ember/10 p-4">
                <p class="m-0 text-sm">¿Dejar de seguir «{{ sub.name }}»? Los pagos ya registrados se quedan en tu historial.</p>
                <div class="flex flex-wrap gap-2">
                  <button type="button" [class]="secondary" (click)="confirmingRemove.set(null)">Cancelar</button>
                  <button type="button" class="inline-flex min-h-11 items-center rounded-full bg-ember px-5 font-semibold text-ink" (click)="remove(sub)">Sí, dejar de seguir</button>
                </div>
              </div>
            } @else {
              <button type="button" [class]="secondary + ' self-start'" (click)="confirmingRemove.set(sub.id)">
                <app-icon name="trash" class="size-4.5" /> Dejar de seguir
              </button>
            }
          </article>
        } @empty {
          <div class="glass flex flex-col items-center gap-3 rounded-card px-6 py-12 text-center">
            <span class="grid size-14 place-items-center rounded-2xl bg-violet/18 text-lilac"><app-icon name="users" class="size-6" /></span>
            <h3 class="m-0 font-display text-xl font-bold">Nada compartido todavía</h3>
            <p class="m-0 max-w-80 text-muted">Divide tu próxima suscripción con el formulario y lleva la cuenta de quién te pagó.</p>
          </div>
        }
      </section>

      <section aria-labelledby="split-title" class="glass flex flex-col gap-5 rounded-card p-6">
        <h2 id="split-title" class="m-0 font-display text-xl font-bold">Dividir una suscripción</h2>
        <form [formRoot]="split" class="flex flex-col gap-4">
          <div>
            <label for="split-name" class="mb-2 block font-medium">Servicio</label>
            <input id="split-name" type="text" placeholder="ej. Streaming de música" aria-describedby="split-name-error" [class]="control" [formField]="split.name" [attr.aria-invalid]="split.name().touched() && split.name().invalid()" />
            <app-field-error id="split-name-error" [state]="split.name()" />
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="split-amount" class="mb-2 block font-medium">Precio mensual</label>
              <input id="split-amount" type="number" inputmode="decimal" step="0.01" placeholder="0.00" aria-describedby="split-amount-error" [class]="control + ' font-mono'" [formField]="split.amount" [attr.aria-invalid]="split.amount().touched() && split.amount().invalid()" />
              <app-field-error id="split-amount-error" [state]="split.amount()" />
            </div>
            <div>
              <label for="split-account" class="mb-2 block font-medium">Pagas desde</label>
              <app-select inputId="split-account" label="Pagas desde" [options]="bank.accountOptions()" [formField]="split.accountId" />
            </div>
          </div>

          <fieldset class="m-0 flex flex-col gap-2 border-0 p-0" aria-describedby="split-members-error">
            <legend class="mb-2 p-0 font-medium">Lo compartes con</legend>
            @for (c of bank.contacts; track c.id) {
              <label class="panel flex min-h-12 cursor-pointer items-center gap-3 rounded-panel px-4 has-[:checked]:border-lime/50 has-[:checked]:bg-lime/8">
                <input type="checkbox" class="size-4.5 accent-lime" [formField]="split.members[c.id]" />
                <span aria-hidden="true" class="size-6 rounded-full" [class]="toneClass[c.tone]"></span>
                <span>{{ c.name }} <span class="font-mono text-xs text-subtle">{{ c.handle }}</span></span>
              </label>
            }
            <app-field-error id="split-members-error" [state]="split.members()" />
          </fieldset>

          <p class="m-0 text-sm text-muted" aria-live="polite">
            @if (preview(); as p) {
              Cada uno paga <strong class="font-mono text-fg">{{ p.share | money: p.currency }}</strong> ({{ p.people }} personas, contándote).
            } @else {
              Elige el precio y a tu squad para ver cuánto paga cada uno.
            }
          </p>

          <button type="submit" [disabled]="split().submitting()" [class]="primary">
            {{ split().submitting() ? 'Pagando…' : 'Pagar y dividir' }}
          </button>
        </form>
      </section>
    </div>
  `,
})
export class Squad {
  protected readonly squad = inject(SquadStore);
  protected readonly bank = inject(BankStore);

  protected readonly toneClass = { violet: 'bg-violet', lime: 'bg-lime', ember: 'bg-ember' } as const;
  protected readonly control =
    'panel min-h-12 w-full rounded-panel bg-ink-2 px-4 text-fg outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime';
  protected readonly primary =
    'inline-flex min-h-13 items-center justify-center rounded-full bg-lime px-7 font-semibold text-ink transition hover:bg-lime-soft disabled:opacity-60';
  protected readonly secondary =
    'inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-4 text-sm text-fg transition-colors hover:bg-white/8 disabled:opacity-60';

  protected readonly notice = signal('');
  protected readonly busy = signal<string | null>(null);
  protected readonly confirmingRemove = signal<string | null>(null);

  private readonly blankMembers = (): MemberFlags =>
    Object.fromEntries(this.bank.contacts.map((c) => [c.id, false]));

  private readonly model = signal({
    name: '',
    amount: null as number | null,
    accountId: 'pen',
    members: this.blankMembers(),
  });

  protected readonly split = form(
    this.model,
    (p) => {
      required(p.name, { message: 'Escribe qué servicio comparten.' });
      maxLength(p.name, 30, { message: 'Usa como máximo 30 caracteres.' });
      required(p.amount, { message: 'Escribe el precio mensual.' });
      min(p.amount, 1, { message: 'El precio mínimo es 1.' });
      max(p.amount, 500, { message: 'El precio máximo es 500.' });
      validate(p.members, ({ value }) =>
        Object.values(value()).some(Boolean)
          ? undefined
          : { kind: 'members', message: 'Elige al menos a una persona de tu squad.' },
      );
    },
    {
      submission: {
        action: async (f) => {
          const { name, amount, accountId, members } = this.model();
          const memberIds = Object.keys(members).filter((id) => members[id]);
          try {
            const sub = await this.squad.create({ name, amount: amount ?? 0, accountId, memberIds });
            this.model.set({ name: '', amount: null, accountId: 'pen', members: this.blankMembers() });
            f().reset();
            this.notice.set(`Pagaste «${sub.name}» y la dividiste entre ${memberIds.length + 1}.`);
            return undefined;
          } catch (e) {
            const message = e instanceof BankError ? e.message : 'No pudimos completar el pago. Intenta de nuevo.';
            return { kind: 'server', message, fieldTree: f.amount };
          }
        },
      },
    },
  );

  protected readonly preview = computed(() => {
    const { amount, accountId, members } = this.model();
    const count = Object.values(members).filter(Boolean).length;
    if (!amount || amount <= 0 || count === 0) return null;
    return {
      share: round2(amount / (count + 1)),
      people: count + 1,
      currency: this.bank.currencyOf(accountId),
    };
  });

  protected currencyOf(sub: SharedSubscription) {
    return this.bank.currencyOf(sub.accountId);
  }

  protected share(sub: SharedSubscription): number {
    return shareOf(sub);
  }

  protected paidCount(sub: SharedSubscription): number {
    return sub.members.filter((m) => m.paid).length;
  }

  protected async markPaid(sub: SharedSubscription, contactId: string): Promise<void> {
    this.busy.set(sub.id + contactId);
    try {
      await this.squad.markPaid(sub.id, contactId);
      this.notice.set(`Registraste el pago de ${this.squad.contact(contactId)?.name} por «${sub.name}».`);
    } catch (e) {
      this.notice.set(e instanceof BankError ? e.message : 'No pudimos registrar el pago.');
    } finally {
      this.busy.set(null);
    }
  }

  protected remove(sub: SharedSubscription): void {
    this.squad.remove(sub.id);
    this.confirmingRemove.set(null);
    this.notice.set(`Dejaste de seguir «${sub.name}».`);
  }
}
