/**
 * FictSelf Auth API
 *
 * Real API calls for login and register.
 * All other auth functions remain in authService.ts.
 */

import { UserProfile } from '../../types';

const ACCESS_TOKEN_KEY = 'fictself_access_token';
const USER_SESSION_KEY = 'fictself_user_session';

/** Map minimal backend UserResponse to full frontend UserProfile */
export function adaptBackendUser(b: Record<string, any>): UserProfile {
  return {
    id: b.id,
    username: b.username,
    displayName: b.display_name || b.username,
    email: b.email,
    profileImage: b.profile_image || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(b.username)}`,
    bio: b.bio || '',
    aboutMe: b.about_me || '',
    role: 'Writer',
    isVerified: true,
    isActive: true,
    createdAt: b.created_at,
    lastLogin: b.updated_at ?? b.created_at,
    isOnboarded: b.is_onboarded || false,
    interests: b.interests ? b.interests.split(',').map((s: string) => s.trim()) : [],
  };
}

/** POST /auth/login — uses OAuth2 form encoding */
export async function apiLogin(email: string, password: string): Promise<{
  user: UserProfile;
  accessToken: string;
}> {
  const form = new URLSearchParams();
  form.append('username', email);   // FastAPI OAuth2: field is 'username'
  form.append('password', password);

  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.detail === 'string' ? err.detail : 'Incorrect email or password'
    );
  }

  const data = await res.json(); // { access_token, token_type }
  const accessToken: string = data.access_token;

  // Store JWT
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

  // Fetch profile
  const meRes = await fetch('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!meRes.ok) {
    throw new Error('Login succeeded but failed to fetch user profile.');
  }

  const backendUser = await meRes.json();
  const user = adaptBackendUser(backendUser);

  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
  return { user, accessToken };
}

/** POST /auth/register — creates account then immediately logs in to obtain JWT */
export async function apiRegister(payload: {
  username: string;
  email: string;
  password: string;
}): Promise<{ user: UserProfile }> {
  const res = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      username: payload.username,
      password: payload.password,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.detail === 'string' ? err.detail : 'Registration failed'
    );
  }

  // Registration succeeded — now auto-login to obtain the JWT.
  // Without this, no token is stored and every subsequent API call returns 401.
  const { user, accessToken } = await apiLogin(payload.email, payload.password);
  void accessToken; // already stored inside apiLogin
  return { user };
}

export async function apiRequestSignupOtp(email: string): Promise<void> {
  const res = await fetch('/api/v1/auth/request-signup-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Failed to send verification code.');
  }
}

export async function apiVerifySignupOtp(email: string, otp: string): Promise<void> {
  const res = await fetch('/api/v1/auth/verify-signup-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Failed to verify code.');
  }
}

export async function apiUpdateProfile(payload: Partial<UserProfile>, accessToken: string): Promise<UserProfile> {
  const backendPayload: any = {};
  if (payload.displayName !== undefined) backendPayload.display_name = payload.displayName;
  if (payload.profileImage !== undefined) backendPayload.profile_image = payload.profileImage;
  if (payload.bio !== undefined) backendPayload.bio = payload.bio;
  if (payload.aboutMe !== undefined) backendPayload.about_me = payload.aboutMe;
  if (payload.interests !== undefined) backendPayload.interests = payload.interests.join(', ');
  if (payload.isOnboarded !== undefined) backendPayload.is_onboarded = payload.isOnboarded;

  const res = await fetch('/api/v1/auth/me', {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(backendPayload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Failed to update profile');
  }
  
  const backendUser = await res.json();
  const user = adaptBackendUser(backendUser);
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
  return user;
}

export async function apiUploadAvatar(file: File, accessToken: string): Promise<UserProfile> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/v1/auth/me/avatar', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Failed to upload avatar');
  }

  const backendUser = await res.json();
  const user = adaptBackendUser(backendUser);
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
  return user;
}
