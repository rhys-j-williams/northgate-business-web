import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { LegacyModule } from '../../legacy/legacy.module';
import { AccountDetailComponent } from './account-detail/account-detail.component';
import { AccountsOverviewComponent } from './accounts-overview/accounts-overview.component';
import { BalanceSummaryComponent } from './balance-summary/balance-summary.component';
import { TransactionDetailDialogComponent } from './transaction-detail-dialog/transaction-detail-dialog.component';
import { TransactionFilterComponent } from './transaction-filter/transaction-filter.component';
import { TransactionListComponent } from './transaction-list/transaction-list.component';

const routes: Routes = [
  { path: '', component: AccountsOverviewComponent },
  { path: ':accountId', component: AccountDetailComponent }
];

@NgModule({
  imports: [SharedModule, LegacyModule, RouterModule.forChild(routes)],
  declarations: [
    AccountsOverviewComponent,
    AccountDetailComponent,
    BalanceSummaryComponent,
    TransactionFilterComponent,
    TransactionListComponent,
    TransactionDetailDialogComponent
  ],
  exports: [TransactionListComponent]
})
export class AccountsModule {}
