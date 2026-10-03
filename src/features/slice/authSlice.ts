import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../data/mockData';

interface AuthState {
  user: User | null;
  token: string | null;
  // Swapped for a fresh access token when the current one (≈1 hour) expires.
  refreshToken: string | null;
  // "Keep me signed in": the refresh token lives in localStorage and survives
  // closing the browser. Otherwise it lives in sessionStorage and is gone when
  // the browser closes, so the session ends once the access token expires.
  remember: boolean;
}

const USER_KEY = 'kmtams_logged_in_user';
const TOKEN_KEY = 'kmtams_token';
const REFRESH_KEY = 'kmtams_refresh_token';
const REMEMBER_KEY = 'kmtams_remember_me';

const savedUser = localStorage.getItem(USER_KEY);
const savedToken = localStorage.getItem(TOKEN_KEY);
const savedRemember = localStorage.getItem(REMEMBER_KEY) === 'true';
const savedRefresh = savedRemember
  ? localStorage.getItem(REFRESH_KEY)
  : sessionStorage.getItem(REFRESH_KEY);

// Decode JWT exp claim without a library
const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp is in seconds; Date.now() is in ms
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // malformed token — treat as expired
  }
};

const clearStoredSession = () => {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
};

const storeRefreshToken = (refreshToken: string | null, remember: boolean) => {
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  if (!refreshToken) return;
  (remember ? localStorage : sessionStorage).setItem(REFRESH_KEY, refreshToken);
};

// If the stored user still has mustChangePassword: true, don't restore the
// session — they must log in again so the forced-reset flow runs properly.
// An expired access token is fine when a refresh token can renew it.
const parsedUser = savedUser ? JSON.parse(savedUser) : null;
const shouldRestoreSession =
  parsedUser &&
  !parsedUser.mustChangePassword &&
  (!isTokenExpired(savedToken) || !!savedRefresh);

if (!shouldRestoreSession) {
  clearStoredSession();
}

const initialState: AuthState = {
  user: shouldRestoreSession ? parsedUser : null,
  token: shouldRestoreSession ? savedToken : null,
  refreshToken: shouldRestoreSession ? savedRefresh : null,
  remember: shouldRestoreSession ? savedRemember : false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string; refreshToken?: string | null; remember?: boolean }>
    ) => {
      const { user, token, refreshToken = null, remember = false } = action.payload;
      state.user = user;
      state.token = token;
      state.refreshToken = refreshToken;
      state.remember = remember;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REMEMBER_KEY, String(remember));
      storeRefreshToken(refreshToken, remember);
    },
    // A renewed session from /auth/refresh. Supabase rotates the refresh token
    // on every use, so the new one replaces the old.
    tokenRefreshed: (
      state,
      action: PayloadAction<{ token: string; refreshToken: string }>
    ) => {
      if (!state.user) return;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      localStorage.setItem(TOKEN_KEY, action.payload.token);
      storeRefreshToken(action.payload.refreshToken, state.remember);
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem(USER_KEY, JSON.stringify(state.user));
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.remember = false;
      clearStoredSession();
    },
  },
});

export const { setCredentials, tokenRefreshed, updateUser, logout } = authSlice.actions;

export default authSlice.reducer;

export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectCurrentToken = (state: { auth: AuthState }) => state.auth.token;
export const selectRefreshToken = (state: { auth: AuthState }) => state.auth.refreshToken;

// Map backend role to frontend role
export const mapBackendRoleToFrontend = (role: string): 'admin' | 'hr' | 'organizer' => {
  if (role === 'ict_admin') return 'admin';
  if (role === 'hr_officer') return 'hr';
  return 'organizer';
};

// Map backend user to frontend User shape
export const mapProfileToUser = (profile: any, departmentName?: string): User => {
  return {
    id: profile.id || profile.user_id,
    name: profile.full_name,
    email: profile.email,
    role: mapBackendRoleToFrontend(profile.role),
    department: departmentName || 'ICT Department',
    status: profile.is_active ? 'active' : 'disabled',
    mustChangePassword: profile.must_change_password ?? false,
  };
};
