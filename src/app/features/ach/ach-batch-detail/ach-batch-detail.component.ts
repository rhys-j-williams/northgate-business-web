import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { AchBatch, ApprovalRequest } from '../../../core/models';
import { selectApprovalForSubject } from '../../../store/approvals/approvals.selectors';
import { loadApprovals } from '../../../store/approvals/approvals.actions';
import { AchService } from '../ach.service';

@Component({
  selector: 'mbz-ach-batch-detail',
  templateUrl: './ach-batch-detail.component.html'
})
export class AchBatchDetailComponent implements OnInit {
  batch: AchBatch | null = null;
  approval$: Observable<ApprovalRequest | null>;
  loading = true;
  error: string | null = null;

  constructor(private route: ActivatedRoute, private ach: AchService, private store: Store) {}

  ngOnInit(): void {
    const batchId = this.route.snapshot.paramMap.get('batchId');
    this.approval$ = this.store.select(selectApprovalForSubject(batchId));
    this.store.dispatch(loadApprovals());
    this.ach.getBatch(batchId)
      .then(batch => this.batch = batch)
      .catch(err => this.error = err && err.message ? err.message : 'Batch not found')
      .then(() => this.loading = false);
  }
}
