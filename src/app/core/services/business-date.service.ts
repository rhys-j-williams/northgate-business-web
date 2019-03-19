/**
 * Business day arithmetic. Fed holidays, ACH and wire cutoffs. moment everywhere; the calendar
 * below is maintained by hand each November when the Fed publishes next year's list (MBZ-2301
 * has the reminder). Do not replace with a library without talking to Treasury Ops, the
 * "observed" rules for Saturday holidays differ between ACH and Fedwire and we have been bitten.
 */
import { Injectable } from '@angular/core';
import * as moment from 'moment';
import * as _ from 'lodash';

export type CutoffKind = 'ach-same-day' | 'ach-next-day' | 'wire-domestic';

const FED_HOLIDAYS: string[] = [
  // 2024
  '2024-01-01', '2024-01-15', '2024-02-19', '2024-05-27', '2024-06-19', '2024-07-04', '2024-09-02',
  '2024-10-14', '2024-11-11', '2024-11-28', '2024-12-25',
  // 2025
  '2025-01-01', '2025-01-20', '2025-02-17', '2025-05-26', '2025-06-19', '2025-07-04', '2025-09-01',
  '2025-10-13', '2025-11-11', '2025-11-27', '2025-12-25',
  // 2026
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07',
  '2026-10-12', '2026-11-11', '2026-11-26', '2026-12-25'
];

// Eastern time, expressed as hours from midnight. The app does not know about time zones properly;
// it assumes the browser is in the bank's footprint. MBZ-1120 open since 2020.
const CUTOFFS: Record<CutoffKind, { hour: number; minute: number }> = {
  'ach-same-day': { hour: 14, minute: 45 },
  'ach-next-day': { hour: 18, minute: 0 },
  'wire-domestic': { hour: 16, minute: 30 }
};

@Injectable({ providedIn: 'root' })
export class BusinessDateService {

  isBusinessDay(date: moment.MomentInput): boolean {
    const m = moment(date);
    if (m.isoWeekday() >= 6) {
      return false;
    }
    return !_.includes(FED_HOLIDAYS, m.format('YYYY-MM-DD'));
  }

  nextBusinessDay(date: moment.MomentInput, offset = 1): moment.Moment {
    const m = moment(date).startOf('day');
    let remaining = offset;
    while (remaining > 0) {
      m.add(1, 'day');
      if (this.isBusinessDay(m)) {
        remaining--;
      }
    }
    return m;
  }

  /** Earliest effective entry date for an ACH batch submitted now. */
  earliestEffectiveDate(now: moment.MomentInput = moment(), sameDay = false): moment.Moment {
    const m = moment(now);
    if (sameDay && this.isBusinessDay(m) && this.isBeforeCutoff('ach-same-day', m)) {
      return m.clone().startOf('day');
    }
    if (this.isBusinessDay(m) && this.isBeforeCutoff('ach-next-day', m)) {
      return this.nextBusinessDay(m, 1);
    }
    return this.nextBusinessDay(m, 2);
  }

  isBeforeCutoff(kind: CutoffKind, now: moment.MomentInput = moment()): boolean {
    const m = moment(now);
    const cutoff = m.clone().hour(CUTOFFS[kind].hour).minute(CUTOFFS[kind].minute).second(0);
    return m.isBefore(cutoff);
  }

  minutesToCutoff(kind: CutoffKind, now: moment.MomentInput = moment()): number {
    const m = moment(now);
    const cutoff = m.clone().hour(CUTOFFS[kind].hour).minute(CUTOFFS[kind].minute).second(0);
    return Math.max(0, cutoff.diff(m, 'minutes'));
  }

  /** NACHA effective entry date is YYMMDD in the batch header. */
  toNachaDate(date: moment.MomentInput): string {
    return moment(date).format('YYMMDD');
  }

  fromNachaDate(yymmdd: string): moment.Moment {
    return moment(yymmdd, 'YYMMDD', true);
  }

  /** Julian day for the file header creation, as the old mainframe export needs it. */
  toJulian(date: moment.MomentInput): string {
    const m = moment(date);
    return `${m.format('YY')}${_.padStart(String(m.dayOfYear()), 3, '0')}`;
  }

  formatShort(date: moment.MomentInput): string {
    return moment(date).format('MM/DD/YYYY');
  }

  formatLong(date: moment.MomentInput): string {
    return moment(date).format('dddd, MMMM D, YYYY');
  }

  fromNow(date: moment.MomentInput): string {
    return moment(date).fromNow();
  }
}
