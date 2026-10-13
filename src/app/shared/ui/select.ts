import {
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

import { Icon } from './icon';

export interface SelectOption<T> {
  readonly value: T;
  readonly label: string;
  /** Secondary text, e.g. a balance. */
  readonly hint?: string;
  readonly disabled?: boolean;
}

let nextId = 0;

/**
 * Select with a floating, themed option list (WAI-ARIA "select-only combobox").
 * Works with Signal Forms (`[formField]`) or plain two-way binding (`[(value)]`).
 * Pair it with `<label for="…">` using the same `inputId`.
 *
 *   <label for="cuenta">Cuenta</label>
 *   <app-select inputId="cuenta" label="Cuenta" [options]="accounts" [formField]="form.account" />
 *
 * Keyboard: ↑/↓/Home/End move, Enter/Space choose, Esc closes, typing jumps to an option.
 */
@Component({
  selector: 'app-select',
  imports: [Icon],
  host: {
    // Container queries let narrow selects drop the hint instead of truncating the label.
    class: '@container relative block',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
  template: `
    <button
      #trigger
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      class="panel flex min-h-12 w-full items-center justify-between gap-3 rounded-panel bg-ink-2 px-4 text-left text-fg outline-none transition-colors hover:border-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:cursor-not-allowed disabled:opacity-60 aria-expanded:border-lime/50 aria-invalid:border-ember/60"
      [id]="inputId()"
      [disabled]="disabled()"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="listId"
      [attr.aria-activedescendant]="open() && active() >= 0 ? optionId(active()) : null"
      [attr.aria-describedby]="describedBy() || null"
      [attr.aria-invalid]="invalid() || null"
      (click)="toggle()"
      (keydown)="onKeydown($event)"
      (blur)="touch.emit()"
    >
      <span class="flex min-w-0 items-baseline gap-2">
        <span class="truncate" [class.text-faint]="!selected()">{{ selected()?.label ?? placeholder() }}</span>
        @if (selected()?.hint; as hint) {
          <span class="hidden truncate font-mono text-xs text-subtle @xs:inline">{{ hint }}</span>
        }
      </span>
      <app-icon name="chevron-down" class="size-4.5 text-muted transition-transform duration-200" [class.rotate-180]="open()" />
    </button>

    @if (open()) {
      <!-- A manual popover lives in the browser's top layer: no parent stacking context or
           overflow can hide it. It is placed next to the trigger with fixed coordinates. -->
      <ul
        #list
        popover="manual"
        role="listbox"
        tabindex="-1"
        data-lenis-prevent
        class="select-panel fixed m-0 max-h-72 list-none overflow-auto rounded-panel border border-white/14 bg-ink-2 p-1.5 text-fg shadow-[0_24px_60px_rgb(0_0_0/0.6)]"
        [class]="openUp() ? 'origin-bottom' : 'origin-top'"
        [style.left.px]="position().left"
        [style.width.px]="position().width"
        [style.top]="openUp() ? 'auto' : position().top + 'px'"
        [style.bottom]="openUp() ? position().bottom + 'px' : 'auto'"
        [id]="listId"
        [attr.aria-label]="label()"
      >
        @for (option of options(); track $index; let i = $index) {
          <li
            role="option"
            class="flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-sm transition-colors"
            [class]="optionClass(option, i)"
            [id]="optionId(i)"
            [attr.aria-selected]="isSelected(option)"
            [attr.aria-disabled]="option.disabled || null"
            (pointerenter)="option.disabled || active.set(i)"
            (click)="choose(i)"
          >
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="truncate">{{ option.label }}</span>
              @if (option.hint) {
                <span class="truncate font-mono text-xs text-subtle">{{ option.hint }}</span>
              }
            </span>
            @if (isSelected(option)) {
              <app-icon name="check" class="size-4 text-lime" [strokeWidth]="2.5" />
            }
          </li>
        }
      </ul>
    }
  `,
})
export class Select<T> implements FormValueControl<T> {
  readonly value = model.required<T>();
  readonly options = input.required<readonly SelectOption<T>[]>();
  /** Id of the trigger, for `<label for>`. */
  readonly inputId = input.required<string>();
  /** Accessible name of the option list (usually the label text). */
  readonly label = input.required<string>();
  readonly placeholder = input('Elige una opción');
  readonly describedBy = input<string>();
  readonly disabled = input(false);
  readonly invalid = input(false);
  /** Marks the field as touched for Signal Forms. */
  readonly touch = output<void>();

  protected readonly listId = `select-list-${nextId++}`;
  protected readonly open = signal(false);
  protected readonly openUp = signal(false);
  protected readonly active = signal(-1);
  protected readonly position = signal({ left: 0, top: 0, bottom: 0, width: 0 });
  private readonly reposition = () => this.place();

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly host = viewChild<ElementRef<HTMLUListElement>>('list');
  private typed = '';
  private typedAt = 0;

  protected readonly selectedIndex = computed(() =>
    this.options().findIndex((o) => Object.is(o.value, this.value())),
  );
  protected readonly selected = computed(() => this.options()[this.selectedIndex()]);

  constructor() {
    // Promote the freshly rendered list to the top layer.
    afterRenderEffect(() => {
      const list = this.host()?.nativeElement;
      if (this.open() && list && typeof list.showPopover === 'function' && !list.matches(':popover-open')) {
        list.showPopover();
      }
    });

    inject(DestroyRef).onDestroy(() => this.unlisten());

    // Keep the active option visible while moving with the keyboard.
    afterRenderEffect(() => {
      const index = this.active();
      if (!this.open() || index < 0) return;
      document.getElementById(this.optionId(index))?.scrollIntoView({ block: 'nearest' });
    });
  }

  protected optionId(index: number): string {
    return `${this.listId}-${index}`;
  }

  protected isSelected(option: SelectOption<T>): boolean {
    return Object.is(option.value, this.value());
  }

  protected optionClass(option: SelectOption<T>, index: number): string {
    if (option.disabled) return 'cursor-not-allowed text-subtle';
    const base = 'cursor-pointer';
    const tone = this.isSelected(option) ? 'font-medium text-lime' : 'text-fg';
    return `${base} ${tone} ${index === this.active() ? 'bg-white/8' : ''}`;
  }

  protected toggle(): void {
    if (this.open()) this.close();
    else this.show();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const key = event.key;
    if (!this.open()) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Home', 'End'].includes(key)) {
        event.preventDefault();
        this.show(key === 'Home' ? 'first' : key === 'End' ? 'last' : undefined);
      } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        this.show();
        this.typeAhead(key);
      }
      return;
    }

    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        this.move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (event.altKey) this.choose(this.active());
        else this.move(-1);
        break;
      case 'Home':
        event.preventDefault();
        this.active.set(this.edge('first'));
        break;
      case 'End':
        event.preventDefault();
        this.active.set(this.edge('last'));
        break;
      case 'PageDown':
        event.preventDefault();
        this.move(5);
        break;
      case 'PageUp':
        event.preventDefault();
        this.move(-5);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.choose(this.active());
        break;
      case 'Escape':
        // Only this popup closes; parents (menus, dialogs) keep their state.
        event.preventDefault();
        event.stopPropagation();
        this.close();
        break;
      case 'Tab':
        this.choose(this.active(), false);
        break;
      default:
        if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) this.typeAhead(key);
    }
  }

  protected choose(index: number, refocus = true): void {
    const option = this.options()[index];
    if (option && !option.disabled) this.value.set(option.value);
    this.close(refocus);
  }

  protected onDocumentPointerDown(event: PointerEvent): void {
    if (!this.open()) return;
    const target = event.target as Node;
    const inside = this.trigger().nativeElement.contains(target) || this.host()?.nativeElement.contains(target);
    if (!inside) this.close(false);
  }

  private show(start?: 'first' | 'last'): void {
    if (this.disabled()) return;
    this.place();
    this.active.set(start ? this.edge(start) : this.selectedIndex() >= 0 ? this.selectedIndex() : this.edge('first'));
    this.open.set(true);
    window.addEventListener('scroll', this.reposition, { capture: true, passive: true });
    window.addEventListener('resize', this.reposition, { passive: true });
  }

  private close(refocus = true): void {
    this.open.set(false);
    this.active.set(-1);
    this.unlisten();
    if (refocus) this.trigger().nativeElement.focus();
  }

  /** Places the panel under the trigger, or above it when there is not enough room below. */
  private place(): void {
    const rect = this.trigger().nativeElement.getBoundingClientRect();
    const panel = Math.min(this.options().length * 44 + 12, 288) + 8;
    const below = window.innerHeight - rect.bottom;
    this.openUp.set(below < panel && rect.top > below);
    this.position.set({
      left: rect.left,
      width: rect.width,
      top: rect.bottom + 8,
      bottom: window.innerHeight - rect.top + 8,
    });
  }

  private unlisten(): void {
    window.removeEventListener('scroll', this.reposition, { capture: true });
    window.removeEventListener('resize', this.reposition);
  }

  /** Moves the active option by `step` among the enabled ones, stopping at the ends. */
  private move(step: number): void {
    const enabled = this.enabled();
    if (!enabled.length) return;
    const position = enabled.indexOf(this.active());
    const next = position === -1 ? (step > 0 ? 0 : enabled.length - 1) : position + step;
    this.active.set(enabled[Math.min(enabled.length - 1, Math.max(0, next))]);
  }

  private edge(which: 'first' | 'last'): number {
    const enabled = this.enabled();
    return (which === 'first' ? enabled[0] : enabled.at(-1)) ?? -1;
  }

  private enabled(): number[] {
    return this.options()
      .map((option, i) => (option.disabled ? -1 : i))
      .filter((i) => i >= 0);
  }

  /** Jumps to the next option whose label starts with what was typed in the last half second. */
  private typeAhead(char: string): void {
    const now = Date.now();
    this.typed = now - this.typedAt > 500 ? char.toLowerCase() : this.typed + char.toLowerCase();
    this.typedAt = now;
    const options = this.options();
    const start = this.typed.length === 1 ? this.active() + 1 : this.active();
    for (let i = 0; i < options.length; i++) {
      const index = (start + i) % options.length;
      const option = options[index];
      if (!option.disabled && option.label.toLowerCase().startsWith(this.typed)) {
        this.active.set(index);
        return;
      }
    }
  }
}
