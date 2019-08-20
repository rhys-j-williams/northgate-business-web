import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import * as moment from 'moment';

import { ApprovalRequest, Wire } from '../../../core/models';
import { AuthService } from '../../../core/services';
import { ConfirmActionDialogComponent, ConfirmActionResult } from '../../../shared/components/confirm-action-dialog/confirm-action-dialog.component';
import { decide, loadApprovals } from '../../../store/approvals/approvals.actions';
import { applyDecision } from '../../../store/approvals/approvals.reducer';
import { selectApprovalForSubject, selectDecidingIds } from '../../../store/approvals/approvals.selectors';
import { WiresService } from '../wires.service';

@Component({
  selector: 'mbz-wire-detail',
  templateUrl: './wire-detail.component.html',
  styleUrls: ['./wire-detail.component.scss']
})
export class WireDetailComponent implements OnInit, OnDestroy {
  wire: Wire | null = null;
  approval: ApprovalRequest | null = null;
  deciding$: Observable<boolean>;
  loading = true;
  error: string | null = null;
  canApprove = false;

  private subscription = new Subscription();

  constructor(private route: ActivatedRoute,
              private wires: WiresService,
              private store: Store,
              private auth: AuthService,
              private dialog: MatDialog) {}

  ngOnInit(): void {
    const wireId = this.route.snapshot.paramMap.get('wireId');
    this.canApprove = this.auth.hasPermission('payments:approve');
    this.store.dispatch(loadApprovals());
    this.subscription.add(this.store.select(selectApprovalForSubject(wireId)).subscribe(a => this.approval = a));
    this.deciding$ = this.store.select(selectDecidingIds).pipe(map(ids => !!this.approval && ids.indexOf(this.approval.approvalId) >= 0));
    this.load(wireId);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get isInitiator(): boolean {
    return !!this.wire && this.wire.initiatedBy === this.auth.snapshot.handle;
  }

  get alreadyDecided(): boolean {
    return !!this.approval && this.approval.decisions.some(d => d.approverHandle === this.auth.snapshot.handle);
  }

  get canDecide(): boolean {
    return this.canApprove && !!this.approval && this.approval.status === 'pending' && !this.isInitiator && !this.alreadyDecided;
  }

  /** What the store will do with an approval from me, before I confirm. */
  get outcomeIfApproved(): ApprovalRequest['status'] | null {
    if (!this.approval) {
      return null;
    }
    return applyDecision(this.approval, { approverHandle: this.auth.snapshot.handle, decision: 'approved', decidedAt: moment().toISOString() }).status;
  }

  approve(): void {
    this.confirm({
      title: 'Approve wire',
      message: `Approve ${this.wire.wireId} for ${(this.wire.amountMinor / 100).toFixed(2)} to ${this.wire.beneficiary.name}?`
        + (this.outcomeIfApproved === 'approved' ? ' This is the final approval and the wire will be released.' : ' One more approval will be needed.'),
      confirmLabel: 'Approve'
    }, 'approved');
  }

  reject(): void {
    this.confirm({
      title: 'Reject wire',
      message: `Reject ${this.wire.wireId}? The initiator will be notified and the wire cancelled.`,
      confirmLabel: 'Reject',
      requireComment: true,
      commentLabel: 'Reason (recorded in the audit log)',
      destructive: true
    }, 'rejected');
  }

  private confirm(data: object, decision: 'approved' | 'rejected'): void {
    this.dialog.open(ConfirmActionDialogComponent, { data, width: '480px' })
      .afterClosed().toPromise().then((result: ConfirmActionResult | undefined) => {
        if (result && result.confirmed && this.approval) {
          this.store.dispatch(decide({
            approvalId: this.approval.approvalId,
            decision: { approverHandle: this.auth.snapshot.handle, decision, decidedAt: moment().toISOString(), comment: result.comment }
          }));
          // Refresh the wire itself after the effect round trips. Crude; MBZ-1380 would push it.
          setTimeout(() => this.load(this.wire.wireId), 800);
        }
      });
  }

  private load(wireId: string): void {
    this.wires.getWire(wireId)
      .then(wire => this.wire = wire)
      .catch(err => this.error = err && err.message ? err.message : 'Wire not found')
      .then(() => this.loading = false);
  }
}
