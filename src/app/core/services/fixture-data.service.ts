/* tslint:disable:max-line-length */
/**
 * In process data source for Meridian Business.
 *
 * History, because people keep asking: when the app was scaffolded in January 2019 (MBZ-12) the
 * business BFF did not exist and the team wired the screens straight to a JSON fixture file. The
 * BFF (bff-business, PLAT-410) arrived in mid 2020 and the API client was written against it, but
 * the fixture path was kept for the smoke stage and for laptops, and in practice every developer
 * runs with useFixtures=true. In 2023 the JSON files were replaced by @meridian/domain-fixtures so
 * that the data matches what the mocks serve (MBZ-1998). This service is the result: it takes the
 * seeded FixtureSet and derives everything the business screens need from it.
 *
 * It is long. It has been long since 2019. Splitting it up is MBZ-1453, which is in the backlog
 * with the other things that are in the backlog.
 *
 * Nothing in here is a real customer. Card numbers fail Luhn, routing numbers are 021000000,
 * emails are @example.com. See DATA_CLASSIFICATION.md.
 */
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import * as moment from 'moment';
import * as _ from 'lodash';
import {
  Account, AlertPreference, Customer, Entitlement, FixtureSet, generateFixtures, Payee, SeededRandom,
  TEST_ROUTING_NUMBER, Transaction
} from '@meridian/domain-fixtures';

import { environment } from '../../../environments/environment';
import {
  AchBatch, AchTemplate, ApprovalDecision, ApprovalRequest, AuditEvent, BusinessAlert, BusinessUser,
  Organisation, Page, PayrollEmployee, PayrollRun, ReportDefinition, ReportRun, Statement, TransactionQuery, Wire,
  WireBeneficiary
} from '../models';

const SIMULATED_LATENCY_MS = 120;

const BENEFICIARY_BANKS = [
  'First Harbour Bank', 'Cascade Community Bank', 'Northline Savings', 'Prairie State Trust',
  'Bluewater Credit Union', 'Ironwood National Bank'
];

const WIRE_PURPOSES = [
  'Supplier invoice', 'Equipment purchase', 'Rent', 'Professional fees', 'Inventory deposit',
  'Contractor settlement', 'Insurance premium'
];

const EMPLOYEE_MEMOS = ['Salary', 'Salary', 'Hourly', 'Bonus', 'Expenses'];

const AUDIT_ACTIONS: Array<[string, string]> = [
  ['user.login', 'session'],
  ['wire.initiate', 'wire'],
  ['wire.approve', 'wire'],
  ['ach.upload', 'ach-batch'],
  ['ach.release', 'ach-batch'],
  ['payroll.submit', 'payroll-run'],
  ['entitlement.update', 'entitlement'],
  ['user.invite', 'user'],
  ['report.export', 'report'],
  ['alert.update', 'alert']
];

const REPORT_CATALOGUE: ReportDefinition[] = [
  { reportId: 'RPT-TXN', kind: 'transactions', name: 'Transaction detail', description: 'Posted and pending activity for one or all accounts.', parameters: ['dateRange', 'account', 'status'], owner: 'business-digital' },
  { reportId: 'RPT-ACH', kind: 'ach-activity', name: 'ACH origination activity', description: 'Batches uploaded, released and returned, with NACHA totals.', parameters: ['dateRange', 'status'], owner: 'business-digital' },
  { reportId: 'RPT-WIRE', kind: 'wire-activity', name: 'Wire activity', description: 'Outgoing wires with approval trail and Fed reference.', parameters: ['dateRange', 'status', 'user'], owner: 'business-digital' },
  { reportId: 'RPT-PAY', kind: 'payroll-register', name: 'Payroll register', description: 'Per employee amounts for each payroll run.', parameters: ['dateRange'], owner: 'business-digital' },
  { reportId: 'RPT-USR', kind: 'user-access', name: 'User access review', description: 'Users, roles, limits and last login. Required quarterly by GIS-STD-014 s2.', parameters: ['user'], owner: 'gis-appsec' },
  { reportId: 'RPT-BAL', kind: 'balance-history', name: 'Balance history', description: 'End of day ledger and available balances.', parameters: ['dateRange', 'account'], owner: 'business-digital' }
];

@Injectable({ providedIn: 'root' })
export class FixtureDataService {
  private readonly fixtures: FixtureSet;
  private readonly random: SeededRandom;
  private readonly asOf: moment.Moment;

  private organisation: Organisation;
  private users: BusinessUser[] = [];
  private employees: PayrollEmployee[] = [];
  private payrollRuns: PayrollRun[] = [];
  private achBatches: AchBatch[] = [];
  private achTemplates: AchTemplate[] = [];
  private beneficiaries: WireBeneficiary[] = [];
  private wires: Wire[] = [];
  private approvals: ApprovalRequest[] = [];
  private auditEvents: AuditEvent[] = [];
  private reportRuns: ReportRun[] = [];
  private alerts: BusinessAlert[] = [];

