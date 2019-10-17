import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Entitlement } from '@meridian/domain-fixtures';
import { CnSelectOption } from '@meridian/canopy-ui';

import { PERMISSION_CATALOGUE } from '../users.service';

@Component({
  selector: 'mbz-permission-matrix',
  templateUrl: './permission-matrix.component.html',
  styleUrls: ['./permission-matrix.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PermissionMatrixComponent {
  @Input() entitlement: Entitlement;
  @Input() readonly = false;
  @Output() roleChange = new EventEmitter<Entitlement['role']>();
  @Output() permissionToggle = new EventEmitter<string>();
  @Output() dualApprovalToggle = new EventEmitter<void>();

  readonly catalogue = PERMISSION_CATALOGUE;
  readonly roles: CnSelectOption<Entitlement['role']>[] = [
    { value: 'viewer', label: 'Viewer' },
    { value: 'initiator', label: 'Initiator' },
    { value: 'approver', label: 'Approver' },
    { value: 'auditor', label: 'Auditor' },
    { value: 'administrator', label: 'Administrator' }
  ];

  has(permission: string): boolean {
    return this.entitlement.permissions.indexOf(permission) >= 0;
  }

  /** initiate + approve on one user is allowed but the policy says dual approval must then be on. */
  get segregationWarning(): boolean {
    return this.has('payments:initiate') && this.has('payments:approve') && !this.entitlement.dualApprovalRequired;
  }
}
