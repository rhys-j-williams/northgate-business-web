import { Component, OnInit } from '@angular/core';
import { CnColumn } from '@meridian/canopy-ui';

import { WireBeneficiary } from '../../../core/models';
import { WiresService } from '../wires.service';

/**
 * Read only. Adding a beneficiary requires a callback by Treasury Ops and is done from their
 * tooling; the self-service flow was descoped in MBZ-905 and has not come back.
 */
@Component({
  selector: 'mbz-beneficiary-list',
  templateUrl: './beneficiary-list.component.html'
})
export class BeneficiaryListComponent implements OnInit {
  beneficiaries: WireBeneficiary[] = [];
  loading = true;
  error: string | null = null;

  readonly columns: CnColumn<WireBeneficiary>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'bankName', header: 'Bank', sortable: true },
    { key: 'routingNumber', header: 'Routing', cellClass: 'mbz-mono' },
    { key: 'account', header: 'Account', accessor: b => `****${b.accountNumberLastFour}`, cellClass: 'mbz-mono' },
    { key: 'addressLine', header: 'Address' },
    { key: 'verified', header: 'Verified', type: 'status', accessor: b => b.verified ? 'verified' : 'unverified' },
    { key: 'addedAt', header: 'Added', type: 'date', sortable: true }
  ];

  constructor(private wires: WiresService) {}

  ngOnInit(): void {
    this.wires.getBeneficiaries()
      .then(items => this.beneficiaries = items)
      .catch(err => this.error = err && err.message ? err.message : 'Could not load beneficiaries')
      .then(() => this.loading = false);
  }
}
