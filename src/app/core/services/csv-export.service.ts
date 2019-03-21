/**
 * CSV export. RFC 4180 quoting, CRLF row separators because that is what the customers' accounting
 * packages expect (MBZ-1367, three separate tickets before we believed them). Amounts in minor
 * units are converted to dollars on the way out; the column name decides, anything ending in
 * `Minor` is money.
 */
import { Injectable } from '@angular/core';
import * as moment from 'moment';
import * as _ from 'lodash';

export interface CsvColumn {
  key: string;
  header: string;
  format?: 'money' | 'date' | 'datetime' | 'text';
}

@Injectable({ providedIn: 'root' })
export class CsvExportService {

  build(rows: Array<Record<string, unknown>>, columns?: CsvColumn[]): string {
    const cols = columns && columns.length ? columns : this.inferColumns(rows);
    const lines: string[] = [];
    lines.push(cols.map(c => this.escape(c.header)).join(','));
    for (const row of rows) {
      lines.push(cols.map(c => this.escape(this.formatCell(row[c.key], c))).join(','));
    }
    // UTF-8 BOM so spreadsheets pick the encoding up. MBZ-1367 again.
    return '\ufeff' + lines.join('\r\n') + '\r\n';
  }

  download(fileName: string, csv: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    // Give the browser a tick before revoking or Safari downloads an empty file.
    setTimeout(() => {
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    }, 250);
  }

  inferColumns(rows: Array<Record<string, unknown>>): CsvColumn[] {
    const keys = _.uniq(_.flatMap(rows, r => _.keys(r)));
    return keys.map(key => ({
      key,
      header: _.startCase(key.replace(/Minor$/, '')),
      format: /Minor$/.test(key) ? 'money' : /At$/.test(key) ? 'datetime' : /[dD]ate$/.test(key) ? 'date' : 'text'
    }));
  }

  formatCell(value: unknown, column: CsvColumn): string {
    if (value === null || value === undefined) {
      return '';
    }
    switch (column.format) {
      case 'money':
        return (Number(value) / 100).toFixed(2);
      case 'date':
        return moment(value as string).format('MM/DD/YYYY');
      case 'datetime':
        return moment(value as string).format('MM/DD/YYYY HH:mm:ss');
      default:
        return String(value);
    }
  }

  escape(value: string): string {
    if (/[",\r\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