  constructor() {
    // A fixed asOf keeps screenshots stable across the estate (domain-fixtures does the same).
    this.asOf = moment('2024-11-15T00:00:00.000Z');
    this.fixtures = generateFixtures({
      seed: environment.fixtureSeed || 'meridian-business',
      customers: 40,
      // Business heavy mix; we do not want thirty consumers we cannot show.
      segmentMix: { consumer: 0.1, smallBusiness: 0.8, treasury: 0.1 },
      asOf: this.asOf.toISOString()
    });
    this.random = new SeededRandom(`${environment.fixtureSeed}-business-derived`);

    this.organisation = this.buildOrganisation();
    this.users = this.buildUsers();
    this.employees = this.buildEmployees();
    this.beneficiaries = this.buildBeneficiaries();
    this.payrollRuns = this.buildPayrollRuns();
    this.achBatches = this.buildAchBatches();
    this.achTemplates = this.buildAchTemplates();
    this.wires = this.buildWires();
    this.approvals = this.buildApprovals();
    this.auditEvents = this.buildAudit();
    this.reportRuns = this.buildReportRuns();
    this.alerts = this.buildAlerts();
  }

  // ------------------------------------------------------------------ organisation and accounts

  getOrganisation(): Observable<Organisation> {
    return this.respond(this.organisation);
  }

  getAccounts(): Observable<Account[]> {
    return this.respond(this.organisation.accounts);
  }

  getAccount(accountId: string): Observable<Account> {
    const account = _.find(this.organisation.accounts, { accountId });
    return account ? this.respond(account) : this.notFound('account', accountId);
  }

  getTransactions(query: TransactionQuery): Observable<Page<Transaction>> {
    let rows = _.filter(this.fixtures.transactions, { accountId: query.accountId });
    if (query.from) {
      const from = moment(query.from).startOf('day');
      rows = rows.filter(t => moment(t.postedAt).isSameOrAfter(from));
    }
    if (query.to) {
      const to = moment(query.to).endOf('day');
      rows = rows.filter(t => moment(t.postedAt).isSameOrBefore(to));
    }
    if (query.channel) {
      rows = rows.filter(t => t.channel === query.channel);
    }
    if (query.status) {
      rows = rows.filter(t => t.status === query.status);
    }
    if (query.text) {
      const needle = query.text.toLowerCase();
      rows = rows.filter(t => t.description.toLowerCase().indexOf(needle) >= 0 || t.merchantName.toLowerCase().indexOf(needle) >= 0);
    }
    if (query.direction) {
      rows = rows.filter(t => query.direction === 'debit' ? t.amountMinor < 0 : t.amountMinor > 0);
    }
    if (query.minAmountMinor) {
      rows = rows.filter(t => Math.abs(t.amountMinor) >= query.minAmountMinor);
    }
    const [sortField, sortDir] = (query.sort || 'postedAt:desc').split(':');
    rows = _.orderBy(rows, [sortField === 'amountMinor' ? (t: Transaction) => Math.abs(t.amountMinor) : 'postedAt'], [sortDir === 'asc' ? 'asc' : 'desc']);
    const pageSize = query.pageSize || 25;
    const page = query.page || 0;
    return this.respond({
      items: rows.slice(page * pageSize, (page + 1) * pageSize),
      total: rows.length,
      page,
      pageSize
    });
  }

  /**
   * Monthly statements derived from the transaction history. There is no statement fixture; the
   * closing balance is the running balance of the last posted transaction in the month.
   */
  getStatements(accountId: string): Observable<Statement[]> {
    const account = _.find(this.organisation.accounts, { accountId });
    if (!account) {
      return this.notFound('account', accountId);
    }
    const byMonth = _.groupBy(_.filter(this.fixtures.transactions, { accountId }), t => moment(t.postedAt).format('YYYY-MM'));
    const statements: Statement[] = _.keys(byMonth).sort().reverse().map(month => {
      const rows = _.orderBy(byMonth[month], ['postedAt'], ['desc']);
      const end = moment(month, 'YYYY-MM').endOf('month');
      return {
        statementId: `STM-${accountId.slice(-6)}-${month.replace('-', '')}`,
        accountId,
        periodStart: moment(month, 'YYYY-MM').format('YYYY-MM-DD'),
        periodEnd: end.format('YYYY-MM-DD'),
        closingBalanceMinor: rows[0].runningBalanceMinor,
        pages: 1 + Math.ceil(rows.length / 45)
      };
    });
    // The current month has not closed yet.
    return this.respond(statements.filter(s => moment(s.periodEnd).isBefore(moment())));
  }

  getPayees(): Observable<Payee[]> {
    return this.respond(_.filter(this.fixtures.payees, { customerId: this.organisation.primaryCustomer.customerId }));
  }

  // ------------------------------------------------------------------------------------ users

  getUsers(): Observable<BusinessUser[]> {
    return this.respond(this.users);
  }

  getUser(userId: string): Observable<BusinessUser> {
    const user = _.find(this.users, { userId });
    return user ? this.respond(user) : this.notFound('user', userId);
  }

