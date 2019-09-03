import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, timer } from 'rxjs';
import { catchError, map, mergeMap, switchMap } from 'rxjs/operators';
import * as moment from 'moment';
import { CnToastService } from '@meridian/canopy-ui';

import { BffGatewayService } from '../../core/services/bff-gateway.service';
import * as A from './approvals.actions';

@Injectable()
export class ApprovalsEffects {

  load$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadApprovals),
    switchMap(() => this.data.approvals().pipe(
      map(approvals => A.loadApprovalsSuccess({ approvals, loadedAt: moment().toISOString() })),
      catchError(err => of(A.loadApprovalsFailure({ error: err && err.message ? err.message : 'Could not load approvals' })))
    ))
  ));

  decide$ = createEffect(() => this.actions$.pipe(
    ofType(A.decide),
    mergeMap(({ approvalId, decision }) => this.data.decide(approvalId, decision).pipe(
      map(approval => A.decideSuccess({ approval })),
      catchError(err => of(A.decideFailure({ approvalId, error: err && err.message ? err.message : 'Decision failed' })))
    ))
  ));

  decidedToast$ = createEffect(() => this.actions$.pipe(
    ofType(A.decideSuccess),
    map(({ approval }) => {
      if (approval.status === 'approved') {
        this.toast.success(`${approval.summary} approved`);
      } else if (approval.status === 'rejected') {
        this.toast.caution(`${approval.summary} rejected`);
      } else {
        this.toast.show(`Recorded. ${approval.requiredApprovals - approval.decisions.length} more approval needed.`);
      }
    })
  ), { dispatch: false });

  // Sweep for expired requests once a minute. A push channel would be better; MBZ-1380.
  expiry$ = createEffect(() => timer(60000, 60000).pipe(
    map(() => A.expireStale({ now: moment().toISOString() }))
  ));

  constructor(private actions$: Actions, private data: BffGatewayService, private toast: CnToastService) {}
}
