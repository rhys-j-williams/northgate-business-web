import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as moment from 'moment';
import * as _ from 'lodash';

import { environment } from '../../../environments/environment';
import { AchBatch, AchTemplate } from '../../core/models';
import { AuthService, FixtureDataService } from '../../core/services';
import { NachaParseResult, NachaParserService, NachaValidationOptions } from '../../legacy/nacha-parser.service';

/**
 * ACH origination. Files are parsed and validated in the browser (legacy/nacha-parser.service.ts)
 * before anything is sent, because the 2019 BFF returned a single "file rejected" string and the
 * treasurers hated it (MBZ-1104). The server validates again; we do not trust the client result.
 */
@Injectable({ providedIn: 'root' })
export class AchService {
  constructor(private http: HttpClient,
              private fixtures: FixtureDataService,
              private parser: NachaParserService,
              private auth: AuthService) {}

  getBatches(): Promise<AchBatch[]> {
    const source$ = environment.useFixtures ? this.fixtures.getAchBatches() : this.http.get<AchBatch[]>(`${environment.apiBase}/ach/batches`);
    return source$.toPromise();
  }

  getBatch(batchId: string): Promise<AchBatch> {
    const source$ = environment.useFixtures ? this.fixtures.getAchBatch(batchId) : this.http.get<AchBatch>(`${environment.apiBase}/ach/batches/${batchId}`);
    return source$.toPromise();
  }

  getTemplates(): Promise<AchTemplate[]> {
    const source$ = environment.useFixtures ? this.fixtures.getAchTemplates() : this.http.get<AchTemplate[]>(`${environment.apiBase}/ach/templates`);
    return source$.toPromise();
  }

  saveTemplate(template: AchTemplate): Promise<AchTemplate> {
    const source$ = environment.useFixtures ? this.fixtures.saveAchTemplate(template) : this.http.put<AchTemplate>(`${environment.apiBase}/ach/templates/${template.templateId || 'new'}`, template);
    return source$.toPromise();
  }

  /** Read the file as text. NACHA is ASCII; anything else is a wrong file. */
  readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read the file'));
      reader.readAsText(file, 'ascii');
    });
  }

  validate(content: string, options: NachaValidationOptions): NachaParseResult {
    return this.parser.parse(content, options);
  }

  submit(fileName: string, content: string, result: NachaParseResult, offsetAccountId: string): Promise<AchBatch> {
    const batch: AchBatch = {
      batchId: `ACH-${moment().format('YYMMDD')}-${_.padStart(String(Math.floor(Math.random() * 100000)), 5, '0')}`,
      organisationId: this.auth.snapshot.organisationId,
      fileName,
      secCode: (result.summary.secCodes[0] || 'PPD') as AchBatch['secCode'],
      companyEntryDescription: result.file.batches.length ? result.file.batches[0].companyEntryDescription : '',
      effectiveEntryDate: result.summary.effectiveDates.length ? moment(result.summary.effectiveDates[0], 'YYMMDD').format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
      uploadedAt: moment().toISOString(),
      uploadedBy: this.auth.snapshot.handle,
      status: result.valid ? 'pending-approval' : 'rejected',
      entryCount: result.summary.entries,
      totalDebitMinor: result.summary.totalDebitMinor,
      totalCreditMinor: result.summary.totalCreditMinor,
      offsetAccountId,
      validationErrors: result.issues.filter(i => i.severity === 'error').map(i => `${i.code} line ${i.line}: ${i.message}`),
      fileHash: this.cheapHash(content)
    };
    const source$ = environment.useFixtures
      ? this.fixtures.addAchBatch(batch)
      : this.http.post<AchBatch>(`${environment.apiBase}/ach/batches`, { batch, content });
    return source$.toPromise();
  }

  // Not a real hash. Duplicate detection on the BFF uses SHA-256; this is a display value only.
  // TODO(MBZ-1190): use SubtleCrypto once we drop IE11 from the support matrix. (We did. In 2021.)
  private cheapHash(content: string): string {
    let h = 0;
    for (let i = 0; i < content.length; i++) {
      // tslint:disable-next-line:no-bitwise
      h = ((h << 5) - h + content.charCodeAt(i)) | 0;
    }
    // tslint:disable-next-line:no-bitwise
    return (h >>> 0).toString(16).padStart(8, '0');
  }
}