  getEntitlements(): Observable<Entitlement[]> {
    return this.respond(_.filter(this.fixtures.entitlements, { organisationId: this.organisation.organisationId }));
  }

  saveEntitlement(entitlement: Entitlement): Observable<Entitlement> {
    const index = _.findIndex(this.fixtures.entitlements, { entitlementId: entitlement.entitlementId });
    if (index >= 0) {
      this.fixtures.entitlements[index] = _.cloneDeep(entitlement);
    }
    this.audit('entitlement.update', entitlement.entitlementId, 'success');
    return this.respond(entitlement);
  }

  inviteUser(invite: Pick<BusinessUser, 'displayName' | 'email' | 'role'>): Observable<BusinessUser> {
    const user: BusinessUser = {
      userId: `USR-${this.random.digits(9)}`,
      handle: invite.email.split('@')[0],
      displayName: invite.displayName,
      email: invite.email,
      role: invite.role,
      status: 'invited',
      lastLoginAt: null,
      mfaEnrolled: false,
      entitlementId: `ENT-${this.random.digits(9)}`
    };
    this.users = [...this.users, user];
    this.audit('user.invite', user.userId, 'success');
    return this.respond(user);
  }

  // ---------------------------------------------------------------------------------- payroll

  getEmployees(): Observable<PayrollEmployee[]> {
    return this.respond(this.employees);
  }

  getPayrollRuns(): Observable<PayrollRun[]> {
    return this.respond(_.orderBy(this.payrollRuns, ['payDate'], ['desc']));
  }

  getPayrollRun(runId: string): Observable<PayrollRun> {
    const run = _.find(this.payrollRuns, { runId });
    return run ? this.respond(run) : this.notFound('payroll run', runId);
  }

  submitPayrollRun(run: PayrollRun): Observable<PayrollRun> {
    const submitted: PayrollRun = {
      ...run,
      runId: run.runId || `PAY-${this.random.digits(8)}`,
      status: 'scheduled',
      createdAt: moment().toISOString(),
      totalMinor: _.sumBy(run.lines, 'amountMinor'),
      traceNumber: `${TEST_ROUTING_NUMBER.substring(0, 8)}${this.random.digits(7)}`
    };
    this.payrollRuns = [submitted, ...this.payrollRuns.filter(r => r.runId !== submitted.runId)];
    this.audit('payroll.submit', submitted.runId, 'success');
    return this.respond(submitted);
  }

  // -------------------------------------------------------------------------------------- ach

  getAchBatches(): Observable<AchBatch[]> {
    return this.respond(_.orderBy(this.achBatches, ['uploadedAt'], ['desc']));
  }

  getAchBatch(batchId: string): Observable<AchBatch> {
    const batch = _.find(this.achBatches, { batchId });
    return batch ? this.respond(batch) : this.notFound('ACH batch', batchId);
  }

  addAchBatch(batch: AchBatch): Observable<AchBatch> {
    this.achBatches = [batch, ...this.achBatches];
    this.audit('ach.upload', batch.batchId, batch.status === 'rejected' ? 'error' : 'success');
    if (batch.status === 'pending-approval') {
      this.approvals = [this.approvalFor('ach-batch', batch.batchId, `ACH ${batch.secCode} ${batch.companyEntryDescription} (${batch.entryCount} entries)`, batch.totalDebitMinor + batch.totalCreditMinor, batch.uploadedBy), ...this.approvals];
    }
    return this.respond(batch);
  }

  getAchTemplates(): Observable<AchTemplate[]> {
    return this.respond(this.achTemplates);
  }

  saveAchTemplate(template: AchTemplate): Observable<AchTemplate> {
    const saved = { ...template, templateId: template.templateId || `TPL-${this.random.digits(6)}`, updatedAt: moment().toISOString() };
    this.achTemplates = [saved, ...this.achTemplates.filter(t => t.templateId !== saved.templateId)];
    return this.respond(saved);
  }

  // ------------------------------------------------------------------------------------ wires

  getBeneficiaries(): Observable<WireBeneficiary[]> {
    return this.respond(this.beneficiaries);
  }

  getWires(): Observable<Wire[]> {
    return this.respond(_.orderBy(this.wires, ['initiatedAt'], ['desc']));
  }

  getWire(wireId: string): Observable<Wire> {
    const wire = _.find(this.wires, { wireId });
    return wire ? this.respond(wire) : this.notFound('wire', wireId);
  }

  initiateWire(draft: Partial<Wire>, initiatedBy: string): Observable<Wire> {
    const wire: Wire = {
      wireId: `WIR-${this.random.digits(8)}`,
      organisationId: this.organisation.organisationId,
      fromAccountId: draft.fromAccountId,
      beneficiary: draft.beneficiary,
      amountMinor: draft.amountMinor,
      currency: 'USD',
      valueDate: draft.valueDate || moment().format('YYYY-MM-DD'),
      reference: draft.reference || '',
      purpose: draft.purpose || '',
      status: 'pending-approval',
      initiatedBy,
      initiatedAt: moment().toISOString(),
      approvals: []
    };
    this.wires = [wire, ...this.wires];
    this.approvals = [this.approvalFor('wire', wire.wireId, `Wire to ${wire.beneficiary.name}`, wire.amountMinor, initiatedBy), ...this.approvals];
    this.audit('wire.initiate', wire.wireId, 'success');
    return this.respond(wire);
  }

