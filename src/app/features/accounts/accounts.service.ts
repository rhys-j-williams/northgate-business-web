/**
 * Accounts data access. This is the oldest feature service in the app (MBZ-31, Feb 2019) and the
 * pattern the others copied: HttpClient when the BFF is configured, the fixture service otherwise,
 * toPromise on the way out because the original team preferred async/await in components.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Account, Transaction } from '@meridian/domain-fixtures';
import * as _ from 'lodash';

import { environment } from '../../../environments/environment';
import { Organisation, Page, TransactionQuery } from '../../core/models';
import { BffGatewayService } from '../../core/services/bff-gateway.service';
import { FixtureDataService } from '../../core/services/fixture-data.service';

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private accountsCache: Account[] | null = null;

  constructor(private http: HttpClient, private fixtures: FixtureDataService, private gateway: BffGatewayService) {}

  getOrganisation(): Promise<Organisation> {
    if (environment.useFixtures) {
      return this.fixtures.getOrganisation().toPromise();
    }
    return this.http.get<Organisation>(`${environment.apiBase}/business/v1/organisation`).toPromise();
  }

  getAccounts(force = false): Promise<Account[]> {
    if (this.accountsCache && !force) {
      return Promise.resolve(this.accountsCache);
    }
    // MBZ-0801: accounts moved to bff-business /api/v1/accounts. The gateway falls back to fixtures when 4501 is down.
    const source$: Observable<Account[]> = this.gateway.accounts();
    return source$.toPromise().then(accounts => {
      this.accountsCache = accounts;
      return accounts;
    });
  }

  getAccount(accountId: string): Promise<Account> {
    if (environment.useFixtures) {
      return this.fixtures.getAccount(accountId).toPromise();
    }
    return this.http.get<Account>(`${environment.apiBase}/business/v1/accounts/${encodeURIComponent(accountId)}`).toPromise();
  }

  getTransactions(query: TransactionQuery): Promise<Page<Transaction>> {
    if (environment.useFixtures) {
      return this.fixtures.getTransactions(query).toPromise();
    }
    let params = new HttpParams();
    _.forOwn(query, (value, key) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Page<Transaction>>(`${environment.apiBase}/business/v1/transactions`, { params }).toPromise();
  }

  /** Whole history for CSV export; the BFF caps at 5000 rows and so do we. */
  getAllTransactionsForExport(accountId: string, from?: string, to?: string): Promise<Transaction[]> {
    return this.getTransactions({ accountId, from, to, page: 0, pageSize: 5000 }).then(page => page.items);
  }

  invalidate(): void {
    this.accountsCache = null;
  }

  totalAvailable(accounts: Account[]): number {
    return _.sumBy(accounts.filter(a => a.status !== 'closed' && a.type !== 'credit-card' && a.type !== 'mortgage' && a.type !== 'auto-loan'), a => a.availableBalanceMinor);
  }
}
