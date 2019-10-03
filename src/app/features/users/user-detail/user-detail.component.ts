import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Entitlement } from '@meridian/domain-fixtures';

import { AuditEvent, BusinessUser } from '../../../core/models';
import { AuthService, FixtureDataService } from '../../../core/services';
import { LoadEntitlements, SelectEntitlement } from '../../../store/entitlements/entitlements.actions';
import { selectAllEntitlements } from '../../../store/entitlements/entitlements.selectors';
import { PERMISSION_CATALOGUE, UsersService } from '../users.service';

@Component({
  selector: 'mbz-user-detail',
  templateUrl: './user-detail.component.html'
})
export class UserDetailComponent implements OnInit {
  user: BusinessUser | null = null;
  entitlement$: Observable<Entitlement | undefined>;
  recentActivity: AuditEvent[] = [];
  loading = true;
  error: string | null = null;
  canManage = false;
  readonly catalogue = PERMISSION_CATALOGUE;

  constructor(private route: ActivatedRoute,
              private users: UsersService,
              private fixtures: FixtureDataService,
              private auth: AuthService,
              private store: Store) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('userId');
    this.canManage = this.auth.hasPermission('entitlements:manage');
    this.store.dispatch(new LoadEntitlements());
    this.users.getUser(userId)
      .then(user => {
        this.user = user;
        this.entitlement$ = this.store.select(selectAllEntitlements).pipe(map(all => all.find(e => e.entitlementId === user.entitlementId)));
        // Audit is fixture only; see legacy/audit-log. MBZ-1877 covers the BFF endpoint.
        return this.fixtures.getAuditEvents(500).toPromise();
      })
      .then(events => this.recentActivity = events.filter(e => e.actor === this.user.handle).slice(0, 10))
      .catch(err => this.error = err && err.message ? err.message : 'User not found')
      .then(() => this.loading = false);
  }

  labelFor(permission: string): string {
    const entry = this.catalogue.find(p => p.key === permission);
    return entry ? entry.label : permission;
  }

  editEntitlement(): void {
    if (this.user) {
      this.store.dispatch(new SelectEntitlement(this.user.entitlementId));
    }
  }
}
