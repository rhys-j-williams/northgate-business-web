/**
 * Hand rolled entity map. We looked at @ngrx/entity in 2019 and decided the adapter hid too much
 * for a team that had never used Redux (MBZ-140 comments). Meridian Online went the other way.
 * The shape is: byId for the saved server state, drafts for unsaved edits keyed the same way,
 * so "dirty" is just "is there a draft".
 */
import { Entitlement } from '@meridian/domain-fixtures';
import * as _ from 'lodash';

import { EntitlementsActions, EntitlementsActionTypes } from './entitlements.actions';

export interface EntitlementsState {
  byId: { [entitlementId: string]: Entitlement };
  ids: string[];
  drafts: { [entitlementId: string]: Entitlement };
  saving: { [entitlementId: string]: boolean };
  errors: { [entitlementId: string]: string };
  selectedId: string | null;
  loading: boolean;
  loaded: boolean;
  loadError: string | null;
}

export const initialEntitlementsState: EntitlementsState = {
  byId: {},
  ids: [],
  drafts: {},
  saving: {},
  errors: {},
  selectedId: null,
  loading: false,
  loaded: false,
  loadError: null
};

// The canonical permission list. Mirrors permissionsFor() in domain-fixtures and the BFF's
// entitlement catalogue. If you add one here add it there too.
export const ALL_PERMISSIONS: string[] = [
  'accounts:view',
  'payments:initiate',
  'payments:approve',
  'users:manage',
  'entitlements:manage',
  'reports:run',
  'audit:read'
];

export const ROLE_DEFAULT_PERMISSIONS: { [role: string]: string[] } = {
  administrator: ['users:manage', 'accounts:view', 'payments:initiate', 'payments:approve', 'reports:run', 'entitlements:manage'],
  approver: ['accounts:view', 'payments:approve', 'reports:run'],
  initiator: ['accounts:view', 'payments:initiate', 'reports:run'],
  auditor: ['accounts:view', 'reports:run', 'audit:read'],
  viewer: ['accounts:view']
};

function draftFor(state: EntitlementsState, entitlementId: string): Entitlement | null {
  return state.drafts[entitlementId] || state.byId[entitlementId] || null;
}

function withDraft(state: EntitlementsState, entitlementId: string, mutate: (draft: Entitlement) => Entitlement): EntitlementsState {
  const current = draftFor(state, entitlementId);
  if (!current) {
    return state;
  }
  const next = mutate(_.cloneDeep(current));
  // If the draft is identical to the saved record, drop it, so the dirty flag clears.
  if (_.isEqual(next, state.byId[entitlementId])) {
    return { ...state, drafts: _.omit(state.drafts, entitlementId), errors: _.omit(state.errors, entitlementId) };
  }
  return { ...state, drafts: { ...state.drafts, [entitlementId]: next }, errors: _.omit(state.errors, entitlementId) };
}

export function entitlementsReducer(state: EntitlementsState = initialEntitlementsState, action: EntitlementsActions): EntitlementsState {
  switch (action.type) {

    case EntitlementsActionTypes.Load:
      return { ...state, loading: true, loadError: null };

    case EntitlementsActionTypes.LoadSuccess: {
      const byId: { [id: string]: Entitlement } = {};
      const ids: string[] = [];
      for (const entitlement of action.payload) {
        byId[entitlement.entitlementId] = entitlement;
        ids.push(entitlement.entitlementId);
      }
      return { ...state, byId, ids, loading: false, loaded: true, loadError: null, drafts: {}, saving: {}, errors: {} };
    }

    case EntitlementsActionTypes.LoadFailure:
      return { ...state, loading: false, loaded: false, loadError: action.payload };

    case EntitlementsActionTypes.Select:
      return { ...state, selectedId: action.payload };

    case EntitlementsActionTypes.UpdateRole:
      return withDraft(state, action.payload.entitlementId, draft => ({
        ...draft,
        role: action.payload.role,
        // Changing role resets permissions to the role default; limits only make sense for initiators.
        permissions: [...(ROLE_DEFAULT_PERMISSIONS[action.payload.role] || ['accounts:view'])],
        limitPerTransactionMinor: action.payload.role === 'initiator' || action.payload.role === 'administrator' ? draft.limitPerTransactionMinor : undefined,
        limitPerDayMinor: action.payload.role === 'initiator' || action.payload.role === 'administrator' ? draft.limitPerDayMinor : undefined
      }));

    case EntitlementsActionTypes.UpdateLimits:
      return withDraft(state, action.payload.entitlementId, draft => {
        const next = { ...draft };
        if (action.payload.perTransactionMinor !== undefined) {
          next.limitPerTransactionMinor = action.payload.perTransactionMinor;
        }
        if (action.payload.perDayMinor !== undefined) {
          next.limitPerDayMinor = action.payload.perDayMinor;
        }
        // Per day can never be under per transaction. Treasury Ops rule, MBZ-611.
        if (next.limitPerDayMinor !== undefined && next.limitPerTransactionMinor !== undefined && next.limitPerDayMinor < next.limitPerTransactionMinor) {
          next.limitPerDayMinor = next.limitPerTransactionMinor;
        }
        return next;
      });

    case EntitlementsActionTypes.TogglePermission:
      return withDraft(state, action.payload.entitlementId, draft => {
        const has = draft.permissions.indexOf(action.payload.permission) >= 0;
        let permissions = has
          ? draft.permissions.filter(p => p !== action.payload.permission)
          : [...draft.permissions, action.payload.permission];
        // accounts:view is implied by everything else and cannot be removed while anything remains.
        if (permissions.length > 0 && permissions.indexOf('accounts:view') < 0) {
          permissions = ['accounts:view', ...permissions];
        }
        return { ...draft, permissions: _.sortBy(permissions, p => ALL_PERMISSIONS.indexOf(p)) };
      });

    case EntitlementsActionTypes.ToggleDualApproval:
      return withDraft(state, action.payload.entitlementId, draft => ({ ...draft, dualApprovalRequired: !draft.dualApprovalRequired }));

    case EntitlementsActionTypes.Save:
      return { ...state, saving: { ...state.saving, [action.payload.entitlementId]: true } };

    case EntitlementsActionTypes.SaveSuccess: {
      const id = action.payload.entitlementId;
      return {
        ...state,
        byId: { ...state.byId, [id]: action.payload },
        ids: state.ids.indexOf(id) >= 0 ? state.ids : [...state.ids, id],
        drafts: _.omit(state.drafts, id),
        saving: _.omit(state.saving, id),
        errors: _.omit(state.errors, id)
      };
    }

    case EntitlementsActionTypes.SaveFailure:
      return {
        ...state,
        saving: _.omit(state.saving, action.payload.entitlementId),
        errors: { ...state.errors, [action.payload.entitlementId]: action.payload.error }
      };

    case EntitlementsActionTypes.DiscardChanges:
      return { ...state, drafts: _.omit(state.drafts, action.payload.entitlementId), errors: _.omit(state.errors, action.payload.entitlementId) };

    default:
      return state;
  }
}
