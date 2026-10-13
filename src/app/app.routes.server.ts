import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // The dashboard is private and lives in browser storage: render it on the client only.
  { path: 'app', renderMode: RenderMode.Client },
  { path: 'app/**', renderMode: RenderMode.Client },
  // Public pages (landing, sign-in) are prerendered to static HTML.
  { path: '**', renderMode: RenderMode.Prerender },
];
