import { Service } from '@angular/core';
import Lenis from 'lenis';

import { prefersReducedMotion, useGsap } from './gsap';

/**
 * Smooth scrolling with Lenis, driven by GSAP's ticker so that
 * ScrollTrigger and Lenis stay in perfect sync.
 */
@Service()
export class SmoothScroll {
  private lenis: Lenis | null = null;
  private readonly tick = (time: number) => this.lenis?.raf(time * 1000);

  init(): void {
    if (this.lenis || prefersReducedMotion()) return;

    const { gsap, ScrollTrigger } = useGsap();
    this.lenis = new Lenis({ anchors: { offset: -96 } });
    this.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(this.tick);
    gsap.ticker.lagSmoothing(0);
  }

  /** Jumps to the top instantly (used on route changes). */
  scrollToTop(): void {
    if (this.lenis) this.lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }

  destroy(): void {
    if (!this.lenis) return;
    useGsap().gsap.ticker.remove(this.tick);
    this.lenis.destroy();
    this.lenis = null;
  }
}
