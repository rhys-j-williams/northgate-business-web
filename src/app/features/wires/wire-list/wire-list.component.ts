import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CnColumn } from '@meridian/canopy-ui';
import * as moment from 'moment';

import { Wire } from '../../../core/models';
import { AuthService } from '../../../core/services';
import { WiresService } from '../wires.service';

@Component({
  selector: 'mbz-wire-list',
  templateUrl: './wire-list.component.html'
})
export class WireListComponent implements OnInit {
  wires: Wire[] = [];
  visible: Wire[] = [];
  loading = true;
  error: string | null = null;
  canInitiate = false;
  minutesToCutoff = 0;
  private currentView: 'active' | 'all' = 'active';

  readonly columns: CnColumn<Wire>[] = [
    { key: 'initiatedAt', header: 'Initiated', type: 'date', sortable: true },
    { key: 'wireId', header: 'Reference', cellClass: 'mbz-mono' },
    { key: 'beneficiary', header: 'Beneficiary', accessor: w => w.beneficiary.name, sortable: true },
    { key: 'bank', header: 'Receiving bank', accessor: w => w.beneficiary.bankName },
    { key: 'valueDate', header: 'Value date', type: 'date' },
    { key: 'amount', header: 'Amount', type: 'currency', align: 'end', accessor: w => w.amountMinor / 100, sortable: true },
    { key: 'approvals', header: 'Approvals', align: 'center', accessor: w => `${w.approvals.filter(a => a.decision === 'approved').length}/2` },
    { key: 'status', header: 'Status', type: 'status' }
  ];

  constructor(private wiresService: WiresService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.canInitiate = this.auth.hasPermission('payments:initiate');
    this.minutesToCutoff = this.wiresService.minutesToCutoff();
    this.wiresService.getWires()
      .then(wires => {
        this.wires = wires;
        this.refreshVisible();
      })
      .catch(err => this.error = err && err.message ? err.message : 'Could not load wires')
      .then(() => this.loading = false);
  }

  get view(): 'active' | 'all' {
    return this.currentView;
  }

  set view(value: 'active' | 'all') {
    this.currentView = value;
    this.refreshVisible();
  }

  private refreshVisible(): void {
    if (this.currentView === 'all') {
      this.visible = this.wires;
      return;
    }
    const cutoff = moment().subtract(7, 'days');
    this.visible = this.wires.filter(w => w.status === 'pending-approval' || w.status === 'approved' || w.status === 'draft' || moment(w.initiatedAt).isAfter(cutoff));
  }

  get cutoffLabel(): string {
    if (this.minutesToCutoff <= 0) {
      return 'Past today\'s Fedwire cutoff; new wires value tomorrow.';
    }
    const hours = Math.floor(this.minutesToCutoff / 60);
    return hours > 0 ? `${hours}h ${this.minutesToCutoff % 60}m to same day cutoff` : `${this.minutesToCutoff}m to same day cutoff`;
  }

  open(wire: Wire): void {
    this.router.navigate(['/wires', wire.wireId]);
  }

  newWire(): void {
    this.router.navigate(['/wires', 'new']);
  }
}
