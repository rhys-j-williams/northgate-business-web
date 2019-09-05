import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { ApprovalsQueueComponent } from './approvals-queue/approvals-queue.component';
import { ApprovalDetailComponent } from './approval-detail/approval-detail.component';
import { ApprovalFilterBarComponent } from './approval-filter-bar/approval-filter-bar.component';
import { ApprovalDecisionDialogComponent } from './approval-decision-dialog/approval-decision-dialog.component';
import { DecisionItemsPipe } from './decision-items.pipe';

const routes: Routes = [
  { path: '', component: ApprovalsQueueComponent },
  { path: ':approvalId', component: ApprovalDetailComponent }
];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [
    ApprovalsQueueComponent,
    ApprovalDetailComponent,
    ApprovalFilterBarComponent,
    ApprovalDecisionDialogComponent,
    DecisionItemsPipe
  ]
})
export class ApprovalsModule {}
