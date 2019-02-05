import { Pipe, PipeTransform } from '@angular/core';

/**
 * Minor units to a display amount. Everything from the BFF is in cents; the Canopy currency pipe
 * expects major units, so this sits in front of it. Negative amounts as (1,234.56) because that is
 * what the accounting people expect (MBZ-322).
 */
@Pipe({ name: 'mbzMoney' })
export class MoneyPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  transform(minor: number | null | undefined, accounting = false): string {
    if (minor === null || minor === undefined || isNaN(minor)) {
      return '';
    }
    const major = minor / 100;
    if (accounting && major < 0) {
      return `(${this.formatter.format(Math.abs(major))})`;
    }
    return this.formatter.format(major);
  }
}
