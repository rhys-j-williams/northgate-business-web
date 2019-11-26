import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { BusinessAlert } from '../../../core/models';

@Component({
  selector: 'mbz-alert-card',
  templateUrl: './alert-card.component.html',
  styleUrls: ['./alert-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlertCardComponent {
  @Input() alert: BusinessAlert;
  @Input() saving = false;
  @Output() enabledChange = new EventEmitter<boolean>();
  @Output() thresholdEdit = new EventEmitter<void>();

  get hasThreshold(): boolean {
    return this.alert.thresholdMinor !== undefined;
  }
}
