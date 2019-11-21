import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { BusinessAlert } from '../../core/models';
import { FixtureDataService } from '../../core/services';

// Only the balance / payment alert subset lives here. Card and fraud alerts are Meridian Online's.
@Injectable({ providedIn: 'root' })
export class AlertsService {
  constructor(private http: HttpClient, private fixtures: FixtureDataService) {}

  getAlerts(): Promise<BusinessAlert[]> {
    const source$ = environment.useFixtures ? this.fixtures.getAlerts() : this.http.get<BusinessAlert[]>(`${environment.apiBase}/alerts`);
    return source$.toPromise();
  }

  save(alert: BusinessAlert): Promise<BusinessAlert> {
    const source$ = environment.useFixtures ? this.fixtures.saveAlert(alert) : this.http.put<BusinessAlert>(`${environment.apiBase}/alerts/${alert.alertId}`, alert);
    return source$.toPromise();
  }
}
