import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { ApprovalItemKind } from '../../../core/models';
import { ApprovalsState } from '../../../store/approvals/approvals.reducer';

type Filter = ApprovalsState['filter'];

@Component({
  selector: 'mbz-approval-filter-bar',
  templateUrl: './approval-filter-bar.component.html',
  styleUrls: ['./approval-filter-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApprovalFilterBarComponent {
  @Input() filter: Filter | null;
  @Output() filterChange = new EventEmitter<Filter>();

  readonly kinds: Array<{ value: ApprovalItemKind | 'all'; label: string }> = [
    { value: 'all', label: 'All types' },
    { value: 'wire', label: 'Wires' },
    { value: 'ach-batch', label: 'ACH' },
    { value: 'payroll-run', label: 'Payroll' },
    { value: 'entitlement-change', label: 'Entitlements' },
    { value: 'user-change', label: 'Users' }
  ];

  readonly statuses: Array<{ value: Filter['status']; label: string }> = [
    { value: 'pending', label: 'Pending' },
    { value: 'decided', label: 'Decided' },
    { value: 'all', label: 'All' }
  ];

  setKind(kind: ApprovalItemKind | 'all'): void {
    this.filterChange.emit({ ...(this.filter || { kind: 'all', status: 'pending' }), kind });
  }

  setStatus(status: Filter['status']): void {
    this.filterChange.emit({ ...(this.filter || { kind: 'all', status: 'pending' }), status });
  }
}
