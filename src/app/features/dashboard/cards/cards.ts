import { Component, computed, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, FormRoot, form, max, maxLength, min, required } from '@angular/forms/signals';

import { Button } from '../../../shared/ui/button';
import { FieldError } from '../../../shared/ui/field-error';
import { Icon } from '../../../shared/ui/icon';
import { MoneyPipe } from '../../../shared/ui/money';
import { ProgressBar } from '../../../shared/ui/progress-bar';
import { Select, SelectOption } from '../../../shared/ui/select';
import { BankError, BankStore } from '../data/bank-store';
import { CardsStore, MAX_CARDS, MERCHANTS, PurchaseReceipt } from '../data/cards-store';
import { VirtualCardView } from '../ui/virtual-card-view';
import { OffersStore, offerBadge } from '../data/offers-store';

const playerError = (e: unknown) =>
  e instanceof BankError ? e.message : 'No pudimos completar la operación. Intenta de nuevo.';

@Component({
  selector: 'app-cards',
  imports: [Button, FieldError, FormField, FormRoot, Icon, MoneyPipe, ProgressBar, RouterLink, Select, VirtualCardView],
  host: { class: 'flex flex-col gap-6' },
  templateUrl: './cards.html',
})
export class Cards {
  protected readonly store = inject(CardsStore);
  protected readonly bank = inject(BankStore);

  protected readonly merchants = MERCHANTS;
  protected readonly maxCards = MAX_CARDS;

  protected readonly notice = signal('');
  protected readonly confirmingDelete = signal<string | null>(null);
  protected readonly receipt = signal<PurchaseReceipt | null>(null);
  protected readonly usableCards = computed(() => this.store.cards().filter((c) => !c.frozen));
  protected readonly cardOptions = computed<SelectOption<string>[]>(() =>
    this.usableCards().map((c) => ({ value: c.id, label: c.label, hint: `•••• ${c.last4}` })),
  );
  protected readonly merchantOptions: SelectOption<string>[] = MERCHANTS.map((m) => ({ value: m.id, label: m.label }));

  /** `?tienda=` preselects a store, e.g. from "Usar ahora" in the Botín. */
  readonly tienda = input<string>();
  private readonly offersStore = inject(OffersStore);

  private readonly buyModel = linkedSignal(() => {
    const tienda = this.tienda();
    return {
      cardId: untracked(() => this.usableCards()[0]?.id ?? ''),
      merchantId: MERCHANTS.some((m) => m.id === tienda) ? tienda! : 'gift',
      amount: null as number | null,
    };
  });
  protected readonly offersHere = computed(() => this.offersStore.activeFor(this.buyModel().merchantId));
  protected readonly buy = form(
    this.buyModel,
    (p) => {
      required(p.cardId, { message: 'Elige una tarjeta.' });
      required(p.amount, { message: 'Escribe el monto de la compra.' });
      min(p.amount, 1, { message: 'El monto mínimo es 1.' });
    },
    {
      submission: {
        action: async (f) => {
          this.receipt.set(null);
          const { cardId, merchantId, amount } = this.buyModel();
          try {
            this.receipt.set(await this.store.purchase(cardId, merchantId, amount ?? 0));
            this.buyModel.update((m) => ({ ...m, amount: null }));
            f.amount().reset();
            return undefined;
          } catch (e) {
            return { kind: 'server', message: playerError(e), fieldTree: f.amount };
          }
        },
      },
    },
  );

  private readonly newModel = signal({ label: '', accountId: 'pen', limit: 100 as number | null });
  protected readonly newCard = form(
    this.newModel,
    (p) => {
      required(p.label, { message: 'Ponle un nombre para reconocerla.' });
      maxLength(p.label, 20, { message: 'Usa como máximo 20 caracteres.' });
      required(p.limit, { message: 'Define un tope de gasto.' });
      min(p.limit, 10, { message: 'El tope mínimo es 10.' });
      max(p.limit, 2000, { message: 'El tope máximo es 2,000.' });
    },
    {
      submission: {
        action: async (f) => {
          const { label, accountId, limit } = this.newModel();
          try {
            const card = await this.store.create({ label, accountId, limit: limit ?? 0 });
            this.newModel.set({ label: '', accountId: 'pen', limit: 100 });
            f().reset();
            this.buyModel.update((m) => ({ ...m, cardId: m.cardId || card.id }));
            this.notice.set(`Creaste la tarjeta «${card.label}» terminada en ${card.last4}.`);
            return undefined;
          } catch (e) {
            return { kind: 'server', message: playerError(e), fieldTree: f.label };
          }
        },
      },
    },
  );

  protected badge(offer: Parameters<typeof offerBadge>[0]): string {
    return offerBadge(offer);
  }

  protected toggleFreeze(id: string): void {
    this.store.toggleFreeze(id);
    // A frozen card can't pay: keep the purchase form pointing at a usable one.
    if (!this.usableCards().some((c) => c.id === this.buyModel().cardId)) {
      this.buyModel.update((m) => ({ ...m, cardId: this.usableCards()[0]?.id ?? '' }));
    }
  }

  protected remove(id: string, label: string): void {
    this.store.remove(id);
    this.confirmingDelete.set(null);
    if (this.buyModel().cardId === id) {
      this.buyModel.update((m) => ({ ...m, cardId: this.usableCards()[0]?.id ?? '' }));
    }
    this.notice.set(`Eliminaste la tarjeta «${label}».`);
  }
}
