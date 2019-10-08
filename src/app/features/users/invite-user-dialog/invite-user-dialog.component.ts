import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { Entitlement } from '@meridian/domain-fixtures';
import { CnSelectOption } from '@meridian/canopy-ui';

import { BusinessUser } from '../../../core/models';
import { UsersService } from '../users.service';

@Component({
  selector: 'mbz-invite-user-dialog',
  templateUrl: './invite-user-dialog.component.html'
})
export class InviteUserDialogComponent {
  form: FormGroup;
  saving = false;
  error: string | null = null;

  readonly roles: CnSelectOption<Entitlement['role']>[] = [
    { value: 'viewer', label: 'Viewer', description: 'Read only' },
    { value: 'initiator', label: 'Initiator', description: 'Can create payments' },
    { value: 'approver', label: 'Approver', description: 'Can approve payments' },
    { value: 'auditor', label: 'Auditor', description: 'Read only plus audit log' },
    { value: 'administrator', label: 'Administrator', description: 'Everything. Needs a second administrator to confirm.' }
  ];

  constructor(public ref: MatDialogRef<InviteUserDialogComponent, BusinessUser | undefined>, fb: FormBuilder, private users: UsersService) {
    this.form = fb.group({
      displayName: ['', [Validators.required, Validators.maxLength(60)]],
      // Corporate directory only. Personal addresses were disallowed after GIS-2207.
      email: ['', [Validators.required, Validators.email, Validators.pattern(/^[^@]+@example\.com$/)]],
      role: ['viewer', Validators.required]
    });
  }

  send(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.users.invite(this.form.value)
      .then(user => this.ref.close(user))
      .catch(err => {
        this.error = err && err.message ? err.message : 'Invitation failed';
        this.saving = false;
      });
  }
}
