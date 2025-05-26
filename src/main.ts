import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { importProvidersFrom } from '@angular/core';
import { ToastrModule } from 'ngx-toastr';

// Merge the app config with additional providers
const providers = [
  ...appConfig.providers,
  importProvidersFrom(
    ToastrModule.forRoot({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
    })
  )
];

// Bootstrap with combined providers
bootstrapApplication(AppComponent, {
  providers
}).catch(err => console.error(err));