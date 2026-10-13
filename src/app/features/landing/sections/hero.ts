import { Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';

import { hasFinePointer, prefersReducedMotion, useGsap } from '../../../core/motion/gsap';
import { ButtonLink } from '../../../shared/ui/button-link';
import { Icon } from '../../../shared/ui/icon';
import { FxRateChip } from '../components/fx-rate-chip';
import { Movement, WalletCard } from '../components/wallet-card';

@Component({
  selector: 'app-hero',
  imports: [ButtonLink, Icon, FxRateChip, WalletCard],
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

          <h1
            #title
            class="m-0 font-display text-[clamp(48px,7.4vw,104px)] leading-[0.95] font-black tracking-[-0.035em] uppercase"
          >
            Sube de<br />nivel tu<br /><span class="text-lime [text-shadow:0_0_40px_rgb(198_255_61/0.35)]"
              >dinero.</span
            >
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
  private readonly title = viewChild.required<ElementRef<HTMLElement>>('title');
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (prefersReducedMotion()) return;

      const { gsap } = useGsap();
      const root = this.root().nativeElement;
      const q = (selector: string) => root.querySelector<HTMLElement>(selector);

      // index.html hides the hero before first paint; the intro reveals it right after
      // hydration. Waiting for web fonts here delayed the LCP by seconds on mobile.
      const ctx = gsap.context(() => this.intro(root, q), root);
      this.destroyRef.onDestroy(() => ctx.revert());
    });
  }

  private intro(
    root: HTMLElement,
    q: (selector: string) => HTMLElement | null,
  ): (() => void) | undefined {
    const { gsap, SplitText } = useGsap();
    gsap.set(root, { autoAlpha: 1 });

    // Masked word-by-word headline. `autoSplit` re-splits when the web fonts arrive (their
    // metrics change the line breaks) and carries the tween's progress over to the new split.
    // Once the words land, the split is reverted to restore the plain DOM (and the glow).
    SplitText.create(this.title().nativeElement, {
      type: 'lines,words',
      mask: 'lines',
      autoSplit: true,
      onSplit: (split) =>
        gsap.from(split.words, {
          yPercent: 110,
          stagger: 0.06,
          duration: 1.2,
          delay: 0.15,
          ease: 'expo.out',
          onComplete: () => split.revert(),
        }),
    });

    const tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.1 } });

    tl.from(q('[data-hero="eyebrow"]'), { autoAlpha: 0, y: 20, duration: 0.8 }, 0)
      .from(q('[data-hero="lead"]'), { autoAlpha: 0, y: 24 }, 0.55)
      .from(q('[data-hero="ctas"]'), { autoAlpha: 0, y: 24 }, 0.65)
      .from(q('[data-hero="card"]'), { autoAlpha: 0, y: 80, rotateX: 14, duration: 1.4 }, 0.35)
      .from(q('[data-hero="xp"] [data-progress-fill]'), { scaleX: 0, duration: 1.6, ease: 'power3.out' }, 0.9)
      .from(q('[data-hero="chip"]'), { autoAlpha: 0, x: -30, duration: 0.9 }, 1.1);

    // Subtle 3D tilt that follows the cursor (mouse/trackpad only).
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
