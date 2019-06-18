/**
 * NACHA record layouts.
 *
 * Offsets are 1-based positions as printed in the Operating Rules, converted to 0-based slices in
 * the parser. Every record is 94 characters. Do not reformat this file, see legacy/README.md.
 *
 * MBZ-410 (2019-06) original. MBZ-1177 (2021-03) added IAT detection (rejected, not parsed).
 * MBZ-1980 (2023-02) added the 7 addenda type for CCD+/PPD+.
 */

export const NACHA_RECORD_LENGTH = 94;
export const NACHA_BLOCKING_FACTOR = 10;
export const NACHA_FORMAT_CODE = '1';

/** Fictional routing number from the test range. Every fixture and every synthetic file uses it. */
export const NACHA_TEST_ROUTING_NUMBER = '021000000';

export const NACHA_RECORD_TYPES = {
  FILE_HEADER: '1',
  BATCH_HEADER: '5',
  ENTRY_DETAIL: '6',
  ADDENDA: '7',
  BATCH_CONTROL: '8',
  FILE_CONTROL: '9'
} as const;

export type NachaRecordType = typeof NACHA_RECORD_TYPES[keyof typeof NACHA_RECORD_TYPES];

export const NACHA_SEC_CODES = ['PPD', 'CCD', 'CTX', 'WEB', 'TEL', 'ARC', 'BOC', 'POP', 'RCK'] as const;
export type NachaSecCode = typeof NACHA_SEC_CODES[number];

/** SEC codes this application will originate. Everything else validates but is rejected at submit. */
export const NACHA_ORIGINATION_SEC_CODES: NachaSecCode[] = ['PPD', 'CCD', 'CTX'];

/** IAT is detected so we can give a useful error rather than a field mismatch. */
export const NACHA_UNSUPPORTED_SEC_CODES = ['IAT', 'ADV', 'COR', 'ENR', 'TRC', 'TRX', 'XCK', 'MTE', 'POS', 'SHR'];

export const NACHA_SERVICE_CLASS_CODES = {
  MIXED: '200',
  CREDITS_ONLY: '220',
  DEBITS_ONLY: '225',
  AUTOMATED_ACCOUNTING_ADVICES: '280'
} as const;

export const NACHA_TRANSACTION_CODES = {
  CHECKING_CREDIT: '22',
  CHECKING_CREDIT_PRENOTE: '23',
  CHECKING_DEBIT: '27',
  CHECKING_DEBIT_PRENOTE: '28',
  SAVINGS_CREDIT: '32',
  SAVINGS_CREDIT_PRENOTE: '33',
  SAVINGS_DEBIT: '37',
  SAVINGS_DEBIT_PRENOTE: '38',
  GL_CREDIT: '42',
  GL_DEBIT: '47',
  LOAN_CREDIT: '52',
  LOAN_DEBIT: '55'
} as const;

export const NACHA_CREDIT_TRANSACTION_CODES = ['22', '23', '32', '33', '42', '43', '52', '53'];
export const NACHA_DEBIT_TRANSACTION_CODES = ['27', '28', '37', '38', '47', '48', '55'];
export const NACHA_PRENOTE_TRANSACTION_CODES = ['23', '28', '33', '38', '43', '48', '53'];

export interface NachaField {
  /** 1-based start position as in the rules. */
  start: number;
  /** 1-based end position, inclusive. */
  end: number;
  name: string;
  /** N numeric, A alphanumeric, D date YYMMDD, T time HHMM, $ amount in cents. */
  type: 'N' | 'A' | 'D' | 'T' | '$';
  required?: boolean;
  /** Where a field has a fixed value in our files. */
  constant?: string;
}

export const FILE_HEADER_FIELDS: NachaField[] = [
  { start: 1, end: 1, name: 'recordTypeCode', type: 'N', required: true, constant: '1' },
  { start: 2, end: 3, name: 'priorityCode', type: 'N', required: true, constant: '01' },
  { start: 4, end: 13, name: 'immediateDestination', type: 'A', required: true },
  { start: 14, end: 23, name: 'immediateOrigin', type: 'A', required: true },
  { start: 24, end: 29, name: 'fileCreationDate', type: 'D', required: true },
  { start: 30, end: 33, name: 'fileCreationTime', type: 'T' },
  { start: 34, end: 34, name: 'fileIdModifier', type: 'A', required: true },
  { start: 35, end: 37, name: 'recordSize', type: 'N', required: true, constant: '094' },
  { start: 38, end: 39, name: 'blockingFactor', type: 'N', required: true, constant: '10' },
  { start: 40, end: 40, name: 'formatCode', type: 'N', required: true, constant: '1' },
  { start: 41, end: 63, name: 'immediateDestinationName', type: 'A' },
  { start: 64, end: 86, name: 'immediateOriginName', type: 'A' },
  { start: 87, end: 94, name: 'referenceCode', type: 'A' }
];

export const BATCH_HEADER_FIELDS: NachaField[] = [
  { start: 1, end: 1, name: 'recordTypeCode', type: 'N', required: true, constant: '5' },
  { start: 2, end: 4, name: 'serviceClassCode', type: 'N', required: true },
  { start: 5, end: 20, name: 'companyName', type: 'A', required: true },
  { start: 21, end: 40, name: 'companyDiscretionaryData', type: 'A' },
  { start: 41, end: 50, name: 'companyIdentification', type: 'A', required: true },
  { start: 51, end: 53, name: 'standardEntryClassCode', type: 'A', required: true },
  { start: 54, end: 63, name: 'companyEntryDescription', type: 'A', required: true },
  { start: 64, end: 69, name: 'companyDescriptiveDate', type: 'A' },
  { start: 70, end: 75, name: 'effectiveEntryDate', type: 'D', required: true },
  { start: 76, end: 78, name: 'settlementDate', type: 'A' },
  { start: 79, end: 79, name: 'originatorStatusCode', type: 'A', required: true },
  { start: 80, end: 87, name: 'originatingDfiIdentification', type: 'N', required: true },
  { start: 88, end: 94, name: 'batchNumber', type: 'N', required: true }
];

