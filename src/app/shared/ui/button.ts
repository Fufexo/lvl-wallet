import { Directive, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'glass' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const BASE =
  'group inline-flex items-center justify-center rounded-full no-underline transition disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-lime font-semibold text-ink hover:bg-lime-soft',
  glass: 'glass font-medium text-fg hover:bg-white/10',
  outline:
    'border border-white/12 text-fg hover:bg-white/8 aria-pressed:border-lime/50 aria-pressed:bg-lime/10 aria-pressed:text-lime',
  danger: 'bg-ember font-semibold text-ink hover:brightness-110',
};

// Every size keeps the 44px minimum touch target.
const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-11 gap-2 px-4 text-sm',
  md: 'min-h-11 gap-2.5 px-5 text-[15px]',
  lg: 'min-h-13 gap-2.5 px-7',
  xl: 'min-h-14 gap-2.5 px-9 text-[17px]',
};

/**
 * Pill-shaped action for links and buttons. The element keeps its own semantics
 * (`<a>` navigates, `<button>` acts) and extra classes on it are merged in.
 *
 *   <a appButton href="#unete" size="lg">Empezar partida</a>
 *   <button appButton="outline" size="sm" type="button">Congelar</button>
 */
@Directive({
  selector: 'a[appButton], button[appButton]',
  host: { '[class]': 'classes()' },
})
export class Button {
  readonly appButton = input<ButtonVariant | ''>('primary');
  readonly size = input<ButtonSize>('md');

  protected readonly classes = computed(
    () => `${BASE} ${VARIANTS[this.appButton() || 'primary']} ${SIZES[this.size()]}`,
  );
}
