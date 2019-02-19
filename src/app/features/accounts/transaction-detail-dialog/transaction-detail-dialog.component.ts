import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Transaction } from '@meridian/domain-fixtures';

@Component({
  selector: 'mbz-transaction-detail-dialog',
  template: `
    <cn-dialog-shell [title]="data.description" [subtitle]="data.postedAt | mbzDate:'long'" size="md" (closed)="ref.close()">
      <dl class="mbz-kv">
        <dt>Amount</dt><dd><mbz-money-cell [minor]="data.amountMinor"></mbz-money-cell></dd>
        <dt>Running balance</dt><dd>{{ data.runningBalanceMinor | mbzMoney }}</dd>
        <dt>Status</dt><dd><mbz-status-badge [status]="data.status"></mbz-status-badge></dd>
        <dt>Category</dt><dd>{{ data.category | mbzStatusLabel }}</dd>
        <dt>Channel</dt><dd>{{ data.channel | mbzStatusLabel }}</dd>
        <dt *ngIf="data.merchantName">Merchant</dt><dd *ngIf="data.merchantName">{{ data.merchantName }}</dd>
        <dt *ngIf="data.merchantCategoryCode">MCC</dt><dd *ngIf="data.merchantCategoryCode">{{ data.merchantCategoryCode }}</dd>
        <dt *ngIf="data.disputeId">Dispute</dt><dd *ngIf="data.disputeId" class="mbz-mono">{{ data.disputeId }}</dd>
        <dt>Reference</dt><dd class="mbz-mono">{{ data.transactionId }}</dd>
        <dt>Account</dt><dd class="mbz-mono">{{ data.accountId }}</dd>
      </dl>
      <p class="mbz-muted" style="margin-top: 16px; font-size: 12px">
        To dispute this transaction call Business Support. Online disputes are MBZ-1409 and not yet available.
      </p>
    </cn-dialog-shell>
  `
})
export class TransactionDetailDialogComponent {
  constructor(public ref: MatDialogRef<TransactionDetailDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: Transaction) {}
}
