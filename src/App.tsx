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
import type { User } from './data/mockData';
import type { Toast } from './types';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser, logout } from './features/slice/authSlice';
import { selectCurrentToken } from './features/slice/authSlice';
import { useLogoutMutation } from './features/apis/authApi';

function App() {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const currentToken = useSelector(selectCurrentToken);
  const [logoutApi] = useLogoutMutation();

  const setCurrentUser = (u: User | null) => {
    if (u === null) {
      dispatch(logout());
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

  // Active Dashboard Tab (role-specific)
  const [activeDashboardTab, setActiveDashboardTab] = useState('');

  // Password reset form state
  const [resetOldPass, setResetOldPass] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');

  // --- Navigation ---
  const navigate = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
  };

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- Enforce Pure Light Theme ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('kmtams_theme');
  }, []);

  // --- Default tab per role ---
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') setActiveDashboardTab('dashboard');
      else if (currentUser.role === 'hr') setActiveDashboardTab('meetings');
      else if (currentUser.role === 'organizer') setActiveDashboardTab('meetings');
    }
  }, [currentUser]);

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
    setLoginPassword('');
    showToast('Logged out successfully');
    navigate('/login');
    setDbTick(t => t + 1);
  };

  const triggerDbUpdate = () => setDbTick(t => t + 1);

  // ==========================================
  // ROUTING
  // ==========================================

  // Public attendance route: /attend/:id
  const isAttendRoute = currentPath.startsWith('/attend/');
  if (isAttendRoute) {
    const meetingId = currentPath.split('/')[2];
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
  const isLiveDashboardRoute = currentPath.startsWith('/meeting/') && currentPath.endsWith('/live');
  if (isLiveDashboardRoute) {
    const meetingId = currentPath.split('/')[2];
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
          onCreateMeeting={() => setActiveDashboardTab('create_meeting')}
        />
      );
    }
    if (activeDashboardTab === 'create_meeting' && currentUser.role === 'organizer') {
      return (
        <CreateMeetingPage
          currentUser={currentUser}
          showToast={showToast}
          triggerDbUpdate={triggerDbUpdate}
          setActiveTab={setActiveDashboardTab}
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
        setActiveDashboardTab={setActiveDashboardTab}
        onOpenProfile={() => setActiveDashboardTab('profile')}
        sidebar={
          <Sidebar
            currentUser={currentUser}
            activeDashboardTab={activeDashboardTab}
            setActiveDashboardTab={setActiveDashboardTab}
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
