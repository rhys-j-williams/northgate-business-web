import { createFeatureSelector, createSelector } from '@ngrx/store';

import { ApprovalsState } from './approvals.reducer';

export const selectApprovalsState = createFeatureSelector<ApprovalsState>('approvals');

export const selectAllApprovals = createSelector(selectApprovalsState, s => s.items);
export const selectApprovalsLoading = createSelector(selectApprovalsState, s => s.loading);
export const selectApprovalsError = createSelector(selectApprovalsState, s => s.error);
export const selectApprovalsFilter = createSelector(selectApprovalsState, s => s.filter);
export const selectDecidingIds = createSelector(selectApprovalsState, s => s.deciding);

export const selectPendingApprovals = createSelector(selectAllApprovals, items => items.filter(i => i.status === 'pending'));
export const selectPendingCount = createSelector(selectPendingApprovals, items => items.length);

export const selectFilteredApprovals = createSelector(selectAllApprovals, selectApprovalsFilter, (items, filter) =>
  items.filter(i =>
    (filter.kind === 'all' || i.kind === filter.kind) &&
    (filter.status === 'all' || (filter.status === 'pending' ? i.status === 'pending' : i.status !== 'pending'))
  ));

export const selectSelectedApproval = createSelector(selectApprovalsState,
  s => s.selectedId ? s.items.find(i => i.approvalId === s.selectedId) || null : null);

export const selectApprovalForSubject = (subjectId: string) =>
  createSelector(selectAllApprovals, items => items.find(i => i.subjectId === subjectId) || null);
