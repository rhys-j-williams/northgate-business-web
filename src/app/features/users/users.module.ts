import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MatListModule } from '@angular/material/list';

import { SharedModule } from '../../shared/shared.module';
import { PermissionGuard } from '../../core/guards/permission.guard';
import { UnsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';
import { UserListComponent } from './user-list/user-list.component';
import { UserDetailComponent } from './user-detail/user-detail.component';
import { InviteUserDialogComponent } from './invite-user-dialog/invite-user-dialog.component';
import { EntitlementsEditorComponent } from './entitlements-editor/entitlements-editor.component';
import { PermissionMatrixComponent } from './permission-matrix/permission-matrix.component';
import { LimitsFormComponent } from './limits-form/limits-form.component';

const routes: Routes = [
  { path: '', component: UserListComponent },
  {
    path: 'entitlements',
    component: EntitlementsEditorComponent,
    canActivate: [PermissionGuard],
    canDeactivate: [UnsavedChangesGuard],
    data: { permission: 'accounts:view' }
  },
  { path: ':userId', component: UserDetailComponent }
];

@NgModule({
  imports: [SharedModule, MatListModule, RouterModule.forChild(routes)],
  declarations: [
    UserListComponent,
    UserDetailComponent,
    InviteUserDialogComponent,
    EntitlementsEditorComponent,
    PermissionMatrixComponent,
    LimitsFormComponent
  ]
})
export class UsersModule {}
