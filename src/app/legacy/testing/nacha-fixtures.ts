/**
 * Synthetic NACHA files for the parser specs and for the ACH upload screen's "load a sample"
 * link. Account data comes from @meridian/domain-fixtures so nothing here is ever a real account:
 * routing numbers are the test range number, names are the fixture payees, amounts are seeded.
 *
 * Deterministic for a given seed. Change the seed and the specs change; do not.
 */
import { generateFixtures, Payee, SeededRandom, TEST_ROUTING_NUMBER } from '@meridian/domain-fixtures';
import * as moment from 'moment';

import { NachaBatch, NachaEntry, NachaFile, NachaParserService } from '../nacha-parser.service';
import { NACHA_SERVICE_CLASS_CODES, NACHA_TRANSACTION_CODES } from '../nacha-format.constants';

export const NACHA_FIXTURE_SEED = 'mbz-nacha-2019';
export const NACHA_FIXTURE_ORIGIN = '1770000001';
export const NACHA_FIXTURE_ODFI = TEST_ROUTING_NUMBER.substring(0, 8);
export const NACHA_FIXTURE_COMPANY = 'HARBORLIGHT LLC';

export interface NachaFixtureOptions {
  seed?: string;
  entries?: number;
  batches?: number;
  secCode?: 'PPD' | 'CCD' | 'CTX';
  effectiveDate?: string;
  withAddenda?: boolean;
  creationDate?: string;
}

function fixturePayees(seed: string, count: number): Payee[] {
  const fixtures = generateFixtures({ seed, customers: Math.max(8, Math.ceil(count / 2)), segmentMix: { consumer: 0, smallBusiness: 1, treasury: 0 } });
  const payees = fixtures.payees.slice(0, count);
  // If the fixture set is too small for the request, recycle.
  while (payees.length < count) {
    payees.push(fixtures.payees[payees.length % fixtures.payees.length]);
  }
  return payees;
}

