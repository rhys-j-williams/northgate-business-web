import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ApprovalRequest } from '../../../core/models';

export interface DecisionDialogData {
  approval: ApprovalRequest;
  decision: 'approved' | 'rejected';
  isFinal: boolean;
}

export interface DecisionDialogResult {
  comment?: string;
}

@Component({
  selector: 'mbz-approval-decision-dialog',
  templateUrl: './approval-decision-dialog.component.html'
})
export class ApprovalDecisionDialogComponent {
  form: FormGroup;

  constructor(public ref: MatDialogRef<ApprovalDecisionDialogComponent, DecisionDialogResult | undefined>,
              @Inject(MAT_DIALOG_DATA) public data: DecisionDialogData,
              fb: FormBuilder) {
    this.form = fb.group({
      comment: ['', data.decision === 'rejected' ? [Validators.required, Validators.maxLength(200)] : [Validators.maxLength(200)]],
      acknowledged: [false, data.isFinal ? Validators.requiredTrue : []]
    });
  }

  get title(): string {
    return this.data.decision === 'approved' ? 'Approve request' : 'Reject request';
  }

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.ref.close({ comment: this.form.value.comment || undefined });
  }
}
