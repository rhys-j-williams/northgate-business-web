import { Component, Input } from '@angular/core';

@Component({
  selector: 'mbz-empty-state',
  template: `
    <div class="mbz-empty-state" role="status">
      <mat-icon *ngIf="icon" [svgIcon]="icon" aria-hidden="true"></mat-icon>
      <h3 class="mbz-empty-state__title">{{ title }}</h3>
      <p class="mbz-empty-state__body" *ngIf="body">{{ body }}</p>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .mbz-empty-state { text-align: center; padding: 40px 16px; color: var(--cn-color-text-muted); }
    .mbz-empty-state mat-icon { width: 40px; height: 40px; opacity: .6; }
    .mbz-empty-state__title { margin: 12px 0 4px; font-size: 16px; font-weight: 600; color: var(--cn-color-text); }
    .mbz-empty-state__body { margin: 0 0 16px; }
  `]
})
export class EmptyStateComponent {
  @Input() icon = 'cn:document';
  @Input() title = 'Nothing here';
  @Input() body: string | null = null;
}
