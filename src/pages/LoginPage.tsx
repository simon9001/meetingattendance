import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { KeNHALogo } from '../components/KeNHALogo';
import type { User } from '../data/mockData';
import { useLoginMutation } from '../features/apis/authApi';
import { useDispatch } from 'react-redux';
import { apiSlice } from '../features/apis/apiSlice';
import { setCredentials, mapProfileToUser } from '../features/slice/authSlice';
import { AlertError, AlertWarning, AlertInfo, InlineSpinner } from '../components/shared/Feedback';
import { FormField } from '../components/shared/FormField';

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
  // Per-field messages render beside the field they belong to, rather than only
  // as a floating banner that never says which input is at fault.
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const clearMessages = () => {
    setWarningMsg(null);
    setErrorMsg(null);
    setFieldErrors({});
  };

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

    const next: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!loginEmail) {
      next.email = 'Enter your official email address.';
    } else if (!emailRegex.test(loginEmail)) {
      next.email = 'Enter a valid email address, e.g. name@kenha.co.ke';
    }
    if (!loginPassword) {
      next.password = 'Enter your password.';
    }

    setFieldErrors(next);

    // Move focus to the first field at fault so keyboard and screen reader users
    // are taken to the problem instead of having to hunt for it.
    const firstInvalid = next.email ? 'l-email' : next.password ? 'l-pass' : null;
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
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
      {/* Top-Right Floating Alerts Container — announced to screen readers */}
      <div
        className="fixed top-6 right-6 z-50 flex flex-col gap-2 max-w-sm"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {warningMsg && <AlertWarning message={warningMsg} />}
        {errorMsg && <AlertError message={errorMsg} />}
      </div>

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
            <FormField
              id="l-email"
              label="Official Email Address"
              className="underline"
              required
              error={fieldErrors.email}
            >
              {(field) => (
                <input
                  {...field}
                  name="email" type="email" autoComplete="email"
                  inputMode="email" spellCheck={false} autoCapitalize="none"
                  placeholder="e.g. name@kenha.co.ke"
                  value={loginEmail}
                  onChange={e => {
                    setLoginEmail(e.target.value);
                    clearMessages();
                  }}
                  className="form-input"
                />
              )}
            </FormField>

            <FormField
              id="l-pass"
              label="Password"
              className="underline login-password-wrapper"
              required
              error={fieldErrors.password}
            >
              {(field) => (
                <>
                  <input
                    {...field}
                    name="password" type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password" spellCheck={false}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={e => {
                      setLoginPassword(e.target.value);
                      clearMessages();
                    }}
                    className="form-input"
                    style={{ paddingRight: 28 }}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword
                      ? <EyeOff size={16} aria-hidden="true" />
                      : <Eye size={16} aria-hidden="true" />}
                  </button>
                </>
              )}
            </FormField>

            <div className="login-actions">
              <a
                href="/reset-password"
                className="forgot-password-link"
                onClick={(e) => {
                  // Let the browser handle modified clicks (new tab / new window)
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  navigate('/reset-password');
                }}
              >
                Forgot password?
              </a>
              <label className="login-keep-signed-in" htmlFor="l-keep">
                <input id="l-keep" name="keep-signed-in" type="checkbox" />
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