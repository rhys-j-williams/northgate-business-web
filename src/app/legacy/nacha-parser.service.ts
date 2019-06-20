/**
 * NACHA file parser and validator.
 *
 * Pure TypeScript. No HttpClient, no store, no Canopy. The Injectable decorator is there so the
 * upload screen can get it from DI, nothing else. Everything is synchronous and deterministic so
 * it can be characterised with fixtures (see nacha-parser.service.spec.ts, and please read the
 * comment at the top of that file before adding a third test).
 *
 * The parser is deliberately lenient about what it *reads* and strict about what it *validates*:
 * every record is parsed even when an earlier one is broken, so the validation screen can show
 * all problems at once rather than one per upload. Treasury Ops asked for that in 2019 after the
 * first version stopped at the first error (MBZ-418).
 *
 * Amounts are integers in cents throughout. Nothing here should ever touch a float.
 */
import { Injectable } from '@angular/core';
import * as moment from 'moment';
import * as _ from 'lodash';

import {
  ADDENDA_FIELDS, BATCH_CONTROL_FIELDS, BATCH_HEADER_FIELDS, ENTRY_DETAIL_FIELDS, FILE_CONTROL_FIELDS, FILE_HEADER_FIELDS,
  NACHA_BLOCKING_FACTOR, NACHA_CREDIT_TRANSACTION_CODES, NACHA_DEBIT_TRANSACTION_CODES, NACHA_ERRORS, NACHA_ORIGINATION_SEC_CODES,
  NACHA_PAD_LINE, NACHA_PRENOTE_TRANSACTION_CODES, NACHA_RECORD_LENGTH, NACHA_RECORD_TYPES, NACHA_SERVICE_CLASS_CODES,
  NACHA_UNSUPPORTED_SEC_CODES, NachaErrorCode, NachaField
} from './nacha-format.constants';

export interface NachaIssue {
  code: NachaErrorCode;
  message: string;
  severity: 'error' | 'warning';
  /** 1-based line in the file, 0 for file level issues. */
  line: number;
  field?: string;
  detail?: string;
}

export interface NachaFileHeader {
  immediateDestination: string;
  immediateOrigin: string;
  fileCreationDate: string;
  fileCreationTime: string;
  fileIdModifier: string;
  immediateDestinationName: string;
  immediateOriginName: string;
  referenceCode: string;
}

export interface NachaEntry {
  line: number;
  transactionCode: string;
  receivingDfiIdentification: string;
  checkDigit: string;
  dfiAccountNumber: string;
  amountMinor: number;
  individualIdentificationNumber: string;
  individualName: string;
  discretionaryData: string;
  addendaRecordIndicator: string;
  traceNumber: string;
  addenda: NachaAddenda[];
  direction: 'credit' | 'debit' | 'unknown';
  prenote: boolean;
}

export interface NachaAddenda {
  line: number;
  addendaTypeCode: string;
  paymentRelatedInformation: string;
  addendaSequenceNumber: string;
  entryDetailSequenceNumber: string;
}

export interface NachaBatch {
  headerLine: number;
  controlLine: number | null;
  serviceClassCode: string;
  companyName: string;
  companyDiscretionaryData: string;
  companyIdentification: string;
  standardEntryClassCode: string;
  companyEntryDescription: string;
  companyDescriptiveDate: string;
  effectiveEntryDate: string;
  originatorStatusCode: string;
  originatingDfiIdentification: string;
  batchNumber: string;
  entries: NachaEntry[];
  control: {
    entryAddendaCount: number;
    entryHash: number;
    totalDebitAmountMinor: number;
    totalCreditAmountMinor: number;
  } | null;
  computed: {
    entryAddendaCount: number;
    entryHash: number;
    totalDebitAmountMinor: number;
    totalCreditAmountMinor: number;
  };
}

export interface NachaFile {
  header: NachaFileHeader | null;
  batches: NachaBatch[];
  control: {
    batchCount: number;
    blockCount: number;
    entryAddendaCount: number;
    entryHash: number;
    totalDebitAmountMinor: number;
    totalCreditAmountMinor: number;
  } | null;
  lineCount: number;
  padLines: number;
}

