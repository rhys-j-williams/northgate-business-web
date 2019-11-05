import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { ReportDefinition, ReportRun } from '../../core/models';
import { AuthService, CsvExportService, FixtureDataService } from '../../core/services';

export interface ReportResult {
  run: ReportRun;
  rows: Array<Record<string, unknown>>;
}

/**
 * Reports run synchronously and come back as rows; the CSV is built in the browser. The BFF has
 * an async "queued" state in the model because the 2019 mainframe extract took minutes, and the
 * UI still copes with it, but nothing has returned 'queued' since the Ledgerline cutover.
 */
@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private http: HttpClient,
              private fixtures: FixtureDataService,
              private auth: AuthService,
              private csv: CsvExportService) {}

  getCatalogue(): Observable<ReportDefinition[]> {
    return environment.useFixtures ? this.fixtures.getReportCatalogue() : this.http.get<ReportDefinition[]>(`${environment.apiBase}/reports`);
  }

  getRuns(): Observable<ReportRun[]> {
    return environment.useFixtures ? this.fixtures.getReportRuns() : this.http.get<ReportRun[]>(`${environment.apiBase}/reports/runs`);
  }

  run(reportId: string, parameters: Record<string, string>): Promise<ReportResult> {
    const source$ = environment.useFixtures
      ? this.fixtures.runReport(reportId, parameters, this.auth.snapshot.handle)
      : this.http.post<ReportResult>(`${environment.apiBase}/reports/${reportId}/runs`, { parameters });
    return source$.pipe(map(result => ({ ...result, rows: result.rows || [] }))).toPromise();
  }

  export(result: ReportResult): void {
    this.csv.download(result.run.fileName, this.csv.build(result.rows));
  }
}
