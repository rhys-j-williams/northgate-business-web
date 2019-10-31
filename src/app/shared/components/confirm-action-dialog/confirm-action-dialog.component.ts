import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, Validators } from '@angular/forms';

export interface ConfirmActionData {
  title: string;
  message: string;
  confirmLabel?: string;
  requireComment?: boolean;
  commentLabel?: string;
  destructive?: boolean;
}

export interface ConfirmActionResult {
  confirmed: boolean;
  comment?: string;
}

/**
 * Confirm with an optional mandatory comment. Canopy's confirm dialog has no comment field and the
 * approvals workflow needs one for rejections (audit trail, GIS-1310), so this wraps MatDialog
 * directly. Predates cn-dialog-shell having a footer slot; not revisited.
 */
@Component({
  selector: 'mbz-confirm-action-dialog',
  templateUrl: './confirm-action-dialog.component.html',
  styleUrls: ['./confirm-action-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ConfirmActionDialogComponent {
  readonly comment = new FormControl('', this.data.requireComment ? [Validators.required, Validators.minLength(4)] : []);

  constructor(public ref: MatDialogRef<ConfirmActionDialogComponent, ConfirmActionResult>,
              @Inject(MAT_DIALOG_DATA) public data: ConfirmActionData) {}

  confirm(): void {
    if (this.comment.invalid) {
      this.comment.markAsTouched();
      return;
    }
    this.ref.close({ confirmed: true, comment: this.comment.value || undefined });
  }

  cancel(): void {
    this.ref.close({ confirmed: false });
  }
}
