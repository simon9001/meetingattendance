import { useState, useEffect } from 'react';

// Layout
import { AppShell } from './components/layout/AppShell';
import { Sidebar } from './components/layout/Sidebar';
import { ToastContainer } from './components/shared/ToastContainer';

// Pages — Auth
import { LoginPage } from './pages/LoginPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProfilePage } from './pages/ProfilePage';

// Pages — Public
import { PublicAttendPage } from './pages/public/PublicAttendPage';
import { LiveDashboardPage } from './pages/public/LiveDashboardPage';

// Pages — Admin
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminDepartmentsPage } from './pages/admin/AdminDepartmentsPage';
import { AdminSecurityPage } from './pages/admin/AdminSecurityPage';
import { AdminLogsPage } from './pages/admin/AdminLogsPage';
import { DocumentsPage } from './pages/admin/DocumentsPage';

// Pages — Organizer
import { OrganizerMeetingsPage } from './pages/organizer/OrganizerMeetingsPage';
import { CreateMeetingPage } from './pages/organizer/CreateMeetingPage';
import { OrganizerSubmissionsPage } from './pages/organizer/OrganizerSubmissionsPage';

// Pages — HR
import { HRMeetingsPage } from './pages/hr/HRMeetingsPage';
import { HRRepositoryPage } from './pages/hr/HRRepositoryPage';
import { HRAnalyticsPage } from './pages/hr/HRAnalyticsPage';


// Shared components
import { QRCodeModal } from './components/QRCodeModal';
// Inline lightweight type for QR modal state (decoupled from mock data)
interface ActiveQRMeeting { id: string; title: string; pin: string; }
import { apiSlice } from './features/apis/apiSlice';
import type { User } from './data/mockData';
import type { Toast } from './types';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser, logout } from './features/slice/authSlice';
import { selectCurrentToken } from './features/slice/authSlice';
import { useLogoutMutation } from './features/apis/authApi';

// Helpers for bidirectional Tab <-> URL routing
export const getTabPath = (tab: string, role?: string): string => {
  switch (tab) {
    case 'dashboard':
      return '/dashboard';
    case 'users':
      return '/users';
    case 'departments':
      return '/departments';
    case 'security':
      return '/security';
    case 'logs':
      return '/logs';
    case 'documents':
      return '/documents';
    case 'meetings':
      return role === 'admin' ? '/dashboard' : '/meetings';
    case 'create_meeting':
      return '/create-meeting';
    case 'my_submissions':
      return '/my-submissions';
    case 'hr_archive':
      return '/hr-archive';
    case 'hr_analytics':
      return '/hr-analytics';
    case 'profile':
      return '/profile';
    default:
      return role === 'admin' ? '/dashboard' : '/meetings';
  }
};

export const getTabFromPath = (path: string, role?: string): string => {
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
  const pathToTab: Record<string, string> = {
    '/dashboard': role === 'admin' ? 'dashboard' : 'meetings',
    '/users': 'users',
    '/departments': 'departments',
    '/security': 'security',
    '/logs': 'logs',
    '/documents': 'documents',
    '/meetings': 'meetings',
    '/create-meeting': 'create_meeting',
    '/create_meeting': 'create_meeting',
    '/my-submissions': 'my_submissions',
    '/submissions': 'my_submissions',
    '/archive': 'hr_archive',
    '/hr-archive': 'hr_archive',
    '/analytics': 'hr_analytics',
    '/hr-analytics': 'hr_analytics',
    '/profile': 'profile',
  };
  return pathToTab[clean] || (role === 'admin' ? 'dashboard' : 'meetings');
};

