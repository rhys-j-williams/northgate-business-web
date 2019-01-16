import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, CanLoad, Route, Router, RouterStateSnapshot, UrlSegment } from '@angular/router';

import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanActivateChild, CanLoad {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    return this.check(state.url);
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    return this.check(state.url);
  }

  canLoad(route: Route, segments: UrlSegment[]): Promise<boolean> {
    return this.check('/' + segments.map(s => s.path).join('/'));
  }

  private async check(url: string): Promise<boolean> {
    if (this.auth.isAuthenticated()) {
      return true;
    }
    const restored = await this.auth.restore();
    if (restored) {
      return true;
    }
    await this.auth.login(url);
    return false;
  }
}
