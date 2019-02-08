import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { Account } from '@meridian/domain-fixtures';
import * as _ from 'lodash';

@Component({
  selector: 'mbz-balance-summary',
  template: `
    <div class="mbz-balance-summary">
      <cn-card [flat]="true" [padded]="true">
        <span class="mbz-balance-summary__label">Total available</span>
        <span class="mbz-balance-summary__value">{{ totalAvailableMinor | mbzMoney }}</span>
        <span class="mbz-muted">{{ depositAccounts }} deposit accounts</span>
      </cn-card>
      <cn-card [flat]="true" [padded]="true">
        <span class="mbz-balance-summary__label">Pending debits</span>
        <span class="mbz-balance-summary__value mbz-debit">{{ pendingDebitsMinor | mbzMoney:true }}</span>
        <span class="mbz-muted">Current less available</span>
      </cn-card>
      <cn-card [flat]="true" [padded]="true">
        <span class="mbz-balance-summary__label">Credit in use</span>
        <span class="mbz-balance-summary__value">{{ creditUsedMinor | mbzMoney }}</span>
        <span class="mbz-muted">of {{ creditLimitMinor | mbzMoney }}</span>
      </cn-card>
    </div>
  `,
  styles: [`
    .mbz-balance-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .mbz-balance-summary__label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--cn-color-text-muted); }
    .mbz-balance-summary__value { display: block; font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; margin: 4px 0; }
    @media (max-width: 900px) { .mbz-balance-summary { grid-template-columns: 1fr; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BalanceSummaryComponent implements OnChanges {
  @Input() accounts: Account[] = [];
  @Input() totalAvailableMinor = 0;

  depositAccounts = 0;
  pendingDebitsMinor = 0;
  creditUsedMinor = 0;
  creditLimitMinor = 0;

  ngOnChanges(): void {
    const open = this.accounts.filter(a => a.status !== 'closed');
    const deposits = open.filter(a => a.type !== 'credit-card' && a.type !== 'mortgage' && a.type !== 'auto-loan');
    const credit = open.filter(a => a.type === 'credit-card');
    this.depositAccounts = deposits.length;
    this.pendingDebitsMinor = -Math.max(0, _.sumBy(deposits, a => a.currentBalanceMinor - a.availableBalanceMinor));
    this.creditUsedMinor = _.sumBy(credit, a => Math.abs(a.currentBalanceMinor));
    this.creditLimitMinor = _.sumBy(credit, a => a.creditLimitMinor || 0);
  }
}
