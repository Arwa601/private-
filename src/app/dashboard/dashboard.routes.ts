import { Routes } from '@angular/router';
import { DashboardComponent } from './containers/dashboard-page/dashboard-page.component';
import { AzureDevopsComponent } from './components/azure-devops-page/azure-devops.component';


export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full'
  },
  {
    path: 'overview',
    component: DashboardComponent
  },
  {
    path: 'azure-devops',
    component: AzureDevopsComponent
  }
];

export default DASHBOARD_ROUTES;
