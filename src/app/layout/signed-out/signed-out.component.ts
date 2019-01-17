import { Component } from '@angular/core';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'mbz-signed-out',
  template: `
    <div class="mbz-signed-out">
      <cn-card title="You have been signed out">
        <p>Close this window if you are on a shared computer.</p>
        <cn-button variant="primary" (pressed)="signIn()">Sign in again</cn-button>
      </cn-card>
    </div>
  `,
  styles: [`.mbz-signed-out { max-width: 420px; margin: 80px auto; }`]
})
export class SignedOutComponent {
  constructor(private auth: AuthService) {}

  signIn(): void {
    this.auth.login('/accounts');
  }
}
