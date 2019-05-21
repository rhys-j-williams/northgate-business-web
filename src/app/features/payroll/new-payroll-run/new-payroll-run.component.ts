import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Account, Entitlement } from '@meridian/domain-fixtures';
import { CnSelectOption, CnToastService } from '@meridian/canopy-ui';
import * as moment from 'moment';
import * as _ from 'lodash';

import { PayrollEmployee, PayrollLine, PayrollRun } from '../../../core/models';
import { AuthService, BusinessDateService } from '../../../core/services';
import { AccountsService } from '../../accounts/accounts.service';
import { selectEntitlementByHandle } from '../../../store/entitlements/entitlements.selectors';
import { LoadEntitlements } from '../../../store/entitlements/entitlements.actions';
import { PayrollService } from '../payroll.service';

/**
 * Three step wizard: who, how much, when. Uses mat-stepper directly; cn-stepper-shell arrived in
 * Canopy 3.2 after this screen was written and the two do not share a template model (MBZ-1330).
 */
@Component({
  selector: 'mbz-new-payroll-run',
  templateUrl: './new-payroll-run.component.html',
  styleUrls: ['./new-payroll-run.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class NewPayrollRunComponent implements OnInit {
  @ViewChild(MatStepper) stepper: MatStepper;

  employees: PayrollEmployee[] = [];
  accounts: Account[] = [];
  entitlement: Entitlement | null = null;
  selectedIds: string[] = [];
  lines: PayrollLine[] = [];
  scheduleForm: FormGroup;
  loading = true;
  submitting = false;
  error: string | null = null;
  minPayDate: moment.Moment;
  submitted: PayrollRun | null = null;
  accountOptions: CnSelectOption<string>[] = [];

  constructor(private payroll: PayrollService,
              private accountsService: AccountsService,
              private auth: AuthService,
              private businessDates: BusinessDateService,
              private store: Store,
              private fb: FormBuilder,
              private toast: CnToastService,
              private router: Router) {}

  ngOnInit(): void {
    this.minPayDate = this.payroll.earliestPayDate();
    this.scheduleForm = this.fb.group({
      fundingAccountId: [null, Validators.required],
      payDate: [this.minPayDate, [Validators.required, this.businessDayValidator.bind(this)]]
    });
    this.store.dispatch(new LoadEntitlements());
    this.store.select(selectEntitlementByHandle(this.auth.snapshot.handle)).subscribe(e => this.entitlement = e);

    Promise.all([this.payroll.getEmployees(), this.accountsService.getAccounts()])
      .then(([employees, accounts]) => {
        this.employees = employees;
        this.accounts = accounts.filter(a => a.status === 'open' && (a.type === 'business-checking' || a.type === 'treasury-operating'));
        this.accountOptions = this.accounts.map(a => ({ value: a.accountId, label: `${a.nickname} ****${a.accountNumber.slice(-4)}`, description: `Available ${(a.availableBalanceMinor / 100).toFixed(2)}` }));
        if (this.accounts.length === 1) {
          this.scheduleForm.patchValue({ fundingAccountId: this.accounts[0].accountId });
        }
        this.selectedIds = employees.filter(e => e.active).map(e => e.employeeId);
        this.syncLines();
      })
      .catch(err => this.error = err && err.message ? err.message : 'Could not start a payroll run')
      .then(() => this.loading = false);
  }

  get totalMinor(): number {
    return this.payroll.total(this.lines);
  }

  get perTransactionLimit(): number | null {
    return this.entitlement && this.entitlement.limitPerTransactionMinor !== undefined ? this.entitlement.limitPerTransactionMinor : null;
  }

  get overDailyLimit(): boolean {
    return !!this.entitlement && this.entitlement.limitPerDayMinor !== undefined && this.totalMinor > this.entitlement.limitPerDayMinor;
  }

  get fundingAccount(): Account | undefined {
    return _.find(this.accounts, { accountId: this.scheduleForm.value.fundingAccountId });
  }

  get insufficientFunds(): boolean {
    const account = this.fundingAccount;
    return !!account && account.availableBalanceMinor < this.totalMinor;
  }

  onSelection(ids: string[]): void {
    this.selectedIds = ids;
    this.syncLines();
  }

  onLines(lines: PayrollLine[]): void {
    this.lines = lines;
    this.selectedIds = lines.map(l => l.employeeId);
  }

  submit(): void {
    if (this.scheduleForm.invalid || this.lines.length === 0 || this.submitting) {
      return;
    }
    this.submitting = true;
    const run: PayrollRun = {
      runId: '',
      organisationId: this.auth.snapshot.organisationId,
      fundingAccountId: this.scheduleForm.value.fundingAccountId,
      payDate: moment(this.scheduleForm.value.payDate).format('YYYY-MM-DD'),
      createdAt: '',
      createdBy: this.auth.snapshot.handle,
      status: 'draft',
      lines: this.lines,
      totalMinor: this.totalMinor
    };
    this.payroll.submit(run)
      .then(saved => {
        this.submitted = saved;
        this.toast.success(`Payroll ${saved.runId} scheduled for ${moment(saved.payDate).format('D MMM')}`);
        this.stepper.next();
      })
      .catch(err => this.toast.error(err && err.message ? err.message : 'Payroll submission failed'))
      .then(() => this.submitting = false);
  }

  done(): void {
    this.router.navigate(['/payroll', this.submitted ? this.submitted.runId : '']);
  }

  private syncLines(): void {
    const existing = _.keyBy(this.lines, 'employeeId');
    const defaults = _.keyBy(this.payroll.defaultLines(this.employees), 'employeeId');
    this.lines = this.selectedIds.map(id => existing[id] || defaults[id]).filter(l => !!l);
  }

  private businessDayValidator(control: { value: moment.MomentInput }): { [key: string]: boolean } | null {
    if (!control.value) {
      return null;
    }
    const day = moment(control.value);
    if (!this.businessDates.isBusinessDay(day)) {
      return { notBusinessDay: true };
    }
    if (day.isBefore(this.minPayDate, 'day')) {
      return { tooSoon: true };
    }
    return null;
  }
}
