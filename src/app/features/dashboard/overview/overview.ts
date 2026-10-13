import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { NOW } from '../../../core/clock';
import { Session } from '../../../core/session';
import { Button } from '../../../shared/ui/button';
import { Icon } from '../../../shared/ui/icon';
import { MoneyPipe } from '../../../shared/ui/money';
import { ProgressBar } from '../../../shared/ui/progress-bar';
import { BankStore } from '../data/bank-store';
import { dayLabel } from '../data/dates';
import { TransactionRow } from '../ui/transaction-row';
import { CardsStore } from '../data/cards-store';
import { SquadStore } from '../data/squad-store';
import { MissionsStore } from '../data/missions-store';
import { OffersStore } from '../data/offers-store';
import { SavingsStore } from '../data/savings-store';
import { IconName } from '../../../shared/ui/icon';
import { formatMoney } from '../../../shared/ui/money';
import { annualRateForLevel } from '../data/loan';

@Component({
  selector: 'app-overview',
  imports: [Button, DecimalPipe, Icon, MoneyPipe, ProgressBar, RouterLink, TransactionRow],
  host: { class: 'flex flex-col gap-8' },
  templateUrl: './overview.html',
})
export class Overview {
  protected readonly session = inject(Session);
  protected readonly bank = inject(BankStore);
  protected readonly cards = inject(CardsStore);
  protected readonly squad = inject(SquadStore);
  protected readonly offers = inject(OffersStore);
  protected readonly missions = inject(MissionsStore);
  protected readonly savings = inject(SavingsStore);

  /** Accounts plus savings goals: money in a goal is still the player's. */
  protected readonly total = computed(() => {
    const accounts = this.bank.netWorthPen();
    const saved = this.savings.totalPen();
    return accounts === null || saved === null ? null : accounts + saved;
  });

  protected readonly shortcuts = computed<
    { path: string; title: string; detail: string; icon: IconName; tone: string; badge?: string }[]
  >(() => [
    {
      path: '/app/tarjetas',
      title: 'Tarjetas virtuales',
      detail: `${this.cards.cards().length} ${this.cards.cards().length === 1 ? 'tarjeta' : 'tarjetas'} · compra y suma XP`,
      icon: 'card',
      tone: 'bg-violet/18 text-lilac',
    },
    {
      path: '/app/botin',
      title: 'Botín de aliados',
      detail: `${this.offers.activeCount()} activas · ofertas por nivel`,
      icon: 'tag',
      tone: 'bg-ember/16 text-ember',
    },
    {
      path: '/app/misiones',
      title: 'Misiones',
      detail: `Se renuevan en ${this.missions.daysLeft()} días`,
      icon: 'flag',
      tone: 'bg-lime/14 text-lime',
      badge: this.missions.claimable() ? `${this.missions.claimable()} lista${this.missions.claimable() === 1 ? '' : 's'}` : undefined,
    },
    {
      path: '/app/cofres',
      title: 'Cofres de ahorro',
      detail: `${formatMoney(this.savings.totalPen() ?? 0, 'PEN')} guardados`,
      icon: 'target',
      tone: 'bg-lime/14 text-lime',
    },
    {
      path: '/app/squad',
      title: 'Tu squad te debe',
      detail: formatMoney(this.squad.pendingPen() ?? 0, 'PEN'),
      icon: 'users',
      tone: 'bg-violet/18 text-lilac',
    },
    {
      path: '/app/prestamos',
      title: 'Préstamo con tu nivel',
      detail: `TEA ${(this.annualRate() * 100).toFixed(1)}%`,
      icon: 'calculator',
      tone: 'bg-white/8 text-fg',
    },
  ]);
  protected readonly shortcut =
    'glass flex items-center gap-4 rounded-card p-5 text-fg no-underline transition-colors hover:bg-white/8';
  private readonly now = inject(NOW);

  protected readonly progress = this.bank.progress;
  protected readonly xpToNext = computed(() => this.progress().xpForNext - this.progress().xpInLevel);
  protected readonly recent = computed(() => this.bank.transactions().slice(0, 5));
  protected readonly annualRate = computed(() => annualRateForLevel(this.progress().level));
  protected readonly limitUsed = computed(() => this.bank.gamesSpentThisMonth() / this.bank.gamesMonthlyLimit);

  protected dayOf(iso: string): string {
    return dayLabel(iso, this.now());
  }
}
