import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  withViewTransitions,
} from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/api/auth-interceptor';
import { prefersReducedMotion } from './core/motion/gsap';
import { PreloadFlagged } from './core/preload';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Route changes animate with the View Transitions API (styles.css); browsers without it,
      // and users who prefer reduced motion, switch pages instantly.
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition }) => {
          if (prefersReducedMotion()) transition.skipTransition();
        },
      }),
      withPreloading(PreloadFlagged),
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideClientHydration(withEventReplay()),
  ],
};
