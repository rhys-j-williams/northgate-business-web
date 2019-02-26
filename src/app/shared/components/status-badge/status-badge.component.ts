import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CnBadgeTone } from '@meridian/canopy-ui';

const TONES: { [status: string]: CnBadgeTone } = {
  open: 'success', active: 'success', settled: 'success', confirmed: 'success', approved: 'success', released: 'success', ready: 'success', validated: 'success',
  pending: 'info', 'pending-approval': 'info', scheduled: 'info', submitted: 'info', sent: 'info', uploaded: 'info', queued: 'info', invited: 'info', draft: 'neutral',
  dormant: 'caution', restricted: 'caution', locked: 'caution', returned: 'caution', expired: 'caution', withdrawn: 'neutral',
  closed: 'neutral', cancelled: 'neutral', disabled: 'neutral', disputed: 'warn', reversed: 'warn', rejected: 'warn', failed: 'warn', denied: 'warn', error: 'warn'
};

@Component({
  selector: 'mbz-status-badge',
  template: `<cn-badge [tone]="tone" [dot]="true" size="small">{{ status | mbzStatusLabel }}</cn-badge>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusBadgeComponent {
  @Input() status: string;

  get tone(): CnBadgeTone {
    return TONES[this.status] || 'neutral';
  }
}
