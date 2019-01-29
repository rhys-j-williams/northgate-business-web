import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, concatMap, delay, retryWhen } from 'rxjs/operators';
import { CnToastService } from '@meridian/canopy-ui';

import { AuthService } from '../services/auth.service';
import { TelemetryService } from '../services/telemetry.service';

/**
 * 401 -> back to the IdP. 5xx on GET -> two retries with a short delay (the BFF pod restarts during
 * deploys and the branch staff were seeing blank screens, INC0448213). Everything else surfaces a
 * toast and rethrows so the caller can decide.
 */
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private toast: CnToastService, private telemetry: TelemetryService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      retryWhen(errors => errors.pipe(
        concatMap((err: HttpErrorResponse, i: number) => {
          if (req.method === 'GET' && err.status >= 500 && i < 2) {
            return of(err).pipe(delay(400 * (i + 1)));
          }
          return throwError(err);
        })
      )),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.telemetry.warn('http.401', { url: req.urlWithParams });
          this.auth.login(window.location.pathname);
        } else if (err.status === 403) {
          this.toast.caution('You are not entitled to do that.');
        } else if (err.status >= 500) {
          this.toast.error('Something went wrong on our side. Reference ' + this.telemetry.currentCorrelationId);
          this.telemetry.error('http.5xx', err);
        }
        return throwError(err);
      })
    );
  }
}