  // -------------------------------------------------------------------------------- approvals

  getApprovals(): Observable<ApprovalRequest[]> {
    return this.respond(_.orderBy(this.approvals, ['requestedAt'], ['desc']));
  }

  decideApproval(approvalId: string, decision: ApprovalDecision): Observable<ApprovalRequest> {
    const index = _.findIndex(this.approvals, { approvalId });
    if (index < 0) {
      return this.notFound('approval', approvalId);
    }
    const current = this.approvals[index];
    const decisions = [...current.decisions, decision];
    const approvedCount = decisions.filter(d => d.decision === 'approved').length;
    const status: ApprovalRequest['status'] = decision.decision === 'rejected'
      ? 'rejected'
      : approvedCount >= current.requiredApprovals ? 'approved' : 'pending';
    const updated: ApprovalRequest = { ...current, decisions, status };
    this.approvals = [...this.approvals.slice(0, index), updated, ...this.approvals.slice(index + 1)];

    if (current.kind === 'wire') {
      this.wires = this.wires.map(w => w.wireId === current.subjectId
        ? { ...w, approvals: decisions, status: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : w.status }
        : w);
    }
    if (current.kind === 'ach-batch' && status !== 'pending') {
      this.achBatches = this.achBatches.map(b => b.batchId === current.subjectId
        ? { ...b, status: status === 'approved' ? 'released' : 'rejected' }
        : b);
    }
    this.audit(`${current.kind}.${decision.decision === 'approved' ? 'approve' : 'reject'}`, current.subjectId, 'success');
    return this.respond(updated);
  }

  // ---------------------------------------------------------------------------------- reports

  getReportCatalogue(): Observable<ReportDefinition[]> {
    return this.respond(REPORT_CATALOGUE);
  }

  getReportRuns(): Observable<ReportRun[]> {
    return this.respond(_.orderBy(this.reportRuns, ['requestedAt'], ['desc']));
  }

  runReport(reportId: string, parameters: Record<string, string>, requestedBy: string): Observable<{ run: ReportRun; rows: Array<Record<string, unknown>> }> {
    const definition = _.find(REPORT_CATALOGUE, { reportId });
    if (!definition) {
      return this.notFound('report', reportId);
    }
    const rows = this.reportRows(definition, parameters);
    const run: ReportRun = {
      runId: `RUN-${this.random.digits(7)}`,
      reportId,
      requestedAt: moment().toISOString(),
      requestedBy,
      parameters,
      rowCount: rows.length,
      fileName: `${definition.kind}-${moment().format('YYYYMMDD-HHmmss')}.csv`,
      status: 'ready'
    };
    this.reportRuns = [run, ...this.reportRuns];
    this.audit('report.export', run.runId, 'success');
    return this.respond({ run, rows });
  }

  // ------------------------------------------------------------------------------------ audit

  getAuditEvents(limit = 200): Observable<AuditEvent[]> {
    return this.respond(_.take(_.orderBy(this.auditEvents, ['at'], ['desc']), limit));
  }

  // ----------------------------------------------------------------------------------- alerts

  getAlerts(): Observable<BusinessAlert[]> {
    return this.respond(this.alerts);
  }

  saveAlert(alert: BusinessAlert): Observable<BusinessAlert> {
    if (alert.regulatory && !alert.enabled) {
      return throwError({ status: 422, message: 'Regulatory alerts cannot be disabled' });
    }
    this.alerts = this.alerts.map(a => a.alertId === alert.alertId ? alert : a);
    this.audit('alert.update', alert.alertId, 'success');
    return this.respond(alert);
  }

  // =============================================================================== builders

  private buildOrganisation(): Organisation {
    // Pick the small business customer with the most accounts so the screens have something on them.
    const candidates = this.fixtures.customers.filter(c => c.segment === 'small-business');
    const primary = _.maxBy(candidates, c => _.filter(this.fixtures.accounts, { customerId: c.customerId }).length) || candidates[0];
    const entitlement = _.find(this.fixtures.entitlements, { customerId: primary.customerId });
    return {
      organisationId: entitlement ? entitlement.organisationId : `ORG-${this.random.digits(9)}`,
      name: primary.organisationName || `${primary.lastName} & Co`,
      taxIdLastFour: primary.taxIdLastFour || '0000',
      primaryCustomer: primary,
      accounts: _.filter(this.fixtures.accounts, { customerId: primary.customerId }),
      enrolledAt: primary.enrolledAt
    };
  }

