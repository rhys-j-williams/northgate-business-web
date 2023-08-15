import { Component } from '@angular/core';

@Component({
  selector: 'mbz-positive-pay-placeholder',
  template: `
    <cn-page-header title="Positive Pay" eyebrow="Fraud controls"></cn-page-header>
    <cn-card>
      <p>Positive Pay is handled by Treasury Operations for Meridian Business customers. Send check issue files to your
        relationship manager or call Business Support.</p>
      <p class="mbz-muted">Online check issue upload was scheduled for 2020 and descoped (MBZ-790). This page is kept so existing
        bookmarks continue to work.</p>
    </cn-card>
  `
})
export class PositivePayPlaceholderComponent {}
