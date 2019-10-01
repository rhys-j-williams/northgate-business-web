import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CnColumn, CnToastService } from '@meridian/canopy-ui';
import * as _ from 'lodash';

import { BusinessUser } from '../../../core/models';
import { AuthService } from '../../../core/services';
import { InviteUserDialogComponent } from '../invite-user-dialog/invite-user-dialog.component';
import { UsersService } from '../users.service';

@Component({
  selector: 'mbz-user-list',
  templateUrl: './user-list.component.html'
})
export class UserListComponent implements OnInit {
  users: BusinessUser[] = [];
  loading = true;
  error: string | null = null;
  canManage = false;
  search = '';

  readonly columns: CnColumn<BusinessUser>[] = [
    { key: 'displayName', header: 'Name', sortable: true },
    { key: 'handle', header: 'Handle', cellClass: 'mbz-mono' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', sortable: true },
    { key: 'mfaEnrolled', header: 'MFA', type: 'status', accessor: u => u.mfaEnrolled ? 'enrolled' : 'not-enrolled' },
    { key: 'lastLoginAt', header: 'Last sign in', type: 'date', sortable: true },
    { key: 'status', header: 'Status', type: 'status' }
  ];

  constructor(private usersService: UsersService,
              private auth: AuthService,
              private dialog: MatDialog,
              private toast: CnToastService,
              private router: Router) {}

  ngOnInit(): void {
    this.canManage = this.auth.hasPermission('users:manage');
    this.usersService.getUsers()
      .then(users => this.users = _.sortBy(users, 'displayName'))
      .catch(err => this.error = err && err.message ? err.message : 'Could not load users')
      .then(() => this.loading = false);
  }

  get visible(): BusinessUser[] {
    const needle = this.search.trim().toLowerCase();
    return needle ? this.users.filter(u => [u.displayName, u.handle, u.email].some(v => v.toLowerCase().indexOf(needle) >= 0)) : this.users;
  }

  open(user: BusinessUser): void {
    this.router.navigate(['/users', user.userId]);
  }

  invite(): void {
    this.dialog.open<InviteUserDialogComponent, void, BusinessUser | undefined>(InviteUserDialogComponent, { width: '520px' })
      .afterClosed().toPromise().then(user => {
        if (user) {
          this.users = _.sortBy([...this.users, user], 'displayName');
          this.toast.success(`Invitation sent to ${user.email}`);
        }
      });
  }
}