  private buildUsers(): BusinessUser[] {
    const entitlements = _.filter(this.fixtures.entitlements, { organisationId: this.organisation.organisationId });
    // The roster for a small business is administrator, initiator, viewer. We want an approver too
    // or the dual approval screens are empty, so borrow the shape of a treasury roster for one.
    const extra: Entitlement = {
      ...entitlements[0],
      entitlementId: `ENT-${this.random.digits(9)}`,
      userHandle: `approver.${this.organisation.name.split(' ')[0].toLowerCase()}`,
      role: 'approver',
      permissions: ['accounts:view', 'payments:approve', 'reports:run'],
      dualApprovalRequired: false,
      limitPerTransactionMinor: undefined,
      limitPerDayMinor: undefined
    };
    this.fixtures.entitlements.push(extra);
    return [...entitlements, extra].map((e, index) => ({
      userId: `USR-${this.random.digits(9)}`,
      handle: e.userHandle,
      displayName: e.userHandle.split('.').slice(0, 2).map(_.capitalize).join(' '),
      email: `${e.userHandle}@example.com`,
      role: e.role,
      status: index === 3 && this.random.bool(0.4) ? 'locked' : 'active',
      lastLoginAt: this.asOf.clone().subtract(this.random.int(0, 30), 'days').subtract(this.random.int(0, 600), 'minutes').toISOString(),
      mfaEnrolled: e.role !== 'viewer' || this.random.bool(),
      entitlementId: e.entitlementId
    }));
  }

  private buildEmployees(): PayrollEmployee[] {
    const payees = _.filter(this.fixtures.payees, { customerId: this.organisation.primaryCustomer.customerId });
    const count = Math.max(4, Math.min(payees.length, 9));
    return _.range(count).map(i => {
      const payee = payees[i % payees.length];
      const salary = this.random.bool(0.7);
      return {
        employeeId: `EMP-${this.random.digits(6)}`,
        name: payee.name,
        payee,
        payType: salary ? 'salary' : 'hourly',
        defaultAmountMinor: salary ? this.random.minorUnits(2400, 6800) : this.random.minorUnits(900, 3200),
        active: i < count - 1 || this.random.bool(0.5)
      };
    });
  }

  private buildPayrollRuns(): PayrollRun[] {
    const funding = _.find(this.organisation.accounts, { type: 'business-checking' }) || this.organisation.accounts[0];
    const admin = this.users.find(u => u.role === 'administrator') || this.users[0];
    // Fortnightly Fridays back for a year.
    let payDate = this.asOf.clone().day(5);
    if (payDate.isAfter(this.asOf)) {
      payDate = payDate.subtract(7, 'days');
    }
    const runs: PayrollRun[] = [];
    for (let i = 0; i < 26; i++) {
      const lines = this.employees.filter(e => e.active || i > 6).map(e => ({
        employeeId: e.employeeId,
        amountMinor: e.payType === 'salary' ? e.defaultAmountMinor : Math.round(e.defaultAmountMinor * (0.8 + this.random.next() * 0.4)),
        memo: this.random.pick(EMPLOYEE_MEMOS)
      }));
      const status: PayrollRun['status'] = i === 0 ? 'scheduled' : i === 5 && this.random.bool(0.6) ? 'returned' : 'settled';
      runs.push({
        runId: `PAY-${this.random.digits(8)}`,
        organisationId: this.organisation.organisationId,
        fundingAccountId: funding.accountId,
        payDate: payDate.format('YYYY-MM-DD'),
        createdAt: payDate.clone().subtract(2, 'days').hour(9).toISOString(),
        createdBy: admin.handle,
        status,
        lines,
        totalMinor: _.sumBy(lines, 'amountMinor'),
        traceNumber: status === 'settled' ? `${TEST_ROUTING_NUMBER.substring(0, 8)}${this.random.digits(7)}` : undefined
      });
      payDate = payDate.clone().subtract(14, 'days');
    }
    return runs;
  }

  private buildAchBatches(): AchBatch[] {
    const offset = _.find(this.organisation.accounts, { type: 'business-checking' }) || this.organisation.accounts[0];
    const initiator = this.users.find(u => u.role === 'initiator') || this.users[0];
    const statuses: AchBatch['status'][] = ['settled', 'settled', 'settled', 'released', 'pending-approval', 'rejected', 'returned', 'settled'];
    return _.range(18).map(i => {
      const uploadedAt = this.asOf.clone().subtract(i * 5 + this.random.int(0, 3), 'days').hour(this.random.int(8, 16)).minute(this.random.int(0, 59));
      const secCode = this.random.pick<AchBatch['secCode']>(['PPD', 'CCD', 'CCD', 'CTX']);
      const entryCount = this.random.int(3, 40);
      const credit = secCode === 'CCD' && this.random.bool(0.3);
      const total = _.sum(_.range(entryCount).map(() => this.random.minorUnits(120, 5400)));
      const status = i === 0 ? 'pending-approval' : statuses[i % statuses.length];
      return {
        batchId: `ACH-${this.random.digits(8)}`,
        organisationId: this.organisation.organisationId,
        fileName: `${this.organisation.name.replace(/[^A-Za-z]/g, '').toUpperCase().substring(0, 8)}_${uploadedAt.format('YYYYMMDD')}_${secCode}.ach`,
        secCode,
        companyEntryDescription: secCode === 'PPD' ? 'PAYROLL' : credit ? 'VENDOR PAY' : 'COLLECTION',
        effectiveEntryDate: uploadedAt.clone().add(2, 'days').format('YYYY-MM-DD'),
        uploadedAt: uploadedAt.toISOString(),
        uploadedBy: initiator.handle,
        status,
        entryCount,
        totalDebitMinor: credit ? 0 : total,
        totalCreditMinor: credit ? total : 0,
        offsetAccountId: offset.accountId,
        validationErrors: status === 'rejected' ? ['Batch control total does not match sum of entry detail records', 'Entry hash mismatch (batch 1)'] : [],
        fileHash: this.random.digits(16)
      };
    });
  }

