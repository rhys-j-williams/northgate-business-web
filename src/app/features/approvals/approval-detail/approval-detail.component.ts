import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import * as moment from 'moment';

import { ApprovalRequest } from '../../../core/models';
import { AuthService } from '../../../core/services';
import * as A from '../../../store/approvals/approvals.actions';
import { applyDecision } from '../../../store/approvals/approvals.reducer';
import { selectAllApprovals, selectApprovalsLoading, selectDecidingIds, selectApprovalsState } from '../../../store/approvals/approvals.selectors';
import { ApprovalDecisionDialogComponent, DecisionDialogData, DecisionDialogResult } from '../approval-decision-dialog/approval-decision-dialog.component';

@Component({
  selector: 'mbz-approval-detail',
  templateUrl: './approval-detail.component.html'
})
export class ApprovalDetailComponent implements OnInit, OnDestroy {
  approval: ApprovalRequest | null = null;
  loading = true;
  deciding = false;
  decisionError: string | null = null;
  me: string;
  canApprove = false;

  private approvalId: string;
  private subscription = new Subscription();

  constructor(private route: ActivatedRoute, private store: Store, private auth: AuthService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.approvalId = this.route.snapshot.paramMap.get('approvalId');
    this.me = this.auth.snapshot.handle;
    this.canApprove = this.auth.hasPermission('payments:approve');
    this.store.dispatch(A.selectApproval({ approvalId: this.approvalId }));
    this.store.dispatch(A.loadApprovals());

    this.subscription.add(this.store.select(selectAllApprovals).subscribe(items => {
      this.approval = items.find(i => i.approvalId === this.approvalId) || null;
    }));
    this.subscription.add(this.store.select(selectApprovalsLoading).subscribe(l => this.loading = l));
    this.subscription.add(this.store.select(selectDecidingIds).subscribe(ids => this.deciding = ids.indexOf(this.approvalId) >= 0));
    this.subscription.add(this.store.select(selectApprovalsState).subscribe(s => this.decisionError = s.decisionErrors[this.approvalId] || null));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.store.dispatch(A.selectApproval({ approvalId: null }));
  }

  get subjectLink(): string[] | null {
    if (!this.approval) {
      return null;
    }
    switch (this.approval.kind) {
      case 'wire': return ['/wires', this.approval.subjectId];
      case 'ach-batch': return ['/ach', 'batches', this.approval.subjectId];
      case 'payroll-run': return ['/payroll', this.approval.subjectId];
      case 'entitlement-change': return ['/users', 'entitlements'];
      default: return null;
    }
  }

  get canDecide(): boolean {
    return this.canApprove && !!this.approval && this.approval.status === 'pending'
      && this.approval.requestedBy !== this.me
      && !this.approval.decisions.some(d => d.approverHandle === this.me);
  }

  get blockedReason(): string | null {
    if (!this.approval || this.approval.status !== 'pending') {
      return null;
    }
    if (!this.canApprove) {
      return 'You do not have the payments:approve permission.';
    }
    if (this.approval.requestedBy === this.me) {
      return 'You raised this request and cannot approve it.';
    }
    if (this.approval.decisions.some(d => d.approverHandle === this.me)) {
      return 'You have already recorded a decision on this request.';
    }
    return null;
  }

  decide(decision: 'approved' | 'rejected'): void {
    if (!this.canDecide) {
      return;
    }
    const preview = applyDecision(this.approval, { approverHandle: this.me, decision, decidedAt: moment().toISOString() });
    const data: DecisionDialogData = { approval: this.approval, decision, isFinal: preview.status === 'approved' };
    this.dialog.open<ApprovalDecisionDialogComponent, DecisionDialogData, DecisionDialogResult | undefined>(ApprovalDecisionDialogComponent, { data, width: '480px' })
      .afterClosed().toPromise().then(result => {
        if (result) {
          this.store.dispatch(A.decide({
            approvalId: this.approvalId,
            decision: { approverHandle: this.me, decision, decidedAt: moment().toISOString(), comment: result.comment }
          }));
        }
      });
  }
}
