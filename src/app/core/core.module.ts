import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule, HttpClientXsrfModule } from '@angular/common/http';
import { CnCoreModule } from '@meridian/canopy-ui';

import { AuthInterceptor } from './interceptors/auth.interceptor';
import { CorrelationInterceptor } from './interceptors/correlation.interceptor';
import { ErrorInterceptor } from './interceptors/error.interceptor';

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    // Header names agreed with the BFF in PLAT-410. Do not rename without a BFF change in the same train.
    HttpClientXsrfModule.withOptions({ cookieName: 'MERIDIAN-XSRF', headerName: 'X-MERIDIAN-XSRF' }),
    CnCoreModule.forRoot({ locale: 'en-US', currency: 'USD', density: 'compact', themeStorageKey: null })
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: CorrelationInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
  ]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parent: CoreModule) {
    if (parent) {
      throw new Error('CoreModule is imported once, in AppModule. See MBZ-233.');
    }
  }
}
