import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Account } from '@meridian/domain-fixtures';
import { CnAccountSummary } from '@meridian/canopy-ui';
import * as _ from 'lodash';

import { AccountsService } from '../accounts.service';
import { Organisation } from '../../../core/models';
import { TelemetryService } from '../../../core/services/telemetry.service';

@Component({
  selector: 'mbz-accounts-overview',
  templateUrl: './accounts-overview.component.html',
  styleUrls: ['./accounts-overview.component.scss']
})
export class AccountsOverviewComponent implements OnInit {
  loading = true;
  organisation: Organisation | null = null;
  accounts: Account[] = [];
  groups: Array<{ label: string; accounts: Account[] }> = [];
  totalAvailableMinor = 0;
  error: string | null = null;

  constructor(private accountsService: AccountsService, private router: Router, private telemetry: TelemetryService) {}

  async ngOnInit(): Promise<void> {
    try {
      [this.organisation, this.accounts] = await Promise.all([
        this.accountsService.getOrganisation(),
        this.accountsService.getAccounts()
      ]);
      this.groups = this.groupAccounts(this.accounts);
      this.totalAvailableMinor = this.accountsService.totalAvailable(this.accounts);
    } catch (e) {
      this.telemetry.error('accounts.overview.load', e);
      this.error = 'Accounts could not be loaded right now.';
    } finally {
      this.loading = false;
    }
  }

  toSummary(account: Account): CnAccountSummary {
    return {
      id: account.accountId,
      nickname: account.nickname,
      kind: this.kindFor(account),
      last4: account.accountNumber.slice(-4),
      currency: account.currency,
      currentBalance: account.currentBalanceMinor / 100,
      availableBalance: account.availableBalanceMinor / 100,
      status: account.status === 'closed' ? 'closed' : account.status === 'restricted' || account.status === 'dormant' ? 'frozen' : 'open',
      creditLimit: account.creditLimitMinor !== undefined ? account.creditLimitMinor / 100 : undefined
    };
  }

  open(summary: CnAccountSummary): void {
    this.router.navigate(['/accounts', summary.id]);
  }

  private kindFor(account: Account): CnAccountSummary['kind'] {
    switch (account.type) {
      case 'business-checking':
      case 'treasury-operating': return 'business';
      case 'checking': return 'checking';
      case 'savings':
      case 'business-savings':
      case 'certificate': return 'savings';
      case 'credit-card': return 'credit';
      case 'mortgage':
      case 'auto-loan': return 'loan';
      default: return 'business';
    }
  }

  private groupAccounts(accounts: Account[]): Array<{ label: string; accounts: Account[] }> {
    const order = ['Operating', 'Reserves', 'Credit', 'Closed'];
    const grouped = _.groupBy(accounts, a => {
      if (a.status === 'closed') {
        return 'Closed';
      }
      if (a.type === 'credit-card' || a.type === 'mortgage' || a.type === 'auto-loan') {
        return 'Credit';
      }
      if (a.type === 'savings' || a.type === 'business-savings' || a.type === 'certificate') {
        return 'Reserves';
      }
      return 'Operating';
    });
    return order.filter(label => grouped[label]).map(label => ({ label, accounts: _.sortBy(grouped[label], 'nickname') }));
  }
}
