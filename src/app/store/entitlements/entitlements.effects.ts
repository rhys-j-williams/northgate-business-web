import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { catchError, map, mergeMap, switchMap, withLatestFrom } from 'rxjs/operators';
import { CnToastService } from '@meridian/canopy-ui';

import { FixtureDataService } from '../../core/services/fixture-data.service';
import {
  EntitlementsActionTypes, LoadEntitlementsFailure, LoadEntitlementsSuccess, SaveEntitlement, SaveEntitlementFailure,
  SaveEntitlementSuccess
} from './entitlements.actions';
import { selectEntitlementsState } from './entitlements.selectors';

@Injectable()
export class EntitlementsEffects {

  load$ = createEffect(() => this.actions$.pipe(
    ofType(EntitlementsActionTypes.Load),
    switchMap(() => this.data.getEntitlements().pipe(
      map(entitlements => new LoadEntitlementsSuccess(entitlements)),
      catchError(err => of(new LoadEntitlementsFailure(err && err.message ? err.message : 'Could not load entitlements')))
    ))
  ));

  save$ = createEffect(() => this.actions$.pipe(
    ofType<SaveEntitlement>(EntitlementsActionTypes.Save),
    withLatestFrom(this.store.select(selectEntitlementsState)),
    mergeMap(([action, state]) => {
      const draft = state.drafts[action.payload.entitlementId] || state.byId[action.payload.entitlementId];
      return this.data.saveEntitlement(draft).pipe(
        map(saved => new SaveEntitlementSuccess(saved)),
        catchError(err => of(new SaveEntitlementFailure({ entitlementId: action.payload.entitlementId, error: err && err.message ? err.message : 'Save failed' })))
      );
    })
  ));

  saveToast$ = createEffect(() => this.actions$.pipe(
    ofType<SaveEntitlementSuccess>(EntitlementsActionTypes.SaveSuccess),
    map(action => this.toast.success(`Saved entitlements for ${action.payload.userHandle}`))
  ), { dispatch: false });

  constructor(private actions$: Actions, private store: Store, private data: FixtureDataService, private toast: CnToastService) {}
}
