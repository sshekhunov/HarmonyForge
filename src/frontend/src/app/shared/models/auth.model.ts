export interface RegisterRequest {
  email: string;
  password: string;
  userName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  userName: string;
  expiresAt: string;
}

