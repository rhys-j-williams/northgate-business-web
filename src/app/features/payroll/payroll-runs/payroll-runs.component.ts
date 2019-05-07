import { AfterViewInit, Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';

import { PayrollRun } from '../../../core/models';
import { AuthService } from '../../../core/services';
import { PayrollService } from '../payroll.service';

/**
 * Payroll run history. Plain mat-table because this screen predates cn-data-table by a year
 * (MBZ-410, 2019) and nobody has moved it. See README, "Canopy and Material".
 */
@Component({
  selector: 'mbz-payroll-runs',
  templateUrl: './payroll-runs.component.html',
  styleUrls: ['./payroll-runs.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PayrollRunsComponent implements OnInit, AfterViewInit {
  readonly columns = ['payDate', 'runId', 'status', 'lines', 'totalMinor', 'createdBy'];
  readonly dataSource = new MatTableDataSource<PayrollRun>([]);
  loading = true;
  error: string | null = null;
  canInitiate = false;

  @ViewChild(MatSort) sort: MatSort;

  constructor(private payroll: PayrollService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.canInitiate = this.auth.hasPermission('payments:initiate');
    this.dataSource.sortingDataAccessor = (run, column) => {
      switch (column) {
        case 'lines': return run.lines.length;
        case 'payDate': return run.payDate;
        default: return (run as any)[column];
      }
    };
    this.payroll.getRuns()
      .then(runs => this.dataSource.data = runs)
      .catch(err => this.error = err && err.message ? err.message : 'Could not load payroll runs')
      .then(() => this.loading = false);
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  open(run: PayrollRun): void {
    this.router.navigate(['/payroll', run.runId]);
  }

  newRun(): void {
    this.router.navigate(['/payroll', 'new']);
  }
}
