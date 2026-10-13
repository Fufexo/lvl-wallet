import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

import { prefersReducedMotion, useGsap } from './gsap';

/**
 * Scroll-triggered entrance.
 *
 *   <h2 appReveal>…</h2>                 → reveals the element itself
 *   <div appReveal="children">…</div>    → reveals its children in a stagger
 */
@Directive({ selector: '[appReveal]' })
export class Reveal {
  readonly appReveal = input<'' | 'children'>('');
  readonly revealDelay = input(0);
  readonly revealY = input(40);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (prefersReducedMotion()) return;

      const { gsap } = useGsap();
      const targets = this.appReveal() === 'children' ? Array.from(this.host.children) : this.host;

      const ctx = gsap.context(() => {
        gsap.from(targets, {
          autoAlpha: 0,
          y: this.revealY(),
          duration: 0.9,
          ease: 'power3.out',
          delay: this.revealDelay(),
          stagger: 0.08,
          scrollTrigger: { trigger: this.host, start: 'top 85%', once: true },
        });
      }, this.host);

      this.destroyRef.onDestroy(() => ctx.revert());
    });
  }
}
