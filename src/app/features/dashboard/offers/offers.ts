import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Icon } from '../../../shared/ui/icon';
import { BankStore } from '../data/bank-store';
import { MERCHANTS } from '../data/cards-store';
import { OfferView, OffersStore, offerBadge } from '../data/offers-store';

const KIND_TONE = {
  xp: 'bg-violet/18 text-lilac',
  discount: 'bg-ember/16 text-ember',
  cashback: 'bg-lime/14 text-lime',
} as const;

@Component({
  selector: 'app-offers',
  imports: [DecimalPipe, Icon, RouterLink],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-2">
        <span class="eyebrow text-xs text-lime">Botín de aliados</span>
        <h1 tabindex="-1" class="m-0 font-display text-[clamp(28px,4vw,44px)] leading-none font-bold tracking-[-0.02em] outline-none">
          Ofertas para tu nivel
        </h1>
        <p class="m-0 max-w-150 text-muted">
          Actívalas y se aplican solas cuando pagas con tu tarjeta virtual en esa tienda. Subir de
          nivel desbloquea mejores ofertas.
        </p>
      </div>
      <div class="panel rounded-panel px-5 py-3">
        <p class="m-0 text-sm text-label">Activas</p>
        <p class="m-0 font-mono text-2xl font-bold text-lime">{{ store.activeCount() }}</p>
      </div>
    </header>

    <p class="m-0 flex items-start gap-2 rounded-panel border border-white/10 bg-white/4 px-4 py-3 text-sm text-muted">
      <app-icon name="alert" class="mt-0.5 size-4 text-subtle" />
      Aliados de demostración: marcas ficticias creadas para este proyecto, sin convenios reales.
    </p>

    <p role="status" class="m-0 min-h-6 text-sm text-lime">{{ notice() }}</p>

    <ul class="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
      @for (offer of store.offers(); track offer.id) {
        <li class="glass flex flex-col gap-4 rounded-card p-6" [class]="cardState(offer)">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <span
                aria-hidden="true"
                class="grid size-11 place-items-center rounded-xl font-display text-sm font-black"
                [class]="offer.status === 'locked' || offer.status === 'expired' ? 'bg-white/6 text-subtle' : tone[offer.kind]"
              >
                {{ initials(offer.partner) }}
              </span>
              <span class="flex flex-col">
                <span class="font-medium">{{ offer.partner }}</span>
                <span class="text-xs text-subtle">{{ merchant(offer.merchantId) }}</span>
              </span>
            </div>
            <span class="rounded-full px-2.5 py-1 font-mono text-xs font-bold" [class]="tone[offer.kind]">{{ badge(offer) }}</span>
          </div>

          <div class="flex flex-col gap-1.5">
            <h2 class="m-0 font-display text-lg leading-tight font-bold">{{ offer.title }}</h2>
            <p class="m-0 text-sm text-muted">{{ offer.description }}</p>
          </div>

          <div class="mt-auto flex flex-wrap items-center justify-between gap-3">
            <span class="text-xs text-subtle">
              @switch (offer.status) {
                @case ('expired') { Vencida }
                @case ('locked') { Desde el nivel {{ offer.minLevel }} · te faltan {{ offer.xpToUnlock | number }} XP }
                @default { Vence en {{ offer.daysLeft }} {{ offer.daysLeft === 1 ? 'día' : 'días' }} }
              }
            </span>

            @switch (offer.status) {
              @case ('locked') {
                <span class="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm text-subtle">
                  <app-icon name="lock" class="size-4" /> Bloqueada
                </span>
              }
              @case ('expired') {}
              @default {
                <div class="flex flex-wrap gap-2">
                  @if (offer.status === 'active') {
                    <a class="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm text-dim no-underline hover:text-fg" routerLink="/app/tarjetas" [queryParams]="{ tienda: offer.merchantId }">
                      Usar ahora <app-icon name="chevron-right" class="size-4" />
                    </a>
                  }
                  <button
                    type="button"
                    class="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition"
                    [class]="offer.status === 'active' ? 'border border-lime/50 bg-lime/10 text-lime' : 'bg-lime text-ink hover:bg-lime-soft'"
                    [attr.aria-pressed]="offer.status === 'active'"
                    [attr.aria-label]="(offer.status === 'active' ? 'Desactivar ' : 'Activar ') + offer.title"
                    (click)="toggle(offer)"
                  >
                    @if (offer.status === 'active') {
                      <app-icon name="check" class="size-4" [strokeWidth]="2.5" /> Activa
                    } @else {
                      <app-icon name="lock-open" class="size-4" /> Activar
                    }
                  </button>
                </div>
              }
            }
          </div>
        </li>
      }
    </ul>
  `,
})
export class Offers {
  protected readonly store = inject(OffersStore);
  private readonly bank = inject(BankStore);

  protected readonly tone = KIND_TONE;
  protected readonly notice = signal('');
  protected readonly level = computed(() => this.bank.progress().level);

  protected cardState(offer: OfferView): string {
    // Locked/expired cards keep full-contrast text (it explains how to unlock them);
    // only the border and the partner mark are muted.
    if (offer.status === 'active') return 'border-lime/40!';
    return offer.status === 'locked' || offer.status === 'expired' ? 'border-dashed! border-white/20!' : '';
  }

  protected badge(offer: OfferView): string {
    return offerBadge(offer);
  }

  protected initials(partner: string): string {
    return partner
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  protected merchant(id: string): string {
    return MERCHANTS.find((m) => m.id === id)?.label ?? '';
  }

  protected toggle(offer: OfferView): void {
    if (offer.status === 'active') {
      this.store.deactivate(offer.id);
      this.notice.set(`Desactivaste «${offer.title}».`);
    } else {
      this.store.activate(offer.id);
      this.notice.set(`Activaste «${offer.title}». Se aplica al pagar en ${this.merchant(offer.merchantId)}.`);
    }
  }
}
