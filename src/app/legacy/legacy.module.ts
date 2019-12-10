import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CnCardModule, CnPageHeaderModule } from '@meridian/canopy-ui';

import { SharedModule } from '../shared/shared.module';
import { LegacyAuditLogComponent } from './audit-log/legacy-audit-log.component';
import { PositivePayPlaceholderComponent } from './positive-pay/positive-pay-placeholder.component';
import { LegacyStatementsComponent } from './statements/legacy-statements.component';

@NgModule({
  imports: [CommonModule, FormsModule, RouterModule, SharedModule, CnCardModule, CnPageHeaderModule],
  declarations: [LegacyStatementsComponent, LegacyAuditLogComponent, PositivePayPlaceholderComponent],
  exports: [LegacyStatementsComponent, LegacyAuditLogComponent, PositivePayPlaceholderComponent]
})
export class LegacyModule {}
