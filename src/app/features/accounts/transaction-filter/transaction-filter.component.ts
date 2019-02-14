import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CnDateRange, CnFilterChip } from '@meridian/canopy-ui';
import * as moment from 'moment';
import * as _ from 'lodash';

import { TransactionQuery } from '../../../core/models';

@Component({
  selector: 'mbz-transaction-filter',
  templateUrl: './transaction-filter.component.html'
})
export class TransactionFilterComponent implements OnInit {
  @Input() query: TransactionQuery;
  @Output() queryChange = new EventEmitter<Partial<TransactionQuery>>();

  form: FormGroup;
  readonly directionChips: CnFilterChip<'all' | 'debit' | 'credit'>[] = [
    { value: 'all', label: 'All' },
    { value: 'debit', label: 'Debits' },
    { value: 'credit', label: 'Credits' }
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      search: [this.query.text || ''],
      direction: [this.query.direction || 'all'],
      range: [{ start: this.query.from || null, end: this.query.to || null } as CnDateRange],
      minAmount: [this.query.minAmountMinor ? this.query.minAmountMinor / 100 : null]
    });

    this.form.get('search').valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.emit());
    this.form.get('direction').valueChanges.subscribe(() => this.emit());
    this.form.get('range').valueChanges.subscribe(() => this.emit());
    this.form.get('minAmount').valueChanges.pipe(debounceTime(400)).subscribe(() => this.emit());
  }

  reset(): void {
    this.form.reset({ search: '', direction: 'all', range: { start: null, end: null }, minAmount: null });
  }

  private emit(): void {
    const value = this.form.value;
    const range: CnDateRange = value.range || { start: null, end: null };
    const direction = _.isArray(value.direction) ? value.direction[0] : value.direction;
    this.queryChange.emit({
      text: value.search || undefined,
      direction: direction === 'all' ? undefined : direction,
      from: range.start ? moment(range.start).format('YYYY-MM-DD') : undefined,
      to: range.end ? moment(range.end).format('YYYY-MM-DD') : undefined,
      minAmountMinor: value.minAmount ? Math.round(value.minAmount * 100) : undefined
    });
  }
}
