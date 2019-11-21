import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { SharedModule } from '../../shared/shared.module';
import { AlertListComponent } from './alert-list/alert-list.component';
import { AlertCardComponent } from './alert-card/alert-card.component';
import { AlertThresholdDialogComponent } from './alert-threshold-dialog/alert-threshold-dialog.component';

const routes: Routes = [{ path: '', component: AlertListComponent }];

@NgModule({
  imports: [SharedModule, MatSlideToggleModule, RouterModule.forChild(routes)],
  declarations: [AlertListComponent, AlertCardComponent, AlertThresholdDialogComponent]
})
export class AlertsModule {}
