import { Service } from '@angular/core';
import type Lenis from 'lenis';

import { prefersReducedMotion } from './media';

type Gsap = ReturnType<typeof import('./gsap').useGsap>['gsap'];

/**
 * Smooth scrolling with Lenis, driven by GSAP's ticker so that
 * ScrollTrigger and Lenis stay in perfect sync.
 *
 * Lenis and GSAP are imported on demand, so they stay out of the initial bundle:
 * pages that never animate (like the dashboard) do not wait for them.
 */
@Service()
export class SmoothScroll {
  private lenis: Lenis | null = null;
  private gsap: Gsap | null = null;
  private active = false;
  private readonly tick = (time: number) => this.lenis?.raf(time * 1000);

  async init(): Promise<void> {
    if (this.active || prefersReducedMotion()) return;
    this.active = true;

    const [{ default: LenisCtor }, { useGsap }] = await Promise.all([import('lenis'), import('./gsap')]);
    if (!this.active) return; // destroyed while loading

    const { gsap, ScrollTrigger } = useGsap();
    this.gsap = gsap;
    this.lenis = new LenisCtor({ anchors: { offset: -96 } });
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
    this.active = false;
    this.gsap?.ticker.remove(this.tick);
    this.lenis?.destroy();
    this.lenis = null;
  }
}
