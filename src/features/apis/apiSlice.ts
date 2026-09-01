import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { BASE_URL } from '../../backendcomnnect/domin';
import { logout } from '../slice/authSlice';

/**
 * Base API Slice
 *
 * This is the single RTK Query API instance for the entire app.
 * Domain-specific endpoints are split into separate files using
 * `apiSlice.injectEndpoints(...)` — see:
 *   - authApi.ts      → /auth/*
 *   - (add more here as you split them out)
 */
// Raw base query with auth header injection
const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as any).auth.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Wrapper: auto-logout on 401 (token expired / invalid)
const baseQueryWithLogoutOn401: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    api.dispatch(logout());
    api.dispatch(apiSlice.util.resetApiState());
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithLogoutOn401,
  tagTypes: [
    'User',
    'Meeting',
    'Department',
    'Attendance',
    'AuditLog',
    'Notification',
    'Report',
    'Template',
    'Asset',
    'GeneratedDoc',
  ],
  endpoints: (builder) => ({
    // ─── User Administration ─────────────────────────────────────────────
    getUsers: builder.query({
      query: () => '/users',
      providesTags: ['User'],
    }),
    createUser: builder.mutation({
      query: (userData) => ({
        url: '/users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User', 'AuditLog'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: ['User', 'AuditLog'],
    }),
    disableUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}/disable`,
        method: 'PATCH',
      }),
      invalidatesTags: ['User', 'AuditLog'],
    }),
    enableUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}/enable`,
        method: 'PATCH',
      }),
      invalidatesTags: ['User', 'AuditLog'],
    }),
    resetUserPassword: builder.mutation({
      query: (id) => ({
        url: `/users/${id}/reset-password`,
        method: 'POST',
      }),
      invalidatesTags: ['User', 'AuditLog'],
    }),

    // ─── Departments ──────────────────────────────────────────────────────
    getDepartments: builder.query({
      query: () => '/departments',
      providesTags: ['Department'],
    }),
    createDepartment: builder.mutation({
      query: (deptData) => ({
        url: '/departments',
        method: 'POST',
        body: deptData,
      }),
      invalidatesTags: ['Department', 'AuditLog'],
    }),
    deleteDepartment: builder.mutation({
      query: (id) => ({
        url: `/departments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Department', 'AuditLog'],
    }),

    // ─── Meetings ────────────────────────────────────────────────────────
    getMeetings: builder.query({
      query: () => '/meetings',
      providesTags: ['Meeting'],
    }),
    getMeetingDashboardStats: builder.query<{ success: boolean; data: { totalAttendanceStaff: number; totalAttendanceVisitors: number; totalAttendance: number } }, void>({
      query: () => '/meetings/dashboard-stats',
      providesTags: ['Attendance'],
    }),
    getMeeting: builder.query({
      query: (id) => `/meetings/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Meeting', id }],
    }),
    getLiveMeeting: builder.query({
      query: (id) => `/meetings/${id}/live`,
      providesTags: (_result, _error, id) => [{ type: 'Meeting', id }],
    }),
    createMeeting: builder.mutation({
      query: (meetingData) => ({
        url: '/meetings',
        method: 'POST',
        body: meetingData,
      }),
      invalidatesTags: ['Meeting', 'AuditLog'],
    }),
    updateMeeting: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/meetings/${id}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Meeting', id },
        'Meeting',
        'AuditLog',
      ],
    }),
    openMeetingAttendance: builder.mutation({
      query: (id) => ({
        url: `/meetings/${id}/open-attendance`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Meeting', id },
        'Meeting',
        'AuditLog',
      ],
    }),
    closeMeetingAttendance: builder.mutation({
      query: (id) => ({
        url: `/meetings/${id}/close-attendance`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Meeting', id },
        'Meeting',
        'AuditLog',
      ],
    }),
    extendMeetingAttendance: builder.mutation({
      query: ({ id, minutes }) => ({
        url: `/meetings/${id}/extend-attendance`,
        method: 'POST',
        body: { minutes },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Meeting', id },
        'Meeting',
        'AuditLog',
      ],
    }),
    sendMeetingReminders: builder.mutation<any, { meetingId: string; dayLabel?: string; dateStr?: string; emails?: string[] }>({
      query: ({ meetingId, ...body }) => ({
        url: `/meetings/${meetingId}/send-reminders`,
        method: 'POST',
        body,
      }),
    }),

    // ─── Attendance ───────────────────────────────────────────────────────
    getPublicMeetingInfo: builder.query({
      query: (meetingId) => `/attendance/meeting-info/${meetingId}`,
    }),
    validateMeetingPin: builder.mutation<{ success: boolean; message: string; meetingTitle?: string }, { meeting_id: string; meeting_pin: string }>({
      query: (data) => ({
        url: '/attendance/validate-pin',
        method: 'POST',
        body: data,
      }),
    }),
    submitAttendance: builder.mutation({
      query: (attendanceData) => ({
        url: '/attendance/submit',
        method: 'POST',
        body: attendanceData,
      }),
      invalidatesTags: ['Attendance', 'AuditLog'],
    }),
    getMeetingAttendance: builder.query({
      query: (meetingId) => `/attendance/${meetingId}`,
      providesTags: ['Attendance'],
    }),

    // ─── Reports ──────────────────────────────────────────────────────────
    getReports: builder.query({
      query: () => '/reports',
      providesTags: ['Report'],
    }),
    generateReport: builder.mutation({
      query: (meetingId) => ({
        url: `/reports/generate/${meetingId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Report', 'Meeting', 'AuditLog'],
    }),
    submitReportToHR: builder.mutation({
      query: (id) => ({
        url: `/reports/${id}/submit-to-hr`,
        method: 'POST',
      }),
      invalidatesTags: ['Report', 'Meeting', 'AuditLog'],
    }),
    archiveReport: builder.mutation({
      query: (id) => ({
        url: `/reports/${id}/archive`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Report', 'AuditLog'],
    }),
    downloadReport: builder.query({
      query: (id) => `/reports/${id}/download`,
    }),

    // ─── Audit Logs ───────────────────────────────────────────────────────
    getAuditLogs: builder.query({
      query: () => '/audit',
      providesTags: ['AuditLog'],
    }),

    // ─── Notifications ────────────────────────────────────────────────────
    getNotifications: builder.query({
      query: () => '/notifications',
      providesTags: ['Notification'],
    }),
    getUnreadNotificationsCount: builder.query({
      query: () => '/notifications/unread-count',
      providesTags: ['Notification'],
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
    markNotificationRead: builder.mutation({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  // Users
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDisableUserMutation,
  useEnableUserMutation,
  useResetUserPasswordMutation,
  // Departments
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useDeleteDepartmentMutation,
  // Meetings
  useGetMeetingsQuery,
  useGetMeetingDashboardStatsQuery,
  useGetMeetingQuery,
  useGetLiveMeetingQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useOpenMeetingAttendanceMutation,
  useCloseMeetingAttendanceMutation,
  useExtendMeetingAttendanceMutation,
  useSendMeetingRemindersMutation,
  // Attendance
  useGetPublicMeetingInfoQuery,
  useValidateMeetingPinMutation,
  useSubmitAttendanceMutation,
  useGetMeetingAttendanceQuery,
  // Reports
  useGetReportsQuery,
  useGenerateReportMutation,
  useSubmitReportToHRMutation,
  useArchiveReportMutation,
  useLazyDownloadReportQuery,
  // Audit Logs
  useGetAuditLogsQuery,
  // Notifications
  useGetNotificationsQuery,
  useGetUnreadNotificationsCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} = apiSlice;
