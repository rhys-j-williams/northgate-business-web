import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, switchMap, timeout } from 'rxjs/operators';
import * as moment from 'moment';
import { Account } from '@meridian/domain-fixtures';

import { environment } from '../../../environments/environment';
import { FixtureDataService } from './fixture-data.service';
import { ApprovalDecision, ApprovalRequest, BusinessUser } from '../models/business.models';

/**
 * Thin adapter over bff-business (platform-services/bff-business, port 4501).
 *
 * The BFF only grew a real surface in 2022 (MBZ-0801, forked from bff-retail) and it still only
 * serves accounts, the approvals queue and the entitlements "me"/organisation users calls. Everything
 * else in this app (payroll, ACH, wires, reports, alerts) is still on the fixture layer with the
 * BFF paths pencilled in. Do not "tidy" the two together; the shapes differ and MBZ-1304/MBZ-1411
 * are still open on the BFF side.
 *
 * Availability: /health is probed once, on first use. If the BFF is down we fall back to fixtures
 * for the rest of the session rather than showing an empty queue. `useFixtures` in the environment
 * short-circuits the probe entirely.
 */
@Injectable({ providedIn: 'root' })
export class BffGatewayService {

  private available$: Observable<boolean> | null = null;

  constructor(private http: HttpClient, private fixtures: FixtureDataService) {}

  isAvailable(): Observable<boolean> {
    if (environment.useFixtures) {
      return of(false);
    }
    if (!this.available$) {
      // /health sits outside the /api/v1 prefix on the BFF; proxy.conf.json forwards it separately.
      const healthUrl = `${environment.apiBase.replace(/\/api$/, '')}/health`;
      this.available$ = this.http.get<{ status: string }>(healthUrl).pipe(
        timeout(1500),
        map(r => !!r && (r.status === 'UP' || r.status === 'ok')),
        catchError(() => of(false)),
        shareReplay(1)
      );
    }
    return this.available$;
  }

  accounts(): Observable<Account[]> {
    return this.isAvailable().pipe(switchMap(up => up
      ? this.http.get<BffAccount[]>(`${environment.apiBase}/v1/accounts`).pipe(
          map(rows => rows.map(toAccount)),
          catchError(() => this.fixtures.getAccounts()))
      : this.fixtures.getAccounts()));
  }

  approvals(): Observable<ApprovalRequest[]> {
    return this.isAvailable().pipe(switchMap(up => up
      ? this.http.get<BffApproval[]>(`${environment.apiBase}/v1/approvals`).pipe(
          map(rows => rows.map(toApprovalRequest)),
          catchError(() => this.fixtures.getApprovals()))
      : this.fixtures.getApprovals()));
  }

  decide(approvalId: string, decision: ApprovalDecision): Observable<ApprovalRequest> {
    return this.isAvailable().pipe(switchMap(up => {
      if (!up) {
        return this.fixtures.decideApproval(approvalId, decision);
      }
      const url = `${environment.apiBase}/v1/approvals/${encodeURIComponent(approvalId)}/${decision.decision === 'approved' ? 'approve' : 'reject'}`;
      const body = decision.decision === 'rejected' ? { reason: decision.comment || 'Rejected in Meridian Business' } : {};
      return this.http.post<BffApproval>(url, body).pipe(
        map(toApprovalRequest),
        // 409 is maker-checker; let that one through to the store so the row rolls back.
        catchError(err => throwError(err))
      );
    }));
  }

  organisationUsers(): Observable<BusinessUser[]> {
    return this.isAvailable().pipe(switchMap(up => up
      ? this.http.get<BusinessUser[]>(`${environment.apiBase}/v1/organisation/users`).pipe(catchError(() => this.fixtures.getUsers()))
      : this.fixtures.getUsers()));
  }
}

interface BffAccount {
  accountId: string;
  type: string;
  maskedNumber: string;
  ownerName: string;
  currentBalanceMinor: number;
  availableBalanceMinor: number;
  status: string;
}

interface BffApproval {
  approvalId: string;
  organisationId: string;
  kind: 'payment' | 'user-change' | 'limit-change';
  summary: string;
  amountMinor?: number;
  fromAccountId?: string;
  initiatedBy: string;
  initiatedAt: string;
  requiredApprovals: number;
  approvals: Array<{ by: string; at: string }>;
  rejection?: { by: string; at: string; reason: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RELEASED' | 'EXPIRED';
  expiresAt: string;
}

function toAccount(a: BffAccount): Account {
  // The BFF masks for us; the fixture layer masks in the pipe. Both end up as ****1234 on screen.
  return {
    accountId: a.accountId,
    customerId: '',
    type: a.type as Account['type'],
    nickname: a.ownerName,
    accountNumber: a.maskedNumber,
    routingNumber: '021000000',
    currency: 'USD',
    currentBalanceMinor: a.currentBalanceMinor,
    availableBalanceMinor: a.availableBalanceMinor,
    openedAt: '',
    status: a.status as Account['status']
  };
}

function toApprovalRequest(a: BffApproval): ApprovalRequest {
  const decisions: ApprovalDecision[] = a.approvals.map(x => ({ approverHandle: x.by, decision: 'approved' as const, decidedAt: x.at }));
  if (a.rejection) {
    decisions.push({ approverHandle: a.rejection.by, decision: 'rejected', decidedAt: a.rejection.at, comment: a.rejection.reason });
  }
  const status: ApprovalRequest['status'] =
    a.status === 'PENDING' ? 'pending'
    : a.status === 'REJECTED' ? 'rejected'
    : a.status === 'EXPIRED' ? 'expired'
    : 'approved'; // APPROVED and RELEASED both read as approved here; release is a ledger concern
  return {
    approvalId: a.approvalId,
    organisationId: a.organisationId,
    kind: a.kind === 'payment' ? 'wire' : a.kind === 'limit-change' ? 'entitlement-change' : 'user-change',
    subjectId: a.fromAccountId || a.approvalId,
    summary: a.summary,
    amountMinor: a.amountMinor === undefined ? null : a.amountMinor,
    requestedBy: a.initiatedBy,
    requestedAt: moment(a.initiatedAt).toISOString(),
    requiredApprovals: a.requiredApprovals,
    decisions,
    status,
    expiresAt: a.expiresAt
  };
}