export interface NachaValidationOptions {
  /** The organisation's company identification (1 + EIN). Checked against immediate origin when set. */
  expectedOrigin?: string;
  /** Per transaction limit in cents. */
  perTransactionLimitMinor?: number;
  /** Per day limit in cents, applied per batch because we have no view of the day here. */
  perDayLimitMinor?: number;
  /** Allow non business day effective dates (used by the fixture generator and by Treasury Ops). */
  allowAnyEffectiveDate?: boolean;
  /** Reference date for staleness checks. Defaults to now. */
  asOf?: string;
}

export interface NachaParseResult {
  file: NachaFile;
  issues: NachaIssue[];
  valid: boolean;
  summary: {
    batches: number;
    entries: number;
    addenda: number;
    totalDebitMinor: number;
    totalCreditMinor: number;
    effectiveDates: string[];
    secCodes: string[];
  };
}

@Injectable({ providedIn: 'root' })
export class NachaParserService {

  /**
   * Parse and validate. Never throws for malformed input; throws only for a non string argument
   * because that is a programming error.
   */
  parse(content: string, options: NachaValidationOptions = {}): NachaParseResult {
    if (typeof content !== 'string') {
      throw new TypeError('NachaParserService.parse expects a string');
    }
    const issues: NachaIssue[] = [];
    const file: NachaFile = { header: null, batches: [], control: null, lineCount: 0, padLines: 0 };

    const lines = this.splitLines(content);
    file.lineCount = lines.length;

    if (lines.length === 0) {
      issues.push(this.issue('E001', 0));
      return this.finish(file, issues);
    }

    let currentBatch: NachaBatch | null = null;
    let lastEntry: NachaEntry | null = null;
    let sawControl = false;

    for (let i = 0; i < lines.length; i++) {
      const lineNumber = i + 1;
      const raw = lines[i];

      if (raw === NACHA_PAD_LINE) {
        file.padLines++;
        continue;
      }
      if (sawControl) {
        // anything after the file control that is not padding
        issues.push(this.issue('E005', lineNumber, undefined, 'record after file control'));
      }
      if (raw.length !== NACHA_RECORD_LENGTH) {
        issues.push(this.issue('E002', lineNumber, undefined, `length ${raw.length}`));
      }
      const line = raw.length < NACHA_RECORD_LENGTH ? raw.padEnd(NACHA_RECORD_LENGTH, ' ') : raw;
      const type = line.charAt(0);

      switch (type) {
        case NACHA_RECORD_TYPES.FILE_HEADER: {
          if (i !== 0 || file.header) {
            issues.push(this.issue('E004', lineNumber));
          }
          const fields = this.readFields(line, FILE_HEADER_FIELDS, lineNumber, issues);
          file.header = {
            immediateDestination: fields['immediateDestination'].trim(),
            immediateOrigin: fields['immediateOrigin'].trim(),
            fileCreationDate: fields['fileCreationDate'],
            fileCreationTime: fields['fileCreationTime'],
            fileIdModifier: fields['fileIdModifier'],
            immediateDestinationName: fields['immediateDestinationName'].trim(),
            immediateOriginName: fields['immediateOriginName'].trim(),
            referenceCode: fields['referenceCode'].trim()
          };
          break;
        }

        case NACHA_RECORD_TYPES.BATCH_HEADER: {
          if (currentBatch) {
            issues.push(this.issue('E006', currentBatch.headerLine));
            file.batches.push(currentBatch);
          }
          const fields = this.readFields(line, BATCH_HEADER_FIELDS, lineNumber, issues);
          currentBatch = {
            headerLine: lineNumber,
            controlLine: null,
            serviceClassCode: fields['serviceClassCode'],
            companyName: fields['companyName'].trim(),
            companyDiscretionaryData: fields['companyDiscretionaryData'].trim(),
            companyIdentification: fields['companyIdentification'].trim(),
            standardEntryClassCode: fields['standardEntryClassCode'],
            companyEntryDescription: fields['companyEntryDescription'].trim(),
            companyDescriptiveDate: fields['companyDescriptiveDate'].trim(),
            effectiveEntryDate: fields['effectiveEntryDate'],
            originatorStatusCode: fields['originatorStatusCode'],
            originatingDfiIdentification: fields['originatingDfiIdentification'],
            batchNumber: fields['batchNumber'],
            entries: [],
            control: null,
            computed: { entryAddendaCount: 0, entryHash: 0, totalDebitAmountMinor: 0, totalCreditAmountMinor: 0 }
          };
          lastEntry = null;
          break;
        }

        case NACHA_RECORD_TYPES.ENTRY_DETAIL: {
          const fields = this.readFields(line, ENTRY_DETAIL_FIELDS, lineNumber, issues);
          const transactionCode = fields['transactionCode'];
          const entry: NachaEntry = {
            line: lineNumber,
            transactionCode,
            receivingDfiIdentification: fields['receivingDfiIdentification'],
            checkDigit: fields['checkDigit'],
            dfiAccountNumber: fields['dfiAccountNumber'].trim(),
            amountMinor: this.toInt(fields['amount']),
            individualIdentificationNumber: fields['individualIdentificationNumber'].trim(),
            individualName: fields['individualName'].trim(),
            discretionaryData: fields['discretionaryData'],
            addendaRecordIndicator: fields['addendaRecordIndicator'],
            traceNumber: fields['traceNumber'],
            addenda: [],
            direction: NACHA_CREDIT_TRANSACTION_CODES.indexOf(transactionCode) >= 0 ? 'credit'
              : NACHA_DEBIT_TRANSACTION_CODES.indexOf(transactionCode) >= 0 ? 'debit' : 'unknown',
            prenote: NACHA_PRENOTE_TRANSACTION_CODES.indexOf(transactionCode) >= 0
          };
          if (!currentBatch) {
            issues.push(this.issue('E008', lineNumber));
          } else {
            currentBatch.entries.push(entry);
          }
          lastEntry = entry;
          break;
        }

        case NACHA_RECORD_TYPES.ADDENDA: {
          const fields = this.readFields(line, ADDENDA_FIELDS, lineNumber, issues);
          if (!lastEntry) {
            issues.push(this.issue('E009', lineNumber));
            break;
          }
          lastEntry.addenda.push({
            line: lineNumber,
            addendaTypeCode: fields['addendaTypeCode'],
            paymentRelatedInformation: fields['paymentRelatedInformation'].replace(/\s+$/, ''),
            addendaSequenceNumber: fields['addendaSequenceNumber'],
            entryDetailSequenceNumber: fields['entryDetailSequenceNumber']
          });
          break;
        }

        case NACHA_RECORD_TYPES.BATCH_CONTROL: {
          const fields = this.readFields(line, BATCH_CONTROL_FIELDS, lineNumber, issues);
          if (!currentBatch) {
            issues.push(this.issue('E007', lineNumber));
            break;
          }
          currentBatch.controlLine = lineNumber;
          currentBatch.control = {
            entryAddendaCount: this.toInt(fields['entryAddendaCount']),
            entryHash: this.toInt(fields['entryHash']),
            totalDebitAmountMinor: this.toInt(fields['totalDebitAmount']),
            totalCreditAmountMinor: this.toInt(fields['totalCreditAmount'])
          };
          file.batches.push(currentBatch);
          currentBatch = null;
          lastEntry = null;
          break;
        }

        case NACHA_RECORD_TYPES.FILE_CONTROL: {
          const fields = this.readFields(line, FILE_CONTROL_FIELDS, lineNumber, issues);
          file.control = {
            batchCount: this.toInt(fields['batchCount']),
            blockCount: this.toInt(fields['blockCount']),
            entryAddendaCount: this.toInt(fields['entryAddendaCount']),
            entryHash: this.toInt(fields['entryHash']),
            totalDebitAmountMinor: this.toInt(fields['totalDebitAmount']),
            totalCreditAmountMinor: this.toInt(fields['totalCreditAmount'])
          };
          sawControl = true;
          break;
        }

        default:
          issues.push(this.issue('E003', lineNumber, undefined, `type '${type}'`));
      }
    }

    if (currentBatch) {
      issues.push(this.issue('E006', currentBatch.headerLine));
      file.batches.push(currentBatch);
    }
    if (!file.header) {
      issues.push(this.issue('E004', 0));
    }
    if (!file.control) {
      issues.push(this.issue('E005', 0));
    }

    this.computeTotals(file);
    this.validateBatches(file, issues, options);
    this.validateFile(file, issues, options, lines.length);

    return this.finish(file, issues);
  }

