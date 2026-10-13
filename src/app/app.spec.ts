import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { Bento } from './features/landing/sections/bento';
import { Hero } from './features/landing/sections/hero';

const RATES_URL = 'https://open.er-api.com/v6/latest/USD';

describe('LVL landing', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, Hero, Bento],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('creates the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the hero headline', async () => {
    const fixture = TestBed.createComponent(Hero);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(RATES_URL)
      .flush({ result: 'success', rates: { PEN: 3.75 }, time_last_update_utc: '' });
    await fixture.whenStable();
    const h1 = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(h1?.textContent).toContain('dinero');
  });

  it('converts soles to dollars with the live rate', async () => {
    const fixture = TestBed.createComponent(Bento);
    fixture.detectChanges();

    TestBed.inject(HttpTestingController)
      .expectOne(RATES_URL)
      .flush({ result: 'success', rates: { PEN: 4 }, time_last_update_utc: '' });
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('US$ 50.00');

    const input = el.querySelector<HTMLInputElement>('#fx-amount')!;
    input.value = '100';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(el.textContent).toContain('US$ 25.00');
  });
});
