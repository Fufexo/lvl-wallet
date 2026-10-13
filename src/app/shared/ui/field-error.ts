import { Component, computed, input } from '@angular/core';

import { Icon } from './icon';

/** The slice of a Signal Forms field state this component reads. */
export interface ErrorSource {
  touched(): boolean;
  invalid(): boolean;
  errors(): readonly { readonly message?: string }[];
}

/**
 * Inline error for one field, shown once the field was touched (or the form submitted).
 * Point the control's `aria-describedby` at the same `id`.
 *
 *   <input id="monto" aria-describedby="monto-error" [formField]="f.amount" />
 *   <app-field-error id="monto-error" [state]="f.amount()" />
 */
@Component({
  selector: 'app-field-error',
  imports: [Icon],
  host: { class: 'block' },
  template: `
    @if (message(); as text) {
      <p class="m-0 mt-2 flex items-start gap-1.5 text-sm text-ember">
        <app-icon name="alert" class="mt-0.5 size-4" />
        <span>{{ text }}</span>
      </p>
    }
  `,
})
export class FieldError {
  readonly state = input.required<ErrorSource>();

  protected readonly message = computed(() => {
    const state = this.state();
    if (!state.touched() || !state.invalid()) return null;
    return state.errors()[0]?.message ?? 'Revisa este campo.';
  });
}
