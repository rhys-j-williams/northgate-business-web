/**
 * Idle timeout. Warn at 8 minutes, sign out at 10 (SECURITY.md s1). The activity events are
 * throttled because mousemove at 60Hz through zone.js was measurable on the older laptops the
 * branch staff use (MBZ-1466).
 */
import { Injectable, NgZone } from '@angular/core';
import { fromEvent, merge, Observable, Subject, Subscription, timer } from 'rxjs';
import { switchMap, throttleTime } from 'rxjs/operators';
import * as moment from 'moment';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SessionIdleService {
  private readonly warn$ = new Subject<number>();
  private readonly timeout$ = new Subject<void>();
  private subscription: Subscription | null = null;
  private lastActivity = moment();

  constructor(private zone: NgZone) {}

  get warning(): Observable<number> {
    return this.warn$.asObservable();
  }

  get timedOut(): Observable<void> {
    return this.timeout$.asObservable();
  }

  start(): void {
    this.stop();
    this.zone.runOutsideAngular(() => {
      const activity$ = merge(
        fromEvent(document, 'mousemove'),
        fromEvent(document, 'keydown'),
        fromEvent(document, 'click'),
        fromEvent(document, 'touchstart')
      ).pipe(throttleTime(1000));

      this.subscription = activity$.pipe(
        switchMap(() => {
          this.lastActivity = moment();
          return timer(environment.idleWarnMinutes * 60 * 1000);
        })
      ).subscribe(() => {
        this.zone.run(() => {
          const remaining = environment.idleTimeoutMinutes - environment.idleWarnMinutes;
          this.warn$.next(remaining);
        });
        timer((environment.idleTimeoutMinutes - environment.idleWarnMinutes) * 60 * 1000).toPromise().then(() => {
          if (moment().diff(this.lastActivity, 'minutes') >= environment.idleTimeoutMinutes) {
            this.zone.run(() => this.timeout$.next());
          }
        });
      });
    });
  }

  touch(): void {
    this.lastActivity = moment();
    document.dispatchEvent(new Event('click'));
  }

  stop(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}
