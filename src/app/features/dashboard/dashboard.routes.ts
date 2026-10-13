import { Routes } from '@angular/router';

import { DashboardShell } from './shell/dashboard-shell';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: DashboardShell,
    children: [
      {
        path: '',
        title: 'Resumen — LVL',
        data: { preload: true },
        loadComponent: () => import('./overview/overview').then((m) => m.Overview),
      },
      {
        path: 'movimientos',
        title: 'Movimientos — LVL',
        data: { preload: true },
        loadComponent: () => import('./movements/movements').then((m) => m.Movements),
      },
      {
        path: 'transferir',
        title: 'Transferir — LVL',
        data: { preload: true },
        loadComponent: () => import('./transfer/transfer').then((m) => m.Transfer),
      },
      {
        path: 'tarjetas',
        title: 'Tarjetas virtuales — LVL',
        data: { preload: true },
        loadComponent: () => import('./cards/cards').then((m) => m.Cards),
      },
      {
        path: 'botin',
        title: 'Botín de aliados — LVL',
        data: { preload: true },
        loadComponent: () => import('./offers/offers').then((m) => m.Offers),
      },
      {
        path: 'misiones',
        title: 'Misiones — LVL',
        data: { preload: true },
        loadComponent: () => import('./missions/missions').then((m) => m.Missions),
      },
      {
        path: 'cofres',
        title: 'Cofres de ahorro — LVL',
        data: { preload: true },
        loadComponent: () => import('./savings/savings').then((m) => m.Savings),
      },
      {
        path: 'squad',
        title: 'Squad — LVL',
        data: { preload: true },
        loadComponent: () => import('./squad/squad').then((m) => m.Squad),
      },
      {
        path: 'prestamos',
        title: 'Simulador de préstamos — LVL',
        data: { preload: true },
        loadComponent: () => import('./loans/loan-simulator').then((m) => m.LoanSimulator),
      },
    ],
  },
];
