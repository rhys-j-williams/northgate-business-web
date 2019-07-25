import { Component, Inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Payee } from '@meridian/domain-fixtures';
import { CnSelectOption } from '@meridian/canopy-ui';
import * as _ from 'lodash';

import { AchTemplate, SecCode } from '../../../core/models';
import { NACHA_ORIGINATION_SEC_CODES } from '../../../legacy/nacha-format.constants';
import { AchService } from '../ach.service';

export interface TemplateEditorData {
  template: AchTemplate | null;
  payees: Payee[];
  organisationId: string;
}

@Component({
  selector: 'mbz-ach-template-editor',
  templateUrl: './ach-template-editor.component.html',
  styleUrls: ['./ach-template-editor.component.scss']
})
export class AchTemplateEditorComponent {
  form: FormGroup;
  saving = false;
  error: string | null = null;

  readonly secOptions: CnSelectOption<SecCode>[] = NACHA_ORIGINATION_SEC_CODES.map(code => ({ value: code as SecCode, label: code }));
  readonly payeeOptions: CnSelectOption<string>[];
  readonly codeOptions: CnSelectOption<string>[] = [
    { value: '22', label: '22 · Checking credit' },
    { value: '27', label: '27 · Checking debit' },
    { value: '32', label: '32 · Savings credit' },
    { value: '37', label: '37 · Savings debit' }
  ];

  constructor(public ref: MatDialogRef<AchTemplateEditorComponent, AchTemplate | undefined>,
              @Inject(MAT_DIALOG_DATA) public data: TemplateEditorData,
              private fb: FormBuilder,
              private ach: AchService) {
    this.payeeOptions = _.sortBy(data.payees, 'name').map(p => ({ value: p.payeeId, label: p.name, description: `****${p.accountNumberLastFour}` }));
    const template = data.template;
    this.form = this.fb.group({
      name: [template ? template.name : '', [Validators.required, Validators.maxLength(40)]],
      secCode: [template ? template.secCode : 'PPD', Validators.required],
      companyEntryDescription: [template ? template.companyEntryDescription : '', [Validators.required, Validators.maxLength(10)]],
      entries: this.fb.array((template ? template.entries : []).map(e => this.entryGroup(e.payeeId, e.amountMinor, e.transactionCode)))
    });
    if (!template) {
      this.addEntry();
    }
  }

  get entries(): FormArray {
    return this.form.get('entries') as FormArray;
  }

  get totalMinor(): number {
    return _.sumBy(this.entries.controls, c => Math.round((c.value.amount || 0) * 100));
  }

  addEntry(): void {
    this.entries.push(this.entryGroup(null, 0, '22'));
  }

  removeEntry(index: number): void {
    this.entries.removeAt(index);
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const value = this.form.value;
    const template: AchTemplate = {
      templateId: this.data.template ? this.data.template.templateId : '',
      organisationId: this.data.organisationId,
      name: value.name,
      secCode: value.secCode,
      companyEntryDescription: String(value.companyEntryDescription).toUpperCase(),
      offsetAccountId: this.data.template ? this.data.template.offsetAccountId : '',
      entries: value.entries.map((e: { payeeId: string; amount: number; transactionCode: string }) => ({
        payeeId: e.payeeId,
        amountMinor: Math.round(e.amount * 100),
        transactionCode: e.transactionCode
      })),
      updatedAt: ''
    };
    this.ach.saveTemplate(template)
      .then(saved => this.ref.close(saved))
      .catch(err => {
        this.error = err && err.message ? err.message : 'Save failed';
        this.saving = false;
      });
  }

  private entryGroup(payeeId: string | null, amountMinor: number, transactionCode: string): FormGroup {
    return this.fb.group({
      payeeId: [payeeId, Validators.required],
      amount: [amountMinor / 100, [Validators.required, Validators.min(0.01)]],
      transactionCode: [transactionCode, Validators.required]
    });
  }
}
