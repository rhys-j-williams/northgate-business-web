import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { PermissionGuard } from '../../core/guards/permission.guard';
import { StepUpGuard } from '../../core/guards/step-up.guard';
import { AchBatchesComponent } from './ach-batches/ach-batches.component';
import { AchBatchDetailComponent } from './ach-batch-detail/ach-batch-detail.component';
import { NachaUploadComponent } from './nacha-upload/nacha-upload.component';
import { NachaValidationReportComponent } from './nacha-validation-report/nacha-validation-report.component';
import { AchTemplatesComponent } from './ach-templates/ach-templates.component';
import { AchTemplateEditorComponent } from './ach-template-editor/ach-template-editor.component';

const routes: Routes = [
  { path: '', component: AchBatchesComponent },
  { path: 'upload', component: NachaUploadComponent, canActivate: [PermissionGuard, StepUpGuard], data: { permission: 'payments:initiate' } },
  { path: 'templates', component: AchTemplatesComponent },
  { path: 'batches/:batchId', component: AchBatchDetailComponent }
];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [
    AchBatchesComponent,
    AchBatchDetailComponent,
    NachaUploadComponent,
    NachaValidationReportComponent,
    AchTemplatesComponent,
    AchTemplateEditorComponent
  ]
})
export class AchModule {}
