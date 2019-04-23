import { Component, Input, OnInit } from '@angular/core';
import * as moment from 'moment';
import * as _ from 'lodash';

import { AuditEvent } from '../../core/models';
import { FixtureDataService } from '../../core/services/fixture-data.service';

@Component({
  selector: 'mbz-legacy-audit-log',
  template: `
    <div class="legacy-audit">
      <div class="legacy-audit__filters">
        <label>Show
          <select [(ngModel)]="filter" (ngModelChange)="apply()">
            <option value="all">everything</option>
            <option value="entitlements">entitlement changes</option>
            <option value="payments">payments</option>
            <option value="session">sessions</option>
          </select>
        </label>
        <span class="mbz-muted">{{ filtered.length }} of {{ events.length }} events</span>
      </div>
      <ul class="legacy-audit__list">
        <li *ngFor="let group of grouped">
          <h4>{{ group.day }}</h4>
          <ul>
            <li *ngFor="let e of group.events">
              <span class="legacy-audit__time">{{ e.at | mbzDate:'clock' }}</span>
              <strong>{{ e.actor }}</strong> {{ e.action }}
              <span *ngIf="e.target" class="mbz-mono">{{ e.target }}</span>
              <span *ngIf="e.detail" class="mbz-muted"> - {{ e.detail }}</span>
            </li>
          </ul>
        </li>
      </ul>
      <p *ngIf="!events.length && !loading" class="mbz-muted">No audit events.</p>
    </div>
  `,
  styles: [`
    .legacy-audit__filters { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; font-size: 13px; }
    .legacy-audit__list, .legacy-audit__list ul { list-style: none; padding: 0; margin: 0; }
    .legacy-audit__list h4 { margin: 12px 0 4px; font-size: 12px; text-transform: uppercase; color: #666; }
    .legacy-audit__list li li { padding: 3px 0; font-size: 13px; border-bottom: 1px dotted #ddd; }
    .legacy-audit__time { display: inline-block; width: 64px; color: #666; font-variant-numeric: tabular-nums; }
  `]
})
export class LegacyAuditLogComponent implements OnInit {
  @Input() actor?: string;

  events: AuditEvent[] = [];
  filtered: AuditEvent[] = [];
  grouped: Array<{ day: string; events: AuditEvent[] }> = [];
  filter: 'all' | 'entitlements' | 'payments' | 'session' = 'all';
  loading = true;

  constructor(private data: FixtureDataService) {}

  ngOnInit() {
    this.data.getAuditEvents().toPromise().then(events => {
      this.events = this.actor ? events.filter(e => e.actor === this.actor) : events;
      this.loading = false;
      this.apply();
    });
  }

  categoryOf(e: AuditEvent): string {
    if (e.action.indexOf('entitlement') === 0 || e.action.indexOf('user') === 0) { return 'entitlements'; }
    if (e.action.indexOf('wire') === 0 || e.action.indexOf('ach') === 0 || e.action.indexOf('payroll') === 0) { return 'payments'; }
    if (e.action === 'user.login') { return 'session'; }
    return 'other';
  }

  apply() {
    this.filtered = this.filter === 'all' ? this.events : this.events.filter(e => this.categoryOf(e) === this.filter);
    const byDay = _.groupBy(this.filtered, e => moment(e.at).format('dddd D MMMM YYYY'));
    this.grouped = _.keys(byDay).map(day => ({ day, events: byDay[day] }));
  }
}
