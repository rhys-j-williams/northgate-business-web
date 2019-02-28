import { Component, Input } from '@angular/core';

@Component({
  selector: 'mbz-page-loading',
  template: `
    <div class="mbz-page-loading" aria-busy="true" [attr.aria-label]="label">
      <cn-progress [label]="label" tone="brand"></cn-progress>
    </div>
  `,
  styles: [`.mbz-page-loading { padding: 24px 0; }`]
})
export class PageLoadingComponent {
  @Input() label = 'Loading';
}
