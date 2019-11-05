import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { CnToastService } from '@meridian/canopy-ui';

import { ReportDefinition, ReportRun } from '../../../core/models';
import { AuthService } from '../../../core/services';
import { environment } from '../../../../environments/environment';
import { ReportResult, ReportsService } from '../reports.service';

@Component({
  selector: 'mbz-report-catalogue',
  templateUrl: './report-catalogue.component.html',
  styleUrls: ['./report-catalogue.component.scss']
})
export class ReportCatalogueComponent implements OnInit {
  catalogue$: Observable<ReportDefinition[]>;
  runs$: Observable<ReportRun[]>;
  selected: ReportDefinition | null = null;
  result: ReportResult | null = null;
  running = false;
  canRun = false;
  readonly csvEnabled = environment.featureFlags.reportsCsvExport;

  constructor(private reports: ReportsService, private auth: AuthService, private toast: CnToastService) {}

  ngOnInit(): void {
    this.canRun = this.auth.hasPermission('reports:run');
    this.catalogue$ = this.reports.getCatalogue();
    this.runs$ = this.reports.getRuns();
  }

  choose(report: ReportDefinition): void {
    this.selected = report;
    this.result = null;
  }

  run(parameters: Record<string, string>): void {
    if (!this.selected || this.running) {
      return;
    }
    this.running = true;
    this.reports.run(this.selected.reportId, parameters)
      .then(result => {
        this.result = result;
        this.runs$ = this.reports.getRuns();
        if (result.rows.length === 0) {
          this.toast.show('The report ran but returned no rows for those parameters.');
        }
      })
      .catch(err => this.toast.error(err && err.message ? err.message : 'Report failed'))
      .then(() => this.running = false);
  }

  exportCsv(): void {
    if (this.result) {
      this.reports.export(this.result);
    }
  }
}
