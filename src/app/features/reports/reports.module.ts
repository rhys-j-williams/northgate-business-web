import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { ReportCatalogueComponent } from './report-catalogue/report-catalogue.component';
import { ReportParametersComponent } from './report-parameters/report-parameters.component';
import { ReportPreviewComponent } from './report-preview/report-preview.component';
import { ReportHistoryComponent } from './report-history/report-history.component';

const routes: Routes = [{ path: '', component: ReportCatalogueComponent }];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [ReportCatalogueComponent, ReportParametersComponent, ReportPreviewComponent, ReportHistoryComponent]
})
export class ReportsModule {}
