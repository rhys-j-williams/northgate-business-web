import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

/**
 * 'short' MM/DD/YYYY, 'long' Friday, March 1, 2024, 'time' MM/DD/YYYY HH:mm, 'ago' relative.
 * Yes Angular has a date pipe. It did not do relative time in 2019 and by then everything was
 * on moment anyway.
 */
@Pipe({ name: 'mbzDate' })
export class BusinessDatePipe implements PipeTransform {
  transform(value: moment.MomentInput, format: 'short' | 'long' | 'time' | 'ago' | string = 'short'): string {
    if (!value) {
      return '';
    }
    const m = moment(value);
    if (!m.isValid()) {
      return '';
    }
    switch (format) {
      case 'short': return m.format('MM/DD/YYYY');
      case 'long': return m.format('dddd, MMMM D, YYYY');
      case 'time': return m.format('MM/DD/YYYY HH:mm');
      case 'ago': return m.fromNow();
      default: return m.format(format);
    }
  }
}
