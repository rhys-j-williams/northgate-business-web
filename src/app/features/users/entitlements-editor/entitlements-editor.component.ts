import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { Entitlement } from '@meridian/domain-fixtures';
import { CnDialogService } from '@meridian/canopy-ui';

import { AuthService } from '../../../core/services';
import * as E from '../../../store/entitlements/entitlements.actions';
import {
  selectAllEntitlements, selectDirtyIds, selectEntitlementsLoadError, selectEntitlementsLoading, selectHasUnsavedChanges,
  selectSavingIds, selectSelectedEntitlement, selectSelectedIsDirty
} from '../../../store/entitlements/entitlements.selectors';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';

/**
 * Master/detail over the hand rolled entitlements store (store/entitlements). Selecting a row
 * dispatches Select; edits go to a draft; Save sends the draft. Everything else is selectors.
 * Compare this to how Meridian Online does it with @ngrx/entity and weep (MBZ-1901).
 */
@Component({
  selector: 'mbz-entitlements-editor',
  templateUrl: './entitlements-editor.component.html',
  styleUrls: ['./entitlements-editor.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class EntitlementsEditorComponent implements OnInit, OnDestroy, CanComponentDeactivate {
  entitlements$: Observable<Entitlement[]>;
  selected$: Observable<Entitlement | null>;
  selectedIsDirty$: Observable<boolean>;
  dirtyIds$: Observable<string[]>;
  savingIds$: Observable<string[]>;
  loading$: Observable<boolean>;
  loadError$: Observable<string | null>;
  hasUnsaved = false;
  canManage = false;
  me: string;

  private subscription = new Subscription();

  constructor(private store: Store, private auth: AuthService, private dialogs: CnDialogService) {}

  ngOnInit(): void {
    this.me = this.auth.snapshot.handle;
    this.canManage = this.auth.hasPermission('entitlements:manage');
    this.entitlements$ = this.store.select(selectAllEntitlements);
    this.selected$ = this.store.select(selectSelectedEntitlement);
    this.selectedIsDirty$ = this.store.select(selectSelectedIsDirty);
    this.dirtyIds$ = this.store.select(selectDirtyIds);
    this.savingIds$ = this.store.select(selectSavingIds);
    this.loading$ = this.store.select(selectEntitlementsLoading);
    this.loadError$ = this.store.select(selectEntitlementsLoadError);
    this.subscription.add(this.store.select(selectHasUnsavedChanges).subscribe(v => this.hasUnsaved = v));
    this.store.dispatch(new E.LoadEntitlements());
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.hasUnsaved) {
      return true;
    }
    return this.dialogs.confirm({ title: 'Discard changes?', message: 'You have unsaved entitlement changes.', confirmLabel: 'Discard', destructive: true });
  }

  select(entitlement: Entitlement): void {
    this.store.dispatch(new E.SelectEntitlement(entitlement.entitlementId));
  }

  isSelf(entitlement: Entitlement): boolean {
    return entitlement.userHandle === this.me;
  }

  onRole(entitlement: Entitlement, role: Entitlement['role']): void {
    this.store.dispatch(new E.UpdateEntitlementRole({ entitlementId: entitlement.entitlementId, role }));
  }

  onTogglePermission(entitlement: Entitlement, permission: string): void {
    this.store.dispatch(new E.ToggleEntitlementPermission({ entitlementId: entitlement.entitlementId, permission }));
  }

  onToggleDual(entitlement: Entitlement): void {
    this.store.dispatch(new E.ToggleDualApproval({ entitlementId: entitlement.entitlementId }));
  }

  onLimits(entitlement: Entitlement, limits: { perTransactionMinor?: number; perDayMinor?: number }): void {
    this.store.dispatch(new E.UpdateEntitlementLimits({ entitlementId: entitlement.entitlementId, ...limits }));
  }

  save(entitlement: Entitlement): void {
    this.store.dispatch(new E.SaveEntitlement({ entitlementId: entitlement.entitlementId }));
  }

  discard(entitlement: Entitlement): void {
    this.store.dispatch(new E.DiscardEntitlementChanges({ entitlementId: entitlement.entitlementId }));
  }

  trackById(index: number, e: Entitlement): string {
    return e.entitlementId;
  }
}
