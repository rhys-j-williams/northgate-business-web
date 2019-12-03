import { Component, Inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { BusinessAlert } from '../../../core/models';

@Component({
  selector: 'mbz-alert-threshold-dialog',
  templateUrl: './alert-threshold-dialog.component.html'
})
export class AlertThresholdDialogComponent {
  readonly amount: FormControl;

  constructor(public ref: MatDialogRef<AlertThresholdDialogComponent, number | undefined>,
              @Inject(MAT_DIALOG_DATA) public alert: BusinessAlert) {
    this.amount = new FormControl((alert.thresholdMinor || 0) / 100, [Validators.required, Validators.min(0)]);
  }

  save(): void {
    if (this.amount.invalid) {
      this.amount.markAsTouched();
      return;
    }
    this.ref.close(Math.round(Number(this.amount.value) * 100));
  }
}
