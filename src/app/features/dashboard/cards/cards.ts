import { Component, computed, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, FormRoot, form, max, maxLength, min, required } from '@angular/forms/signals';

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
  imports: [FieldError, FormField, FormRoot, Icon, MoneyPipe, ProgressBar, RouterLink, Select, VirtualCardView],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <header class="flex flex-col gap-2">
      <span class="eyebrow text-xs text-lime">Pagos seguros</span>
      <h1 tabindex="-1" class="m-0 font-display text-[clamp(28px,4vw,44px)] leading-none font-bold tracking-[-0.02em] outline-none">
        Tarjetas virtuales
      </h1>
      <p class="m-0 max-w-150 text-muted">
        Úsalas en tiendas nuevas y bórralas después: tu cuenta principal nunca se expone. Cada compra
        suma XP y te devuelve cashback según tu nivel.
      </p>
    </header>

    <p role="status" class="m-0 min-h-6 text-sm text-lime">{{ notice() }}</p>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
      <!-- Cards -->
      <section aria-labelledby="cards-title" class="flex flex-col gap-4">
        <h2 id="cards-title" class="sr-only">Tus tarjetas</h2>
        @for (card of store.cards(); track card.id) {
          <article class="glass flex flex-col gap-5 rounded-card p-5 sm:p-6" [attr.aria-label]="'Tarjeta ' + card.label">
            <app-virtual-card-view [card]="card" [currency]="bank.currencyOf(card.accountId)" />

            <div class="flex flex-col gap-2">
              <p class="m-0 flex justify-between text-sm">
                <span class="text-muted">Usado de su tope</span>
                <span class="font-mono">{{ card.spent | money: bank.currencyOf(card.accountId) }} / {{ card.limit | money: bank.currencyOf(card.accountId) }}</span>
              </p>
              <app-progress-bar
                class="h-2"
                [label]="'Tope usado de la tarjeta ' + card.label"
                [fillClass]="card.spent / card.limit >= 0.8 ? 'bg-ember' : 'bg-lime'"
                [value]="card.spent"
                [max]="card.limit"
              />
            </div>

            @if (confirmingDelete() === card.id) {
              <div role="group" aria-label="Confirmar eliminación" class="flex flex-col gap-3 rounded-panel border border-ember/40 bg-ember/10 p-4">
                <p class="m-0 text-sm">¿Eliminar «{{ card.label }}»? La tarjeta deja de funcionar y no se puede recuperar.</p>
                <div class="flex flex-wrap gap-2">
                  <button type="button" [class]="secondary" (click)="confirmingDelete.set(null)">Cancelar</button>
                  <button type="button" class="inline-flex min-h-11 items-center gap-2 rounded-full bg-ember px-5 font-semibold text-ink" (click)="remove(card.id, card.label)">
                    <app-icon name="trash" class="size-4.5" /> Sí, eliminar
                  </button>
                </div>
              </div>
            } @else {
              <div class="flex flex-wrap gap-2">
                <button type="button" [class]="secondary" [attr.aria-pressed]="card.frozen" (click)="toggleFreeze(card.id)">
                  <app-icon name="freeze" class="size-4.5" />
                  {{ card.frozen ? 'Congelada' : 'Congelar' }}
                </button>
                <button type="button" [class]="secondary" (click)="confirmingDelete.set(card.id)">
                  <app-icon name="trash" class="size-4.5" /> Eliminar
                </button>
              </div>
            }
          </article>
        } @empty {
          <div class="glass flex flex-col items-center gap-3 rounded-card px-6 py-12 text-center">
            <span class="grid size-14 place-items-center rounded-2xl bg-violet/18 text-lilac"><app-icon name="card" class="size-6" /></span>
            <h3 class="m-0 font-display text-xl font-bold">No tienes tarjetas virtuales</h3>
            <p class="m-0 max-w-80 text-muted">Crea una con el formulario para comprar en una tienda nueva sin exponer tu cuenta.</p>
          </div>
        }
      </section>

      <div class="flex flex-col gap-4">
        <!-- Simulated purchase -->
        <section aria-labelledby="buy-title" class="glass flex flex-col gap-5 rounded-card p-6">
          <h2 id="buy-title" class="m-0 font-display text-xl font-bold">Simular una compra</h2>

          @if (usableCards().length) {
            <form [formRoot]="buy" class="flex flex-col gap-4">
              <div>
                <label for="buy-card" class="mb-2 block font-medium">Tarjeta</label>
                <app-select inputId="buy-card" label="Tarjeta" [options]="cardOptions()" [formField]="buy.cardId" />
              </div>
              <div>
                <label for="buy-merchant" class="mb-2 block font-medium">Tienda</label>
                <app-select inputId="buy-merchant" label="Tienda" [options]="merchantOptions" [formField]="buy.merchantId" />
              </div>
              <div>
                <label for="buy-amount" class="mb-2 block font-medium">Monto</label>
                <input id="buy-amount" type="number" inputmode="decimal" step="0.01" placeholder="0.00" aria-describedby="buy-amount-error" [class]="control + ' font-mono'" [formField]="buy.amount" [attr.aria-invalid]="buy.amount().touched() && buy.amount().invalid()" />
                <app-field-error id="buy-amount-error" [state]="buy.amount()" />
              </div>
              @if (offersHere().length) {
                <p class="m-0 flex flex-wrap items-center gap-2 rounded-panel border border-lime/25 bg-lime/6 px-3 py-2 text-sm">
                  <app-icon name="tag" class="size-4 text-lime" />
                  <span>Se aplica:</span>
                  @for (o of offersHere(); track o.id) {
                    <span class="rounded-full bg-lime/14 px-2 py-0.5 font-mono text-xs text-lime">{{ o.partner }} {{ badge(o) }}</span>
                  }
                </p>
              } @else {
                <p class="m-0 text-sm text-subtle">
                  Sin ofertas activas en esta tienda.
                  <a routerLink="/app/botin" class="text-dim underline underline-offset-2 hover:text-fg">Ver el botín</a>
                </p>
              }
              <button type="submit" [disabled]="buy().submitting()" [class]="primary">
                {{ buy().submitting() ? 'Pagando…' : 'Pagar con la tarjeta' }}
              </button>
            </form>
          } @else {
            <p class="m-0 text-muted">Necesitas una tarjeta activa (sin congelar) para simular una compra.</p>
          }

          @if (receipt(); as r) {
            <div role="status" class="flex flex-col gap-2 rounded-panel border border-lime/30 bg-lime/8 p-4">
              <p class="m-0 font-medium">
                Pagaste {{ r.amount | money: r.currency }} en {{ r.merchant }}@if (r.price !== r.amount) { <span class="text-subtle"> (antes {{ r.price | money: r.currency }})</span> }.
              </p>
              @for (o of r.offers; track o.title) {
                <p class="m-0 flex items-center gap-2 text-sm"><app-icon name="tag" class="size-4 text-lime" /> {{ o.partner }}: {{ o.effect }}</p>
              }
              @if (r.roundUp > 0) {
                <p class="m-0 flex items-center gap-2 text-sm"><app-icon name="target" class="size-4 text-lime" /> {{ r.roundUp | money: r.currency }} de redondeo a tu cofre</p>
              }
              <p class="m-0 flex flex-wrap gap-2 font-mono text-sm">
                <span class="rounded-full bg-violet/18 px-2.5 py-1 text-lilac">+{{ r.xp }} XP</span>
                @if (r.cashback > 0) {
                  <span class="rounded-full bg-lime/14 px-2.5 py-1 text-lime">Cashback {{ r.cashback | money: r.currency }} ({{ r.cashbackRate }}%)</span>
                }
              </p>
              @if (r.levelUp; as level) {
                <p class="m-0 flex items-center gap-2 font-display font-bold text-lime">
                  <app-icon name="sparkle" class="size-5" /> ¡Subiste al nivel {{ level }}!
                </p>
              }
            </div>
          }
        </section>

        <!-- New card -->
        <section aria-labelledby="new-title" class="glass flex flex-col gap-5 rounded-card p-6">
          <h2 id="new-title" class="m-0 font-display text-xl font-bold">Nueva tarjeta</h2>
          @if (store.canCreate()) {
            <form [formRoot]="newCard" class="flex flex-col gap-4">
              <div>
                <label for="new-label" class="mb-2 block font-medium">Nombre</label>
                <input id="new-label" type="text" placeholder="ej. Torneo del sábado" aria-describedby="new-label-error" [class]="control" [formField]="newCard.label" [attr.aria-invalid]="newCard.label().touched() && newCard.label().invalid()" />
                <app-field-error id="new-label-error" [state]="newCard.label()" />
              </div>
              <div>
                <label for="new-account" class="mb-2 block font-medium">Cobra desde</label>
                <app-select inputId="new-account" label="Cobra desde" [options]="bank.accountOptions()" [formField]="newCard.accountId" />
              </div>
              <div>
                <label for="new-limit" class="mb-2 block font-medium">Tope de gasto</label>
                <input id="new-limit" type="number" inputmode="decimal" step="1" aria-describedby="new-limit-hint new-limit-error" [class]="control + ' font-mono'" [formField]="newCard.limit" [attr.aria-invalid]="newCard.limit().touched() && newCard.limit().invalid()" />
                <p id="new-limit-hint" class="m-0 mt-2 text-sm text-subtle">Entre 10 y 2,000 en la moneda de la cuenta.</p>
                <app-field-error id="new-limit-error" [state]="newCard.limit()" />
              </div>
              <button type="submit" [disabled]="newCard().submitting()" [class]="primary">
                {{ newCard().submitting() ? 'Creando…' : 'Crear tarjeta' }}
              </button>
            </form>
          } @else {
            <p class="m-0 text-muted">Tienes {{ maxCards }} tarjetas, el máximo. Elimina una para crear otra.</p>
          }
        </section>
      </div>
    </div>
  `,
})
export class Cards {
  protected readonly store = inject(CardsStore);
  protected readonly bank = inject(BankStore);

  protected readonly merchants = MERCHANTS;
  protected readonly maxCards = MAX_CARDS;
  protected readonly control =
    'panel min-h-12 w-full rounded-panel bg-ink-2 px-4 text-fg outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime';
  protected readonly primary =
    'inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-lime px-7 font-semibold text-ink transition hover:bg-lime-soft disabled:opacity-60';
  protected readonly secondary =
    'inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-4 text-sm text-fg transition-colors hover:bg-white/8 aria-pressed:border-lime/50 aria-pressed:bg-lime/10 aria-pressed:text-lime';

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
