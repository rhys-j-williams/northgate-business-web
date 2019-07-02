import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CnColumn } from '@meridian/canopy-ui';

import { AchBatch } from '../../../core/models';
import { AuthService } from '../../../core/services';
import { AchService } from '../ach.service';

/**
 * Newer screen (2021) so it uses cn-data-table rather than mat-table. Compare payroll-runs.
 */
@Component({
  selector: 'mbz-ach-batches',
  templateUrl: './ach-batches.component.html'
})
export class AchBatchesComponent implements OnInit {
  batches: AchBatch[] = [];
  loading = true;
  error: string | null = null;
  canUpload = false;
  statusFilter: string[] = [];

  readonly columns: CnColumn<AchBatch>[] = [
    { key: 'uploadedAt', header: 'Uploaded', type: 'date', sortable: true },
    { key: 'fileName', header: 'File' },
    { key: 'secCode', header: 'SEC', width: '64px' },
    { key: 'companyEntryDescription', header: 'Description' },
    { key: 'effectiveEntryDate', header: 'Effective', type: 'date', sortable: true },
    { key: 'entryCount', header: 'Entries', type: 'number', align: 'end' },
    { key: 'total', header: 'Total', type: 'currency', align: 'end', accessor: b => (b.totalDebitMinor + b.totalCreditMinor) / 100 },
    { key: 'status', header: 'Status', type: 'status' }
  ];

  readonly statusChips = [
    { value: 'pending-approval', label: 'Pending approval' },
    { value: 'released', label: 'Released' },
    { value: 'settled', label: 'Settled' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'returned', label: 'Returned' }
  ];

  constructor(private ach: AchService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.canUpload = this.auth.hasPermission('payments:initiate');
    this.ach.getBatches()
      .then(batches => this.batches = batches)
      .catch(err => this.error = err && err.message ? err.message : 'Could not load ACH activity')
      .then(() => this.loading = false);
  }

  get visible(): AchBatch[] {
    return this.statusFilter.length ? this.batches.filter(b => this.statusFilter.indexOf(b.status) >= 0) : this.batches;
  }

  open(batch: AchBatch): void {
    this.router.navigate(['/ach', 'batches', batch.batchId]);
  }

  upload(): void {
    this.router.navigate(['/ach', 'upload']);
  }
}
