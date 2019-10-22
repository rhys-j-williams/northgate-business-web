import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Entitlement } from '@meridian/domain-fixtures';

/**
 * Limits are entered in dollars and stored in minor units. Empty means no limit, which is
 * different from zero (zero is a valid "cannot initiate anything" limit that Treasury Ops uses
 * as a soft lock). Keep that distinction, it has bitten twice (MBZ-1712, MBZ-2044).
 */
@Component({
  selector: 'mbz-limits-form',
  templateUrl: './limits-form.component.html',
  styleUrls: ['./limits-form.component.scss']
})
export class LimitsFormComponent implements OnChanges, OnDestroy {
  @Input() entitlement: Entitlement;
  @Input() readonly = false;
  @Output() limitsChange = new EventEmitter<{ perTransactionMinor?: number; perDayMinor?: number }>();

  form: FormGroup;
  private subscription: Subscription;
  private lastId: string | null = null;

  constructor(fb: FormBuilder) {
    this.form = fb.group({ perTransaction: [null], perDay: [null] });
    this.subscription = this.form.valueChanges.pipe(debounceTime(300), distinctUntilChanged((a, b) => a.perTransaction === b.perTransaction && a.perDay === b.perDay)).subscribe(value => {
      if (this.form.dirty) {
        this.limitsChange.emit({
          perTransactionMinor: this.toMinor(value.perTransaction),
          perDayMinor: this.toMinor(value.perDay)
        });
      }
    });
  }

  ngOnChanges(): void {
    if (!this.entitlement) {
      return;
    }
    if (this.entitlement.entitlementId !== this.lastId) {
      this.lastId = this.entitlement.entitlementId;
      this.form.reset({
        perTransaction: this.fromMinor(this.entitlement.limitPerTransactionMinor),
        perDay: this.fromMinor(this.entitlement.limitPerDayMinor)
      }, { emitEvent: false });
    }
    if (this.readonly) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get dailyBelowTransaction(): boolean {
    const v = this.form.value;
    return v.perDay !== null && v.perTransaction !== null && v.perDay !== undefined && v.perTransaction !== undefined && v.perDay < v.perTransaction;
  }

  private toMinor(value: number | null | undefined): number | undefined {
    return value === null || value === undefined || (value as unknown) === '' ? undefined : Math.round(value * 100);
  }

  private fromMinor(value: number | undefined): number | null {
    return value === undefined ? null : value / 100;
  }
}
