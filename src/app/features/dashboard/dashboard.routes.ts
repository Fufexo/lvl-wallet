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
        loadComponent: () => import('./overview/overview').then((m) => m.Overview),
      },
      {
        path: 'movimientos',
        title: 'Movimientos — LVL',
        loadComponent: () => import('./movements/movements').then((m) => m.Movements),
      },
      {
        path: 'transferir',
        title: 'Transferir — LVL',
        loadComponent: () => import('./transfer/transfer').then((m) => m.Transfer),
      },
      {
        path: 'prestamos',
        title: 'Simulador de préstamos — LVL',
        loadComponent: () => import('./loans/loan-simulator').then((m) => m.LoanSimulator),
      },
    ],
  },
];
