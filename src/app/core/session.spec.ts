import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { safeReturn } from '../features/auth/sign-in';
import { Session, requireSession } from './session';

describe('session & access', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  const runGuard = (url: string) =>
    TestBed.runInInjectionContext(() =>
      requireSession({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  it('sends visitors without a session to /ingresar, remembering the target', () => {
    const result = runGuard('/app/transferir');
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/ingresar?volver=%2Fapp%2Ftransferir');
  });

  it('lets signed-in players through and remembers them across reloads', () => {
    TestBed.inject(Session).signIn('  fufexo_gg ');
    expect(runGuard('/app')).toBe(true);
    expect(localStorage.getItem('lvl.session.v1')).toBe('"fufexo_gg"');

    TestBed.inject(Session).signOut();
    expect(runGuard('/app')).not.toBe(true);
  });

  it('only accepts dashboard paths as a return target', () => {
    expect(safeReturn('/app/prestamos')).toBe('/app/prestamos');
    expect(safeReturn('/app?cuenta=usd')).toBe('/app?cuenta=usd');
    expect(safeReturn('https://evil.example/app')).toBe('/app');
    expect(safeReturn('//evil.example')).toBe('/app');
    expect(safeReturn('/application')).toBe('/app');
    expect(safeReturn(undefined)).toBe('/app');
  });
});
