import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './core/guards/auth.guard';
import { PermissionGuard } from './core/guards/permission.guard';
import { AuthCallbackComponent } from './layout/auth-callback/auth-callback.component';
import { NotFoundComponent } from './layout/not-found/not-found.component';
import { ShellComponent } from './layout/shell/shell.component';
import { SignedOutComponent } from './layout/signed-out/signed-out.component';

const routes: Routes = [
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'signed-out', component: SignedOutComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'accounts' },
      {
        path: 'accounts',
        loadChildren: () => import('./features/accounts/accounts.module').then(m => m.AccountsModule)
      },
      {
        path: 'payroll',
        canActivate: [PermissionGuard],
        data: { permission: 'payments:initiate' },
        loadChildren: () => import('./features/payroll/payroll.module').then(m => m.PayrollModule)
      },
      {
        path: 'ach',
        canActivate: [PermissionGuard],
        data: { permission: 'payments:initiate' },
        loadChildren: () => import('./features/ach/ach.module').then(m => m.AchModule)
      },
      {
        path: 'wires',
        loadChildren: () => import('./features/wires/wires.module').then(m => m.WiresModule)
      },
      {
        path: 'approvals',
        canActivate: [PermissionGuard],
        data: { permission: 'payments:approve' },
        loadChildren: () => import('./features/approvals/approvals.module').then(m => m.ApprovalsModule)
      },
      {
        path: 'users',
        canActivate: [PermissionGuard],
        data: { permission: 'users:manage' },
        loadChildren: () => import('./features/users/users.module').then(m => m.UsersModule)
      },
      {
        path: 'reports',
        canActivate: [PermissionGuard],
        data: { permission: 'reports:run' },
        loadChildren: () => import('./features/reports/reports.module').then(m => m.ReportsModule)
      },
      {
        path: 'alerts',
        loadChildren: () => import('./features/alerts/alerts.module').then(m => m.AlertsModule)
      },
      // Old bookmarks. The statements route moved under accounts in 2021 (MBZ-1188).
      { path: 'statements', redirectTo: 'accounts' },
      { path: 'admin', redirectTo: 'users' },
      { path: '**', component: NotFoundComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    preloadingStrategy: PreloadAllModules,
    scrollPositionRestoration: 'enabled',
    paramsInheritanceStrategy: 'always'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
