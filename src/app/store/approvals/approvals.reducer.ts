import { createReducer, on } from '@ngrx/store';
import * as moment from 'moment';
import * as _ from 'lodash';

import { ApprovalDecision, ApprovalRequest } from '../../core/models';
import * as A from './approvals.actions';

export interface ApprovalsState {
  items: ApprovalRequest[];
  loading: boolean;
  loadedAt: string | null;
  error: string | null;
  deciding: string[];
  decisionErrors: { [approvalId: string]: string };
  filter: { kind: ApprovalRequest['kind'] | 'all'; status: 'pending' | 'decided' | 'all' };
  selectedId: string | null;
}

export const initialApprovalsState: ApprovalsState = {
  items: [],
  loading: false,
  loadedAt: null,
  error: null,
  deciding: [],
  decisionErrors: {},
  filter: { kind: 'all', status: 'pending' },
  selectedId: null
};

/**
 * Applies a decision to a request. Pure, exported for the specs and for the wire detail screen
 * which previews the outcome before the user confirms.
 *
 * Rules (Treasury Ops policy, MBZ-604, MBZ-1042, GIS-1310):
 *  - a rejected decision ends the request regardless of prior approvals
 *  - the requester may not approve their own request
 *  - the same approver may not approve twice
 *  - the request is approved once distinct approvals reach requiredApprovals
 *  - decisions on a non pending request are ignored
 *  - a decision after expiresAt expires the request instead of applying
 */
export function applyDecision(request: ApprovalRequest, decision: ApprovalDecision): ApprovalRequest {
  if (request.status !== 'pending') {
    return request;
  }
  if (moment(decision.decidedAt).isAfter(moment(request.expiresAt))) {
    return { ...request, status: 'expired' };
  }
  if (decision.approverHandle === request.requestedBy) {
    return request;
  }
  if (_.some(request.decisions, d => d.approverHandle === decision.approverHandle)) {
    return request;
  }
  const decisions = [...request.decisions, decision];
  if (decision.decision === 'rejected') {
    return { ...request, decisions, status: 'rejected' };
  }
  const approvals = _.uniqBy(decisions.filter(d => d.decision === 'approved'), d => d.approverHandle).length;
  return { ...request, decisions, status: approvals >= request.requiredApprovals ? 'approved' : 'pending' };
}

function upsert(items: ApprovalRequest[], approval: ApprovalRequest): ApprovalRequest[] {
  const index = _.findIndex(items, { approvalId: approval.approvalId });
  if (index < 0) {
    return [approval, ...items];
  }
  return [...items.slice(0, index), approval, ...items.slice(index + 1)];
}

export const approvalsReducer = createReducer(
  initialApprovalsState,

  on(A.loadApprovals, state => ({ ...state, loading: true, error: null })),

  on(A.loadApprovalsSuccess, (state, { approvals, loadedAt }) => ({
    ...state,
    items: _.orderBy(approvals, ['requestedAt'], ['desc']),
    loading: false,
    loadedAt,
    error: null
  })),

  on(A.loadApprovalsFailure, (state, { error }) => ({ ...state, loading: false, error })),

  on(A.setApprovalsFilter, (state, { kind, status }) => ({ ...state, filter: { kind, status } })),

  on(A.selectApproval, (state, { approvalId }) => ({ ...state, selectedId: approvalId })),

  on(A.decide, (state, { approvalId, decision }) => {
    const current = _.find(state.items, { approvalId });
    if (!current) {
      return state;
    }
    // Optimistic. The success action replaces with the server copy; failure rolls back.
    return {
      ...state,
      items: upsert(state.items, applyDecision(current, decision)),
      deciding: _.union(state.deciding, [approvalId]),
      decisionErrors: _.omit(state.decisionErrors, approvalId)
    };
  }),

  on(A.decideSuccess, (state, { approval }) => ({
    ...state,
    items: upsert(state.items, approval),
    deciding: _.without(state.deciding, approval.approvalId)
  })),

  on(A.decideFailure, (state, { approvalId, error }) => {
    // Roll the optimistic decision back: drop the last decision made by anyone on this request.
    const current = _.find(state.items, { approvalId });
    const rolledBack = current ? { ...current, decisions: current.decisions.slice(0, -1), status: 'pending' as const } : null;
    return {
      ...state,
      items: rolledBack ? upsert(state.items, rolledBack) : state.items,
      deciding: _.without(state.deciding, approvalId),
      decisionErrors: { ...state.decisionErrors, [approvalId]: error }
    };
  }),

  on(A.approvalReceived, (state, { approval }) => ({ ...state, items: upsert(state.items, approval) })),

  on(A.approvalWithdrawn, (state, { approvalId }) => ({
    ...state,
    items: state.items.map(i => i.approvalId === approvalId && i.status === 'pending' ? { ...i, status: 'withdrawn' as const } : i),
    selectedId: state.selectedId === approvalId ? null : state.selectedId
  })),

  on(A.expireStale, (state, { now }) => ({
    ...state,
    items: state.items.map(i => i.status === 'pending' && moment(i.expiresAt).isBefore(moment(now)) ? { ...i, status: 'expired' as const } : i)
  }))
);
