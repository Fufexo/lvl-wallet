import { Service, computed, effect, inject, signal } from '@angular/core';

import { NOW } from '../../../core/clock';
import { LocalStore } from '../../../core/local-store';
import { BankError, BankStore } from './bank-store';
import { XP_PER_LEVEL } from './progression';

const KEY = 'lvl.offers.v1';
const DAY = 24 * 60 * 60 * 1000;

/** x2 XP, % off the price, or extra % of cashback. */
export type OfferKind = 'xp' | 'discount' | 'cashback';

export interface Offer {
  readonly id: string;
  /** Fictional partner brand. */
  readonly partner: string;
  readonly merchantId: string;
  readonly kind: OfferKind;
  /** Multiplier for `xp`, percentage for `discount` and `cashback`. */
  readonly value: number;
  /** Max extra cashback per purchase, in the card's currency. */
  readonly cap?: number;
  readonly minLevel: number;
  readonly title: string;
  readonly description: string;
  /** How long the offer lasts from the start of the season. */
  readonly days: number;
}

export const OFFERS: readonly Offer[] = [
  {
    id: 'arena-xp',
    partner: 'Arena Nova',
    merchantId: 'tienda',
    kind: 'xp',
    value: 2,
    minLevel: 1,
    title: 'Doble XP en la tienda de juegos',
    description: 'Cada compra en Arena Nova suma el doble de XP mientras la oferta esté activa.',
    days: 3,
  },
  {
    id: 'cofre-gift',
    partner: 'Cofre Andino',
    merchantId: 'gift',
    kind: 'cashback',
    value: 10,
    cap: 15,
    minLevel: 10,
    title: '+10% de cashback en gift cards',
    description: 'Cashback extra sobre tu nivel, hasta 15 por compra.',
    days: 7,
  },
  {
    id: 'bitforja-pase',
    partner: 'Bitforja',
    merchantId: 'pase',
    kind: 'discount',
    value: 15,
    minLevel: 12,
    title: '15% menos en pases de batalla',
    description: 'El descuento se aplica al pagar con tu tarjeta virtual.',
    days: 5,
  },
  {
    id: 'lumen-xp',
    partner: 'Lumen Play',
    merchantId: 'streaming',
    kind: 'xp',
    value: 3,
    minLevel: 15,
    title: 'Triple XP en streaming',
    description: 'Tus suscripciones de streaming suman el triple de XP.',
    days: 10,
  },
  {
    id: 'arena-cash',
    partner: 'Arena Nova',
    merchantId: 'tienda',
    kind: 'cashback',
    value: 5,
    cap: 10,
    minLevel: 20,
    title: '+5% de cashback en juegos',
    description: 'Para jugadores veteranos: cashback extra en Arena Nova, hasta 10 por compra.',
    days: 14,
  },
];

export type OfferStatus = 'locked' | 'available' | 'active' | 'expired';

export interface OfferView extends Offer {
  readonly status: OfferStatus;
  readonly daysLeft: number;
  /** XP still needed to unlock a locked offer. */
  readonly xpToUnlock: number;
}

interface OffersState {
  /** Start of the current offer season (ISO). */
  readonly season: string;
  readonly active: readonly string[];
}

/** Short badge text: "x2 XP", "-15%", "+10% cashback". */
export function offerBadge(offer: Pick<Offer, 'kind' | 'value'>): string {
  if (offer.kind === 'xp') return `x${offer.value} XP`;
  if (offer.kind === 'discount') return `-${offer.value}%`;
  return `+${offer.value}% cashback`;
}

/**
 * Partner offers ("Botín"). Players activate them; active, unlocked offers apply
 * automatically to virtual-card purchases at the partner's store until they expire.
 * A new season starts once the longest offer has ended, so the demo never runs dry.
 */
@Service()
export class OffersStore {
  private readonly storage = inject(LocalStore);
  private readonly now = inject(NOW);
  private readonly bank = inject(BankStore);

  private readonly state = signal<OffersState>(this.restore());

  readonly offers = computed<OfferView[]>(() => {
    const { season, active } = this.state();
    const now = this.now().getTime();
    const level = this.bank.progress().level;
    const totalXp = this.bank.totalXp();
    return OFFERS.map((offer) => {
      const ends = new Date(season).getTime() + offer.days * DAY;
      const daysLeft = Math.max(0, Math.ceil((ends - now) / DAY));
      const status: OfferStatus =
        daysLeft === 0 ? 'expired' : level < offer.minLevel ? 'locked' : active.includes(offer.id) ? 'active' : 'available';
      return { ...offer, status, daysLeft, xpToUnlock: Math.max(0, (offer.minLevel - 1) * XP_PER_LEVEL - totalXp) };
    });
  });

  readonly activeCount = computed(() => this.offers().filter((o) => o.status === 'active').length);

  constructor() {
    effect(() => this.storage.set(KEY, this.state()));
  }

  /** Offers that will apply to a purchase at this merchant right now. */
  activeFor(merchantId: string): OfferView[] {
    return this.offers().filter((o) => o.merchantId === merchantId && o.status === 'active');
  }

  activate(id: string): void {
    const offer = this.offers().find((o) => o.id === id);
    if (!offer) throw new BankError('Esa oferta ya no existe.');
    if (offer.status === 'locked') throw new BankError(`Se desbloquea en el nivel ${offer.minLevel}.`);
    if (offer.status === 'expired') throw new BankError('Esta oferta ya venció.');
    this.state.update((s) => (s.active.includes(id) ? s : { ...s, active: [...s.active, id] }));
  }

  deactivate(id: string): void {
    this.state.update((s) => ({ ...s, active: s.active.filter((a) => a !== id) }));
  }

  reset(): void {
    this.state.set(this.fresh());
  }

  private fresh(): OffersState {
    return { season: this.now().toISOString(), active: [] };
  }

  private restore(): OffersState {
    const saved = this.storage.get(KEY) as OffersState | null;
    const longest = Math.max(...OFFERS.map((o) => o.days));
    if (
      saved &&
      typeof saved.season === 'string' &&
      Array.isArray(saved.active) &&
      this.now().getTime() - new Date(saved.season).getTime() < longest * DAY
    ) {
      return saved;
    }
    return this.fresh();
  }
}
