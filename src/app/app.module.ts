import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { routes } from './app.routes';
import { DashboardService } from './dashboard/services';
import { SharedService } from './components/services/shared.service';
import { AzureDevOpsService } from './services/Azure/azure-devops.service';

@NgModule({
  declarations: [
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot(routes)
    
    
  ],  providers: [
    DashboardService,
    SharedService,
    AzureDevOpsService
  ],
  bootstrap: []
})
export class AppModule { }