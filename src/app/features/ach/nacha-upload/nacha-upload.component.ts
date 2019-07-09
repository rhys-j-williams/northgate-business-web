import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Account, Entitlement } from '@meridian/domain-fixtures';
import { CnSelectOption, CnToastService } from '@meridian/canopy-ui';
import * as moment from 'moment';

import { AuthService } from '../../../core/services';
import { AccountsService } from '../../accounts/accounts.service';
import { NachaParseResult } from '../../../legacy/nacha-parser.service';
import { NACHA_FIXTURE_ORIGIN } from '../../../legacy/testing/nacha-fixtures';
import { LoadEntitlements } from '../../../store/entitlements/entitlements.actions';
import { selectEntitlementByHandle } from '../../../store/entitlements/entitlements.selectors';
import { AchService } from '../ach.service';

/**
 * Drop zone, parse, report, submit. The drag handlers are hand rolled; there was a cdk drop
 * directive proposal (MBZ-1108) that never landed.
 */
@Component({
  selector: 'mbz-nacha-upload',
  templateUrl: './nacha-upload.component.html',
  styleUrls: ['./nacha-upload.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class NachaUploadComponent implements OnInit {
  @ViewChild('fileInput') fileInput: ElementRef<HTMLInputElement>;

  fileName: string | null = null;
  content: string | null = null;
  result: NachaParseResult | null = null;
  dragging = false;
  parsing = false;
  submitting = false;
  offsetAccountId: string | null = null;
  accountOptions: CnSelectOption<string>[] = [];
  entitlement: Entitlement | null = null;

  constructor(private ach: AchService,
              private accounts: AccountsService,
              private auth: AuthService,
              private store: Store,
              private toast: CnToastService,
              private router: Router) {}

  ngOnInit(): void {
    this.store.dispatch(new LoadEntitlements());
    this.store.select(selectEntitlementByHandle(this.auth.snapshot.handle)).subscribe(e => this.entitlement = e);
    this.accounts.getAccounts().then(accounts => {
      const eligible = accounts.filter((a: Account) => a.status === 'open' && a.type !== 'credit-card' && a.type !== 'mortgage' && a.type !== 'auto-loan');
      this.accountOptions = eligible.map(a => ({ value: a.accountId, label: `${a.nickname} ****${a.accountNumber.slice(-4)}` }));
      if (eligible.length) {
        this.offsetAccountId = eligible[0].accountId;
      }
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging = true;
  }

  onDragLeave(): void {
    this.dragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    if (event.dataTransfer && event.dataTransfer.files.length) {
      this.take(event.dataTransfer.files[0]);
    }
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.take(input.files[0]);
    }
  }

  browse(): void {
    this.fileInput.nativeElement.click();
  }

  reset(): void {
    this.fileName = null;
    this.content = null;
    this.result = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  revalidate(): void {
    if (this.content) {
      this.parse();
    }
  }

  submit(): void {
    if (!this.result || !this.content || !this.fileName || !this.offsetAccountId || this.submitting) {
      return;
    }
    this.submitting = true;
    this.ach.submit(this.fileName, this.content, this.result, this.offsetAccountId)
      .then(batch => {
        if (batch.status === 'rejected') {
          this.toast.caution(`${batch.batchId} recorded as rejected`);
        } else {
          this.toast.success(`${batch.batchId} submitted for approval`);
        }
        this.router.navigate(['/ach', 'batches', batch.batchId]);
      })
      .catch(err => this.toast.error(err && err.message ? err.message : 'Upload failed'))
      .then(() => this.submitting = false);
  }

  private take(file: File): void {
    if (file.size > 2 * 1024 * 1024) {
      this.toast.error('Files over 2 MB are not accepted through the browser. Use the SFTP channel.');
      return;
    }
    this.parsing = true;
    this.fileName = file.name;
    this.ach.readFile(file)
      .then(content => {
        this.content = content;
        this.parse();
      })
      .catch(err => this.toast.error(err.message))
      .then(() => this.parsing = false);
  }

  private parse(): void {
    this.result = this.ach.validate(this.content, {
      // The organisation's immediate origin. Fixture mode uses the same one the parser tests do.
      expectedOrigin: NACHA_FIXTURE_ORIGIN,
      perTransactionLimitMinor: this.entitlement ? this.entitlement.limitPerTransactionMinor : undefined,
      perDayLimitMinor: this.entitlement ? this.entitlement.limitPerDayMinor : undefined,
      asOf: moment().format('YYYY-MM-DD'),
      allowAnyEffectiveDate: true
    });
  }
}
