import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CnToastService } from '@meridian/canopy-ui';
import * as _ from 'lodash';

import { BusinessAlert } from '../../../core/models';
import { AlertThresholdDialogComponent } from '../alert-threshold-dialog/alert-threshold-dialog.component';
import { AlertsService } from '../alerts.service';

@Component({
  selector: 'mbz-alert-list',
  templateUrl: './alert-list.component.html'
})
export class AlertListComponent implements OnInit {
  alerts: BusinessAlert[] = [];
  loading = true;
  error: string | null = null;
  saving: { [alertId: string]: boolean } = {};

  constructor(private alertsService: AlertsService, private dialog: MatDialog, private toast: CnToastService) {}

  ngOnInit(): void {
    this.alertsService.getAlerts()
      .then(alerts => this.alerts = _.orderBy(alerts, ['regulatory', 'label'], ['desc', 'asc']))
      .catch(err => this.error = err && err.message ? err.message : 'Could not load alerts')
      .then(() => this.loading = false);
  }

  get regulatory(): BusinessAlert[] {
    return this.alerts.filter(a => a.regulatory);
  }

  get optional(): BusinessAlert[] {
    return this.alerts.filter(a => !a.regulatory);
  }

  toggle(alert: BusinessAlert, enabled: boolean): void {
    this.persist({ ...alert, enabled });
  }

  editThreshold(alert: BusinessAlert): void {
    this.dialog.open<AlertThresholdDialogComponent, BusinessAlert, number | undefined>(AlertThresholdDialogComponent, { data: alert, width: '420px' })
      .afterClosed().toPromise().then(thresholdMinor => {
        if (thresholdMinor !== undefined) {
          this.persist({ ...alert, thresholdMinor });
        }
      });
  }

  private persist(next: BusinessAlert): void {
    const previous = this.alerts;
    this.alerts = this.alerts.map(a => a.alertId === next.alertId ? next : a);
    this.saving[next.alertId] = true;
    this.alertsService.save(next)
      .then(saved => this.alerts = this.alerts.map(a => a.alertId === saved.alertId ? saved : a))
      .catch(err => {
        this.alerts = previous;
        this.toast.error(err && err.message ? err.message : 'Could not save alert');
      })
      .then(() => this.saving[next.alertId] = false);
  }
}
