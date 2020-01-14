/**
 * Front end telemetry to the Splunk HEC (mock on 4606 locally). Batched, fire and forget. Nothing
 * that could be PII goes in `data`; the TSLint ban on console.log exists so people use this instead.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, timer } from 'rxjs';
import { buffer, filter } from 'rxjs/operators';
import * as moment from 'moment';

import { environment } from '../../../environments/environment';

interface TelemetryEvent {
  name: string;
  at: string;
  level: 'info' | 'warn' | 'error';
  data?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private readonly queue$ = new Subject<TelemetryEvent>();
  private correlationId = TelemetryService.newCorrelationId();

  static newCorrelationId(): string {
    return `mbz-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
  }

  constructor(private http: HttpClient) {
    this.queue$.pipe(
      buffer(timer(5000, 5000)),
      filter(batch => batch.length > 0 && environment.telemetry.enabled)
    ).subscribe(batch => this.flush(batch));
  }

  get currentCorrelationId(): string {
    return this.correlationId;
  }

  rotateCorrelationId(): string {
    this.correlationId = TelemetryService.newCorrelationId();
    return this.correlationId;
  }

  event(name: string, data?: Record<string, unknown>): void {
    this.queue$.next({ name, at: moment().toISOString(), level: 'info', data });
  }

  warn(name: string, data?: Record<string, unknown>): void {
    this.queue$.next({ name, at: moment().toISOString(), level: 'warn', data });
  }

  error(name: string, error: unknown): void {
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'unknown';
    this.queue$.next({ name, at: moment().toISOString(), level: 'error', data: { message } });
    if (!environment.production) {
      // tslint:disable-next-line:no-console
      console.warn(`[telemetry] ${name}`, error);
    }
  }

  private flush(batch: TelemetryEvent[]): void {
    const body = batch.map(e => ({
      time: moment(e.at).unix(),
      sourcetype: 'meridian:business-web',
      event: { ...e, correlationId: this.correlationId, app: 'business-web', env: environment.name }
    }));
    this.http.post(environment.telemetry.endpoint, body, {
      headers: { Authorization: 'Splunk CHANGEME-hec-token' }
    }).toPromise().catch(() => { /* telemetry never breaks the app */ });
  }
}
