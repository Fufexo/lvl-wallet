import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NOW } from '../../../core/clock';
import { ExchangeRate } from '../../../core/exchange-rate';
import { Movements } from './movements';

describe('Movements filters', () => {
  let fixture: ComponentFixture<Movements>;
  let el: HTMLElement;

  const count = () => el.querySelector('[aria-live]')!.textContent!.trim();

  async function search(value: string): Promise<void> {
    const input = el.querySelector<HTMLInputElement>('#q')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: NOW, useValue: () => new Date('2026-10-12T15:00:00') },
        { provide: ExchangeRate, useValue: { usdToPen: signal(4), status: signal('ready') } },
      ],
    });
    fixture = TestBed.createComponent(Movements);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('lists every movement, grouped by day', () => {
    expect(count()).toBe('16 movimientos');
    expect(el.querySelector('section h2')?.textContent?.trim()).toBe('Hoy');
  });

  it('preselects the account from the ?cuenta= query param', async () => {
    fixture.componentRef.setInput('cuenta', 'usd');
    await fixture.whenStable();
    expect(count()).toBe('4 movimientos');
    expect(el.querySelector<HTMLSelectElement>('#cuenta')!.value).toBe('usd');
  });

  it('searches without caring about accents or case', async () => {
    await search('SUSCRIPCION');
    expect(count()).toBe('3 movimientos');
  });

  it('offers a way out when nothing matches', async () => {
    await search('pizza');
    expect(el.textContent).toContain('Sin movimientos con esos filtros');

    [...el.querySelectorAll('button')].find((b) => b.textContent!.includes('Limpiar filtros'))!.click();
    await fixture.whenStable();
    expect(count()).toBe('16 movimientos');
  });
});
