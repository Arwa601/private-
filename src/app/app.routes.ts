import { Routes } from '@angular/router';
import { AddMemberComponent } from './components/add-member/add-member.component';
import { UserListComponent } from './components/users-list/users-list.component';
import { LayoutComponent } from './components/layout/layout.component';
import { ProfileComponent } from './components/profile/profile.component';
import { PipelineRunnerComponent } from './components/pipeline-runner/pipeline-runner.component';
import { inject } from '@angular/core';
import { AuthService } from './components/login/auth.service';
import { Router } from '@angular/router';
import { AdminGuard } from './components/login/admin.guard';

// Auth guard function
const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isAuthenticated()) {
    return true;
  }
  
  return router.createUrlTree(['/login']);
};

export const routes: Routes = [
  // Public routes
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component')
      .then(c => c.LoginComponent)
  },
  {
    path: 'diagnostics',
    loadComponent: () => import('./components/route-diagnostics/route-diagnostics.component')
      .then(c => c.RouteDiagnosticsComponent)
  },  {
    path: 'pipeline-runner',
    component: PipelineRunnerComponent
  },
  {
    path: 'documentation',
    loadComponent: () => import('./components/route-diagnostics/route-diagnostics.component')
      .then(c => c.RouteDiagnosticsComponent)
  },
  {
    path: 'support',
    loadComponent: () => import('./components/route-diagnostics/route-diagnostics.component')
      .then(c => c.RouteDiagnosticsComponent)
  },
  {
    path: 'app',
    component: LayoutComponent,
    canActivate: [authGuard],    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      { 
        path: 'users', 
        component: UserListComponent,
        canActivate: [() => inject(AdminGuard).canActivate()]
      },
      { 
        path: 'add-member', 
        component: AddMemberComponent,
        canActivate: [() => inject(AdminGuard).canActivate()]
      },
      { path: 'profile', component: ProfileComponent }
    ]
  },
  // Redirect root to login
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  // Fallback route
  { path: '**', redirectTo: 'login', pathMatch: 'full' }
];
