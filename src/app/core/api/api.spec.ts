import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Session } from '../session';
import { ApiError, toApiError } from './api-error';
import { AuthApi } from './auth-api';
import { authInterceptor } from './auth-interceptor';

const session = (accessToken: string, gamertag = 'fufexo') => ({
  accessToken,
  expiresIn: 900,
  user: { id: 'u1', gamertag, email: `${gamertag}@lvl.test` },
});

/** Lets pending promise chains (refresh → retry) run before the next expectation. */
const tick = () => new Promise((resolve) => setTimeout(resolve));

describe('API errors', () => {
  it('reads the message, code and fields of a problem response', () => {
    const error = toApiError(
      new HttpErrorResponse({
        status: 422,
        error: {
          detail: 'No tienes saldo suficiente en esa cuenta.',
          code: 'INSUFFICIENT_FUNDS',
          errors: [
            { field: 'amount', message: 'No tienes saldo suficiente en esa cuenta.' },
            { nope: 1 },
          ],
        },
      }),
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('No tienes saldo suficiente en esa cuenta.');
    expect(error.code).toBe('INSUFFICIENT_FUNDS');
    expect(error.messageFor('amount')).toBe('No tienes saldo suficiente en esa cuenta.');
    expect(error.fields).toHaveLength(1);
  });

  it('explains a server that cannot be reached', () => {
    expect(toApiError(new HttpErrorResponse({ status: 0 })).code).toBe('UNREACHABLE');
    expect(toApiError(new HttpErrorResponse({ status: 503 })).message).toContain(
      'No pudimos conectar',
    );
  });
});

describe('Session modes', () => {
  beforeEach(() => localStorage.clear());

  it('keeps demo sessions in the original format', () => {
    localStorage.setItem('lvl.session.v1', '"old_player"');
    const s = TestBed.inject(Session);
    expect(s.mode()).toBe('demo');
    expect(s.gamertag()).toBe('old_player');
  });

  it('remembers a real account without storing any token', () => {
    TestBed.inject(Session).startLive('fufexo');
    expect(JSON.parse(localStorage.getItem('lvl.session.v1')!)).toEqual({
      mode: 'live',
      gamertag: 'fufexo',
    });
  });
});

describe('AuthApi and the interceptor', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('signs in, keeps the token in memory and starts a live session', async () => {
    const auth = TestBed.inject(AuthApi);
    const done = auth.login('fufexo', 'contraseña-segura');
    const req = http.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ login: 'fufexo', password: 'contraseña-segura' });
    req.flush(session('token-1'));

    await expect(done).resolves.toMatchObject({ gamertag: 'fufexo' });
    expect(auth.accessToken()).toBe('token-1');
    expect(TestBed.inject(Session).isLive()).toBe(true);
    expect(localStorage.getItem('lvl.session.v1')).not.toContain('token');
  });

  it('turns a rejected sign-in into an ApiError', async () => {
    const done = TestBed.inject(AuthApi).login('fufexo', 'mala');
    http
      .expectOne('/api/auth/login')
      .flush(
        { detail: 'Usuario o contraseña incorrectos.', code: 'INVALID_CREDENTIALS' },
        { status: 401, statusText: '' },
      );
    await expect(done).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  });

  it('shares one refresh between concurrent callers (tokens rotate)', async () => {
    const auth = TestBed.inject(AuthApi);
    const first = auth.refresh();
    const second = auth.refresh();
    http.expectOne('/api/auth/refresh').flush(session('token-2'));
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(auth.accessToken()).toBe('token-2');
  });

  it('after a reload, renews the token before calling the API and sends it', async () => {
    const call = firstValueFrom(TestBed.inject(HttpClient).get('/api/accounts'));
    http.expectOne('/api/auth/refresh').flush(session('token-3'));
    await tick();
    const req = http.expectOne('/api/accounts');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-3');
    req.flush([]);
    await expect(call).resolves.toEqual([]);
  });

  it('on a 401 renews once and retries the call', async () => {
    TestBed.inject(AuthApi)
      .login('fufexo', 'x')
      .catch(() => undefined);
    http.expectOne('/api/auth/login').flush(session('stale'));
    await tick();

    const call = firstValueFrom(TestBed.inject(HttpClient).get('/api/accounts'));
    await tick();
    http.expectOne('/api/accounts').flush(null, { status: 401, statusText: '' });
    http.expectOne('/api/auth/refresh').flush(session('fresh'));
    await tick();
    const retry = http.expectOne('/api/accounts');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer fresh');
    retry.flush([{ id: 'a' }]);
    await expect(call).resolves.toEqual([{ id: 'a' }]);
  });

  it('sends the player back to sign in when the session cannot be renewed', async () => {
    TestBed.inject(Session).startLive('fufexo');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const call = firstValueFrom(TestBed.inject(HttpClient).get('/api/accounts'));
    http.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: '' });

    await expect(call).rejects.toBeInstanceOf(HttpErrorResponse);
    // No point calling the API without a session.
    http.expectNone('/api/accounts');
    expect(TestBed.inject(Session).signedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(
      ['/ingresar'],
      expect.objectContaining({ queryParams: expect.objectContaining({ sesion: 'expirada' }) }),
    );
  });

  it('leaves third-party calls alone', async () => {
    const call = firstValueFrom(
      TestBed.inject(HttpClient).get('https://open.er-api.com/v6/latest/USD'),
    );
    const req = http.expectOne('https://open.er-api.com/v6/latest/USD');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    await call;
  });
});
