import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

import { prefersReducedMotion, useGsap } from './gsap';

/**
 * Counts a number up from 0 when it scrolls into view.
 * SSR renders the final value, so the content is correct without JS.
 *
 *   <span [appCountUp]="5">5</span>
 */
@Directive({ selector: '[appCountUp]' })
export class CountUp {
  readonly appCountUp = input.required<number>();
  readonly countDecimals = input(0);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (prefersReducedMotion()) return;

      const { gsap } = useGsap();
      const target = this.appCountUp();
      const decimals = this.countDecimals();
      const counter = { value: 0 };
      const render = () => (this.host.textContent = counter.value.toFixed(decimals));

      render();
      const tween = gsap.to(counter, {
        value: target,
        duration: 1.6,
        ease: 'power2.out',
        onUpdate: render,
        scrollTrigger: { trigger: this.host, start: 'top 90%', once: true },
      });

      this.destroyRef.onDestroy(() => tween.kill());
    });
  }
}
