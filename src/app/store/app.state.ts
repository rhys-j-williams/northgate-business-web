import { ActionReducerMap, MetaReducer } from '@ngrx/store';

import { environment } from '../../environments/environment';
import { ApprovalsState, approvalsReducer } from './approvals/approvals.reducer';
import { EntitlementsState, entitlementsReducer } from './entitlements/entitlements.reducer';

export interface AppState {
  entitlements: EntitlementsState;
  approvals: ApprovalsState;
}

export const reducers: ActionReducerMap<AppState> = {
  entitlements: entitlementsReducer,
  approvals: approvalsReducer
};

export const metaReducers: MetaReducer<AppState>[] = environment.production ? [] : [];
