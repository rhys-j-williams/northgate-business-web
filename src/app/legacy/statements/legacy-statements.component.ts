import { Component, Input, OnChanges } from '@angular/core';
import * as moment from 'moment';

import { FixtureDataService } from '../../core/services/fixture-data.service';
import { Statement } from '../../core/models';

// Copied from the 2019 app almost unchanged (MBZ-88). Uses the fixture service directly rather
// than AccountsService because it predates it. Works, leave it.
@Component({
  selector: 'mbz-legacy-statements',
  templateUrl: './legacy-statements.component.html',
  styleUrls: ['./legacy-statements.component.scss']
})
export class LegacyStatementsComponent implements OnChanges {
  @Input() accountId: string;

  statements: Statement[] = [];
  years: number[] = [];
  selectedYear: number = moment().year();
  loading = false;

  constructor(private data: FixtureDataService) {}

  ngOnChanges() {
    if (!this.accountId) { return; }
    this.loading = true;
    this.data.getStatements(this.accountId).toPromise().then(list => {
      this.statements = list;
      this.years = list.map(s => moment(s.periodEnd).year()).filter((y, i, arr) => arr.indexOf(y) === i).sort((a, b) => b - a);
      if (this.years.indexOf(this.selectedYear) < 0 && this.years.length) {
        this.selectedYear = this.years[0];
      }
      this.loading = false;
    });
  }

  get visible(): Statement[] {
    return this.statements.filter(s => moment(s.periodEnd).year() === this.selectedYear);
  }

  download(statement: Statement) {
    // TODO MBZ-1188 real PDF; the BFF endpoint exists but returns a placeholder in lower envs.
    const blob = new Blob([`Statement ${statement.statementId} for period ending ${statement.periodEnd}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement-${statement.periodEnd}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
