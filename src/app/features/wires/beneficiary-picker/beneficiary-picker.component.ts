import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import * as _ from 'lodash';

import { WireBeneficiary } from '../../../core/models';

@Component({
  selector: 'mbz-beneficiary-picker',
  templateUrl: './beneficiary-picker.component.html',
  styleUrls: ['./beneficiary-picker.component.scss']
})
export class BeneficiaryPickerComponent implements OnChanges {
  @Input() beneficiaries: WireBeneficiary[] = [];
  @Input() selected: WireBeneficiary | null = null;
  @Output() selectedChange = new EventEmitter<WireBeneficiary>();

  filter = '';
  visible: WireBeneficiary[] = [];

  ngOnChanges(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    const needle = this.filter.trim().toLowerCase();
    this.visible = _.sortBy(this.beneficiaries.filter(b =>
      !needle || b.name.toLowerCase().indexOf(needle) >= 0 || b.bankName.toLowerCase().indexOf(needle) >= 0), 'name');
  }

  pick(beneficiary: WireBeneficiary): void {
    this.selectedChange.emit(beneficiary);
  }

  isSelected(beneficiary: WireBeneficiary): boolean {
    return !!this.selected && this.selected.beneficiaryId === beneficiary.beneficiaryId;
  }
}
