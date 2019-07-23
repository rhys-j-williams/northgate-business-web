import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Payee } from '@meridian/domain-fixtures';
import * as _ from 'lodash';

import { AchTemplate } from '../../../core/models';
import { AuthService, FixtureDataService } from '../../../core/services';
import { AchService } from '../ach.service';
import { AchTemplateEditorComponent, TemplateEditorData } from '../ach-template-editor/ach-template-editor.component';

@Component({
  selector: 'mbz-ach-templates',
  templateUrl: './ach-templates.component.html'
})
export class AchTemplatesComponent implements OnInit {
  templates: AchTemplate[] = [];
  payees: Payee[] = [];
  loading = true;
  error: string | null = null;
  canEdit = false;

  constructor(private ach: AchService,
              private fixtures: FixtureDataService,
              private auth: AuthService,
              private dialog: MatDialog) {}

  ngOnInit(): void {
    this.canEdit = this.auth.hasPermission('payments:initiate');
    // Payees come straight from the fixture service; there is no payee endpoint on the BFF yet
    // (MBZ-1877) so this screen is fixture only even when useFixtures is off. Known.
    Promise.all([this.ach.getTemplates(), this.fixtures.getPayees().toPromise()])
      .then(([templates, payees]) => {
        this.templates = _.orderBy(templates, ['updatedAt'], ['desc']);
        this.payees = payees;
      })
      .catch(err => this.error = err && err.message ? err.message : 'Could not load templates')
      .then(() => this.loading = false);
  }

  total(template: AchTemplate): number {
    return _.sumBy(template.entries, 'amountMinor');
  }

  edit(template: AchTemplate | null): void {
    const data: TemplateEditorData = { template, payees: this.payees, organisationId: this.auth.snapshot.organisationId };
    this.dialog.open<AchTemplateEditorComponent, TemplateEditorData, AchTemplate | undefined>(AchTemplateEditorComponent, { data, width: '720px', disableClose: true })
      .afterClosed().toPromise().then(saved => {
        if (saved) {
          this.templates = _.orderBy([saved, ...this.templates.filter(t => t.templateId !== saved.templateId)], ['updatedAt'], ['desc']);
        }
      });
  }
}
