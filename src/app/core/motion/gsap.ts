import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

export { hasFinePointer, prefersReducedMotion } from './media';

let registered = false;

/**
 * Registers GSAP plugins once. Call it only from browser-only code
 * (e.g. inside `afterNextRender`), never during SSR.
 */
export function useGsap() {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    registered = true;
  }
  return { gsap, ScrollTrigger, SplitText };
}