export const ENTRY_DETAIL_FIELDS: NachaField[] = [
  { start: 1, end: 1, name: 'recordTypeCode', type: 'N', required: true, constant: '6' },
  { start: 2, end: 3, name: 'transactionCode', type: 'N', required: true },
  { start: 4, end: 11, name: 'receivingDfiIdentification', type: 'N', required: true },
  { start: 12, end: 12, name: 'checkDigit', type: 'N', required: true },
  { start: 13, end: 29, name: 'dfiAccountNumber', type: 'A', required: true },
  { start: 30, end: 39, name: 'amount', type: '$', required: true },
  { start: 40, end: 54, name: 'individualIdentificationNumber', type: 'A' },
  { start: 55, end: 76, name: 'individualName', type: 'A', required: true },
  { start: 77, end: 78, name: 'discretionaryData', type: 'A' },
  { start: 79, end: 79, name: 'addendaRecordIndicator', type: 'N', required: true },
  { start: 80, end: 94, name: 'traceNumber', type: 'N', required: true }
];

export const ADDENDA_FIELDS: NachaField[] = [
  { start: 1, end: 1, name: 'recordTypeCode', type: 'N', required: true, constant: '7' },
  { start: 2, end: 3, name: 'addendaTypeCode', type: 'N', required: true },
  { start: 4, end: 83, name: 'paymentRelatedInformation', type: 'A' },
  { start: 84, end: 87, name: 'addendaSequenceNumber', type: 'N', required: true },
  { start: 88, end: 94, name: 'entryDetailSequenceNumber', type: 'N', required: true }
];

export const BATCH_CONTROL_FIELDS: NachaField[] = [
  { start: 1, end: 1, name: 'recordTypeCode', type: 'N', required: true, constant: '8' },
  { start: 2, end: 4, name: 'serviceClassCode', type: 'N', required: true },
  { start: 5, end: 10, name: 'entryAddendaCount', type: 'N', required: true },
  { start: 11, end: 20, name: 'entryHash', type: 'N', required: true },
  { start: 21, end: 32, name: 'totalDebitAmount', type: '$', required: true },
  { start: 33, end: 44, name: 'totalCreditAmount', type: '$', required: true },
  { start: 45, end: 54, name: 'companyIdentification', type: 'A', required: true },
  { start: 55, end: 73, name: 'messageAuthenticationCode', type: 'A' },
  { start: 74, end: 79, name: 'reserved', type: 'A' },
  { start: 80, end: 87, name: 'originatingDfiIdentification', type: 'N', required: true },
  { start: 88, end: 94, name: 'batchNumber', type: 'N', required: true }
];

export const FILE_CONTROL_FIELDS: NachaField[] = [
  { start: 1, end: 1, name: 'recordTypeCode', type: 'N', required: true, constant: '9' },
  { start: 2, end: 7, name: 'batchCount', type: 'N', required: true },
  { start: 8, end: 13, name: 'blockCount', type: 'N', required: true },
  { start: 14, end: 21, name: 'entryAddendaCount', type: 'N', required: true },
  { start: 22, end: 31, name: 'entryHash', type: 'N', required: true },
  { start: 32, end: 43, name: 'totalDebitAmount', type: '$', required: true },
  { start: 44, end: 55, name: 'totalCreditAmount', type: '$', required: true },
  { start: 56, end: 94, name: 'reserved', type: 'A' }
];

/** A block of ten 9s pads the file out to a multiple of the blocking factor. */
export const NACHA_PAD_LINE = '9'.repeat(NACHA_RECORD_LENGTH);

/** Error codes surfaced to the screen. Kept stable because Treasury Ops has a lookup sheet. */
export const NACHA_ERRORS = {
  E001: 'File is empty',
  E002: 'Record is not 94 characters',
  E003: 'Unknown record type',
  E004: 'File header missing or not first',
  E005: 'File control missing or not last',
  E006: 'Batch header without matching batch control',
  E007: 'Batch control without open batch',
  E008: 'Entry detail outside a batch',
  E009: 'Addenda without preceding entry detail',
  E010: 'Required field blank',
  E011: 'Numeric field contains non-digits',
  E012: 'Constant field has unexpected value',
  E013: 'Invalid date',
  E014: 'Entry hash does not match batch control',
  E015: 'Debit total does not match batch control',
  E016: 'Credit total does not match batch control',
  E017: 'Entry/addenda count does not match batch control',
  E018: 'Batch count does not match file control',
  E019: 'Block count does not match file control',
  E020: 'File totals do not match sum of batches',
  E021: 'Receiving DFI check digit invalid',
  E022: 'Unsupported standard entry class code',
  E023: 'Service class code does not match entries',
  E024: 'Effective entry date is not a business day',
  E025: 'Addenda indicator set but no addenda follows',
  E026: 'Trace number does not carry originating DFI',
  E027: 'Immediate origin does not match this organisation',
  E028: 'Amount exceeds per transaction limit',
  E029: 'Batch total exceeds per day limit',
  W001: 'File creation date is more than 5 days old',
  W002: 'Prenote entry with non zero amount',
  W003: 'Company entry description is blank',
  W004: 'Individual name is truncated'
} as const;

export type NachaErrorCode = keyof typeof NACHA_ERRORS;