/** A structurally valid payroll style credits only file. */
export function buildNachaFile(options: NachaFixtureOptions = {}): NachaFile {
  const seed = options.seed || NACHA_FIXTURE_SEED;
  const rng = new SeededRandom(seed + ':nacha');
  const parser = new NachaParserService();
  const entriesPerBatch = options.entries || 6;
  const batchCount = options.batches || 1;
  const effective = options.effectiveDate || '190712'; // a Friday
  const created = options.creationDate || '190710';
  const payees = fixturePayees(seed, entriesPerBatch * batchCount);

  const batches: NachaBatch[] = [];
  let payeeIndex = 0;
  for (let b = 0; b < batchCount; b++) {
    const batchNumber = String(b + 1).padStart(7, '0');
    const entries: NachaEntry[] = [];
    for (let e = 0; e < entriesPerBatch; e++) {
      const payee = payees[payeeIndex++];
      const routingPrefix = payee.routingNumber.substring(0, 8);
      const traceSequence = String(e + 1).padStart(7, '0');
      const entry: NachaEntry = {
        line: 0,
        transactionCode: e % 3 === 2 ? NACHA_TRANSACTION_CODES.SAVINGS_CREDIT : NACHA_TRANSACTION_CODES.CHECKING_CREDIT,
        receivingDfiIdentification: routingPrefix,
        checkDigit: parser.checkDigitFor(routingPrefix),
        // Fixture payees only carry the last four; the rest of the account number is synthetic filler.
        dfiAccountNumber: `${rng.int(100000, 999999)}${payee.accountNumberLastFour}`,
        amountMinor: rng.int(85000, 425000),
        individualIdentificationNumber: `EMP${String(payeeIndex).padStart(5, '0')}`,
        // 21 not 22: a full 22 character name trips W004 in the parser and ops treat it as a truncation.
        individualName: payee.name.toUpperCase().substring(0, 21),
        discretionaryData: '  ',
        addendaRecordIndicator: options.withAddenda ? '1' : '0',
        traceNumber: `${NACHA_FIXTURE_ODFI}${traceSequence}`,
        addenda: [],
        direction: 'credit',
        prenote: false
      };
      if (options.withAddenda) {
        entry.addenda.push({
          line: 0,
          addendaTypeCode: '05',
          paymentRelatedInformation: `PAYROLL PERIOD ENDING ${moment(effective, 'YYMMDD').format('MM/DD/YYYY')}`,
          addendaSequenceNumber: '0001',
          entryDetailSequenceNumber: traceSequence
        });
      }
      entries.push(entry);
    }
    batches.push({
      headerLine: 0,
      controlLine: null,
      serviceClassCode: NACHA_SERVICE_CLASS_CODES.CREDITS_ONLY,
      companyName: NACHA_FIXTURE_COMPANY,
      companyDiscretionaryData: '',
      companyIdentification: NACHA_FIXTURE_ORIGIN,
      standardEntryClassCode: options.secCode || 'PPD',
      companyEntryDescription: 'PAYROLL',
      companyDescriptiveDate: moment(effective, 'YYMMDD').format('MMMDD').toUpperCase(),
      effectiveEntryDate: effective,
      originatorStatusCode: '1',
      originatingDfiIdentification: NACHA_FIXTURE_ODFI,
      batchNumber,
      entries,
      control: null,
      computed: { entryAddendaCount: 0, entryHash: 0, totalDebitAmountMinor: 0, totalCreditAmountMinor: 0 }
    });
  }

  const file: NachaFile = {
    header: {
      immediateDestination: ` ${TEST_ROUTING_NUMBER}`,
      immediateOrigin: NACHA_FIXTURE_ORIGIN,
      fileCreationDate: created,
      fileCreationTime: '0930',
      fileIdModifier: 'A',
      immediateDestinationName: 'MERIDIAN TRUST BANK',
      immediateOriginName: NACHA_FIXTURE_COMPANY,
      referenceCode: ''
    },
    batches,
    control: null,
    lineCount: 0,
    padLines: 0
  };
  // serialize() recomputes the control records from the entries, so run the totals first.
  for (const batch of batches) {
    let hash = 0;
    let credit = 0;
    let count = 0;
    for (const entry of batch.entries) {
      hash += parseInt(entry.receivingDfiIdentification, 10);
      credit += entry.amountMinor;
      count += 1 + entry.addenda.length;
    }
    batch.computed = { entryAddendaCount: count, entryHash: hash % 10000000000, totalDebitAmountMinor: 0, totalCreditAmountMinor: credit };
  }
  return file;
}

export function buildNachaText(options: NachaFixtureOptions = {}): string {
  return new NachaParserService().serialize(buildNachaFile(options));
}

/**
 * The same file with four deliberate defects, one per category the validation screen groups by:
 * a bad check digit on entry 2, a credit total in the batch control that is 100 cents short, an
 * effective date on a Saturday, and an IAT batch header (unsupported SEC). Line numbers are
 * stable because the fixture is.
 */
export function buildDefectiveNachaText(options: NachaFixtureOptions = {}): string {
  const lines = buildNachaText({ ...options, effectiveDate: '190713' }).split('\r\n');
  // line 1 header, line 2 batch header, lines 3.. entries
  const entryLine = 3 + 1; // second entry
  lines[entryLine - 1] = lines[entryLine - 1].substring(0, 11) + '0' + lines[entryLine - 1].substring(12);
  if (lines[entryLine - 1].charAt(11) === lines[3].charAt(11)) {
    // the real digit happened to be 0; use 9 instead
    lines[entryLine - 1] = lines[entryLine - 1].substring(0, 11) + '9' + lines[entryLine - 1].substring(12);
  }
  const batchHeader = lines[1];
  lines[1] = batchHeader.substring(0, 50) + 'IAT' + batchHeader.substring(53);
  const controlIndex = lines.findIndex(l => l.charAt(0) === '8');
  const control = lines[controlIndex];
  const credit = parseInt(control.substring(32, 44), 10) - 100;
  lines[controlIndex] = control.substring(0, 32) + String(credit).padStart(12, '0') + control.substring(44);
  return lines.join('\r\n');
}
