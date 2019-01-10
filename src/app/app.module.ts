import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { CnPageShellModule } from '@meridian/canopy-ui';

import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { AuthCallbackComponent } from './layout/auth-callback/auth-callback.component';
import { IdleWarningComponent } from './layout/idle-warning/idle-warning.component';
import { NotFoundComponent } from './layout/not-found/not-found.component';
import { ShellComponent } from './layout/shell/shell.component';
import { SignedOutComponent } from './layout/signed-out/signed-out.component';
import { SharedModule } from './shared/shared.module';
import { metaReducers, reducers } from './store/app.state';
import { ApprovalsEffects } from './store/approvals/approvals.effects';
import { EntitlementsEffects } from './store/entitlements/entitlements.effects';

@NgModule({
  declarations: [
    AppComponent,
    ShellComponent,
    IdleWarningComponent,
    NotFoundComponent,
    SignedOutComponent,
    AuthCallbackComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CoreModule,
    SharedModule,
    CnPageShellModule,
    StoreModule.forRoot(reducers, {
      metaReducers,
      runtimeChecks: {
        // Strict checks were turned on in MBZ-1610 and off again a week later; the legacy
        // statement screen mutates a payload. Leave them off until MBZ-1611.
        strictStateImmutability: false,
        strictActionImmutability: false
      }
    }),
    EffectsModule.forRoot([EntitlementsEffects, ApprovalsEffects]),
    StoreDevtoolsModule.instrument({ maxAge: 25, logOnly: environment.production }),
    AppRoutingModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
