import { Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';

import { hasFinePointer, prefersReducedMotion, useGsap } from '../../../core/motion/gsap';
import { Button } from '../../../shared/ui/button';
import { Icon } from '../../../shared/ui/icon';
import { FxRateChip } from '../components/fx-rate-chip';
import { Movement, WalletCard } from '../components/wallet-card';

@Component({
  selector: 'app-hero',
  imports: [Button, Icon, FxRateChip, WalletCard],
  host: { class: 'block' },
  template: `
    <section id="inicio" #root data-hero-root class="relative z-10 pt-20 pb-20 sm:pt-28">
      <div class="page-container grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
        <!-- Copy -->
        <div class="flex flex-col gap-7">
          <span
            data-hero="eyebrow"
            class="glass inline-flex items-center gap-2.5 self-start rounded-full px-4 py-2 font-mono text-[13px] tracking-[0.06em] text-soft"
          >
            <span aria-hidden="true" class="size-2 rounded-full bg-lime shadow-[0_0_12px_var(--color-lime)]"></span>
            BILLETERA DIGITAL PARA GAMERS
          </span>

          <!-- The headline is the LCP element: its reveal is pure CSS (styles.css), so it
               starts on first paint instead of waiting for hydration and GSAP. -->
          <h1 class="m-0 font-display text-[clamp(48px,7.4vw,104px)] leading-[0.95] font-black tracking-[-0.035em] uppercase">
            <span class="hero-line"><span>Sube de</span></span>
            <span class="hero-line"><span>nivel tu</span></span>
            <span class="hero-line"><span class="text-lime [text-shadow:0_0_40px_rgb(198_255_61/0.35)]">dinero.</span></span>
          </h1>

          <p data-hero="lead" class="m-0 max-w-[520px] text-[19px] text-muted">
            Paga juegos, pases y suscripciones en soles o dólares. Cada compra te da XP y cada nivel
            desbloquea cashback.
          </p>

          <div data-hero="ctas" class="flex flex-wrap gap-3">
            <a appButton href="#unete" size="lg" class="shadow-glow-lime">
              Empezar partida
              <app-icon name="arrow-right" class="size-[18px] transition-transform group-hover:translate-x-1" [strokeWidth]="2.2" />
            </a>
            <a appButton="glass" href="#como-funciona" size="lg">Ver cómo funciona</a>
          </div>
        </div>

        <!-- Product preview -->
        <div class="relative [perspective:1200px]">
          <app-wallet-card
            data-hero="card"
            class="will-change-transform"
            trend="+ 4.2% este mes"
            rank="Estratega"
            [balance]="1284.5"
            [level]="12"
            [xp]="2340"
            [xpGoal]="3000"
            [movements]="movements"
          />
          <app-fx-rate-chip data-hero="chip" class="absolute -bottom-7 left-3 sm:-left-9" />
        </div>
      </div>
    </section>
  `,
})
export class Hero {
  protected readonly movements: readonly Movement[] = [
    { title: 'Tienda de juegos', meta: 'Hoy · +120 XP', amount: '-US$ 29.99', tone: 'violet', icon: 'gamepad' },
    { title: 'Suscripción de anime', meta: 'Ayer · dividida con 3', amount: '-S/ 6.25', tone: 'lime', icon: 'screen' },
  ];

  private readonly root = viewChild.required<ElementRef<HTMLElement>>('root');
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (prefersReducedMotion()) return;

      const { gsap } = useGsap();
      const root = this.root().nativeElement;
      const q = (selector: string) => root.querySelector<HTMLElement>(selector);

      const ctx = gsap.context(() => this.tilt(root, q), root);
      this.destroyRef.onDestroy(() => ctx.revert());
    });
  }

  /**
   * Subtle 3D tilt that follows the cursor (mouse/trackpad only).
   * The intro itself is pure CSS (styles.css): it starts on first paint, so the LCP
   * never waits for hydration or GSAP.
   */
  private tilt(root: HTMLElement, q: (selector: string) => HTMLElement | null): (() => void) | undefined {
    const { gsap } = useGsap();
    const card = q('[data-hero="card"]');
    if (!card || !hasFinePointer()) return undefined;

    const rotX = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const rotY = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });

    const onMove = (e: PointerEvent) => {
      const { left, top, width, height } = root.getBoundingClientRect();
      rotY(((e.clientX - left) / width - 0.5) * 10);
      rotX(-((e.clientY - top) / height - 0.5) * 8);
    };
    const onLeave = () => {
      rotX(0);
      rotY(0);
    };

    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    return () => {
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
    };
  }
}
