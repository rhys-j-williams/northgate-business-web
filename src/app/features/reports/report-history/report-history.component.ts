import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CnListItem } from '@meridian/canopy-ui';
import * as moment from 'moment';

import { ReportRun } from '../../../core/models';

@Component({
  selector: 'mbz-report-history',
  templateUrl: './report-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportHistoryComponent {
  @Input() set runs(runs: ReportRun[] | null) {
    this.items = (runs || []).slice(0, 8).map(run => ({
      id: run.runId,
      primary: run.fileName,
      secondary: `${run.requestedBy} · ${run.rowCount} rows`,
      meta: moment(run.requestedAt).fromNow(),
      icon: run.status === 'ready' ? 'cn:document' : run.status === 'failed' ? 'cn:warning' : 'cn:clock',
      disabled: run.status === 'expired'
    }));
  }

  items: CnListItem[] = [];
}
