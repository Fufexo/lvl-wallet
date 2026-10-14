import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { Session } from '../session';
import { AuthApi } from './auth-api';

/**
 * Adds the access token to LVL API calls. Without a token (e.g. after a reload) it first renews
 * it from the refresh cookie; on a 401 it renews once and retries. If the session cannot be
 * renewed, the player is sent back to /ingresar.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/') || request.url.startsWith('/api/auth/'))
    return next(request);

  const auth = inject(AuthApi);
  const session = inject(Session);
  const router = inject(Router);

  const withToken = (req: HttpRequest<unknown>) => {
    const token = auth.accessToken();
    return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  };
  const expire = (error: unknown) => {
    session.signOut();
    void router.navigate(['/ingresar'], {
      queryParams: { volver: router.url, sesion: 'expirada' },
    });
    return throwError(() => error);
  };

  const send = () =>
    next(withToken(request)).pipe(
      catchError((error: unknown) => {
        if (!(error instanceof HttpErrorResponse) || error.status !== 401)
          return throwError(() => error);
        return from(auth.refresh()).pipe(
          switchMap((renewed) => (renewed ? next(withToken(request)) : expire(error))),
        );
      }),
    );

  if (auth.accessToken()) return send();
  return from(auth.refresh()).pipe(
    switchMap((renewed) =>
      renewed ? send() : expire(new HttpErrorResponse({ status: 401, url: request.url })),
    ),
  );
};
