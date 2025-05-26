
import { Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    // For immediate checking (sync approach)
    if (this.authService.isAuthenticated() && this.authService.isAdmin()) {
      return true;
    }
    
    if (this.authService.isAuthenticated()) {
      return this.router.createUrlTree(['/app/dashboard']);
    }
    
    return this.router.createUrlTree(['/login']);
    
    // Alternative approach using Observable for async auth state
    /*
    return this.authService.authState$.pipe(
      take(1),
      map(authState => {
        if (authState.isAuthenticated && authState.role === 'Admin') {
          return true;
        } else if (authState.isAuthenticated) {
          return this.router.createUrlTree(['/app/dashboard']);
        } else {
          return this.router.createUrlTree(['/login']);
        }
      })
    );
    */
  }
}
