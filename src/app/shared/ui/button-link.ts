import { Directive, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'glass';
export type ButtonSize = 'md' | 'lg' | 'xl';

const BASE =
  'group inline-flex items-center justify-center gap-2.5 rounded-full no-underline transition';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-lime font-semibold text-ink hover:bg-lime-soft',
  glass: 'glass font-medium text-fg hover:bg-white/10',
};

// Every size keeps the 44px minimum touch target.
const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-11 px-5 text-[15px]',
  lg: 'min-h-13 px-7',
  xl: 'min-h-14 px-9 text-[17px]',
};

/**
 * Pill-shaped call to action. It stays a real `<a>`, so it keeps link semantics,
 * and extra classes on the element (glows, hover scale…) are merged in.
 *
 *   <a appButton href="#unete" size="lg">Empezar partida</a>
 *   <a appButton="glass" href="#como-funciona" size="lg">Ver cómo funciona</a>
 */
@Directive({
  selector: 'a[appButton]',
  host: { '[class]': 'classes()' },
})
export class ButtonLink {
  readonly appButton = input<ButtonVariant | ''>('primary');
  readonly size = input<ButtonSize>('md');

  protected readonly classes = computed(
    () => `${BASE} ${VARIANTS[this.appButton() || 'primary']} ${SIZES[this.size()]}`,
  );
}
