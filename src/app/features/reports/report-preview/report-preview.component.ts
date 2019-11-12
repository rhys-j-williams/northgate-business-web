import { ChangeDetectionStrategy, Component, Input, OnChanges, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import * as _ from 'lodash';
import * as moment from 'moment';

type Row = Record<string, unknown>;

/**
 * Dumb grid over whatever the report returned. Column names are humanised from the keys; anything
 * that looks like an ISO date gets formatted, anything ending in Minor is money.
 */
@Component({
  selector: 'mbz-report-preview',
  templateUrl: './report-preview.component.html',
  styleUrls: ['./report-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ReportPreviewComponent implements OnChanges {
  @Input() rows: Row[] = [];
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  readonly dataSource = new MatTableDataSource<Row>([]);
  columns: string[] = [];

  ngOnChanges(): void {
    this.columns = this.rows.length ? Object.keys(this.rows[0]) : [];
    this.dataSource.data = this.rows;
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  header(column: string): string {
    return _.startCase(column.replace(/Minor$/, ''));
  }

  isMoney(column: string): boolean {
    return /Minor$/.test(column);
  }

  isNumeric(column: string): boolean {
    return this.isMoney(column) || (this.rows.length > 0 && typeof this.rows[0][column] === 'number');
  }

  format(value: unknown, column: string): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (this.isMoney(column) && typeof value === 'number') {
      return (value / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.length > 10 ? moment(value).format('D MMM YYYY HH:mm') : moment(value).format('D MMM YYYY');
    }
    return String(value);
  }
}
