import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { PermissionGuard } from '../../core/guards/permission.guard';
import { StepUpGuard } from '../../core/guards/step-up.guard';
import { WireListComponent } from './wire-list/wire-list.component';
import { NewWireComponent } from './new-wire/new-wire.component';
import { WireDetailComponent } from './wire-detail/wire-detail.component';
import { BeneficiaryListComponent } from './beneficiary-list/beneficiary-list.component';
import { BeneficiaryPickerComponent } from './beneficiary-picker/beneficiary-picker.component';

const routes: Routes = [
  { path: '', component: WireListComponent },
  { path: 'new', component: NewWireComponent, canActivate: [PermissionGuard, StepUpGuard], data: { permission: 'payments:initiate' } },
  { path: 'beneficiaries', component: BeneficiaryListComponent },
  { path: ':wireId', component: WireDetailComponent }
];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [
    WireListComponent,
    NewWireComponent,
    WireDetailComponent,
    BeneficiaryListComponent,
    BeneficiaryPickerComponent
  ]
})
export class WiresModule {}
