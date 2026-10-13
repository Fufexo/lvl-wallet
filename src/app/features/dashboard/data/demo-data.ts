import { Service, inject } from '@angular/core';

import { BankStore } from './bank-store';
import { CardsStore } from './cards-store';
import { MissionsStore } from './missions-store';
import { OffersStore } from './offers-store';
import { SavingsStore } from './savings-store';
import { SquadStore } from './squad-store';

/** Restores every part of the demo to its initial data in one go. */
@Service()
export class DemoData {
  private readonly stores = [
    inject(BankStore),
    inject(CardsStore),
    inject(SquadStore),
    inject(OffersStore),
    inject(SavingsStore),
    inject(MissionsStore),
  ];

  reset(): void {
    for (const store of this.stores) store.reset();
  }
}
