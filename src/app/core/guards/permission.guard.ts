import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { CnToastService } from '@meridian/canopy-ui';

import { AuthService } from '../services/auth.service';
import { TelemetryService } from '../services/telemetry.service';

/**
 * Route data: { permission: 'payments:approve' }. The front end guard is a courtesy; the BFF
 * enforces entitlements on every call (SECURITY.md s2).
 */
@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router, private toast: CnToastService, private telemetry: TelemetryService) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const permission = route.data && route.data['permission'];
    if (!permission || this.auth.hasPermission(permission)) {
      return true;
    }
    this.telemetry.warn('route.denied', { permission });
    this.toast.caution('You do not have access to that area. Ask your administrator.');
    this.router.navigate(['/accounts']);
    return false;
  }
}
