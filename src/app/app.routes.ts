import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'LVL — Billetera digital para gamers',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'app',
    title: 'Panel en construcción — LVL',
    loadComponent: () => import('./features/app-preview/app-preview').then((m) => m.AppPreview),
  },
  { path: '**', redirectTo: '' },
];
