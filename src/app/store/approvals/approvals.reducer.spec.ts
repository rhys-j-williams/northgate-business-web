import * as moment from 'moment';

import { ApprovalDecision, ApprovalRequest } from '../../core/models';
import * as A from './approvals.actions';
import { applyDecision, approvalsReducer, initialApprovalsState, ApprovalsState } from './approvals.reducer';
import { selectFilteredApprovals, selectPendingCount, selectApprovalForSubject } from './approvals.selectors';

// Characterisation tests for the approvals reducer. These encode Treasury Ops policy
// (MBZ-604, MBZ-1042, GIS-1310) and were the only thing standing between us and INC-40117
// happening twice. Do not loosen them to make a refactor pass.

const NOW = '2024-03-12T14:00:00.000Z';

function request(overrides: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    approvalId: 'APR-0001',
    organisationId: 'ORG-0001',
    kind: 'wire',
    subjectId: 'WIRE-0001',
    summary: 'Domestic wire to Northwind Supply Co',
    amountMinor: 1250000,
    requestedBy: 'j.okafor',
    requestedAt: '2024-03-12T09:30:00.000Z',
    requiredApprovals: 2,
    decisions: [],
    status: 'pending',
    expiresAt: '2024-03-13T09:30:00.000Z',
    ...overrides
  };
}

function decision(approverHandle: string, verdict: ApprovalDecision['decision'] = 'approved', decidedAt = NOW): ApprovalDecision {
  return { approverHandle, decision: verdict, decidedAt };
}

function loaded(...items: ApprovalRequest[]): ApprovalsState {
  return approvalsReducer(initialApprovalsState, A.loadApprovalsSuccess({ approvals: items, loadedAt: NOW }));
}

