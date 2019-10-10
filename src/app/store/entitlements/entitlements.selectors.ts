import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Entitlement } from '@meridian/domain-fixtures';

import { EntitlementsState } from './entitlements.reducer';

export const selectEntitlementsState = createFeatureSelector<EntitlementsState>('entitlements');

export const selectEntitlementsLoaded = createSelector(selectEntitlementsState, s => s.loaded);
export const selectEntitlementsLoading = createSelector(selectEntitlementsState, s => s.loading);
export const selectEntitlementsLoadError = createSelector(selectEntitlementsState, s => s.loadError);

export const selectAllEntitlements = createSelector(selectEntitlementsState,
  s => s.ids.map(id => s.drafts[id] || s.byId[id]));

export const selectSavedEntitlements = createSelector(selectEntitlementsState,
  s => s.ids.map(id => s.byId[id]));

export const selectDirtyIds = createSelector(selectEntitlementsState, s => Object.keys(s.drafts));

export const selectHasUnsavedChanges = createSelector(selectDirtyIds, ids => ids.length > 0);

export const selectSelectedEntitlement = createSelector(selectEntitlementsState,
  (s): Entitlement | null => s.selectedId ? (s.drafts[s.selectedId] || s.byId[s.selectedId] || null) : null);

export const selectSelectedIsDirty = createSelector(selectEntitlementsState,
  s => !!s.selectedId && !!s.drafts[s.selectedId]);

export const selectSavingIds = createSelector(selectEntitlementsState, s => Object.keys(s.saving));

export const selectEntitlementError = (entitlementId: string) =>
  createSelector(selectEntitlementsState, s => s.errors[entitlementId] || null);

export const selectEntitlementByHandle = (handle: string) =>
  createSelector(selectAllEntitlements, all => all.find(e => e.userHandle === handle) || null);

export const selectApproverCount = createSelector(selectSavedEntitlements,
  all => all.filter(e => e.permissions.indexOf('payments:approve') >= 0).length);
