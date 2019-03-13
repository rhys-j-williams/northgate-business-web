import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subscription, timer } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Component({
  selector: 'mbz-idle-warning',
  template: `
    <h2 mat-dialog-title>Still there?</h2>
    <mat-dialog-content>
      <p>You will be signed out in <strong>{{ secondsLeft }}</strong> seconds for your security.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close(false)">Sign out</button>
      <button mat-flat-button color="primary" type="button" (click)="ref.close(true)" cdkFocusInitial>Stay signed in</button>
    </mat-dialog-actions>
  `
})
export class IdleWarningComponent implements OnInit, OnDestroy {
  secondsLeft: number;
  private sub: Subscription;

  constructor(public ref: MatDialogRef<IdleWarningComponent, boolean>, @Inject(MAT_DIALOG_DATA) data: { minutesRemaining: number }) {
    this.secondsLeft = data.minutesRemaining * 60;
  }

  ngOnInit(): void {
    const total = this.secondsLeft;
    this.sub = timer(1000, 1000).pipe(take(total), map(i => total - i - 1)).subscribe(s => {
      this.secondsLeft = s;
      if (s <= 0) {
        this.ref.close(undefined);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