describe('applyDecision', () => {
  it('keeps the request pending until requiredApprovals distinct approvals exist', () => {
    const first = applyDecision(request(), decision('m.reyes'));
    expect(first.status).toBe('pending');
    expect(first.decisions.length).toBe(1);

    const second = applyDecision(first, decision('a.lindqvist'));
    expect(second.status).toBe('approved');
    expect(second.decisions.length).toBe(2);
  });

  it('approves immediately when only one approval is required', () => {
    const result = applyDecision(request({ requiredApprovals: 1 }), decision('m.reyes'));
    expect(result.status).toBe('approved');
  });

  it('rejects the request on the first rejection even if approvals already exist', () => {
    const partly = applyDecision(request(), decision('m.reyes'));
    const result = applyDecision(partly, decision('a.lindqvist', 'rejected'));
    expect(result.status).toBe('rejected');
    expect(result.decisions.length).toBe(2);
  });

  it('ignores a decision from the requester', () => {
    const original = request();
    const result = applyDecision(original, decision('j.okafor'));
    expect(result).toBe(original);
  });

  it('ignores a second decision from the same approver', () => {
    const first = applyDecision(request(), decision('m.reyes'));
    const again = applyDecision(first, decision('m.reyes'));
    expect(again).toBe(first);
    expect(again.status).toBe('pending');
  });

  it('does not count the same approver twice towards the threshold', () => {
    const seeded = request({ decisions: [decision('m.reyes'), decision('m.reyes')] });
    const result = applyDecision(seeded, decision('a.lindqvist'));
    // two approvers in reality, so approved; the duplicate does not make it three
    expect(result.status).toBe('approved');
    const distinct = new Set(result.decisions.filter(d => d.decision === 'approved').map(d => d.approverHandle));
    expect(distinct.size).toBe(2);
  });

  it('expires instead of applying when the decision is after expiresAt', () => {
    const late = decision('m.reyes', 'approved', moment('2024-03-13T09:30:00.000Z').add(1, 'minute').toISOString());
    const result = applyDecision(request(), late);
    expect(result.status).toBe('expired');
    expect(result.decisions.length).toBe(0);
  });

  it('accepts a decision exactly at expiresAt', () => {
    const onTime = decision('m.reyes', 'approved', '2024-03-13T09:30:00.000Z');
    expect(applyDecision(request({ requiredApprovals: 1 }), onTime).status).toBe('approved');
  });

  it('leaves non pending requests untouched', () => {
    for (const status of ['approved', 'rejected', 'expired', 'withdrawn'] as ApprovalRequest['status'][]) {
      const fixed = request({ status });
      expect(applyDecision(fixed, decision('m.reyes'))).toBe(fixed);
    }
  });

  it('does not mutate its input', () => {
    const original = request();
    const snapshot = JSON.stringify(original);
    applyDecision(original, decision('m.reyes'));
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe('approvalsReducer', () => {
  it('starts empty with the pending filter', () => {
    const state = approvalsReducer(undefined, { type: '@@init' });
    expect(state.items).toEqual([]);
    expect(state.filter).toEqual({ kind: 'all', status: 'pending' });
    expect(state.loading).toBeFalse();
  });

  it('marks loading and clears a previous error on load', () => {
    const errored: ApprovalsState = { ...initialApprovalsState, error: 'boom' };
    const state = approvalsReducer(errored, A.loadApprovals());
    expect(state.loading).toBeTrue();
    expect(state.error).toBeNull();
  });

  it('stores loaded items newest first', () => {
    const older = request({ approvalId: 'APR-OLD', requestedAt: '2024-03-10T09:00:00.000Z' });
    const newer = request({ approvalId: 'APR-NEW', requestedAt: '2024-03-12T09:00:00.000Z' });
    const state = loaded(older, newer);
    expect(state.items.map(i => i.approvalId)).toEqual(['APR-NEW', 'APR-OLD']);
    expect(state.loadedAt).toBe(NOW);
    expect(state.loading).toBeFalse();
  });

  it('records a load failure', () => {
    const state = approvalsReducer({ ...initialApprovalsState, loading: true }, A.loadApprovalsFailure({ error: 'BFF 503' }));
    expect(state.loading).toBeFalse();
    expect(state.error).toBe('BFF 503');
  });

  it('applies a decision optimistically and tracks the in flight id', () => {
    const state = approvalsReducer(loaded(request()), A.decide({ approvalId: 'APR-0001', decision: decision('m.reyes') }));
    expect(state.items[0].decisions.length).toBe(1);
    expect(state.items[0].status).toBe('pending');
    expect(state.deciding).toEqual(['APR-0001']);
  });

  it('ignores a decision for an unknown approval', () => {
    const before = loaded(request());
    const after = approvalsReducer(before, A.decide({ approvalId: 'APR-NOPE', decision: decision('m.reyes') }));
    expect(after).toBe(before);
  });

  it('replaces the optimistic copy with the server copy on success', () => {
    const optimistic = approvalsReducer(loaded(request()), A.decide({ approvalId: 'APR-0001', decision: decision('m.reyes') }));
    const server = request({ decisions: [{ ...decision('m.reyes'), comment: 'ok' }], status: 'pending' });
    const state = approvalsReducer(optimistic, A.decideSuccess({ approval: server }));
    expect(state.items[0].decisions[0].comment).toBe('ok');
    expect(state.deciding).toEqual([]);
  });

  it('rolls the optimistic decision back on failure and records the error', () => {
    const optimistic = approvalsReducer(loaded(request({ requiredApprovals: 1 })), A.decide({ approvalId: 'APR-0001', decision: decision('m.reyes') }));
    expect(optimistic.items[0].status).toBe('approved');

    const state = approvalsReducer(optimistic, A.decideFailure({ approvalId: 'APR-0001', error: 'Limit exceeded' }));
    expect(state.items[0].status).toBe('pending');
    expect(state.items[0].decisions.length).toBe(0);
    expect(state.deciding).toEqual([]);
    expect(state.decisionErrors['APR-0001']).toBe('Limit exceeded');
  });

  it('clears a previous decision error when deciding again', () => {
    const errored: ApprovalsState = { ...loaded(request()), decisionErrors: { 'APR-0001': 'old' } };
    const state = approvalsReducer(errored, A.decide({ approvalId: 'APR-0001', decision: decision('m.reyes') }));
    expect(state.decisionErrors['APR-0001']).toBeUndefined();
  });

  it('inserts a pushed approval at the top and updates an existing one in place', () => {
    const state = loaded(request({ approvalId: 'APR-0001' }), request({ approvalId: 'APR-0002', requestedAt: '2024-03-11T09:00:00.000Z' }));
    const inserted = approvalsReducer(state, A.approvalReceived({ approval: request({ approvalId: 'APR-0003' }) }));
    expect(inserted.items.map(i => i.approvalId)).toEqual(['APR-0003', 'APR-0001', 'APR-0002']);

    const updated = approvalsReducer(inserted, A.approvalReceived({ approval: request({ approvalId: 'APR-0002', summary: 'changed' }) }));
    expect(updated.items.map(i => i.approvalId)).toEqual(['APR-0003', 'APR-0001', 'APR-0002']);
    expect(updated.items[2].summary).toBe('changed');
  });

  it('withdraws only pending requests and clears the selection if it was selected', () => {
    const state: ApprovalsState = {
      ...loaded(request({ approvalId: 'APR-P' }), request({ approvalId: 'APR-A', status: 'approved' })),
      selectedId: 'APR-P'
    };
    const afterP = approvalsReducer(state, A.approvalWithdrawn({ approvalId: 'APR-P' }));
    expect(afterP.items.find(i => i.approvalId === 'APR-P').status).toBe('withdrawn');
    expect(afterP.selectedId).toBeNull();

    const afterA = approvalsReducer(afterP, A.approvalWithdrawn({ approvalId: 'APR-A' }));
    expect(afterA.items.find(i => i.approvalId === 'APR-A').status).toBe('approved');
  });

  it('expires pending requests past their expiry and leaves the rest', () => {
    const state = loaded(
      request({ approvalId: 'APR-STALE', expiresAt: '2024-03-12T13:00:00.000Z' }),
      request({ approvalId: 'APR-FRESH', expiresAt: '2024-03-12T15:00:00.000Z' }),
      request({ approvalId: 'APR-DONE', status: 'approved', expiresAt: '2024-03-01T00:00:00.000Z' })
    );
    const after = approvalsReducer(state, A.expireStale({ now: NOW }));
    const byId = (id: string) => after.items.find(i => i.approvalId === id).status;
    expect(byId('APR-STALE')).toBe('expired');
    expect(byId('APR-FRESH')).toBe('pending');
    expect(byId('APR-DONE')).toBe('approved');
  });

  it('stores filter and selection', () => {
    let state = approvalsReducer(initialApprovalsState, A.setApprovalsFilter({ kind: 'ach-batch', status: 'all' }));
    expect(state.filter).toEqual({ kind: 'ach-batch', status: 'all' });
    state = approvalsReducer(state, A.selectApproval({ approvalId: 'APR-0001' }));
    expect(state.selectedId).toBe('APR-0001');
  });
});

describe('approvals selectors', () => {
  const state = loaded(
    request({ approvalId: 'APR-1', kind: 'wire', subjectId: 'WIRE-1' }),
    request({ approvalId: 'APR-2', kind: 'ach-batch', subjectId: 'ACH-1' }),
    request({ approvalId: 'APR-3', kind: 'wire', subjectId: 'WIRE-2', status: 'approved' })
  );

  it('filters pending by default', () => {
    expect(selectFilteredApprovals.projector(state.items, state.filter).map(i => i.approvalId)).toEqual(['APR-1', 'APR-2']);
    expect(selectPendingCount.projector(state.items.filter(i => i.status === 'pending'))).toBe(2);
  });

  it('filters by kind and decided status', () => {
    const wiresDecided = selectFilteredApprovals.projector(state.items, { kind: 'wire', status: 'decided' });
    expect(wiresDecided.map(i => i.approvalId)).toEqual(['APR-3']);
    const all = selectFilteredApprovals.projector(state.items, { kind: 'all', status: 'all' });
    expect(all.length).toBe(3);
  });

  it('finds the approval for a subject', () => {
    expect(selectApprovalForSubject('ACH-1').projector(state.items).approvalId).toBe('APR-2');
    expect(selectApprovalForSubject('nope').projector(state.items)).toBeNull();
  });
});
