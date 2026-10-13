import { Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, max, maxLength, min, required, validate } from '@angular/forms/signals';

import { Button } from '../../../shared/ui/button';
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
  imports: [Button, FieldError, FormField, FormRoot, Icon, MoneyPipe, ProgressBar, Select],
  host: { class: 'flex flex-col gap-6' },
  templateUrl: './squad.html',
})
export class Squad {
  protected readonly squad = inject(SquadStore);
  protected readonly bank = inject(BankStore);

  protected readonly toneClass = { violet: 'bg-violet', lime: 'bg-lime', ember: 'bg-ember' } as const;

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