  private buildAchTemplates(): AchTemplate[] {
    const offset = _.find(this.organisation.accounts, { type: 'business-checking' }) || this.organisation.accounts[0];
    const payees = _.filter(this.fixtures.payees, { customerId: this.organisation.primaryCustomer.customerId });
    return [
      {
        templateId: 'TPL-100001',
        organisationId: this.organisation.organisationId,
        name: 'Monthly vendor payments',
        secCode: 'CCD',
        companyEntryDescription: 'VENDOR PAY',
        offsetAccountId: offset.accountId,
        entries: payees.slice(0, 4).map(p => ({ payeeId: p.payeeId, amountMinor: this.random.minorUnits(200, 4000), transactionCode: '22' })),
        updatedAt: this.asOf.clone().subtract(40, 'days').toISOString()
      },
      {
        templateId: 'TPL-100002',
        organisationId: this.organisation.organisationId,
        name: 'Quarterly tax deposit',
        secCode: 'CCD',
        companyEntryDescription: 'TAX PAYMT',
        offsetAccountId: offset.accountId,
        entries: payees.slice(-1).map(p => ({ payeeId: p.payeeId, amountMinor: this.random.minorUnits(3000, 9000), transactionCode: '22' })),
        updatedAt: this.asOf.clone().subtract(95, 'days').toISOString()
      }
    ];
  }

  private buildBeneficiaries(): WireBeneficiary[] {
    const payees = _.filter(this.fixtures.payees, { customerId: this.organisation.primaryCustomer.customerId });
    return payees.slice(0, 6).map((p, i) => ({
      beneficiaryId: `BEN-${this.random.digits(7)}`,
      organisationId: this.organisation.organisationId,
      name: p.name,
      bankName: BENEFICIARY_BANKS[i % BENEFICIARY_BANKS.length],
      routingNumber: TEST_ROUTING_NUMBER,
      accountNumberLastFour: p.accountNumberLastFour,
      addressLine: `${this.random.int(10, 999)} ${this.random.pick(['Commerce', 'Harbour', 'Market', 'Union'])} Street, ${this.organisation.primaryCustomer.address.city} ${this.organisation.primaryCustomer.address.state}`,
      verified: i < 5,
      addedAt: p.addedAt
    }));
  }

  private buildWires(): Wire[] {
    const from = _.find(this.organisation.accounts, { type: 'business-checking' }) || this.organisation.accounts[0];
    const initiator = this.users.find(u => u.role === 'initiator') || this.users[0];
    const approver = this.users.find(u => u.role === 'approver') || this.users[0];
    const admin = this.users.find(u => u.role === 'administrator') || this.users[0];
    const statuses: Wire['status'][] = ['confirmed', 'confirmed', 'sent', 'confirmed', 'rejected', 'confirmed', 'cancelled'];
    const wires: Wire[] = _.range(22).map(i => {
      const initiatedAt = this.asOf.clone().subtract(i * 4 + this.random.int(0, 2), 'days').hour(this.random.int(8, 15)).minute(this.random.int(0, 59));
      const status = i < 2 ? 'pending-approval' : statuses[i % statuses.length];
      const amountMinor = this.random.minorUnits(1500, 85000);
      const approvals: ApprovalDecision[] = [];
      if (status !== 'pending-approval' && status !== 'cancelled') {
        approvals.push({ approverHandle: approver.handle, decision: status === 'rejected' ? 'rejected' : 'approved', decidedAt: initiatedAt.clone().add(this.random.int(10, 240), 'minutes').toISOString(), comment: status === 'rejected' ? 'Beneficiary not on the approved list' : undefined });
        if (amountMinor > 2500000 && status !== 'rejected') {
          approvals.push({ approverHandle: admin.handle, decision: 'approved', decidedAt: initiatedAt.clone().add(this.random.int(250, 600), 'minutes').toISOString() });
        }
      }
      return {
        wireId: `WIR-${this.random.digits(8)}`,
        organisationId: this.organisation.organisationId,
        fromAccountId: from.accountId,
        beneficiary: this.random.pick(this.beneficiaries),
        amountMinor,
        currency: 'USD',
        valueDate: initiatedAt.clone().add(status === 'confirmed' ? 0 : 1, 'days').format('YYYY-MM-DD'),
        reference: `INV-${this.random.digits(5)}`,
        purpose: this.random.pick(WIRE_PURPOSES),
        status,
        initiatedBy: initiator.handle,
        initiatedAt: initiatedAt.toISOString(),
        approvals,
        imad: status === 'confirmed' || status === 'sent' ? `${initiatedAt.format('YYYYMMDD')}MMQFMPBQ${this.random.digits(6)}` : undefined,
        omad: status === 'confirmed' ? `${initiatedAt.format('YYYYMMDD')}B1Q8021C${this.random.digits(6)}${initiatedAt.format('MMDD')}${initiatedAt.format('HHmm')}FT01` : undefined
      };
    });
    return wires;
  }

