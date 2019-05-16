import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import * as _ from 'lodash';

import { PayrollEmployee, PayrollLine } from '../../../core/models';

interface EditorRow {
  line: PayrollLine;
  employee: PayrollEmployee;
  overridden: boolean;
}

@Component({
  selector: 'mbz-payroll-line-editor',
  templateUrl: './payroll-line-editor.component.html',
  styleUrls: ['./payroll-line-editor.component.scss']
})
export class PayrollLineEditorComponent implements OnChanges {
  @Input() lines: PayrollLine[] = [];
  @Input() employees: PayrollEmployee[] = [];
  @Input() perTransactionLimitMinor: number | null = null;
  @Output() linesChange = new EventEmitter<PayrollLine[]>();

  rows: EditorRow[] = [];
  totalMinor = 0;

  ngOnChanges(): void {
    const byId = _.keyBy(this.employees, 'employeeId');
    this.rows = this.lines
      .filter(l => !!byId[l.employeeId])
      .map(l => ({ line: l, employee: byId[l.employeeId], overridden: l.amountMinor !== byId[l.employeeId].defaultAmountMinor }));
    this.totalMinor = _.sumBy(this.lines, 'amountMinor');
  }

  overLimit(row: EditorRow): boolean {
    return this.perTransactionLimitMinor !== null && row.line.amountMinor > this.perTransactionLimitMinor;
  }

  setAmount(row: EditorRow, amountMinor: number | null): void {
    this.emit(this.lines.map(l => l.employeeId === row.line.employeeId ? { ...l, amountMinor: amountMinor || 0 } : l));
  }

  setMemo(row: EditorRow, memo: string): void {
    this.emit(this.lines.map(l => l.employeeId === row.line.employeeId ? { ...l, memo: (memo || '').toUpperCase().substring(0, 10) } : l));
  }

  reset(row: EditorRow): void {
    this.setAmount(row, row.employee.defaultAmountMinor);
  }

  remove(row: EditorRow): void {
    this.emit(this.lines.filter(l => l.employeeId !== row.line.employeeId));
  }

  private emit(lines: PayrollLine[]): void {
    this.linesChange.emit(lines);
  }
}
