// filepath: c:\Users\arwa.abdi\source\repos\APIsTestAutomationFront\src\app\components\login\auth.service.d.ts

import { Observable } from 'rxjs';
import { AuthState, LoginRequest, UserResponse } from '../../models/auth.model';

export declare class AuthService {
  authState$: Observable<AuthState>;
  
  login(credentials: LoginRequest): Observable<UserResponse>;
  logout(): void;
  isAuthenticated(): boolean;
  getUserId(): string | null;
  getUserFullName(): string;
  getUserRole(): string | null;
}