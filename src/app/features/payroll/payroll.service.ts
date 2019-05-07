import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as moment from 'moment';
import * as _ from 'lodash';

import { environment } from '../../../environments/environment';
import { PayrollEmployee, PayrollLine, PayrollRun } from '../../core/models';
import { BusinessDateService, FixtureDataService } from '../../core/services';

/**
 * Payroll. Runs are built on the client and submitted whole; the BFF (or the fixture service) does
 * the NACHA generation. Scheduling rules (MBZ-1330): pay date must be a business day at least two
 * business days out, and after the 4pm ACH cutoff that becomes three.
 */
@Injectable({ providedIn: 'root' })
export class PayrollService {
  private employees: PayrollEmployee[] | null = null;

  constructor(private http: HttpClient,
              private fixtures: FixtureDataService,
              private businessDates: BusinessDateService) {}

  getEmployees(): Promise<PayrollEmployee[]> {
    if (this.employees) {
      return Promise.resolve(this.employees);
    }
    const source$ = environment.useFixtures
      ? this.fixtures.getEmployees()
      : this.http.get<PayrollEmployee[]>(`${environment.apiBase}/payroll/employees`);
    return source$.toPromise().then(employees => {
      this.employees = _.sortBy(employees, 'name');
      return this.employees;
    });
  }

  getRuns(): Promise<PayrollRun[]> {
    const source$ = environment.useFixtures
      ? this.fixtures.getPayrollRuns()
      : this.http.get<PayrollRun[]>(`${environment.apiBase}/payroll/runs`);
    return source$.toPromise();
  }

  getRun(runId: string): Promise<PayrollRun> {
    const source$ = environment.useFixtures
      ? this.fixtures.getPayrollRun(runId)
      : this.http.get<PayrollRun>(`${environment.apiBase}/payroll/runs/${runId}`);
    return source$.toPromise();
  }

  submit(run: PayrollRun): Promise<PayrollRun> {
    const source$ = environment.useFixtures
      ? this.fixtures.submitPayrollRun(run)
      : this.http.post<PayrollRun>(`${environment.apiBase}/payroll/runs`, run);
    return source$.toPromise();
  }

  earliestPayDate(): moment.Moment {
    return this.businessDates.earliestEffectiveDate(moment(), false);
  }

  defaultLines(employees: PayrollEmployee[]): PayrollLine[] {
    return employees.filter(e => e.active).map(e => ({
      employeeId: e.employeeId,
      amountMinor: e.defaultAmountMinor,
      memo: e.payType === 'salary' ? 'SALARY' : 'HOURLY'
    }));
  }

  total(lines: PayrollLine[]): number {
    return _.sumBy(lines, l => l.amountMinor || 0);
  }

  invalidate(): void {
    this.employees = null;
  }
}
