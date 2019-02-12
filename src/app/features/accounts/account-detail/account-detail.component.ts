import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Account } from '@meridian/domain-fixtures';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as moment from 'moment';

import { AccountsService } from '../accounts.service';
import { CsvExportService } from '../../../core/services/csv-export.service';
import { TelemetryService } from '../../../core/services/telemetry.service';
import { TransactionQuery } from '../../../core/models';

@Component({
  selector: 'mbz-account-detail',
  templateUrl: './account-detail.component.html'
})
export class AccountDetailComponent implements OnInit, OnDestroy {
  account: Account | null = null;
  loading = true;
  exporting = false;
  query: TransactionQuery = { accountId: '', page: 0, pageSize: 25 };
  selectedTab = 0;

  private sub: Subscription;

  constructor(private route: ActivatedRoute,
              private accountsService: AccountsService,
              private csv: CsvExportService,
              private telemetry: TelemetryService) {}

  ngOnInit(): void {
    this.sub = this.route.paramMap.pipe(
      switchMap(params => {
        this.loading = true;
        const accountId = params.get('accountId');
        this.query = { ...this.query, accountId, page: 0 };
        return this.accountsService.getAccount(accountId);
      })
    ).subscribe(account => {
      this.account = account;
      this.loading = false;
    }, err => {
      this.telemetry.error('accounts.detail.load', err);
      this.loading = false;
    });
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  onQueryChange(query: Partial<TransactionQuery>): void {
    this.query = { ...this.query, ...query, page: 0 };
  }

  async exportCsv(): Promise<void> {
    if (!this.account) {
      return;
    }
    this.exporting = true;
    try {
      const rows = await this.accountsService.getAllTransactionsForExport(this.account.accountId, this.query.from, this.query.to);
      const csv = this.csv.build(rows.map(t => ({
        postedAt: t.postedAt,
        description: t.description,
        merchantName: t.merchantName || '',
        category: t.category,
        amountMinor: t.amountMinor,
        runningBalanceMinor: t.runningBalanceMinor,
        status: t.status,
        transactionId: t.transactionId
      })));
      this.csv.download(`${this.account.nickname.replace(/\s+/g, '-')}-${moment().format('YYYYMMDD')}.csv`, csv);
      this.telemetry.event('accounts.export', { rows: rows.length });
    } catch (e) {
      this.telemetry.error('accounts.export', e);
    } finally {
      this.exporting = false;
    }
  }

  get availableLabel(): string {
    if (!this.account) {
      return '';
    }
    return this.account.type === 'credit-card' ? 'Available credit' : 'Available';
  }
}