  /**
   * Build a file from parsed batches. Used by the ACH screens to write the file back out after
   * the user has edited it, and by the specs to round trip a fixture. The output uses CRLF because
   * the Treasury workstation software that reads these files insists on it.
   */
  serialize(file: NachaFile): string {
    const out: string[] = [];
    if (file.header) {
      out.push(this.writeFields(FILE_HEADER_FIELDS, {
        recordTypeCode: '1', priorityCode: '01',
        immediateDestination: file.header.immediateDestination.padStart(10, ' '),
        immediateOrigin: file.header.immediateOrigin.padStart(10, ' '),
        fileCreationDate: file.header.fileCreationDate, fileCreationTime: file.header.fileCreationTime,
        fileIdModifier: file.header.fileIdModifier, recordSize: '094', blockingFactor: '10', formatCode: '1',
        immediateDestinationName: file.header.immediateDestinationName, immediateOriginName: file.header.immediateOriginName,
        referenceCode: file.header.referenceCode
      }));
    }
    let entryAddendaCount = 0;
    for (const batch of file.batches) {
      out.push(this.writeFields(BATCH_HEADER_FIELDS, {
        recordTypeCode: '5', serviceClassCode: batch.serviceClassCode, companyName: batch.companyName,
        companyDiscretionaryData: batch.companyDiscretionaryData, companyIdentification: batch.companyIdentification,
        standardEntryClassCode: batch.standardEntryClassCode, companyEntryDescription: batch.companyEntryDescription,
        companyDescriptiveDate: batch.companyDescriptiveDate, effectiveEntryDate: batch.effectiveEntryDate, settlementDate: '',
        originatorStatusCode: batch.originatorStatusCode, originatingDfiIdentification: batch.originatingDfiIdentification,
        batchNumber: batch.batchNumber
      }));
      for (const entry of batch.entries) {
        out.push(this.writeFields(ENTRY_DETAIL_FIELDS, {
          recordTypeCode: '6', transactionCode: entry.transactionCode, receivingDfiIdentification: entry.receivingDfiIdentification,
          checkDigit: entry.checkDigit, dfiAccountNumber: entry.dfiAccountNumber, amount: String(entry.amountMinor),
          individualIdentificationNumber: entry.individualIdentificationNumber, individualName: entry.individualName,
          discretionaryData: entry.discretionaryData, addendaRecordIndicator: entry.addenda.length ? '1' : '0', traceNumber: entry.traceNumber
        }));
        entryAddendaCount++;
        for (const addenda of entry.addenda) {
          out.push(this.writeFields(ADDENDA_FIELDS, {
            recordTypeCode: '7', addendaTypeCode: addenda.addendaTypeCode, paymentRelatedInformation: addenda.paymentRelatedInformation,
            addendaSequenceNumber: addenda.addendaSequenceNumber, entryDetailSequenceNumber: addenda.entryDetailSequenceNumber
          }));
          entryAddendaCount++;
        }
      }
      const c = batch.computed;
      out.push(this.writeFields(BATCH_CONTROL_FIELDS, {
        recordTypeCode: '8', serviceClassCode: batch.serviceClassCode, entryAddendaCount: String(c.entryAddendaCount),
        entryHash: String(c.entryHash).slice(-10), totalDebitAmount: String(c.totalDebitAmountMinor), totalCreditAmount: String(c.totalCreditAmountMinor),
        companyIdentification: batch.companyIdentification, messageAuthenticationCode: '', reserved: '',
        originatingDfiIdentification: batch.originatingDfiIdentification, batchNumber: batch.batchNumber
      }));
    }
    const recordCount = out.length + 1;
    const blockCount = Math.ceil(recordCount / NACHA_BLOCKING_FACTOR);
    out.push(this.writeFields(FILE_CONTROL_FIELDS, {
      recordTypeCode: '9', batchCount: String(file.batches.length), blockCount: String(blockCount),
      entryAddendaCount: String(entryAddendaCount),
      entryHash: String(_.sumBy(file.batches, b => b.computed.entryHash)).slice(-10),
      totalDebitAmount: String(_.sumBy(file.batches, b => b.computed.totalDebitAmountMinor)),
      totalCreditAmount: String(_.sumBy(file.batches, b => b.computed.totalCreditAmountMinor)),
      reserved: ''
    }));
    while (out.length % NACHA_BLOCKING_FACTOR !== 0) {
      out.push(NACHA_PAD_LINE);
    }
    return out.join('\r\n') + '\r\n';
  }

