import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { AppModule } from './app.module';
import { AppComponent } from './app.component';
import { AccountsModule } from './features/accounts/accounts.module';
import { PayrollModule } from './features/payroll/payroll.module';
import { AchModule } from './features/ach/ach.module';
import { WiresModule } from './features/wires/wires.module';
import { ApprovalsModule } from './features/approvals/approvals.module';
import { UsersModule } from './features/users/users.module';
import { ReportsModule } from './features/reports/reports.module';
import { AlertsModule } from './features/alerts/alerts.module';
import { LegacyModule } from './legacy/legacy.module';

// Smoke test only. MBZ-1290: a feature module failed to compile in prod because of a duplicate
// pipe declaration and nobody noticed until the Friday deploy, because the lazy chunks are not
// compiled by any unit test. So compile every one of them here. Slow-ish, worth it.
describe('AppModule', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        AppModule, RouterTestingModule, HttpClientTestingModule,
        AccountsModule, PayrollModule, AchModule, WiresModule, ApprovalsModule, UsersModule, ReportsModule, AlertsModule, LegacyModule
      ]
    });
  });

  it('compiles every feature module', async () => {
    await TestBed.compileComponents();
    expect(TestBed.inject(Router)).toBeTruthy();
  });

  it('creates the root component', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
