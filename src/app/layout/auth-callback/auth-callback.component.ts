import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { TelemetryService } from '../../core/services/telemetry.service';

@Component({
  selector: 'mbz-auth-callback',
  template: `
    <mbz-page-loading *ngIf="!error" label="Signing you in"></mbz-page-loading>
    <cn-card *ngIf="error" title="Sign in did not complete">
      <p class="mbz-muted">{{ error }}</p>
      <cn-button variant="secondary" (pressed)="retry()">Try again</cn-button>
    </cn-card>
  `
})
export class AuthCallbackComponent implements OnInit {
  error: string | null = null;

  constructor(private route: ActivatedRoute, private router: Router, private auth: AuthService, private telemetry: TelemetryService) {}

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('error')) {
      this.error = params.get('error_description') || params.get('error');
      return;
    }
    try {
      const returnUrl = await this.auth.completeLogin(params.get('code') || '', params.get('state') || '');
      this.router.navigateByUrl(returnUrl);
    } catch (e) {
      this.telemetry.error('auth.callback', e);
      this.error = 'The sign in response could not be verified. Reference ' + this.telemetry.currentCorrelationId;
    }
  }

  retry(): void {
    this.auth.login('/accounts');
  }
}
