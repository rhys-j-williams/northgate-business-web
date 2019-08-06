import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as moment from 'moment';

import { environment } from '../../../environments/environment';
import { Wire, WireBeneficiary } from '../../core/models';
import { AuthService, BusinessDateService, FixtureDataService } from '../../core/services';

/**
 * Domestic wires only. International went to Treasury Digital's platform in 2020 (MBZ-905) and
 * the FX bits were deleted from here, apart from the `currency: 'USD'` field which is now a
 * constant with a type.
 */
@Injectable({ providedIn: 'root' })
export class WiresService {
  constructor(private http: HttpClient,
              private fixtures: FixtureDataService,
              private auth: AuthService,
              private businessDates: BusinessDateService) {}

  getWires(): Promise<Wire[]> {
    const source$ = environment.useFixtures ? this.fixtures.getWires() : this.http.get<Wire[]>(`${environment.apiBase}/wires`);
    return source$.toPromise();
  }

  getWire(wireId: string): Promise<Wire> {
    const source$ = environment.useFixtures ? this.fixtures.getWire(wireId) : this.http.get<Wire>(`${environment.apiBase}/wires/${wireId}`);
    return source$.toPromise();
  }

  getBeneficiaries(): Promise<WireBeneficiary[]> {
    const source$ = environment.useFixtures ? this.fixtures.getBeneficiaries() : this.http.get<WireBeneficiary[]>(`${environment.apiBase}/wires/beneficiaries`);
    return source$.toPromise();
  }

  initiate(draft: Partial<Wire>): Promise<Wire> {
    const source$ = environment.useFixtures
      ? this.fixtures.initiateWire(draft, this.auth.snapshot.handle)
      : this.http.post<Wire>(`${environment.apiBase}/wires`, draft);
    return source$.toPromise();
  }

  /** Same day if before the Fedwire cutoff and the flag is on, otherwise next business day. */
  earliestValueDate(): moment.Moment {
    const sameDay = environment.featureFlags.wiresSameDayCutoff && this.businessDates.isBeforeCutoff('wire-domestic');
    return sameDay ? this.businessDates.nextBusinessDay(moment(), 0) : this.businessDates.nextBusinessDay(moment(), 1);
  }

  minutesToCutoff(): number {
    return this.businessDates.minutesToCutoff('wire-domestic');
  }
}
