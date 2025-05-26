
export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  Id: string;
  Firstname: string;
  Lastname: string;
  Password: string;
  Email: string;
  Role: string;
  Status: string;
  Projects: any[];
}

export interface AuthState {
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
  isAuthenticated: boolean;
}

export enum StorageKeys {
  USER_ID = 'user_id',
  FIRST_NAME = 'first_name',
  LAST_NAME = 'last_name',
  EMAIL = 'email',
  ROLE = 'role',
  IS_AUTHENTICATED = 'is_authenticated'
}