  private buildApprovals(): ApprovalRequest[] {
    const pending: ApprovalRequest[] = [];
    this.wires.filter(w => w.status === 'pending-approval').forEach(w => {
      pending.push(this.approvalFor('wire', w.wireId, `Wire to ${w.beneficiary.name}`, w.amountMinor, w.initiatedBy, w.initiatedAt));
    });
    this.achBatches.filter(b => b.status === 'pending-approval').forEach(b => {
      pending.push(this.approvalFor('ach-batch', b.batchId, `ACH ${b.secCode} ${b.companyEntryDescription} (${b.entryCount} entries)`, b.totalDebitMinor + b.totalCreditMinor, b.uploadedBy, b.uploadedAt));
    });
    const viewer = this.users.find(u => u.role === 'viewer');
    if (viewer) {
      pending.push(this.approvalFor('entitlement-change', viewer.entitlementId, `Change ${viewer.displayName} from viewer to initiator`, null, (this.users.find(u => u.role === 'administrator') || this.users[0]).handle, this.asOf.clone().subtract(1, 'day').toISOString()));
    }
    // A few historic decided ones so the queue has a "recently decided" tab worth looking at.
    const approver = this.users.find(u => u.role === 'approver') || this.users[0];
    this.wires.filter(w => w.status === 'confirmed').slice(0, 5).forEach(w => {
      const req = this.approvalFor('wire', w.wireId, `Wire to ${w.beneficiary.name}`, w.amountMinor, w.initiatedBy, w.initiatedAt);
      pending.push({ ...req, status: 'approved', decisions: [{ approverHandle: approver.handle, decision: 'approved', decidedAt: moment(w.initiatedAt).add(1, 'hour').toISOString() }] });
    });
    return pending;
  }

  private approvalFor(kind: ApprovalRequest['kind'], subjectId: string, summary: string, amountMinor: number | null, requestedBy: string, requestedAt?: string): ApprovalRequest {
    const at = requestedAt ? moment(requestedAt) : moment();
    return {
      approvalId: `APR-${this.random.digits(8)}`,
      organisationId: this.organisation.organisationId,
      kind,
      subjectId,
      summary,
      amountMinor,
      requestedBy,
      requestedAt: at.toISOString(),
      // Dual approval over $25,000 has been the policy since MBZ-604; below that one approver.
      requiredApprovals: amountMinor !== null && amountMinor > 2500000 ? 2 : 1,
      decisions: [],
      status: 'pending',
      expiresAt: at.clone().add(2, 'days').toISOString()
    };
  }

  private buildAudit(): AuditEvent[] {
    return _.range(120).map(i => {
      const [action, targetKind] = this.random.pick(AUDIT_ACTIONS);
      const actor = this.random.pick(this.users);
      return {
        eventId: `EVT-${this.random.digits(10)}`,
        organisationId: this.organisation.organisationId,
        at: this.asOf.clone().subtract(i * 3 + this.random.int(0, 5), 'hours').toISOString(),
        actor: actor.handle,
        action,
        target: `${targetKind}:${this.random.digits(8)}`,
        outcome: this.random.bool(0.92) ? 'success' : this.random.bool() ? 'denied' : 'error',
        correlationId: `${this.random.digits(8)}-${this.random.digits(4)}-${this.random.digits(4)}`,
        detail: action === 'user.login' ? `Keystone, MFA ${actor.mfaEnrolled ? 'push' : 'not enrolled'}` : undefined
      };
    });
  }

  private buildReportRuns(): ReportRun[] {
    const admin = this.users.find(u => u.role === 'administrator') || this.users[0];
    return _.range(7).map(i => {
      const def = REPORT_CATALOGUE[i % REPORT_CATALOGUE.length];
      const at = this.asOf.clone().subtract(i * 9 + 1, 'days');
      return {
        runId: `RUN-${this.random.digits(7)}`,
        reportId: def.reportId,
        requestedAt: at.toISOString(),
        requestedBy: admin.handle,
        parameters: { from: at.clone().subtract(30, 'days').format('YYYY-MM-DD'), to: at.format('YYYY-MM-DD') },
        rowCount: this.random.int(12, 480),
        fileName: `${def.kind}-${at.format('YYYYMMDD-HHmmss')}.csv`,
        status: i > 4 ? 'expired' : 'ready'
      };
    });
  }

