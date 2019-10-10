/**
 * Entitlements actions. Class based, the way NgRx 7 taught us in 2019 (MBZ-140). createAction
 * exists now and Meridian Online uses it; converting this file is MBZ-1901, not started.
 */
import { Action } from '@ngrx/store';
import { Entitlement } from '@meridian/domain-fixtures';

export enum EntitlementsActionTypes {
  Load = '[Entitlements] Load',
  LoadSuccess = '[Entitlements] Load Success',
  LoadFailure = '[Entitlements] Load Failure',
  Select = '[Entitlements] Select',
  UpdateRole = '[Entitlements] Update Role',
  UpdateLimits = '[Entitlements] Update Limits',
  TogglePermission = '[Entitlements] Toggle Permission',
  ToggleDualApproval = '[Entitlements] Toggle Dual Approval',
  Save = '[Entitlements] Save',
  SaveSuccess = '[Entitlements] Save Success',
  SaveFailure = '[Entitlements] Save Failure',
  DiscardChanges = '[Entitlements] Discard Changes'
}

export class LoadEntitlements implements Action {
  readonly type = EntitlementsActionTypes.Load;
}

export class LoadEntitlementsSuccess implements Action {
  readonly type = EntitlementsActionTypes.LoadSuccess;
  constructor(public payload: Entitlement[]) {}
}

export class LoadEntitlementsFailure implements Action {
  readonly type = EntitlementsActionTypes.LoadFailure;
  constructor(public payload: string) {}
}

export class SelectEntitlement implements Action {
  readonly type = EntitlementsActionTypes.Select;
  constructor(public payload: string | null) {}
}

export class UpdateEntitlementRole implements Action {
  readonly type = EntitlementsActionTypes.UpdateRole;
  constructor(public payload: { entitlementId: string; role: Entitlement['role'] }) {}
}

export class UpdateEntitlementLimits implements Action {
  readonly type = EntitlementsActionTypes.UpdateLimits;
  constructor(public payload: { entitlementId: string; perTransactionMinor?: number; perDayMinor?: number }) {}
}

export class ToggleEntitlementPermission implements Action {
  readonly type = EntitlementsActionTypes.TogglePermission;
  constructor(public payload: { entitlementId: string; permission: string }) {}
}

export class ToggleDualApproval implements Action {
  readonly type = EntitlementsActionTypes.ToggleDualApproval;
  constructor(public payload: { entitlementId: string }) {}
}

export class SaveEntitlement implements Action {
  readonly type = EntitlementsActionTypes.Save;
  constructor(public payload: { entitlementId: string }) {}
}

export class SaveEntitlementSuccess implements Action {
  readonly type = EntitlementsActionTypes.SaveSuccess;
  constructor(public payload: Entitlement) {}
}

export class SaveEntitlementFailure implements Action {
  readonly type = EntitlementsActionTypes.SaveFailure;
  constructor(public payload: { entitlementId: string; error: string }) {}
}

export class DiscardEntitlementChanges implements Action {
  readonly type = EntitlementsActionTypes.DiscardChanges;
  constructor(public payload: { entitlementId: string }) {}
}

export type EntitlementsActions =
  | LoadEntitlements
  | LoadEntitlementsSuccess
  | LoadEntitlementsFailure
  | SelectEntitlement
  | UpdateEntitlementRole
  | UpdateEntitlementLimits
  | ToggleEntitlementPermission
  | ToggleDualApproval
  | SaveEntitlement
  | SaveEntitlementSuccess
  | SaveEntitlementFailure
  | DiscardEntitlementChanges;
