import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Account } from '@meridian/domain-fixtures';
import { CnDateRange, CnSelectOption } from '@meridian/canopy-ui';
import * as moment from 'moment';

import { BusinessUser, ReportDefinition } from '../../../core/models';
import { AccountsService } from '../../accounts/accounts.service';
import { UsersService } from '../../users/users.service';

@Component({
  selector: 'mbz-report-parameters',
  templateUrl: './report-parameters.component.html',
  styleUrls: ['./report-parameters.component.scss']
})
export class ReportParametersComponent implements OnInit, OnChanges {
  @Input() definition: ReportDefinition;
  @Input() disabled = false;
  @Output() run = new EventEmitter<Record<string, string>>();

  form: FormGroup;
  accountOptions: CnSelectOption<string>[] = [{ value: '', label: 'All accounts' }];
  userOptions: CnSelectOption<string>[] = [{ value: '', label: 'All users' }];
  readonly statusOptions: CnSelectOption<string>[] = [
    { value: '', label: 'Any status' },
    { value: 'posted', label: 'Posted' },
    { value: 'pending', label: 'Pending' },
    { value: 'settled', label: 'Settled' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'returned', label: 'Returned' }
  ];
  readonly presets: Array<{ label: string; range: () => CnDateRange }> = [
    { label: 'This month', range: () => ({ start: moment().startOf('month').format('YYYY-MM-DD'), end: moment().format('YYYY-MM-DD') }) },
    { label: 'Last month', range: () => ({ start: moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'), end: moment().subtract(1, 'month').endOf('month').format('YYYY-MM-DD') }) },
    { label: 'Quarter to date', range: () => ({ start: moment().startOf('quarter').format('YYYY-MM-DD'), end: moment().format('YYYY-MM-DD') }) },
    { label: 'Year to date', range: () => ({ start: moment().startOf('year').format('YYYY-MM-DD'), end: moment().format('YYYY-MM-DD') }) }
  ];

  constructor(fb: FormBuilder, private accounts: AccountsService, private users: UsersService) {
    this.form = fb.group({
      range: [this.presets[0].range()],
      accountId: [''],
      status: [''],
      user: ['']
    });
  }

  ngOnInit(): void {
    this.accounts.getAccounts().then((accounts: Account[]) => {
      this.accountOptions = [{ value: '', label: 'All accounts' }, ...accounts.map(a => ({ value: a.accountId, label: `${a.nickname} ****${a.accountNumber.slice(-4)}` }))];
    });
    this.users.getUsers().then((users: BusinessUser[]) => {
      this.userOptions = [{ value: '', label: 'All users' }, ...users.map(u => ({ value: u.handle, label: u.displayName }))];
    });
  }

  ngOnChanges(): void {
    this.form.patchValue({ accountId: '', status: '', user: '' });
    if (this.disabled) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

  wants(parameter: ReportDefinition['parameters'][number]): boolean {
    return !!this.definition && this.definition.parameters.indexOf(parameter) >= 0;
  }

  applyPreset(preset: { range: () => CnDateRange }): void {
    this.form.patchValue({ range: preset.range() });
  }

  submit(): void {
    const value = this.form.value;
    const parameters: Record<string, string> = {};
    if (this.wants('dateRange') && value.range) {
      parameters['from'] = value.range.start || '';
      parameters['to'] = value.range.end || '';
    }
    if (this.wants('account') && value.accountId) {
      parameters['accountId'] = value.accountId;
    }
    if (this.wants('status') && value.status) {
      parameters['status'] = value.status;
    }
    if (this.wants('user') && value.user) {
      parameters['user'] = value.user;
    }
    this.run.emit(parameters);
  }
}
