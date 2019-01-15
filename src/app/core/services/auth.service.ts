/**
 * Keystone OpenID Connect, authorization code with PKCE. Written for the Keystone cutover in 2020
 * (MBZ-702, GIS-1188) replacing the old form post to the legacy SSO. There is no library here on
 * purpose: angular-oauth2-oidc was rejected by GIS at the time because of the implicit flow default,
 * and by the time that was fixed this worked. Tokens live in memory and sessionStorage only; the
 * refresh token is not persisted (GIS-STD-014 s1).
 *
 * With useFixtures on, the service short circuits to a synthetic session so the app can be run
 * without the IdP mock. Do not ship a build with that flag on. The prod environment file has it
 * off and Jenkins greps for it (see Jenkinsfile, "guard rails").
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import * as moment from 'moment';

import { environment } from '../../../environments/environment';
import { OidcDiscovery, SessionUser, TokenSet } from '../models';
import { FixtureDataService } from './fixture-data.service';
import { TelemetryService } from './telemetry.service';

const VERIFIER_KEY = 'mbz.pkce.verifier';
const STATE_KEY = 'mbz.pkce.state';
const RETURN_URL_KEY = 'mbz.returnUrl';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokens: TokenSet | null = null;
  private readonly user$ = new BehaviorSubject<SessionUser | null>(null);
  private discovery$: Observable<OidcDiscovery> | null = null;

  constructor(private http: HttpClient,
              private router: Router,
              private fixtures: FixtureDataService,
              private telemetry: TelemetryService) {}

  get currentUser(): Observable<SessionUser | null> {
    return this.user$.asObservable();
  }

  get snapshot(): SessionUser | null {
    return this.user$.value;
  }

  get accessToken(): string | null {
    return this.tokens ? this.tokens.accessToken : null;
  }

  isAuthenticated(): boolean {
    if (environment.useFixtures) {
      return this.user$.value !== null;
    }
    return !!this.tokens && this.tokens.expiresAt > Date.now();
  }

  hasPermission(permission: string): boolean {
    const user = this.user$.value;
    return !!user && user.permissions.indexOf(permission) >= 0;
  }

  /** True when the MFA claim is fresh enough for money movement (ten minutes, GIS-STD-014 s2). */
  stepUpIsFresh(): boolean {
    const user = this.user$.value;
    if (!user || !user.mfaAt) {
      return false;
    }
    return moment().diff(moment(user.mfaAt), 'minutes') < 10;
  }

  /** Called by the shell on start. Resolves once we know whether there is a session. */
  async restore(): Promise<boolean> {
    if (environment.useFixtures) {
      if (!this.user$.value) {
        await this.signInWithFixtures();
      }
      return true;
    }
    const raw = sessionStorage.getItem('mbz.tokens');
    if (!raw) {
      return false;
    }
    try {
      const tokens: TokenSet = JSON.parse(raw);
      if (tokens.expiresAt <= Date.now()) {
        sessionStorage.removeItem('mbz.tokens');
        return false;
      }
      this.tokens = tokens;
      await this.loadUserInfo().toPromise();
      return true;
    } catch (e) {
      this.telemetry.error('auth.restore', e);
      return false;
    }
  }

  async login(returnUrl: string = '/'): Promise<void> {
    if (environment.useFixtures) {
      await this.signInWithFixtures();
      this.router.navigateByUrl(returnUrl);
      return;
    }
    const discovery = await this.discover().toPromise();
    const verifier = this.randomString(64);
    const state = this.randomString(24);
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    sessionStorage.setItem(RETURN_URL_KEY, returnUrl);
    const challenge = await this.pkceChallenge(verifier);
    const params = new HttpParams()
      .set('client_id', environment.idp.clientId)
      .set('redirect_uri', environment.idp.redirectUri)
      .set('response_type', 'code')
      .set('scope', environment.idp.scopes)
      .set('state', state)
      .set('code_challenge', challenge)
      .set('code_challenge_method', 'S256');
    window.location.assign(`${discovery.authorization_endpoint}?${params.toString()}`);
  }

  /** /auth/callback lands here. */
  async completeLogin(code: string, state: string): Promise<string> {
    const expected = sessionStorage.getItem(STATE_KEY);
    if (!expected || expected !== state) {
      throw new Error('state mismatch');
    }
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    const discovery = await this.discover().toPromise();
    const body = new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('client_id', environment.idp.clientId)
      .set('code', code)
      .set('code_verifier', verifier || '')
      .set('redirect_uri', environment.idp.redirectUri);
    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    const response: any = await this.http.post(discovery.token_endpoint, body.toString(), { headers }).toPromise();
    this.tokens = {
      accessToken: response.access_token,
      idToken: response.id_token,
      refreshToken: response.refresh_token,
      expiresAt: Date.now() + (response.expires_in * 1000) - 5000,
      scope: response.scope
    };
    // refresh token deliberately not persisted
    sessionStorage.setItem('mbz.tokens', JSON.stringify({ ...this.tokens, refreshToken: undefined }));
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    await this.loadUserInfo().toPromise();
    const returnUrl = sessionStorage.getItem(RETURN_URL_KEY) || '/';
    sessionStorage.removeItem(RETURN_URL_KEY);
    return returnUrl;
  }

  logout(): void {
    const idToken = this.tokens ? this.tokens.idToken : null;
    this.tokens = null;
    this.user$.next(null);
    sessionStorage.removeItem('mbz.tokens');
    this.telemetry.event('auth.logout');
    if (environment.useFixtures) {
      this.router.navigateByUrl('/signed-out');
      return;
    }
    this.discover().toPromise().then(d => {
      const params = new HttpParams()
        .set('id_token_hint', idToken || '')
        .set('post_logout_redirect_uri', `${window.location.origin}/`);
      window.location.assign(`${d.end_session_endpoint}?${params.toString()}`);
    });
  }

  private discover(): Observable<OidcDiscovery> {
    if (!this.discovery$) {
      this.discovery$ = this.http.get<OidcDiscovery>(`${environment.idp.issuer}/.well-known/openid-configuration`).pipe(
        shareReplay(1),
        catchError(err => {
          this.discovery$ = null;
          throw err;
        })
      );
    }
    return this.discovery$;
  }

  private loadUserInfo(): Observable<SessionUser> {
    return this.discover().pipe(
      map(d => d.userinfo_endpoint),
      // nested toPromise inside a pipe; this pre dates the interceptors and nobody has cleaned it up
      tap(async endpoint => {
        const info: any = await this.http.get(endpoint, {
          headers: new HttpHeaders({ Authorization: `Bearer ${this.tokens.accessToken}` })
        }).toPromise();
        this.user$.next({
          sub: info.sub,
          handle: info.preferred_username || info.email,
          displayName: info.name,
          email: info.email,
          organisationId: info.organisation_id || info.org_id,
          organisationName: info.organisation_name || '',
          role: info.role || 'viewer',
          mfaAt: info.mfa_at ? moment.unix(info.mfa_at).toISOString() : null,
          permissions: info.permissions || []
        });
        this.telemetry.event('auth.login', { role: info.role });
      }),
      map(() => this.user$.value)
    );
  }

  private async signInWithFixtures(): Promise<void> {
    const organisation = await this.fixtures.getOrganisation().toPromise();
    const users = await this.fixtures.getUsers().toPromise();
    const admin = users.find(u => u.role === 'administrator') || users[0];
    const entitlements = await this.fixtures.getEntitlements().toPromise();
    const entitlement = entitlements.find(e => e.entitlementId === admin.entitlementId);
    this.user$.next({
      sub: admin.userId,
      handle: admin.handle,
      displayName: admin.displayName,
      email: admin.email,
      organisationId: organisation.organisationId,
      organisationName: organisation.name,
      role: admin.role,
      mfaAt: moment().toISOString(),
      permissions: entitlement ? entitlement.permissions : []
    });
    this.tokens = {
      accessToken: 'fixture-token',
      idToken: 'fixture-id-token',
      expiresAt: moment().add(8, 'hours').valueOf(),
      scope: environment.idp.scopes
    };
  }

  private randomString(length: number): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  }

  private async pkceChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    const bytes = Array.from(new Uint8Array(digest));
    const base64 = btoa(String.fromCharCode.apply(null, bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}

/** Kept exported for the two legacy components that still call it. MBZ-1520 will remove. */
export function isSessionUser(value: unknown): value is SessionUser {
  return !!value && typeof (value as SessionUser).handle === 'string';
}

export const NOOP_USER$: Observable<SessionUser | null> = of(null);
