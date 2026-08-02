import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../data/mockData';

interface AuthState {
  user: User | null;
  token: string | null;
}

const savedUser = localStorage.getItem('kmtams_logged_in_user');
const savedToken = localStorage.getItem('kmtams_token');

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

// If the stored user still has mustChangePassword: true, don't restore the
// session — they must log in again so the forced-reset flow runs properly.
const parsedUser = savedUser ? JSON.parse(savedUser) : null;
const shouldRestoreSession =
  parsedUser &&
  !parsedUser.mustChangePassword &&
  !isTokenExpired(savedToken);

if (!shouldRestoreSession) {
  localStorage.removeItem('kmtams_logged_in_user');
  localStorage.removeItem('kmtams_token');
}

const initialState: AuthState = {
  user: shouldRestoreSession ? parsedUser : null,
  token: shouldRestoreSession ? savedToken : null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      localStorage.setItem('kmtams_logged_in_user', JSON.stringify(user));
      localStorage.setItem('kmtams_token', token);
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('kmtams_logged_in_user', JSON.stringify(state.user));
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('kmtams_logged_in_user');
      localStorage.removeItem('kmtams_token');
    },
  },
});

export const { setCredentials, updateUser, logout } = authSlice.actions;

export default authSlice.reducer;

export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectCurrentToken = (state: { auth: AuthState }) => state.auth.token;

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
