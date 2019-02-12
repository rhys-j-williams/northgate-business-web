import { Component, Input, OnChanges, SimpleChanges, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Transaction } from '@meridian/domain-fixtures';

import { AccountsService } from '../accounts.service';
import { Page, TransactionQuery } from '../../../core/models';
import { TelemetryService } from '../../../core/services/telemetry.service';
import { TransactionDetailDialogComponent } from '../transaction-detail-dialog/transaction-detail-dialog.component';

/**
 * Direct MatTable rather than cn-data-table. Written in 2019 before Canopy had a table; when
 * cn-data-table arrived (Canopy 2.3) the running balance column and the row expansion did not fit
 * its column model, so it stayed. Encapsulation off for the sticky header and the pending row
 * styling, both of which reach into Material's classes.
 */
@Component({
  selector: 'mbz-transaction-list',
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TransactionListComponent implements OnChanges {
  @Input() query: TransactionQuery;
  @Input() showAccountColumn = false;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  readonly dataSource = new MatTableDataSource<Transaction>([]);
  displayedColumns = ['postedAt', 'description', 'category', 'status', 'amountMinor', 'runningBalanceMinor'];
  page: Page<Transaction> | null = null;
  loading = false;
  expandedId: string | null = null;

  private lastRequest = 0;

  constructor(private accountsService: AccountsService, private dialog: MatDialog, private telemetry: TelemetryService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['query'] && this.query && this.query.accountId) {
      this.load();
    }
    if (changes['showAccountColumn']) {
      this.displayedColumns = this.showAccountColumn
        ? ['postedAt', 'accountId', 'description', 'category', 'status', 'amountMinor']
        : ['postedAt', 'description', 'category', 'status', 'amountMinor', 'runningBalanceMinor'];
    }
  }

  async load(): Promise<void> {
    const requestId = ++this.lastRequest;
    this.loading = true;
    try {
      const page = await this.accountsService.getTransactions(this.query);
      if (requestId !== this.lastRequest) {
        return; // a newer query won
      }
      this.page = page;
      this.dataSource.data = page.items;
    } catch (e) {
      this.telemetry.error('transactions.load', e);
    } finally {
      if (requestId === this.lastRequest) {
        this.loading = false;
      }
    }
  }

  onPage(event: PageEvent): void {
    this.query = { ...this.query, page: event.pageIndex, pageSize: event.pageSize };
    this.load();
  }

  onSort(sort: Sort): void {
    this.query = { ...this.query, sort: sort.direction ? `${sort.active}:${sort.direction}` : undefined, page: 0 };
    this.load();
  }

  toggle(row: Transaction): void {
    this.expandedId = this.expandedId === row.transactionId ? null : row.transactionId;
  }

  openDetail(row: Transaction, event: MouseEvent): void {
    event.stopPropagation();
    this.dialog.open(TransactionDetailDialogComponent, { data: row, width: '520px', panelClass: 'mbz-transaction-dialog' });
  }

  trackById(_index: number, row: Transaction): string {
    return row.transactionId;
  }
}
