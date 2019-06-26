/**
 * Two tests. Exactly two, on purpose.
 *
 * This service is the best tested thing in the application and the two specs below are wide
 * rather than many: one round trips a synthetic file and asserts the whole parsed shape, the other
 * feeds a file with known defects and asserts every issue the validator should raise. When the
 * parser changes, the failing expectation tells you what moved. Adding a dozen one-line specs on
 * top made the suite slower and the failures noisier the last time someone tried (MBZ-1290, 2021,
 * reverted). If you need a new case, extend the fixture and the expectations here.
 */
import { NachaParserService } from './nacha-parser.service';
import { buildDefectiveNachaText, buildNachaFile, buildNachaText, NACHA_FIXTURE_COMPANY, NACHA_FIXTURE_ODFI, NACHA_FIXTURE_ORIGIN } from './testing/nacha-fixtures';
import { NACHA_RECORD_LENGTH } from './nacha-format.constants';

describe('NachaParserService', () => {
  let parser: NachaParserService;

  beforeEach(() => {
    parser = new NachaParserService();
  });

  it('parses a synthetic payroll file, agrees with its own totals and round trips it byte for byte', () => {
    const source = buildNachaFile({ entries: 6, batches: 2, withAddenda: true });
    const text = buildNachaText({ entries: 6, batches: 2, withAddenda: true });
    const lines = text.split('\r\n').filter(l => l.length > 0);

    // Physical layout: header, 2 x (batch header + 6 entries + 6 addenda + control), file control. Exactly 3 blocks, no padding.
    expect(lines.length % 10).toBe(0);
    expect(lines.length).toBe(30);
    expect(lines.every(l => l.length === NACHA_RECORD_LENGTH)).toBeTrue();

    const result = parser.parse(text, { expectedOrigin: NACHA_FIXTURE_ORIGIN, asOf: '2019-07-11', allowAnyEffectiveDate: false });

    expect(result.valid).toBeTrue();
    expect(result.issues).toEqual([]);

    expect(result.file.header).toEqual(jasmine.objectContaining({
      immediateOrigin: NACHA_FIXTURE_ORIGIN,
      immediateDestination: '021000000',
      immediateOriginName: NACHA_FIXTURE_COMPANY,
      fileCreationDate: '190710',
      fileIdModifier: 'A'
    }));

    expect(result.summary).toEqual({
      batches: 2,
      entries: 12,
      addenda: 12,
      totalDebitMinor: 0,
      totalCreditMinor: source.batches[0].computed.totalCreditAmountMinor + source.batches[1].computed.totalCreditAmountMinor,
      effectiveDates: ['190712'],
      secCodes: ['PPD']
    });

    const first = result.file.batches[0];
    expect(first.companyName).toBe(NACHA_FIXTURE_COMPANY);
    expect(first.serviceClassCode).toBe('220');
    expect(first.originatingDfiIdentification).toBe(NACHA_FIXTURE_ODFI);
    expect(first.entries.length).toBe(6);
    expect(first.control).toEqual(first.computed);
    expect(first.entries.map(e => e.direction)).toEqual(['credit', 'credit', 'credit', 'credit', 'credit', 'credit']);
    expect(first.entries.map(e => e.transactionCode)).toEqual(['22', '22', '32', '22', '22', '32']);
    expect(first.entries.every(e => e.receivingDfiIdentification === NACHA_FIXTURE_ODFI)).toBeTrue();
    expect(first.entries.every(e => e.amountMinor === source.batches[0].entries[first.entries.indexOf(e)].amountMinor)).toBeTrue();
    expect(first.entries[0].addenda[0].paymentRelatedInformation).toBe('PAYROLL PERIOD ENDING 07/12/2019');
    expect(first.entries[0].traceNumber).toBe(NACHA_FIXTURE_ODFI + '0000001');

    expect(result.file.control).toEqual({
      batchCount: 2,
      blockCount: 3,
      entryAddendaCount: 24,
      entryHash: (first.computed.entryHash + result.file.batches[1].computed.entryHash) % 10000000000,
      totalDebitAmountMinor: 0,
      totalCreditAmountMinor: result.summary.totalCreditMinor
    });
    expect(result.file.padLines).toBe(0);

    // Round trip. Serialising what we parsed must give back the exact input.
    expect(parser.serialize(result.file)).toBe(text);

    // And LF input parses identically.
    const lf = parser.parse(text.replace(/\r\n/g, '\n'), { asOf: '2019-07-11' });
    expect(lf.valid).toBeTrue();
    expect(lf.summary).toEqual(result.summary);
  });

  it('reports every defect in a broken file with stable codes and line numbers, and never throws', () => {
    const text = buildDefectiveNachaText({ entries: 6 });
    const result = parser.parse(text, {
      expectedOrigin: '1779999999',
      perTransactionLimitMinor: 400000,
      perDayLimitMinor: 1000000,
      asOf: '2019-08-30'
    });

    expect(result.valid).toBeFalse();
    const codes = result.issues.map(i => `${i.code}@${i.line}`);

    // File level
    expect(codes).toContain('E027@1');            // origin does not match the organisation
    expect(codes).toContain('W001@1');            // created more than five days before asOf
    // Batch header (line 2)
    expect(codes).toContain('E022@2');            // IAT is not something we originate
    expect(codes).toContain('E024@2');            // 13 July 2019 was a Saturday
    expect(codes).toContain('E029@2');            // six payroll credits beat the per day limit
    // Entry 2 (line 4) has a wrong check digit
    expect(codes).toContain('E021@4');
    // Batch control (line 9) credit total is 100 short
    expect(codes).toContain('E016@9');
    // File control (line 10) totals now disagree with the batches
    expect(codes).toContain('E020@10');

    // Every entry above the per transaction limit is flagged, and nothing else is.
    const overLimit = result.file.batches[0].entries.filter(e => e.amountMinor > 400000).map(e => `E028@${e.line}`);
    expect(codes.filter(c => c.indexOf('E028') === 0)).toEqual(overLimit);

    // No spurious structural complaints; the file is still well formed.
    ['E001', 'E002', 'E003', 'E004', 'E005', 'E006', 'E007', 'E008', 'E009', 'E010', 'E011', 'E012', 'E013', 'E014', 'E015', 'E017', 'E018', 'E019']
      .forEach(code => expect(codes.some(c => c.indexOf(code) === 0)).withContext(`did not expect ${code}`).toBeFalse());

    // Issues are ordered by line, errors before warnings, and carry the lookup sheet message.
    for (let i = 1; i < result.issues.length; i++) {
      expect(result.issues[i].line).toBeGreaterThanOrEqual(result.issues[i - 1].line);
    }
    const e021 = result.issues.find(i => i.code === 'E021');
    expect(e021.message).toBe('Receiving DFI check digit invalid');
    expect(e021.severity).toBe('error');
    expect(e021.field).toBe('checkDigit');

    // Malformed input degrades, it does not throw.
    expect(parser.parse('').issues.map(i => i.code)).toEqual(['E001']);
    const garbage = parser.parse('hello\r\n' + 'x'.repeat(94) + '\r\n');
    expect(garbage.valid).toBeFalse();
    expect(garbage.issues.map(i => i.code)).toContain('E002');
    expect(garbage.issues.map(i => i.code)).toContain('E003');
    expect(garbage.issues.map(i => i.code)).toContain('E004');
    expect(garbage.issues.map(i => i.code)).toContain('E005');
    expect(() => parser.parse(undefined as any)).toThrowError(TypeError);
  });
});
