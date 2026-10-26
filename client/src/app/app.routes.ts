import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home').then((m) => m.Home) },
  { path: 'admin', loadComponent: () => import('./admin/admin').then((m) => m.Admin), title: 'כניסת בעלי השמחה' },
  { path: '**', redirectTo: '' },
];