  /** ABA check digit: 3,7,1 weights over the first eight digits. */
  checkDigitFor(routingPrefix: string): string {
    const weights = [3, 7, 1, 3, 7, 1, 3, 7];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(routingPrefix.charAt(i), 10) * weights[i];
    }
    return String((10 - (sum % 10)) % 10);
  }

  // ------------------------------------------------------------------------------------------

  private splitLines(content: string): string[] {
    // CRLF or LF, and a trailing newline is not a blank record.
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    while (lines.length && lines[lines.length - 1].trim() === '') {
      lines.pop();
    }
    return lines;
  }

  private readFields(line: string, fields: NachaField[], lineNumber: number, issues: NachaIssue[]): { [name: string]: string } {
    const out: { [name: string]: string } = {};
    for (const field of fields) {
      const value = line.substring(field.start - 1, field.end);
      out[field.name] = value;
      if (field.required && value.trim() === '') {
        issues.push(this.issue('E010', lineNumber, field.name));
        continue;
      }
      if (field.constant !== undefined && value !== field.constant) {
        issues.push(this.issue('E012', lineNumber, field.name, `expected '${field.constant}' got '${value}'`));
      }
      if ((field.type === 'N' || field.type === '$') && value.trim() !== '' && !/^\d+$/.test(value)) {
        issues.push(this.issue('E011', lineNumber, field.name, `'${value}'`));
      }
      if (field.type === 'D' && value.trim() !== '' && !moment(value, 'YYMMDD', true).isValid()) {
        issues.push(this.issue('E013', lineNumber, field.name, `'${value}'`));
      }
    }
    return out;
  }

  private writeFields(fields: NachaField[], values: { [name: string]: string }): string {
    let line = '';
    for (const field of fields) {
      const width = field.end - field.start + 1;
      const raw = values[field.name] === undefined || values[field.name] === null ? '' : String(values[field.name]);
      const numeric = field.type === 'N' || field.type === '$';
      const clipped = raw.length > width ? (numeric ? raw.slice(-width) : raw.substring(0, width)) : raw;
      line += numeric ? clipped.padStart(width, '0') : clipped.toUpperCase().padEnd(width, ' ');
    }
    return line;
  }

  private toInt(value: string): number {
    const digits = (value || '').trim();
    if (!/^\d+$/.test(digits)) {
      return 0;
    }
    return parseInt(digits, 10);
  }

  private computeTotals(file: NachaFile): void {
    for (const batch of file.batches) {
      let count = 0;
      let hash = 0;
      let debit = 0;
      let credit = 0;
      for (const entry of batch.entries) {
        count += 1 + entry.addenda.length;
        hash += this.toInt(entry.receivingDfiIdentification);
        if (entry.direction === 'debit') {
          debit += entry.amountMinor;
        } else if (entry.direction === 'credit') {
          credit += entry.amountMinor;
        }
      }
      batch.computed = {
        entryAddendaCount: count,
        // The hash is the rightmost ten digits of the sum.
        entryHash: hash % 10000000000,
        totalDebitAmountMinor: debit,
        totalCreditAmountMinor: credit
      };
    }
  }

  private validateBatches(file: NachaFile, issues: NachaIssue[], options: NachaValidationOptions): void {
    for (const batch of file.batches) {
      const sec = batch.standardEntryClassCode;
      if (NACHA_UNSUPPORTED_SEC_CODES.indexOf(sec) >= 0 || NACHA_ORIGINATION_SEC_CODES.indexOf(sec as any) < 0) {
        issues.push(this.issue('E022', batch.headerLine, 'standardEntryClassCode', sec));
      }

      const hasDebits = batch.computed.totalDebitAmountMinor > 0 || batch.entries.some(e => e.direction === 'debit');
      const hasCredits = batch.computed.totalCreditAmountMinor > 0 || batch.entries.some(e => e.direction === 'credit');
      if (batch.serviceClassCode === NACHA_SERVICE_CLASS_CODES.CREDITS_ONLY && hasDebits) {
        issues.push(this.issue('E023', batch.headerLine, 'serviceClassCode', 'credits only batch contains debits'));
      }
      if (batch.serviceClassCode === NACHA_SERVICE_CLASS_CODES.DEBITS_ONLY && hasCredits) {
        issues.push(this.issue('E023', batch.headerLine, 'serviceClassCode', 'debits only batch contains credits'));
      }

      if (!options.allowAnyEffectiveDate && batch.effectiveEntryDate.trim()) {
        const effective = moment(batch.effectiveEntryDate, 'YYMMDD', true);
        if (effective.isValid() && effective.isoWeekday() >= 6) {
          issues.push(this.issue('E024', batch.headerLine, 'effectiveEntryDate', effective.format('YYYY-MM-DD')));
        }
      }

      if (batch.companyEntryDescription === '') {
        issues.push(this.issue('W003', batch.headerLine, 'companyEntryDescription'));
      }

      for (const entry of batch.entries) {
        if (/^\d{8}$/.test(entry.receivingDfiIdentification) && this.checkDigitFor(entry.receivingDfiIdentification) !== entry.checkDigit) {
          issues.push(this.issue('E021', entry.line, 'checkDigit', entry.receivingDfiIdentification + entry.checkDigit));
        }
        if (entry.addendaRecordIndicator === '1' && entry.addenda.length === 0) {
          issues.push(this.issue('E025', entry.line, 'addendaRecordIndicator'));
        }
        if (entry.traceNumber.substring(0, 8) !== batch.originatingDfiIdentification) {
          issues.push(this.issue('E026', entry.line, 'traceNumber', entry.traceNumber));
        }
        if (entry.prenote && entry.amountMinor !== 0) {
          issues.push(this.issue('W002', entry.line, 'amount', String(entry.amountMinor)));
        }
        if (entry.individualName.length >= 22) {
          issues.push(this.issue('W004', entry.line, 'individualName'));
        }
        if (options.perTransactionLimitMinor !== undefined && entry.amountMinor > options.perTransactionLimitMinor) {
          issues.push(this.issue('E028', entry.line, 'amount', `${entry.amountMinor} > ${options.perTransactionLimitMinor}`));
        }
      }

      if (options.perDayLimitMinor !== undefined) {
        const batchTotal = batch.computed.totalCreditAmountMinor + batch.computed.totalDebitAmountMinor;
        if (batchTotal > options.perDayLimitMinor) {
          issues.push(this.issue('E029', batch.headerLine, undefined, `${batchTotal} > ${options.perDayLimitMinor}`));
        }
      }

      if (batch.control) {
        const line = batch.controlLine || batch.headerLine;
        if (batch.control.entryHash !== batch.computed.entryHash) {
          issues.push(this.issue('E014', line, 'entryHash', `control ${batch.control.entryHash} computed ${batch.computed.entryHash}`));
        }
        if (batch.control.totalDebitAmountMinor !== batch.computed.totalDebitAmountMinor) {
          issues.push(this.issue('E015', line, 'totalDebitAmount',
            `control ${batch.control.totalDebitAmountMinor} computed ${batch.computed.totalDebitAmountMinor}`));
        }
        if (batch.control.totalCreditAmountMinor !== batch.computed.totalCreditAmountMinor) {
          issues.push(this.issue('E016', line, 'totalCreditAmount',
            `control ${batch.control.totalCreditAmountMinor} computed ${batch.computed.totalCreditAmountMinor}`));
        }
        if (batch.control.entryAddendaCount !== batch.computed.entryAddendaCount) {
          issues.push(this.issue('E017', line, 'entryAddendaCount',
            `control ${batch.control.entryAddendaCount} computed ${batch.computed.entryAddendaCount}`));
        }
      }
    }
  }

  private validateFile(file: NachaFile, issues: NachaIssue[], options: NachaValidationOptions, lineCount: number): void {
    if (file.header) {
      if (options.expectedOrigin && file.header.immediateOrigin.replace(/\s/g, '') !== options.expectedOrigin.replace(/\s/g, '')) {
        issues.push(this.issue('E027', 1, 'immediateOrigin', file.header.immediateOrigin));
      }
      const created = moment(file.header.fileCreationDate, 'YYMMDD', true);
      const asOf = options.asOf ? moment(options.asOf) : moment();
      if (created.isValid() && asOf.diff(created, 'days') > 5) {
        issues.push(this.issue('W001', 1, 'fileCreationDate', created.format('YYYY-MM-DD')));
      }
    }
    if (file.control) {
      const controlLine = lineCount - file.padLines;
      if (file.control.batchCount !== file.batches.length) {
        issues.push(this.issue('E018', controlLine, 'batchCount', `control ${file.control.batchCount} actual ${file.batches.length}`));
      }
      const records = lineCount - file.padLines;
      const expectedBlocks = Math.ceil(records / NACHA_BLOCKING_FACTOR);
      if (file.control.blockCount !== expectedBlocks) {
        issues.push(this.issue('E019', controlLine, 'blockCount', `control ${file.control.blockCount} expected ${expectedBlocks}`));
      }
      // The file control is the sum of the batch controls as written, not of what we recomputed.
      // A batch control that is wrong gets E016; the file control disagreeing with it is E020.
      const totals = {
        count: _.sumBy(file.batches, b => b.control.entryAddendaCount),
        hash: _.sumBy(file.batches, b => b.control.entryHash) % 10000000000,
        debit: _.sumBy(file.batches, b => b.control.totalDebitAmountMinor),
        credit: _.sumBy(file.batches, b => b.control.totalCreditAmountMinor)
      };
      if (file.control.entryAddendaCount !== totals.count || file.control.entryHash !== totals.hash
        || file.control.totalDebitAmountMinor !== totals.debit || file.control.totalCreditAmountMinor !== totals.credit) {
        issues.push(this.issue('E020', controlLine, undefined,
          `control ${file.control.entryAddendaCount}/${file.control.entryHash}/${file.control.totalDebitAmountMinor}/${file.control.totalCreditAmountMinor} `
          + `computed ${totals.count}/${totals.hash}/${totals.debit}/${totals.credit}`));
      }
    }
  }

  private issue(code: NachaErrorCode, line: number, field?: string, detail?: string): NachaIssue {
    return {
      code,
      message: NACHA_ERRORS[code],
      severity: code.charAt(0) === 'W' ? 'warning' : 'error',
      line,
      field,
      detail
    };
  }

  private finish(file: NachaFile, issues: NachaIssue[]): NachaParseResult {
    const sorted = _.sortBy(issues, i => i.line, i => i.severity === 'error' ? 0 : 1);
    const entries = _.flatMap(file.batches, b => b.entries);
    return {
      file,
      issues: sorted,
      valid: !sorted.some(i => i.severity === 'error'),
      summary: {
        batches: file.batches.length,
        entries: entries.length,
        addenda: _.sumBy(entries, e => e.addenda.length),
        totalDebitMinor: _.sumBy(file.batches, b => b.computed.totalDebitAmountMinor),
        totalCreditMinor: _.sumBy(file.batches, b => b.computed.totalCreditAmountMinor),
        effectiveDates: _.uniq(file.batches.map(b => b.effectiveEntryDate)),
        secCodes: _.uniq(file.batches.map(b => b.standardEntryClassCode))
      }
    };
  }
}
