import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { CnDialogService } from '@meridian/canopy-ui';

import { AuthService } from '../services/auth.service';

/**
 * Money movement needs a fresh MFA claim. With the fixture session the claim is always fresh. When
 * it is not, we tell the user and send them round the IdP again; the IdP mock re-prompts for MFA
 * when acr_values=mfa is on the request, which is MBZ-2144 and not done yet, so today this just
 * explains and bounces.
 */
@Injectable({ providedIn: 'root' })
export class StepUpGuard implements CanActivate {

  constructor(private auth: AuthService, private dialog: CnDialogService) {}

  async canActivate(): Promise<boolean> {
    if (this.auth.stepUpIsFresh()) {
      return true;
    }
    const proceed = await this.dialog.confirm({
      title: 'Verify it is you',
      message: 'Payments need a recent security check. You will be asked to sign in again.',
      confirmLabel: 'Continue'
    }).toPromise();
    if (proceed) {
      await this.auth.login(window.location.pathname);
    }
    return false;
  }
}
