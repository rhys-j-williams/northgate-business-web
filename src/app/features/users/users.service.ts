import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { BusinessUser } from '../../core/models';
import { BffGatewayService, FixtureDataService } from '../../core/services';

/** Every permission the BFF knows about, with the label the admin screen shows. Order matters. */
export const PERMISSION_CATALOGUE: Array<{ key: string; label: string; help: string; sensitive: boolean }> = [
  { key: 'accounts:view', label: 'View accounts', help: 'Balances, activity, statements.', sensitive: false },
  { key: 'payments:initiate', label: 'Initiate payments', help: 'Wires, ACH uploads, payroll runs.', sensitive: true },
  { key: 'payments:approve', label: 'Approve payments', help: 'Second approver on any payment. Cannot approve own.', sensitive: true },
  { key: 'reports:run', label: 'Run reports', help: 'Reports and CSV export.', sensitive: false },
  { key: 'users:manage', label: 'Manage users', help: 'Invite, lock, disable.', sensitive: true },
  { key: 'entitlements:manage', label: 'Manage entitlements', help: 'This screen. Changes need a second administrator.', sensitive: true },
  { key: 'audit:read', label: 'Read audit log', help: 'The legacy audit screen.', sensitive: false }
];

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpClient, private fixtures: FixtureDataService, private gateway: BffGatewayService) {}

  getUsers(): Promise<BusinessUser[]> {
    const source$ = this.gateway.organisationUsers();
    return source$.toPromise();
  }

  getUser(userId: string): Promise<BusinessUser> {
    const source$ = environment.useFixtures ? this.fixtures.getUser(userId) : this.http.get<BusinessUser>(`${environment.apiBase}/users/${userId}`);
    return source$.toPromise();
  }

  invite(invite: Pick<BusinessUser, 'displayName' | 'email' | 'role'>): Promise<BusinessUser> {
    const source$ = environment.useFixtures ? this.fixtures.inviteUser(invite) : this.http.post<BusinessUser>(`${environment.apiBase}/users/invites`, invite);
    return source$.toPromise();
  }
}
