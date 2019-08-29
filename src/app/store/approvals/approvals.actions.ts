/**
 * Approvals queue actions. Newer than entitlements (2021, MBZ-1042) so createAction, but still in
 * the same store. The reducer is the heart of the dual approval rules and is the one part of this
 * application with a proper test file.
 */
import { createAction, props } from '@ngrx/store';

import { ApprovalDecision, ApprovalRequest } from '../../core/models';

export const loadApprovals = createAction('[Approvals] Load');
export const loadApprovalsSuccess = createAction('[Approvals] Load Success', props<{ approvals: ApprovalRequest[]; loadedAt: string }>());
export const loadApprovalsFailure = createAction('[Approvals] Load Failure', props<{ error: string }>());

export const setApprovalsFilter = createAction('[Approvals] Set Filter', props<{ kind: ApprovalRequest['kind'] | 'all'; status: 'pending' | 'decided' | 'all' }>());
export const selectApproval = createAction('[Approvals] Select', props<{ approvalId: string | null }>());

export const decide = createAction('[Approvals] Decide', props<{ approvalId: string; decision: ApprovalDecision }>());
export const decideSuccess = createAction('[Approvals] Decide Success', props<{ approval: ApprovalRequest }>());
export const decideFailure = createAction('[Approvals] Decide Failure', props<{ approvalId: string; error: string }>());

export const approvalReceived = createAction('[Approvals] Received', props<{ approval: ApprovalRequest }>());
export const approvalWithdrawn = createAction('[Approvals] Withdrawn', props<{ approvalId: string }>());
export const expireStale = createAction('[Approvals] Expire Stale', props<{ now: string }>());
