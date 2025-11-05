import { Injectable, signal } from '@angular/core';
import { AuthResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private currentUser = signal<AuthResponse | null>(null);
  private isAuthenticated = signal<boolean>(false);

  constructor() {
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.isAuthenticated.set(true);
      const userStr = localStorage.getItem('current_user');
      if (userStr) {
        try {
          this.currentUser.set(JSON.parse(userStr));
        } catch (e) {
          console.error('Failed to parse stored user data', e);
        }
      }
    }
  }

  setUser(user: AuthResponse): void {
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    localStorage.setItem('current_user', JSON.stringify(user));
  }

  getUser(): AuthResponse | null {
    return this.currentUser();
  }

  getIsAuthenticated(): boolean {
    return this.isAuthenticated();
  }

  clearUser(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem('current_user');
    localStorage.removeItem('auth_token');
  }

  currentUserSignal = this.currentUser.asReadonly();
  isAuthenticatedSignal = this.isAuthenticated.asReadonly();
}

