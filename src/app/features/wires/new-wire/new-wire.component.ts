import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Account, Entitlement } from '@meridian/domain-fixtures';
import { CnSelectOption, CnToastService } from '@meridian/canopy-ui';
import * as moment from 'moment';
import * as _ from 'lodash';

import { Wire, WireBeneficiary } from '../../../core/models';
import { AuthService } from '../../../core/services';
import { AccountsService } from '../../accounts/accounts.service';
import { LoadEntitlements } from '../../../store/entitlements/entitlements.actions';
import { selectApproverCount, selectEntitlementByHandle } from '../../../store/entitlements/entitlements.selectors';
import { WiresService } from '../wires.service';

@Component({
  selector: 'mbz-new-wire',
  templateUrl: './new-wire.component.html',
  styleUrls: ['./new-wire.component.scss']
})
export class NewWireComponent implements OnInit {
  form: FormGroup;
  beneficiaries: WireBeneficiary[] = [];
  beneficiary: WireBeneficiary | null = null;
  accounts: Account[] = [];
  accountOptions: CnSelectOption<string>[] = [];
  entitlement: Entitlement | null = null;
  approverCount = 0;
  minValueDate: moment.Moment;
  loading = true;
  submitting = false;
  step = 0;

  constructor(private wires: WiresService,
              private accountsService: AccountsService,
              private auth: AuthService,
              private store: Store,
              private fb: FormBuilder,
              private toast: CnToastService,
              private router: Router) {}

  ngOnInit(): void {
    this.minValueDate = this.wires.earliestValueDate();
    this.form = this.fb.group({
      fromAccountId: [null, Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      valueDate: [this.minValueDate, Validators.required],
      reference: ['', [Validators.required, Validators.maxLength(16), Validators.pattern(/^[A-Za-z0-9 \-\/]+$/)]],
      purpose: ['', [Validators.required, Validators.maxLength(35)]]
    });
    this.store.dispatch(new LoadEntitlements());
    this.store.select(selectEntitlementByHandle(this.auth.snapshot.handle)).subscribe(e => this.entitlement = e);
    this.store.select(selectApproverCount).subscribe(n => this.approverCount = n);

    Promise.all([this.wires.getBeneficiaries(), this.accountsService.getAccounts()])
      .then(([beneficiaries, accounts]) => {
        this.beneficiaries = beneficiaries;
        this.accounts = accounts.filter(a => a.status === 'open' && a.type !== 'credit-card' && a.type !== 'mortgage' && a.type !== 'auto-loan' && a.type !== 'certificate');
        this.accountOptions = this.accounts.map(a => ({ value: a.accountId, label: `${a.nickname} ****${a.accountNumber.slice(-4)}`, description: `Available ${(a.availableBalanceMinor / 100).toFixed(2)}` }));
      })
      .catch(err => this.toast.error(err && err.message ? err.message : 'Could not start a wire'))
      .then(() => this.loading = false);
  }

  get amountMinor(): number {
    return Math.round((this.form.value.amount || 0) * 100);
  }

  get fromAccount(): Account | undefined {
    return _.find(this.accounts, { accountId: this.form.value.fromAccountId });
  }

  get overTransactionLimit(): boolean {
    return !!this.entitlement && this.entitlement.limitPerTransactionMinor !== undefined && this.amountMinor > this.entitlement.limitPerTransactionMinor;
  }

  get insufficientFunds(): boolean {
    const account = this.fromAccount;
    return !!account && this.amountMinor > account.availableBalanceMinor;
  }

  /** Dual approval is policy for every wire. Approvers other than the initiator must exist. */
  get approversAvailable(): boolean {
    const selfIsApprover = !!this.entitlement && this.entitlement.permissions.indexOf('payments:approve') >= 0;
    return this.approverCount - (selfIsApprover ? 1 : 0) >= 2;
  }

  get canSubmit(): boolean {
    return !!this.beneficiary && this.form.valid && !this.overTransactionLimit && !this.insufficientFunds && !this.submitting;
  }

  chooseBeneficiary(beneficiary: WireBeneficiary): void {
    this.beneficiary = beneficiary;
    this.step = 1;
  }

  review(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.step = 2;
  }

  back(): void {
    this.step = Math.max(0, this.step - 1);
  }

  submit(): void {
    if (!this.canSubmit) {
      return;
    }
    this.submitting = true;
    const draft: Partial<Wire> = {
      fromAccountId: this.form.value.fromAccountId,
      beneficiary: this.beneficiary,
      amountMinor: this.amountMinor,
      valueDate: moment(this.form.value.valueDate).format('YYYY-MM-DD'),
      reference: String(this.form.value.reference).toUpperCase(),
      purpose: this.form.value.purpose
    };
    this.wires.initiate(draft)
      .then(wire => {
        this.toast.success(`${wire.wireId} submitted. Two approvals required.`);
        this.router.navigate(['/wires', wire.wireId]);
      })
      .catch(err => {
        this.toast.error(err && err.message ? err.message : 'Wire submission failed');
        this.submitting = false;
      });
  }
}
