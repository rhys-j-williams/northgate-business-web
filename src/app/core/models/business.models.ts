/**
 * Business banking domain types. These mirror the bff-business contracts in
 * platform-services/apps/bff-business/src/contracts (when they exist; the BFF has been "next
 * quarter" since MBZ-1180). Anything carrying account data comes from @meridian/domain-fixtures.
 */
import { Account, Customer, Entitlement, Payee, Transaction } from '@meridian/domain-fixtures';

export type MoneyMinor = number;

export interface Organisation {
  organisationId: string;
  name: string;
  taxIdLastFour: string;
  primaryCustomer: Customer;
  accounts: Account[];
  enrolledAt: string;
}

export interface BusinessUser {
  userId: string;
  handle: string;
  displayName: string;
  email: string;
  role: Entitlement['role'];
  status: 'active' | 'invited' | 'locked' | 'disabled';
  lastLoginAt: string | null;
  mfaEnrolled: boolean;
  entitlementId: string;
}

export type PayrollRunStatus = 'draft' | 'scheduled' | 'submitted' | 'settled' | 'cancelled' | 'returned';

export interface PayrollEmployee {
  employeeId: string;
  name: string;
  payee: Payee;
  payType: 'salary' | 'hourly';
  defaultAmountMinor: MoneyMinor;
  active: boolean;
}

export interface PayrollLine {
  employeeId: string;
  amountMinor: MoneyMinor;
  memo: string;
}

export interface PayrollRun {
  runId: string;
  organisationId: string;
  fundingAccountId: string;
  payDate: string;
  createdAt: string;
  createdBy: string;
  status: PayrollRunStatus;
  lines: PayrollLine[];
  totalMinor: MoneyMinor;
  traceNumber?: string;
}

export type AchBatchStatus = 'uploaded' | 'validated' | 'rejected' | 'pending-approval' | 'released' | 'settled' | 'returned';
export type SecCode = 'PPD' | 'CCD' | 'CTX' | 'WEB' | 'TEL';

export interface AchBatch {
  batchId: string;
  organisationId: string;
  fileName: string;
  secCode: SecCode;
  companyEntryDescription: string;
  effectiveEntryDate: string;
  uploadedAt: string;
  uploadedBy: string;
  status: AchBatchStatus;
  entryCount: number;
  totalDebitMinor: MoneyMinor;
  totalCreditMinor: MoneyMinor;
  offsetAccountId: string;
  validationErrors: string[];
  fileHash?: string;
}

export interface AchTemplate {
  templateId: string;
  organisationId: string;
  name: string;
  secCode: SecCode;
  companyEntryDescription: string;
  offsetAccountId: string;
  entries: Array<{ payeeId: string; amountMinor: MoneyMinor; transactionCode: string }>;
  updatedAt: string;
}

export type WireStatus = 'draft' | 'pending-approval' | 'approved' | 'rejected' | 'sent' | 'confirmed' | 'cancelled' | 'returned';

export interface WireBeneficiary {
  beneficiaryId: string;
  organisationId: string;
  name: string;
  bankName: string;
  routingNumber: string;
  accountNumberLastFour: string;
  addressLine: string;
  verified: boolean;
  addedAt: string;
}

export interface Wire {
  wireId: string;
  organisationId: string;
  fromAccountId: string;
  beneficiary: WireBeneficiary;
  amountMinor: MoneyMinor;
  currency: 'USD';
  valueDate: string;
  reference: string;
  purpose: string;
  status: WireStatus;
  initiatedBy: string;
  initiatedAt: string;
  approvals: ApprovalDecision[];
  imad?: string;
  omad?: string;
}

export type ApprovalItemKind = 'wire' | 'ach-batch' | 'payroll-run' | 'user-change' | 'entitlement-change';

export interface ApprovalDecision {
  approverHandle: string;
  decision: 'approved' | 'rejected';
  decidedAt: string;
  comment?: string;
}

export interface ApprovalRequest {
  approvalId: string;
  organisationId: string;
  kind: ApprovalItemKind;
  subjectId: string;
  summary: string;
  amountMinor: MoneyMinor | null;
  requestedBy: string;
  requestedAt: string;
  requiredApprovals: number;
  decisions: ApprovalDecision[];
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'withdrawn';
  expiresAt: string;
}

export interface AuditEvent {
  eventId: string;
  organisationId: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  outcome: 'success' | 'denied' | 'error';
  correlationId: string;
  detail?: string;
}

export type ReportKind = 'transactions' | 'ach-activity' | 'wire-activity' | 'payroll-register' | 'user-access' | 'balance-history';

export interface ReportDefinition {
  reportId: string;
  kind: ReportKind;
  name: string;
  description: string;
  parameters: Array<'dateRange' | 'account' | 'status' | 'user'>;
  owner: string;
}

export interface ReportRun {
  runId: string;
  reportId: string;
  requestedAt: string;
  requestedBy: string;
  parameters: Record<string, string>;
  rowCount: number;
  fileName: string;
  status: 'queued' | 'ready' | 'failed' | 'expired';
}

export interface BusinessAlert {
  alertId: string;
  code: string;
  label: string;
  description: string;
  regulatory: boolean;
  enabled: boolean;
  channels: string[];
  thresholdMinor?: MoneyMinor;
  lastFiredAt: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TransactionQuery {
  accountId: string;
  from?: string;
  to?: string;
  channel?: Transaction['channel'] | null;
  status?: Transaction['status'] | null;
  text?: string;
  /** MBZ-1402. Debit/credit chip on the activity screen. */
  direction?: 'debit' | 'credit';
  minAmountMinor?: number;
  /** field:asc|desc. Only postedAt and amountMinor are honoured by the BFF. */
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface Statement {
  statementId: string;
  accountId: string;
  periodStart: string;
  periodEnd: string;
  closingBalanceMinor: MoneyMinor;
  pages: number;
}
