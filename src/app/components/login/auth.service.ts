// filepath: c:\Users\arwa.abdi\source\repos\APIsTestAutomationFront\src\app\components\login\auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthState, LoginRequest, StorageKeys, UserResponse } from '../../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/Auth`;
  
  // BehaviorSubject to track authentication state throughout the app
  private authStateSubject = new BehaviorSubject<AuthState>({
    userId: null,
    firstName: null,
    lastName: null,
    email: null,
    role: null,
    isAuthenticated: false
  });
  
  // Observable stream of auth state that components can subscribe to
  public authState$: Observable<AuthState> = this.authStateSubject.asObservable();
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadUserFromLocalStorage();
  }
  
  /**
   * Login user with email and password
   */
  login(credentials: LoginRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(user => this.setUserSession(user)),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => new Error(error.error?.message || 'Failed to login. Please check your credentials.'));
        })
      );
  }
  
  /**
   * Logout user and clear session data
   */
  logout(): void {
    // Clear local storage
    this.clearUserSession();
    
    // Navigate to login page
    this.router.navigate(['/login']);
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }
  
  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.authStateSubject.value.userId;
  }
  
  /**
   * Get user's full name
   */
  getUserFullName(): string {
    const { firstName, lastName } = this.authStateSubject.value;
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    
    return 'User';
  }
    /**
   * Get user's role
   */
  getUserRole(): string | null {
    return this.authStateSubject.value.role;
  }
    /**
   * Check if the current user is an Admin
   */
  isAdmin(): boolean {
    return this.authStateSubject.value.role === 'Admin';
  }
  
  /**
   * Check if a route is accessible by the current user
   * @param route The route to check access for
   * @returns boolean indicating if the user can access the route
   */
  canAccessRoute(route: string): boolean {
    // Define admin-only routes
    const adminOnlyRoutes = ['/app/users', '/app/add-member'];
    
    // Admin can access all routes
    if (this.isAdmin()) {
      return true;
    }
    
    // For non-admin users, check if the route is admin-only
    return !adminOnlyRoutes.some(adminRoute => route.startsWith(adminRoute));
  }
  
  /**
   * Store user session data in local storage and update auth state
   */
  private setUserSession(user: UserResponse): void {
    // Save to local storage
    localStorage.setItem(StorageKeys.USER_ID, user.Id);
    localStorage.setItem(StorageKeys.FIRST_NAME, user.Firstname);
    localStorage.setItem(StorageKeys.LAST_NAME, user.Lastname);
    localStorage.setItem(StorageKeys.EMAIL, user.Email);
    localStorage.setItem(StorageKeys.ROLE, user.Role);
    localStorage.setItem(StorageKeys.IS_AUTHENTICATED, 'true');
    
    // Update auth state
    this.authStateSubject.next({
      userId: user.Id,
      firstName: user.Firstname,
      lastName: user.Lastname,
      email: user.Email,
      role: user.Role,
      isAuthenticated: true
    });
  }
  
  /**
   * Clear user session data from local storage and reset auth state
   */
  private clearUserSession(): void {
    // Clear local storage
    localStorage.removeItem(StorageKeys.USER_ID);
    localStorage.removeItem(StorageKeys.FIRST_NAME);
    localStorage.removeItem(StorageKeys.LAST_NAME);
    localStorage.removeItem(StorageKeys.EMAIL);
    localStorage.removeItem(StorageKeys.ROLE);
    localStorage.removeItem(StorageKeys.IS_AUTHENTICATED);
    
    // Reset auth state
    this.authStateSubject.next({
      userId: null,
      firstName: null,
      lastName: null,
      email: null,
      role: null,
      isAuthenticated: false
    });
  }
  
  /**
   * Load user data from local storage on application init
   */
  private loadUserFromLocalStorage(): void {
    const isAuthenticated = localStorage.getItem(StorageKeys.IS_AUTHENTICATED) === 'true';
    
    if (isAuthenticated) {
      // Load user data from local storage
      const userId = localStorage.getItem(StorageKeys.USER_ID);
      const firstName = localStorage.getItem(StorageKeys.FIRST_NAME);
      const lastName = localStorage.getItem(StorageKeys.LAST_NAME);
      const email = localStorage.getItem(StorageKeys.EMAIL);
      const role = localStorage.getItem(StorageKeys.ROLE);
      
      // Update auth state
      this.authStateSubject.next({
        userId,
        firstName,
        lastName,
        email,
        role,
        isAuthenticated
      });
    }
  }
}
