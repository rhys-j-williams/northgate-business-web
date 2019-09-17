import { Pipe, PipeTransform } from '@angular/core';
import { CnListItem } from '@meridian/canopy-ui';
import * as moment from 'moment';

import { ApprovalDecision } from '../../core/models';

/** Shapes decisions for cn-list. Lives here because nothing else uses it. */
@Pipe({ name: 'mbzDecisionItems' })
export class DecisionItemsPipe implements PipeTransform {
  transform(decisions: ApprovalDecision[]): CnListItem[] {
    return decisions.map(d => ({
      id: `${d.approverHandle}-${d.decidedAt}`,
      primary: `${d.approverHandle} ${d.decision}`,
      secondary: d.comment || moment(d.decidedAt).format('D MMM YYYY HH:mm'),
      icon: d.decision === 'approved' ? 'cn:check' : 'cn:close',
      meta: moment(d.decidedAt).fromNow()
    }));
  }
}
