import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

import { TelemetryService } from '../services/telemetry.service';

/** X-Correlation-Id on everything, matched in Splunk against the BFF and Bedrock adapter logs. */
@Injectable()
export class CorrelationInterceptor implements HttpInterceptor {
  constructor(private telemetry: TelemetryService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req.clone({
      setHeaders: {
        'X-Correlation-Id': this.telemetry.currentCorrelationId,
        'X-Meridian-Channel': 'business-web'
      }
    }));
  }
}
