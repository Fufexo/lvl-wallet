import { Routes } from '@angular/router';

import { requireSession } from './core/session';

export const routes: Routes = [
  {
    path: '',
    title: 'LVL — Billetera digital para gamers en soles y dólares',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'ingresar',
    title: 'Ingresar — LVL',
    loadComponent: () => import('./features/auth/sign-in').then((m) => m.SignIn),
  },
  {
    path: 'app',
    canActivate: [requireSession],
    loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
