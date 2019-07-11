import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import * as _ from 'lodash';

import { NachaBatch, NachaIssue, NachaParseResult } from '../../../legacy/nacha-parser.service';

interface BatchRow {
  batch: NachaBatch;
  issues: NachaIssue[];
  expanded: boolean;
}

@Component({
  selector: 'mbz-nacha-validation-report',
  templateUrl: './nacha-validation-report.component.html',
  styleUrls: ['./nacha-validation-report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NachaValidationReportComponent implements OnChanges {
  @Input() result: NachaParseResult;

  errors: NachaIssue[] = [];
  warnings: NachaIssue[] = [];
  fileIssues: NachaIssue[] = [];
  batches: BatchRow[] = [];

  ngOnChanges(): void {
    if (!this.result) {
      return;
    }
    this.errors = this.result.issues.filter(i => i.severity === 'error');
    this.warnings = this.result.issues.filter(i => i.severity === 'warning');

    const batchLines = new Set<number>();
    this.batches = this.result.file.batches.map(batch => {
      const lines = [batch.headerLine, batch.controlLine, ...batch.entries.map(e => e.line), ..._.flatMap(batch.entries, e => e.addenda.map(a => a.line))];
      lines.forEach(l => batchLines.add(l));
      return { batch, issues: this.result.issues.filter(i => lines.indexOf(i.line) >= 0), expanded: false };
    });
    this.fileIssues = this.result.issues.filter(i => !batchLines.has(i.line));
  }

  toggle(row: BatchRow): void {
    row.expanded = !row.expanded;
  }

  trackIssue(index: number, issue: NachaIssue): string {
    return `${issue.code}-${issue.line}-${issue.field || ''}`;
  }
}
