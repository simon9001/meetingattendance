import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { KeNHALogo } from '../components/KeNHALogo';
import type { User } from '../data/mockData';
import { useLoginMutation } from '../features/apis/authApi';
import { useDispatch } from 'react-redux';
import { apiSlice } from '../features/apis/apiSlice';
import { setCredentials, mapProfileToUser } from '../features/slice/authSlice';
import { AlertError, AlertWarning, AlertInfo, InlineSpinner } from '../components/shared/Feedback';

interface LoginPageProps {
  loginEmail: string;
  setLoginEmail: (e: string) => void;
  loginPassword: string;
  setLoginPassword: (p: string) => void;
  setCurrentUser: (u: User | null) => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
  navigate: (path: string) => void;
  theme?: string;
  setTheme?: React.Dispatch<React.SetStateAction<string>>;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  loginEmail, setLoginEmail,
  loginPassword, setLoginPassword,
  setCurrentUser, showToast, navigate,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  const [loginApi] = useLoginMutation();
  const dispatch = useDispatch();

  // Auto-dismiss warning messages after 4 seconds
  useEffect(() => {
    if (warningMsg) {
      const timer = setTimeout(() => {
        setWarningMsg(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [warningMsg]);

  // Auto-dismiss error messages after 4 seconds
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => {
        setErrorMsg(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const validateForm = (): boolean => {
    setErrorMsg(null);
    setWarningMsg(null);

    if (!loginEmail || !loginPassword) {
      setWarningMsg('Please fill in all required fields.');
      return false;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginEmail)) {
      setWarningMsg('Warning: Invalid email address!');
      return false;
    }

    return true;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setWarningMsg(null);

    try {
      const response = await loginApi({ email: loginEmail, password: loginPassword }).unwrap();
      if (response.success && response.data) {
        const { access_token, user: profile, must_change_password } = response.data;
        const mappedUser = mapProfileToUser(profile);

        // Reset all RTK Query cache so that no previous user's cached data is shown
        dispatch(apiSlice.util.resetApiState());
        dispatch(setCredentials({ user: mappedUser, token: access_token }));
        setCurrentUser(mappedUser);

        showToast(`Welcome back, ${mappedUser.name}!`);
        const targetHome = mappedUser.role === 'admin' ? '/dashboard' : '/meetings';
        navigate(must_change_password ? '/reset-password' : targetHome);
      } else {
        const err = response.error || 'Invalid email or password';
        setErrorMsg(err);
      }
    } catch (err: any) {
      // RTK Query FetchBaseQueryError wraps the server body in err.data
      // Try common backend response shapes: { error }, { message }, { detail }
      const serverMsg =
        err?.data?.error ||
        err?.data?.message ||
        err?.data?.detail ||
        (typeof err?.data === 'string' ? err.data : null);
      const errMsg = serverMsg || err?.message || `Login failed (${err?.status ?? 'unknown error'}). Please try again.`;
      setErrorMsg(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      {/* Top-Right Floating Alerts Container */}
      {(warningMsg || errorMsg) && (
        <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
          {warningMsg && <AlertWarning message={warningMsg} />}
          {errorMsg && <AlertError message={errorMsg} />}
        </div>
      )}

      <div className="login-center">
        <div className="login-card">
          <div className="login-card-brand">
            <KeNHALogo width={38} height={19} />
            <div>
              <div className="login-card-brand-name">KeNHA</div>
              <div className="login-card-brand-sub">KMTAMS</div>
            </div>
          </div>

          <div className="login-header">
            <h1>Sign in</h1>
          </div>

          <form onSubmit={handleLoginSubmit} noValidate>
            <div className="form-group underline">
              <input
                id="l-email" type="email" autoComplete="email"
                placeholder="Email address"
                value={loginEmail} 
                onChange={e => {
                  setLoginEmail(e.target.value);
                  if (warningMsg || errorMsg) { setWarningMsg(null); setErrorMsg(null); }
                }}
                required
                className="form-input"
              />
            </div>

            <div className="form-group underline login-password-wrapper">
              <input
                id="l-pass" type={showPassword ? 'text' : 'password'}
                autoComplete="current-password" placeholder="Password"
                value={loginPassword} 
                onChange={e => {
                  setLoginPassword(e.target.value);
                  if (warningMsg || errorMsg) { setWarningMsg(null); setErrorMsg(null); }
                }}
                required
                className="form-input"
                style={{ paddingRight: 28 }}
              />
              <button
                type="button" tabIndex={-1}
                className="login-password-toggle"
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="login-actions">
              <button
                type="button"
                className="forgot-password-link bg-transparent border-0 p-0 text-left cursor-pointer"
                onClick={() => navigate('/reset-password')}
              >
                Forgot password?
              </button>
              <label className="login-keep-signed-in">
                <input id="l-keep" type="checkbox" />
                Keep me signed in
              </label>
            </div>

            <div className="login-submit-row">
              <button type="submit" className="btn btn-primary min-w-28 flex items-center justify-center gap-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <InlineSpinner />
                    <span>Signing in…</span>
                  </>
                ) : 'Sign in'}
              </button>
            </div>
          </form>
        </div>

        {/* Access help notice */}
        <div className="w-[440px] max-w-full mt-3">
          <AlertInfo message="For access issues, contact your ICT administrator. Do not share your credentials with anyone." />
        </div>
      </div>

      <div className="login-footer">
        <span>Terms of use</span>
        <span>Privacy &amp; cookies</span>
        <span>© {new Date().getFullYear()} KeNHA KMTAMS v1.0</span>
      </div>
    </div>
  );
};