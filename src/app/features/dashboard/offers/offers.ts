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
  templateUrl: './offers.html',
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
