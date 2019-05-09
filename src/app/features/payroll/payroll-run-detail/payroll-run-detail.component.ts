import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';

import { PayrollEmployee, PayrollRun } from '../../../core/models';
import { CsvExportService } from '../../../core/services';
import { PayrollService } from '../payroll.service';

interface DetailLine {
  employee: PayrollEmployee | undefined;
  amountMinor: number;
  memo: string;
}

@Component({
  selector: 'mbz-payroll-run-detail',
  templateUrl: './payroll-run-detail.component.html'
})
export class PayrollRunDetailComponent implements OnInit {
  run: PayrollRun | null = null;
  lines: DetailLine[] = [];
  loading = true;
  error: string | null = null;

  constructor(private route: ActivatedRoute, private payroll: PayrollService, private csv: CsvExportService) {}

  ngOnInit(): void {
    const runId = this.route.snapshot.paramMap.get('runId');
    Promise.all([this.payroll.getRun(runId), this.payroll.getEmployees()])
      .then(([run, employees]) => {
        this.run = run;
        const byId = _.keyBy(employees, 'employeeId');
        this.lines = run.lines.map(l => ({ employee: byId[l.employeeId], amountMinor: l.amountMinor, memo: l.memo }));
      })
      .catch(err => this.error = err && err.message ? err.message : 'Payroll run not found')
      .then(() => this.loading = false);
  }

  exportRegister(): void {
    if (!this.run) {
      return;
    }
    const rows = this.lines.map(l => ({
      employeeId: l.employee ? l.employee.employeeId : '',
      name: l.employee ? l.employee.name : '(removed)',
      accountLastFour: l.employee ? l.employee.payee.accountNumberLastFour : '',
      amount: (l.amountMinor / 100).toFixed(2),
      memo: l.memo
    }));
    this.csv.download(`payroll-register-${this.run.runId}.csv`, this.csv.build(rows));
  }
}
