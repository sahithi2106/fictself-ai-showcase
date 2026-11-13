/**
 * FictSelf.AI Authentication and Authorization Client-Side SDK
 * 
 * DESIGNED FOR DIRECT MIGRATION TO PYTHON FASTAPI ENDPOINTS:
 * - POST /auth/register
 * - POST /auth/login
 * - POST /auth/logout
 * - POST /auth/refresh
 * - POST /auth/forgot-password
 * - POST /auth/reset-password
 * - POST /auth/verify-email
 * - GET /auth/me
 * - PUT /auth/profile
 * - DELETE /auth/account
 * 
 * Set API_BASE_URL to point to your FastAPI instance once ready.
 */

import { UserProfile, UserRole } from '../types';
import { apiLogin, apiRegister, apiUpdateProfile } from './api/auth';

export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';

// Storage key tokens matching production storage guidelines
const ACCESS_TOKEN_KEY = 'fictself_access_token';
const REFRESH_TOKEN_KEY = 'fictself_refresh_token';
const USER_SESSION_KEY = 'fictself_user_session';

export const authService = {
  /**
   * Helper utility to check Token validity or simulation
   */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_SESSION_KEY);
    localStorage.removeItem('fictself_reading_progress');
    localStorage.removeItem('fictself_reading_history');
  },

  /**
   * REGISTER: POST /auth/register
   * Delegates to real FastAPI endpoint.
   */
  async register(payload: {
    username: string;
    displayName: string;
    email: string;
    passwordHash: string;
  }): Promise<{ success: boolean; user: UserProfile; message: string }> {
    // Clear legacy/other user reading history before registering a new user
    localStorage.removeItem('fictself_reading_progress');
    localStorage.removeItem('fictself_reading_history');

    const { user } = await apiRegister({
      username: payload.username,
      email: payload.email,
      password: payload.passwordHash, // raw password from form
    });
    return {
      success: true,
      user,
      message: 'Account registered successfully.',
    };
  },

  /**
   * LOGIN: POST /auth/login
   * Delegates to real FastAPI endpoint (OAuth2 form encoding).
   */
  async login(payload: {
    email: string;
    passwordHash: string;
    rememberMe: boolean;
  }): Promise<{ user: UserProfile; accessToken: string; refreshToken: string }> {
    // Clear legacy/other user reading history before logging in a new user
    localStorage.removeItem('fictself_reading_progress');
    localStorage.removeItem('fictself_reading_history');

    // passwordHash here is actually the raw password from the auth form
    const { user, accessToken } = await apiLogin(payload.email, payload.passwordHash);
    return { user, accessToken, refreshToken: '' };
  },

  /**
   * VERIFY EMAIL: POST /auth/verify-email
   */
  async verifyEmail(email: string, code: string): Promise<{ success: boolean; user: UserProfile }> {
    throw new Error('Email verification is not implemented yet in the backend.');
  },

  /**
   * RESET PASSWORD & FORGOT: POST /auth/forgot-password / POST /auth/reset-password
   */
  async forgotPassword(email: string): Promise<{ success: boolean }> {
    throw new Error('Password reset is not implemented yet in the backend.');
  },

  async resetPassword(email: string, newPasswordHash: string): Promise<{ success: boolean }> {
    throw new Error('Password reset is not implemented yet in the backend.');
  },

  /**
   * UPDATE PROFILE: PUT /auth/profile
   */
  async updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      throw new Error('No active session. Please log in.');
    }
    return await apiUpdateProfile(data, accessToken);
  },

  /**
   * DELETE ACCOUNT: DELETE /auth/account
   */
  async deleteAccount(userId: string): Promise<{ success: boolean }> {
    throw new Error('Account deletion is not implemented yet in the backend.');
  },

  /**
   * LOGOUT SECURELY: POST /auth/logout
   */
  async logout(): Promise<{ success: boolean }> {
    // We don't have a backend logout endpoint right now, so just clear locally
    this.logoutSync();
    return { success: true };
  },

  logoutSync(): void {
    this.clearTokens();
    localStorage.removeItem(USER_SESSION_KEY);
  },

  /**
   * MOCK REFRESH: POST /auth/refresh
   */
  async refreshSession(): Promise<{ accessToken: string }> {
    throw new Error('Token refresh is not implemented yet in the backend.');
  },

  /**
   * GET CURRENT USER: GET /auth/me
   */
  getCurrentUserSync(): UserProfile | null {
    const token = this.getAccessToken();
    if (!token) return null; // Real token must exist
    const data = localStorage.getItem(USER_SESSION_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
};