  private buildAlerts(): BusinessAlert[] {
    const prefs: AlertPreference[] = _.filter(this.fixtures.alertPreferences, { customerId: this.organisation.primaryCustomer.customerId });
    // Business only gets the subset that makes sense for a company account. Card alerts are on the
    // Meridian Online roadmap for business cards; not ours. MBZ-1877.
    const subset = prefs.filter(p => !/CARD|TRAVEL/.test(p.code));
    return subset.map(p => ({
      alertId: p.alertId,
      code: p.code,
      label: p.label,
      description: p.description,
      regulatory: p.regulatory,
      enabled: p.enabled,
      channels: p.channels,
      thresholdMinor: p.thresholdMinor,
      lastFiredAt: p.enabled && this.random.bool(0.6) ? this.asOf.clone().subtract(this.random.int(1, 40), 'days').toISOString() : null
    }));
  }

  private reportRows(definition: ReportDefinition, parameters: Record<string, string>): Array<Record<string, unknown>> {
    const from = parameters.from ? moment(parameters.from) : this.asOf.clone().subtract(30, 'days');
    const to = parameters.to ? moment(parameters.to).endOf('day') : this.asOf.clone().endOf('day');
    const inRange = (iso: string) => moment(iso).isBetween(from, to, undefined, '[]');
    switch (definition.kind) {
      case 'transactions': {
        const ids = this.organisation.accounts.map(a => a.accountId);
        return this.fixtures.transactions
          .filter(t => ids.indexOf(t.accountId) >= 0 && inRange(t.postedAt) && (!parameters.accountId || t.accountId === parameters.accountId))
          .map(t => ({ postedAt: t.postedAt, accountId: t.accountId, description: t.description, channel: t.channel, status: t.status, amountMinor: t.amountMinor, runningBalanceMinor: t.runningBalanceMinor }));
      }
      case 'ach-activity':
        return this.achBatches.filter(b => inRange(b.uploadedAt)).map(b => ({ uploadedAt: b.uploadedAt, fileName: b.fileName, secCode: b.secCode, status: b.status, entryCount: b.entryCount, totalDebitMinor: b.totalDebitMinor, totalCreditMinor: b.totalCreditMinor }));
      case 'wire-activity':
        return this.wires.filter(w => inRange(w.initiatedAt)).map(w => ({ initiatedAt: w.initiatedAt, beneficiary: w.beneficiary.name, amountMinor: w.amountMinor, status: w.status, initiatedBy: w.initiatedBy, approvals: w.approvals.map(a => `${a.approverHandle}:${a.decision}`).join('|'), imad: w.imad || '' }));
      case 'payroll-register':
        return _.flatMap(this.payrollRuns.filter(r => inRange(r.createdAt)), r => r.lines.map(l => ({ payDate: r.payDate, runId: r.runId, employeeId: l.employeeId, employee: (_.find(this.employees, { employeeId: l.employeeId }) || { name: '?' }).name, amountMinor: l.amountMinor, memo: l.memo, status: r.status })));
      case 'user-access':
        return this.users.map(u => ({ handle: u.handle, displayName: u.displayName, role: u.role, status: u.status, mfaEnrolled: u.mfaEnrolled, lastLoginAt: u.lastLoginAt || '' }));
      case 'balance-history':
      default: {
        // End of day balances reconstructed from the running balance on the last posted item per day.
        const ids = this.organisation.accounts.map(a => a.accountId);
        const grouped = _.groupBy(this.fixtures.transactions.filter(t => ids.indexOf(t.accountId) >= 0 && inRange(t.postedAt)), t => `${t.accountId}|${moment(t.postedAt).format('YYYY-MM-DD')}`);
        return _.map(grouped, (txns, key) => {
          const last = _.maxBy(txns, t => t.postedAt);
          return { accountId: key.split('|')[0], date: key.split('|')[1], ledgerBalanceMinor: last.runningBalanceMinor, itemCount: txns.length };
        });
      }
    }
  }

  private audit(action: string, target: string, outcome: AuditEvent['outcome']): void {
    this.auditEvents = [{
      eventId: `EVT-${this.random.digits(10)}`,
      organisationId: this.organisation.organisationId,
      at: moment().toISOString(),
      actor: 'you',
      action,
      target,
      outcome,
      correlationId: `${this.random.digits(8)}-${this.random.digits(4)}-${this.random.digits(4)}`
    }, ...this.auditEvents];
  }

  private respond<T>(value: T): Observable<T> {
    return of(value).pipe(delay(SIMULATED_LATENCY_MS), map(v => _.cloneDeep(v)));
  }

  private notFound<T>(kind: string, id: string): Observable<T> {
    return throwError({ status: 404, message: `No ${kind} ${id}` });
  }
}
