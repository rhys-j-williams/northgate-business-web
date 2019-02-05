/**
 * Everything a feature module needs and nothing it does not. The Material imports are here because
 * six screens use Material directly (see README "Canopy and Material"); the Canopy modules are the
 * ones the whole app leans on. Kept as one barrel because splitting it in 2020 produced import
 * churn for no bundle size benefit we could measure (MBZ-880).
 */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMomentDateModule } from '@angular/material-moment-adapter';

import {
  CnAccountCardModule, CnBadgeModule, CnButtonModule, CnCardModule, CnCheckboxModule, CnCurrencyInputModule,
  CnDataTableModule, CnDateRangeModule, CnDialogShellModule, CnDividerModule, CnExpansionModule, CnFilterChipsModule,
  CnIconButtonModule, CnIconModule, CnListModule, CnMaskedInputModule, CnMenuModule, CnPageHeaderModule,
  CnProgressModule, CnSelectModule, CnSkeletonModule, CnTabsModule, CnToastModule, CnToggleModule, CnTooltipModule
} from '@meridian/canopy-ui';

import { ConfirmActionDialogComponent } from './components/confirm-action-dialog/confirm-action-dialog.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { MoneyCellComponent } from './components/money-cell/money-cell.component';
import { PageLoadingComponent } from './components/page-loading/page-loading.component';
import { StatusBadgeComponent } from './components/status-badge/status-badge.component';
import { BusinessDatePipe } from './pipes/business-date.pipe';
import { MaskAccountPipe } from './pipes/mask-account.pipe';
import { MoneyPipe } from './pipes/money.pipe';
import { StatusLabelPipe } from './pipes/status-label.pipe';

const MATERIAL = [
  MatButtonModule, MatDialogModule, MatExpansionModule, MatFormFieldModule, MatIconModule, MatInputModule, MatMenuModule,
  MatPaginatorModule, MatProgressBarModule, MatSelectModule, MatSortModule, MatStepperModule, MatTableModule, MatTabsModule,
  MatTooltipModule, MatCheckboxModule, MatDatepickerModule, MatMomentDateModule
];

const CANOPY = [
  CnAccountCardModule, CnBadgeModule, CnButtonModule, CnCardModule, CnCheckboxModule, CnCurrencyInputModule,
  CnDataTableModule, CnDateRangeModule, CnDialogShellModule, CnDividerModule, CnExpansionModule, CnFilterChipsModule,
  CnIconButtonModule, CnIconModule, CnListModule, CnMaskedInputModule, CnMenuModule, CnPageHeaderModule,
  CnProgressModule, CnSelectModule, CnSkeletonModule, CnTabsModule, CnToastModule, CnToggleModule, CnTooltipModule
];

const DECLARATIONS = [
  ConfirmActionDialogComponent,
  EmptyStateComponent,
  MoneyCellComponent,
  PageLoadingComponent,
  StatusBadgeComponent,
  BusinessDatePipe,
  MaskAccountPipe,
  MoneyPipe,
  StatusLabelPipe
];

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ...MATERIAL, ...CANOPY],
  declarations: DECLARATIONS,
  exports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ...MATERIAL, ...CANOPY, ...DECLARATIONS],
  providers: [MoneyPipe, BusinessDatePipe]
})
export class SharedModule {}
