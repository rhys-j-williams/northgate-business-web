import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { StepUpGuard } from '../../core/guards/step-up.guard';
import { PermissionGuard } from '../../core/guards/permission.guard';
import { PayrollRunsComponent } from './payroll-runs/payroll-runs.component';
import { PayrollRunDetailComponent } from './payroll-run-detail/payroll-run-detail.component';
import { NewPayrollRunComponent } from './new-payroll-run/new-payroll-run.component';
import { EmployeeListComponent } from './employee-list/employee-list.component';
import { PayrollLineEditorComponent } from './payroll-line-editor/payroll-line-editor.component';

const routes: Routes = [
  { path: '', component: PayrollRunsComponent },
  {
    path: 'new',
    component: NewPayrollRunComponent,
    canActivate: [PermissionGuard, StepUpGuard],
    data: { permission: 'payments:initiate' }
  },
  { path: ':runId', component: PayrollRunDetailComponent }
];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [
    PayrollRunsComponent,
    PayrollRunDetailComponent,
    NewPayrollRunComponent,
    EmployeeListComponent,
    PayrollLineEditorComponent
  ]
})
export class PayrollModule {}
