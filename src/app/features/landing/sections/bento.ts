import { Component, signal } from '@angular/core';

import { Reveal } from '../../../core/motion/reveal';
import { Icon } from '../../../shared/ui/icon';
import { ProgressBar } from '../../../shared/ui/progress-bar';
import { FxConverter } from '../components/fx-converter';

@Component({
  selector: 'app-bento',
  imports: [Reveal, Icon, ProgressBar, FxConverter],
  host: { class: 'block' },
  templateUrl: './bento.html',
})
export class Bento {
  protected readonly spent = signal(140);
  protected readonly limit = signal(200);

  protected readonly xpBars = [
    { height: 22, class: 'bg-white/10' },
    { height: 36, class: 'bg-white/12' },
    { height: 48, class: 'bg-violet/45' },
    { height: 62, class: 'bg-violet/65' },
    { height: 80, class: 'bg-violet' },
    { height: 100, class: 'bg-lime shadow-[0_0_24px_var(--color-lime)]' },
  ] as const;
}
