import { Service, computed, effect, inject, signal } from '@angular/core';

import { NOW } from '../../../core/clock';
import { LocalStore } from '../../../core/local-store';
import { BankError, BankStore } from './bank-store';
import { Transaction } from './models';

const KEY = 'lvl.missions.v1';
const DAY = 24 * 60 * 60 * 1000;

export interface Mission {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly target: number;
  /** "3 compras", "S/ 50"… */
  readonly unit: 'count' | 'soles';
  readonly reward: number;
  /** Where in the panel the player can make progress. */
  readonly link: string;
  readonly linkLabel: string;
}

export const MISSIONS: readonly Mission[] = [
  {
    id: 'card-3',
    title: 'Paga 3 veces con tarjeta virtual',
    description: 'Cualquier tienda cuenta.',
    target: 3,
    unit: 'count',
    reward: 150,
    link: '/app/tarjetas',
    linkLabel: 'Ir a tarjetas',
  },
  {
    id: 'offer-1',
    title: 'Usa una oferta de aliados',
    description: 'Activa una oferta del Botín y paga en esa tienda.',
    target: 1,
    unit: 'count',
    reward: 100,
    link: '/app/botin',
    linkLabel: 'Ver el botín',
  },
  {
    id: 'save-50',
    title: 'Guarda S/ 50 en tus cofres',
    description: 'Los redondeos automáticos también suman.',
    target: 50,
    unit: 'soles',
    reward: 200,
    link: '/app/cofres',
    linkLabel: 'Ir a cofres',
  },
  {
    id: 'squad-1',
    title: 'Divide una suscripción con tu squad',
    description: 'Paga una suscripción y repártela.',
    target: 1,
    unit: 'count',
    reward: 120,
    link: '/app/squad',
    linkLabel: 'Ir a squad',
  },
  {
    id: 'send-squad',
    title: 'Envía dinero a alguien de tu squad',
    description: 'Una transferencia a cualquier integrante.',
    target: 1,
    unit: 'count',
    reward: 80,
    link: '/app/transferir',
    linkLabel: 'Transferir',
  },
];

export interface MissionView extends Mission {
  readonly progress: number;
  readonly done: boolean;
  readonly claimed: boolean;
}

interface MissionsState {
  /** Monday of the week the claims belong to (ISO date). */
  readonly week: string;
  readonly claimed: readonly string[];
}

/** Monday 00:00 (local time) of the week that contains `date`. */
export function weekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

/**
 * Weekly missions. Progress is derived from this week's movements (their `source`),
 * so nothing has to be tracked twice; claiming records an XP-only reward movement.
 */
@Service()
export class MissionsStore {
  private readonly storage = inject(LocalStore);
  private readonly now = inject(NOW);
  private readonly bank = inject(BankStore);

  private readonly state = signal<MissionsState>(this.restore());


  /** Movements since Monday. */
  private readonly thisWeek = computed(() => {
    const start = weekStart(this.now()).getTime();
    return this.bank.transactions().filter((t) => new Date(t.date).getTime() >= start);
  });

  readonly missions = computed<MissionView[]>(() => {
    const claimed = this.state().week === this.weekKey() ? this.state().claimed : [];
    const txs = this.thisWeek();
    return MISSIONS.map((mission) => {
      const progress = Math.min(mission.target, this.progressOf(mission.id, txs));
      return { ...mission, progress, done: progress >= mission.target, claimed: claimed.includes(mission.id) };
    });
  });

  readonly claimable = computed(() => this.missions().filter((m) => m.done && !m.claimed).length);

  /** Days until missions renew (next Monday). */
  readonly daysLeft = computed(() => {
    const next = weekStart(this.now()).getTime() + 7 * DAY;
    return Math.max(1, Math.ceil((next - this.now().getTime()) / DAY));
  });

  constructor() {
    effect(() => this.storage.set(KEY, this.state()));
  }

  /** Grants the reward. Returns the new level when it levelled the player up. */
  claim(id: string): number | null {
    const mission = this.missions().find((m) => m.id === id);
    if (!mission) throw new BankError('Esa misión ya no existe.');
    if (!mission.done) throw new BankError('Todavía no completas esta misión.');
    if (mission.claimed) return null;

    const before = this.bank.progress().level;
    this.bank.record([
      {
        accountId: 'pen',
        description: `Misión completada · ${mission.title}`,
        category: 'recompensas',
        amount: 0,
        xp: mission.reward,
        source: 'mission',
      },
    ]);
    const week = this.weekKey();
    this.state.update((s) => ({ week, claimed: [...(s.week === week ? s.claimed : []), id] }));
    const after = this.bank.progress().level;
    return after > before ? after : null;
  }

  reset(): void {
    this.state.set({ week: this.weekKey(), claimed: [] });
  }

  private weekKey(): string {
    return weekStart(this.now()).toISOString();
  }

  private progressOf(id: string, txs: readonly Transaction[]): number {
    const count = (predicate: (t: Transaction) => boolean) => txs.filter(predicate).length;
    switch (id) {
      case 'card-3':
        return count((t) => t.source === 'card' && t.amount < 0);
      case 'offer-1':
        return count((t) => (t.offerIds?.length ?? 0) > 0);
      case 'save-50':
        return Math.floor(
          txs
            .filter((t) => t.source === 'savings' && t.amount < 0)
            .reduce((sum, t) => sum - (this.bank.inPen(t.amount, this.bank.currencyOf(t.accountId)) ?? 0), 0),
        );
      case 'squad-1':
        return count((t) => t.source === 'squad');
      case 'send-squad':
        return count((t) => t.source === 'transfer-squad');
      default:
        return 0;
    }
  }

  private restore(): MissionsState {
    const saved = this.storage.get(KEY) as MissionsState | null;
    return saved && typeof saved.week === 'string' && Array.isArray(saved.claimed)
      ? saved
      : { week: this.weekKey(), claimed: [] };
  }
}
