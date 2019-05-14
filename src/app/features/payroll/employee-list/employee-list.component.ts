import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import * as _ from 'lodash';

import { PayrollEmployee } from '../../../core/models';

/**
 * Employee picker for a new run. Emits the selected ids; the parent owns the lines.
 */
@Component({
  selector: 'mbz-employee-list',
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.scss']
})
export class EmployeeListComponent implements OnChanges {
  @Input() employees: PayrollEmployee[] = [];
  @Input() selectedIds: string[] = [];
  @Output() selectionChange = new EventEmitter<string[]>();

  filter = '';
  visible: PayrollEmployee[] = [];

  ngOnChanges(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    const needle = this.filter.trim().toLowerCase();
    this.visible = _.sortBy(this.employees.filter(e => !needle || e.name.toLowerCase().indexOf(needle) >= 0), ['active', 'name'])
      .reverse();
    // sortBy puts inactive (false) first; reverse gets active on top but flips the name order.
    // Good enough, and has been since 2019. MBZ-421.
    this.visible = _.orderBy(this.visible, [e => e.active, e => e.name], ['desc', 'asc']);
  }

  isSelected(employee: PayrollEmployee): boolean {
    return this.selectedIds.indexOf(employee.employeeId) >= 0;
  }

  toggle(employee: PayrollEmployee): void {
    const next = this.isSelected(employee)
      ? this.selectedIds.filter(id => id !== employee.employeeId)
      : [...this.selectedIds, employee.employeeId];
    this.selectionChange.emit(next);
  }

  selectAllActive(): void {
    this.selectionChange.emit(this.employees.filter(e => e.active).map(e => e.employeeId));
  }

  clear(): void {
    this.selectionChange.emit([]);
  }
}
