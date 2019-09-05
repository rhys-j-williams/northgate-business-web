import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import * as moment from 'moment';

import { ApprovalRequest } from '../../../core/models';
import { AuthService } from '../../../core/services';
import * as A from '../../../store/approvals/approvals.actions';
import { selectApprovalsError, selectApprovalsFilter, selectApprovalsLoading, selectFilteredApprovals } from '../../../store/approvals/approvals.selectors';
import { ApprovalsState } from '../../../store/approvals/approvals.reducer';

/**
 * The queue. Second oldest screen in the app after accounts (MBZ-604, 2019) and it shows: raw
 * mat-table, a MatTableDataSource fed from the store by subscription, ngOnDestroy bookkeeping.
 */
@Component({
  selector: 'mbz-approvals-queue',
  templateUrl: './approvals-queue.component.html',
  styleUrls: ['./approvals-queue.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ApprovalsQueueComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;

  readonly dataSource = new MatTableDataSource<ApprovalRequest>([]);
  readonly displayedColumns = ['requestedAt', 'kind', 'summary', 'requestedBy', 'amount', 'progress', 'expiresAt', 'actions'];

  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  filter$: Observable<ApprovalsState['filter']>;
  canApprove = false;
  me: string;

  private subscription = new Subscription();

  constructor(private store: Store, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.me = this.auth.snapshot.handle;
    this.canApprove = this.auth.hasPermission('payments:approve');
    this.loading$ = this.store.select(selectApprovalsLoading);
    this.error$ = this.store.select(selectApprovalsError);
    this.filter$ = this.store.select(selectApprovalsFilter);
    this.dataSource.paginator = this.paginator;
    this.subscription.add(this.store.select(selectFilteredApprovals).subscribe(items => this.dataSource.data = items));
    this.store.dispatch(A.loadApprovals());
    this.store.dispatch(A.expireStale({ now: moment().toISOString() }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onFilter(filter: ApprovalsState['filter']): void {
    this.store.dispatch(A.setApprovalsFilter(filter));
  }

  refresh(): void {
    this.store.dispatch(A.loadApprovals());
  }

  open(approval: ApprovalRequest): void {
    this.store.dispatch(A.selectApproval({ approvalId: approval.approvalId }));
    this.router.navigate(['/approvals', approval.approvalId]);
  }

  mine(approval: ApprovalRequest): boolean {
    return approval.requestedBy === this.me;
  }

  decidedByMe(approval: ApprovalRequest): boolean {
    return approval.decisions.some(d => d.approverHandle === this.me);
  }

  actionable(approval: ApprovalRequest): boolean {
    return this.canApprove && approval.status === 'pending' && !this.mine(approval) && !this.decidedByMe(approval);
  }

  expiringSoon(approval: ApprovalRequest): boolean {
    return approval.status === 'pending' && moment(approval.expiresAt).diff(moment(), 'hours') < 4;
  }

  approvedCount(approval: ApprovalRequest): number {
    return approval.decisions.filter(d => d.decision === 'approved').length;
  }
}
