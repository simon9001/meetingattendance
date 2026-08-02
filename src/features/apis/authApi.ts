import { apiSlice } from './apiSlice';

// ─── Auth Endpoint Types ───────────────────────────────────────────────────

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponseData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
    must_change_password: boolean;
    department_id?: string;
  };
  must_change_password: boolean;
}

export interface LoginResponse {
  success: boolean;
  data: LoginResponseData;
  error?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface UserProfile {
  id: number;
  user_id?: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  must_change_password: boolean;
  department?: string;
}

// ─── Auth API (injected into base apiSlice) ────────────────────────────────

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // POST /auth/login
    login: builder.mutation<LoginResponse, LoginCredentials>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    // POST /auth/logout
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),

    // POST /auth/change-password
    changePassword: builder.mutation<void, ChangePasswordPayload>({
      query: (passwords) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: passwords,
      }),
    }),

    // GET /auth/me
    getCurrentProfile: builder.query<UserProfile, void>({
      query: () => '/auth/me',
    }),
  }),
  // Prevents duplicate endpoint errors during hot-reload in development
  overrideExisting: false,
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useChangePasswordMutation,
  useGetCurrentProfileQuery,
} = authApi;
