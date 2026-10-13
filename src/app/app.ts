import { Component, DestroyRef, afterNextRender, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SmoothScroll } from './core/motion/smooth-scroll';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {
  private readonly smoothScroll = inject(SmoothScroll);

  constructor() {
    // Browser-only: Lenis + GSAP never run during SSR/prerender.
    afterNextRender(() => this.smoothScroll.init());
    inject(DestroyRef).onDestroy(() => this.smoothScroll.destroy());
  }
}