function App() {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const currentToken = useSelector(selectCurrentToken);
  const [logoutApi] = useLogoutMutation();

  const setCurrentUser = (u: User | null) => {
    if (u === null) {
      dispatch(logout());
      dispatch(apiSlice.util.resetApiState());
    }
  };

  // ── Token expiry watcher ──────────────────────────────────────────────
  // Runs every 30 s. If the JWT's exp claim has passed, auto-logout.
  useEffect(() => {
    const isExpired = (token: string | null): boolean => {
      if (!token) return false; // nothing stored — already logged out
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
      } catch {
        return true;
      }
    };

    const check = () => {
      if (currentToken && isExpired(currentToken)) {
        dispatch(logout());
        dispatch(apiSlice.util.resetApiState());
        navigate('/login');
        showToast('Your session has expired. Please log in again.', 'error');
      }
    };

    // Check immediately, then every 30 seconds
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentToken]);

  // Fixed Light Theme (No dark theme)
  const theme = 'light';
  const setTheme = () => {};

  // Navigation / Router State
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modal State
  const [activeQRMeeting, setActiveQRMeeting] = useState<ActiveQRMeeting | null>(null);

  // Refresh Trigger State
  const [dbTick, setDbTick] = useState(0);

  // Active Dashboard Tab (role-specific, initialized from initial path)
  const [activeDashboardTab, setActiveDashboardTab] = useState<string>(() => {
    return getTabFromPath(window.location.pathname, currentUser?.role);
  });

  // Password reset form state
  const [resetOldPass, setResetOldPass] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');

  // --- Navigation ---
  const navigate = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
  };

  // Centralized Tab Change Handler (syncs tab and URL)
  const handleTabChange = (tab: string) => {
    setActiveDashboardTab(tab);
    const targetPath = getTabPath(tab, currentUser?.role);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
      setCurrentPath(targetPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      if (currentUser) {
        setActiveDashboardTab(getTabFromPath(path, currentUser.role));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  // --- Enforce Pure Light Theme ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('kmtams_theme');
  }, []);

  // --- Default tab per role and sync with URL paths on load / change ---
  useEffect(() => {
    if (currentUser) {
      const clean = currentPath.split('?')[0].replace(/\/+$/, '') || '/';
      // If user is at root '/', '/login', or '/reset-password', redirect to their role's home path
      if (clean === '' || clean === '/' || clean === '/login') {
        const homePath = currentUser.role === 'admin' ? '/dashboard' : '/meetings';
        const homeTab = currentUser.role === 'admin' ? 'dashboard' : 'meetings';
        setActiveDashboardTab(homeTab);
        if (window.location.pathname !== homePath) {
          window.history.replaceState(null, '', homePath);
          setCurrentPath(homePath);
        }
        return;
      }

      const matchedTab = getTabFromPath(clean, currentUser.role);
      setActiveDashboardTab(matchedTab);
    }
  }, [currentUser, currentPath]);

  // --- Toast Helper ---
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = `${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleLogout = async () => {
    try {
      await logoutApi(undefined).unwrap();
    } catch (e) {
      console.error('Logout error:', e);
    }
    dispatch(logout());
    dispatch(apiSlice.util.resetApiState());
    setLoginPassword('');
    showToast('Logged out successfully');
    navigate('/login');
    setDbTick(t => t + 1);
  };

  const triggerDbUpdate = () => setDbTick(t => t + 1);

  // ==========================================
  // ROUTING
  // ==========================================

  const cleanPath = currentPath.split('?')[0].replace(/\/+$/, '');

  // Public attendance route: /attend/:id
  const attendMatch = cleanPath.match(/^\/attend\/([^/]+)/);
  if (attendMatch) {
    const meetingId = attendMatch[1];
    return (
      <>
        <PublicAttendPage
          meetingId={meetingId}
          showToast={showToast}
          navigate={navigate}
          theme={theme}
          setTheme={setTheme}
          dbTick={dbTick}
          triggerDbUpdate={triggerDbUpdate}
        />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  // Live dashboard route: /meeting/:id/live
  const liveMatch = cleanPath.match(/^\/meeting\/([^/]+)\/live/);
  if (liveMatch) {
    const meetingId = liveMatch[1];
    return (
      <>
        <LiveDashboardPage
          meetingId={meetingId}
          showToast={showToast}
          navigate={navigate}
          theme={theme}
          setTheme={setTheme}
          dbTick={dbTick}
          triggerDbUpdate={triggerDbUpdate}
          currentUser={currentUser}
        />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  // Unauthenticated: show login or reset password
  if (!currentUser) {
    if (currentPath === '/reset-password') {
      return (
        <>
          <ResetPasswordPage
            email={loginEmail}
            resetOldPass={resetOldPass}
            setResetOldPass={setResetOldPass}
            resetNewPass={resetNewPass}
            setResetNewPass={setResetNewPass}
            resetConfirmPass={resetConfirmPass}
            setResetConfirmPass={setResetConfirmPass}
            setCurrentUser={setCurrentUser}
            showToast={showToast}
            navigate={navigate}
            theme={theme}
          />
          <ToastContainer toasts={toasts} />
        </>
      );
    }

    return (
      <>
        <LoginPage
          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          setCurrentUser={setCurrentUser}
          showToast={showToast}
          navigate={navigate}
          theme={theme}
          setTheme={setTheme}
        />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  // Forced password reset
  if (currentUser.mustChangePassword) {
    return (
      <>
        <ResetPasswordPage
          email={currentUser.email}
          resetOldPass={resetOldPass}
          setResetOldPass={setResetOldPass}
          resetNewPass={resetNewPass}
          setResetNewPass={setResetNewPass}
          resetConfirmPass={resetConfirmPass}
          setResetConfirmPass={setResetConfirmPass}
          setCurrentUser={setCurrentUser}
          showToast={showToast}
          navigate={navigate}
          theme={theme}
        />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  // Redirect root/login/reset paths to dashboard
  if (currentPath === '/' || currentPath === '/login' || currentPath === '/reset-password') {
    navigate('/dashboard');
  }

  // ==========================================
  // AUTHENTICATED DASHBOARD
  // ==========================================

  const renderDashboardContent = () => {
    // --- SHARED (any role) ---
    if (activeDashboardTab === 'profile') {
      return <ProfilePage currentUser={currentUser} />;
    }

    // --- ADMIN TABS ---
    if (activeDashboardTab === 'dashboard' && currentUser.role === 'admin') {
      return <AdminDashboardPage />;
    }
    if (activeDashboardTab === 'users' && currentUser.role === 'admin') {
      return <AdminUsersPage dbTick={dbTick} showToast={showToast} triggerDbUpdate={triggerDbUpdate} />;
    }
    if (activeDashboardTab === 'departments' && currentUser.role === 'admin') {
      return <AdminDepartmentsPage dbTick={dbTick} showToast={showToast} triggerDbUpdate={triggerDbUpdate} />;
    }
    if (activeDashboardTab === 'security' && currentUser.role === 'admin') {
      return <AdminSecurityPage dbTick={dbTick} showToast={showToast} triggerDbUpdate={triggerDbUpdate} />;
    }
    if (activeDashboardTab === 'logs' && currentUser.role === 'admin') {
      return <AdminLogsPage />;
    }
    if (activeDashboardTab === 'documents' && currentUser.role === 'admin') {
      return <DocumentsPage dbTick={dbTick} showToast={showToast} triggerDbUpdate={triggerDbUpdate} />;
    }

    // --- ORGANIZER TABS ---
    if (activeDashboardTab === 'meetings' && currentUser.role === 'organizer') {
      return (
        <OrganizerMeetingsPage
          currentUser={currentUser}
          dbTick={dbTick}
          showToast={showToast}
          triggerDbUpdate={triggerDbUpdate}
          navigate={navigate}
          setActiveQRMeeting={setActiveQRMeeting}
          onCreateMeeting={() => handleTabChange('create_meeting')}
        />
      );
    }
    if (activeDashboardTab === 'create_meeting' && currentUser.role === 'organizer') {
      return (
        <CreateMeetingPage
          currentUser={currentUser}
          showToast={showToast}
          triggerDbUpdate={triggerDbUpdate}
          setActiveTab={handleTabChange}
        />
      );
    }
    if (activeDashboardTab === 'my_submissions' && currentUser.role === 'organizer') {
      return <OrganizerSubmissionsPage />;
    }

    // --- HR TABS ---
    if (activeDashboardTab === 'meetings' && currentUser.role === 'hr') {
      return (
        <HRMeetingsPage
          currentUser={currentUser}
          dbTick={dbTick}
          showToast={showToast}
          triggerDbUpdate={triggerDbUpdate}
          navigate={navigate}
          setActiveQRMeeting={setActiveQRMeeting}
        />
      );
    }
    if (activeDashboardTab === 'hr_archive' && currentUser.role === 'hr') {
      return <HRRepositoryPage />;
    }
    if (activeDashboardTab === 'hr_analytics' && currentUser.role === 'hr') {
      return <HRAnalyticsPage />;
    }

    return null;
  };

  return (
    <>
      <AppShell
        currentUser={currentUser}
        handleLogout={handleLogout}
        activeDashboardTab={activeDashboardTab}
        setActiveDashboardTab={handleTabChange}
        onOpenProfile={() => handleTabChange('profile')}
        sidebar={
          <Sidebar
            currentUser={currentUser}
            activeDashboardTab={activeDashboardTab}
            setActiveDashboardTab={handleTabChange}
          />
        }
      >
        {renderDashboardContent()}
      </AppShell>

      {/* Floating QR Modal */}
      {activeQRMeeting && (
        <QRCodeModal
          meetingId={activeQRMeeting.id}
          meetingTitle={activeQRMeeting.title}
          meetingPin={activeQRMeeting.pin}
          isOpen={true}
          onClose={() => setActiveQRMeeting(null)}
        />
      )}

      <ToastContainer toasts={toasts} />
    </>
  );
}

export default App;
