import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Button } from './button';
import { ProgressBar } from './progress-bar';

@Component({
  imports: [ProgressBar, Button],
  template: `
    <app-progress-bar label="Gasto" [value]="value()" [max]="200" valueText="S/ 140 de S/ 200" />
    <a appButton="glass" size="lg" href="#x" class="extra">Ir</a>
  `,
})
class Host {
  readonly value = signal(140);
}

describe('shared UI', () => {
  it('exposes the progress bar value to assistive tech, clamped to 0–100', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const bar = (fixture.nativeElement as HTMLElement).querySelector('[role="progressbar"]')!;

    expect(bar.getAttribute('aria-label')).toBe('Gasto');
    expect(bar.getAttribute('aria-valuenow')).toBe('70');
    expect(bar.getAttribute('aria-valuetext')).toBe('S/ 140 de S/ 200');

    fixture.componentInstance.value.set(500);
    await fixture.whenStable();
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
  });

  it('styles a link as a button and keeps its own classes', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a')!;

    expect(link.classList).toContain('glass');
    expect(link.classList).toContain('min-h-13');
    expect(link.classList).toContain('extra');
  });
});
