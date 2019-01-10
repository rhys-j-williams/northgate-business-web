import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { CnNavItem } from '@meridian/canopy-ui';

import { environment } from '../../../environments/environment';
import { SessionUser } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { SessionIdleService } from '../../core/services/session-idle.service';
import { loadApprovals } from '../../store/approvals/approvals.actions';
import { selectPendingCount } from '../../store/approvals/approvals.selectors';
import { IdleWarningComponent } from '../idle-warning/idle-warning.component';

/**
 * Application frame. Encapsulation off because the nav badge and the topbar colour are Canopy
 * internals we override (MBZ-1104, MBZ-1290). Yes it is in styles.scss too. Both are needed for
 * the collapsed nav state; nobody knows why any more.
 */
@Component({
  selector: 'mbz-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ShellComponent implements OnInit, OnDestroy {
  user$: Observable<SessionUser | null>;
  pendingApprovals$: Observable<number>;
  environmentLabel: string | null = environment.production ? null : environment.name;
  nav: CnNavItem[] = [];

  private subscriptions = new Subscription();

  constructor(private auth: AuthService,
              private idle: SessionIdleService,
              private store: Store,
              private dialog: MatDialog,
              private router: Router) {}

  ngOnInit(): void {
    this.user$ = this.auth.currentUser;
    this.pendingApprovals$ = this.store.select(selectPendingCount);
    this.store.dispatch(loadApprovals());
    this.idle.start();

    this.subscriptions.add(this.user$.subscribe(user => this.nav = this.buildNav(user)));
    this.subscriptions.add(this.pendingApprovals$.subscribe(count => {
      const item = this.nav.find(n => n.id === 'approvals');
      if (item) {
        item.badge = count > 0 ? count : null;
      }
    }));
    this.subscriptions.add(this.idle.warning.subscribe(minutes => this.warnIdle(minutes)));
    this.subscriptions.add(this.idle.timedOut.subscribe(() => this.auth.logout()));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.idle.stop();
  }

  signOut(): void {
    this.auth.logout();
  }

  private buildNav(user: SessionUser | null): CnNavItem[] {
    if (!user) {
      return [];
    }
    const can = (p: string) => user.permissions.indexOf(p) >= 0;
    const items: CnNavItem[] = [
      { id: 'accounts', label: 'Accounts', icon: 'cn:account', link: '/accounts' }
    ];
    if (can('payments:initiate') || can('payments:approve')) {
      items.push({ id: 'payroll', label: 'Payroll', icon: 'cn:user', link: '/payroll' });
      items.push({ id: 'ach', label: 'ACH', icon: 'cn:transfer', link: '/ach' });
      items.push({ id: 'wires', label: 'Wires', icon: 'cn:arrow-right', link: '/wires' });
    }
    if (can('payments:approve')) {
      items.push({ id: 'approvals', label: 'Approvals', icon: 'cn:check', link: '/approvals', badge: null });
    }
    if (can('users:manage') || can('entitlements:manage')) {
      items.push({ id: 'users', label: 'Users', icon: 'cn:settings', link: '/users' });
    }
    if (can('reports:run')) {
      items.push({ id: 'reports', label: 'Reports', icon: 'cn:document', link: '/reports' });
    }
    items.push({ id: 'alerts', label: 'Alerts', icon: 'cn:bell', link: '/alerts' });
    return items;
  }

  private warnIdle(minutesRemaining: number): void {
    const ref = this.dialog.open(IdleWarningComponent, {
      data: { minutesRemaining },
      disableClose: true,
      width: '400px'
    });
    ref.afterClosed().toPromise().then(stay => {
      if (stay) {
        this.idle.touch();
      } else if (stay === false) {
        this.auth.logout();
      }
    });
  }
}
