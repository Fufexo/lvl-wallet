import { Route, Routes } from '@angular/router';

import { demoOnly } from '../../core/session';
import { DashboardShell } from './shell/dashboard-shell';

/**
 * A section that runs only on demo data for now. Real accounts match the second route instead
 * and see an explanation with a way into the demo.
 */
function demoSection(path: string, section: string, loadComponent: Route['loadComponent']): Route[] {
  return [
    { path, title: `${section} — LVL`, data: { preload: true }, canMatch: [demoOnly], loadComponent },
    {
      path,
      title: `${section} — LVL`,
      data: { section },
      loadComponent: () => import('./demo-only/demo-only').then((m) => m.DemoOnly),
    },
  ];
}

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
      ...demoSection('tarjetas', 'Tarjetas virtuales', () => import('./cards/cards').then((m) => m.Cards)),
      ...demoSection('botin', 'Botín de aliados', () => import('./offers/offers').then((m) => m.Offers)),
      ...demoSection('misiones', 'Misiones', () => import('./missions/missions').then((m) => m.Missions)),
      ...demoSection('cofres', 'Cofres de ahorro', () => import('./savings/savings').then((m) => m.Savings)),
      ...demoSection('squad', 'Squad', () => import('./squad/squad').then((m) => m.Squad)),
      {
        path: 'prestamos',
        title: 'Simulador de préstamos — LVL',
        data: { preload: true },
        loadComponent: () => import('./loans/loan-simulator').then((m) => m.LoanSimulator),
      },
    ],
  },
];
