import { DOCUMENT, DestroyRef, Service, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';

export const SITE_URL = 'https://lvl-wallet.vercel.app';

/**
 * Per-route SEO tags. Call from a routed component's constructor: the tags are written
 * during prerender and removed again when the component is destroyed.
 */
@Service()
export class Seo {
  private readonly doc = inject(DOCUMENT);
  private readonly meta = inject(Meta);

  canonical(path: string, destroyRef: DestroyRef): void {
    const link = this.doc.createElement('link');
    link.rel = 'canonical';
    link.href = `${SITE_URL}${path}`;
    this.doc.head.appendChild(link);
    destroyRef.onDestroy(() => link.remove());
  }

  noIndex(destroyRef: DestroyRef): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
    destroyRef.onDestroy(() => this.meta.removeTag('name="robots"'));
  }
}
