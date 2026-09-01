import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { KeNHALogo } from '../components/KeNHALogo';
import type { User } from '../data/mockData';
import {
  useChangePasswordMutation,
  useRequestPasswordResetMutation,
  useResetPasswordWithTokenMutation,
} from '../features/apis/authApi';
import { useDispatch } from 'react-redux';
import { updateUser } from '../features/slice/authSlice';
import { AlertError, AlertWarning, AlertInfo, InlineSpinner } from '../components/shared/Feedback';

interface ResetPasswordPageProps {
  email: string;
  resetOldPass: string;
  setResetOldPass: (p: string) => void;
  resetNewPass: string;
  setResetNewPass: (p: string) => void;
  resetConfirmPass: string;
  setResetConfirmPass: (p: string) => void;
  setCurrentUser: (u: User | null) => void;
  showToast: (m: string, t?: 'success' | 'error') => void;
  navigate: (path: string) => void;
  theme?: string;
}

// Stable sub-component — defined outside to avoid focus-stealing on re-render
interface PwFieldProps {
  id: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoFocus?: boolean;
  onClearErrors: () => void;
}

const PwField: React.FC<PwFieldProps> = ({
  id, placeholder, value, onChange, show, onToggle, autoFocus, onClearErrors,
}) => (
  <div className="form-group underline login-password-wrapper">
    <input
      id={id}
      name={id}
      type={show ? 'text' : 'password'}
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      onChange={e => { onChange(e.target.value); onClearErrors(); }}
      required
      autoFocus={autoFocus}
      className="form-input"
      style={{ paddingRight: 28 }}
    />
    <button
      type="button"
      tabIndex={-1}
      className="login-password-toggle"
      onClick={onToggle}
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  </div>
);

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  email: initialEmail,
  resetOldPass, setResetOldPass,
  resetNewPass,  setResetNewPass,
  resetConfirmPass, setResetConfirmPass,
  showToast,
  navigate,
}) => {
  // Extract recovery token from URL search (?access_token=... or ?token=...) or hash (#access_token=...)
  const getRecoveryToken = () => {
    try {
      if (window.location.search) {
        const searchParams = new URLSearchParams(window.location.search);
        const searchToken = searchParams.get('access_token') || searchParams.get('token');
        if (searchToken) return searchToken;
      }
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const hashToken = hashParams.get('access_token') || hashParams.get('token');
        if (hashToken) return hashToken;
      }
    } catch {}
    return null;
  };

  const recoveryToken = getRecoveryToken();

  const queryEmail = typeof window !== 'undefined' && window.location.search
    ? new URLSearchParams(window.location.search).get('email')
    : null;

  const [inputEmail, setInputEmail]   = useState(initialEmail || queryEmail || '');
  const [showOld,     setShowOld]     = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [warningMsg,  setWarningMsg]  = useState<string | null>(null);
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null);

  // Flow step: 'email' (input email for reset request) or 'change_password' (setting new password)
  const [step, setStep] = useState<'email' | 'change_password'>(
    recoveryToken || initialEmail || queryEmail ? 'change_password' : 'email'
  );

  const [changePasswordApi] = useChangePasswordMutation();
  const [requestResetApi] = useRequestPasswordResetMutation();
  const [resetWithTokenApi] = useResetPasswordWithTokenMutation();
  const dispatch = useDispatch();

  useEffect(() => {
    if (warningMsg) {
      const t = setTimeout(() => setWarningMsg(null), 6000);
      return () => clearTimeout(t);
    }
  }, [warningMsg]);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 6000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const clearErrors = () => {
    setErrorMsg(null);
    setWarningMsg(null);
  };

  // Step 1: Request Password Reset by Email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!inputEmail) {
      setWarningMsg('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inputEmail)) {
      setWarningMsg('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await requestResetApi({ email: inputEmail }).unwrap();
      const message = res.data?.message || 'Password reset email sent to administrator.';
      setSuccessMsg(message);
      showToast(message, 'success');
      // Advance to password update form for admin
      setStep('change_password');
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.data?.error || err?.message || 'Password reset request failed.';
      if (errMsg.toLowerCase().includes('non-admin') || errMsg.toLowerCase().includes('contact')) {
        setErrorMsg('Access Denied: Only administrators can reset passwords directly. Non-admin users must contact the ICT Administrator.');
      } else {
        setErrorMsg(errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Change Password Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!resetNewPass || !resetConfirmPass) {
      setWarningMsg('Please fill in all password fields.');
      return;
    }
    if (resetNewPass.length < 8) {
      setWarningMsg('New password must be at least 8 characters.');
      return;
    }
    if (resetNewPass !== resetConfirmPass) {
      setWarningMsg('New passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      if (recoveryToken) {
        await resetWithTokenApi({
          access_token: recoveryToken,
          new_password: resetNewPass,
          confirm_password: resetConfirmPass,
        }).unwrap();
      } else {
        await changePasswordApi({
          new_password: resetNewPass,
          confirm_password: resetConfirmPass,
        } as any).unwrap();
      }

      dispatch(updateUser({ mustChangePassword: false }));
      showToast('Password changed successfully! Please log in.');
      setResetOldPass('');
      setResetNewPass('');
      setResetConfirmPass('');
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      const msg = err?.data?.error || err?.message || 'Password change failed. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">

      {/* Top-right floating alerts */}
      {(warningMsg || errorMsg || successMsg) && (
        <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
          {warningMsg && <AlertWarning message={warningMsg} />}
          {errorMsg   && <AlertError   message={errorMsg}   />}
          {successMsg && <AlertInfo    message={successMsg} />}
        </div>
      )}

      <div className="login-center">
        <div className="login-card">

          {/* Brand */}
          <div className="login-card-brand">
            <KeNHALogo width={38} height={19} />
            <div>
              <div className="login-card-brand-name">KeNHA</div>
              <div className="login-card-brand-sub">KMTAMS</div>
            </div>
          </div>

          {step === 'email' ? (
            /* STEP 1: Enter Email */
            <>
              <div className="login-header">
                <h1>Reset Password</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your Administrator email to receive a password reset link.
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} noValidate>
                <div className="form-group underline">
                  <input
                    id="rp-email"
                    type="email"
                    autoComplete="email"
                    placeholder="Administrator email address"
                    value={inputEmail}
                    onChange={e => {
                      setInputEmail(e.target.value);
                      clearErrors();
                    }}
                    required
                    autoFocus
                    className="form-input"
                  />
                </div>

                <div className="login-actions flex justify-between items-center w-full">
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                    onClick={() => navigate('/login')}
                  >
                    <ArrowLeft size={14} /> Back to Sign in
                  </button>
                </div>

                <div className="login-submit-row">
                  <button
                    type="submit"
                    className="btn btn-primary min-w-28 flex items-center justify-center gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <InlineSpinner />
                        <span>Sending…</span>
                      </>
                    ) : 'Reset password'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* STEP 2: Set New Password */
            <>
              <div className="login-header">
                <h1>Set new password</h1>
              </div>

              <form onSubmit={handlePasswordSubmit} noValidate>
                {!recoveryToken && initialEmail && (
                  <PwField
                    id="rp-old"
                    placeholder={`Current password (${initialEmail})`}
                    value={resetOldPass}
                    onChange={setResetOldPass}
                    show={showOld}
                    onToggle={() => setShowOld(v => !v)}
                    autoFocus
                    onClearErrors={clearErrors}
                  />
                )}

                <PwField
                  id="rp-new"
                  placeholder="New password"
                  value={resetNewPass}
                  onChange={setResetNewPass}
                  show={showNew}
                  onToggle={() => setShowNew(v => !v)}
                  autoFocus={!initialEmail || !!recoveryToken}
                  onClearErrors={clearErrors}
                />

                <PwField
                  id="rp-confirm"
                  placeholder="Confirm new password"
                  value={resetConfirmPass}
                  onChange={setResetConfirmPass}
                  show={showConfirm}
                  onToggle={() => setShowConfirm(v => !v)}
                  onClearErrors={clearErrors}
                />

                <div className="login-actions flex justify-between items-center w-full">
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Min. 8 characters.
                  </span>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:underline bg-transparent border-0 cursor-pointer"
                    onClick={() => setStep('email')}
                  >
                    Use different email
                  </button>
                </div>

                <div className="login-submit-row">
                  <button
                    type="submit"
                    className="btn btn-primary min-w-28 flex items-center justify-center gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <InlineSpinner />
                        <span>Updating…</span>
                      </>
                    ) : 'Change password'}
                  </button>
                </div>
              </form>
            </>
          )}

        </div>

        {/* Info notice */}
        <div className="w-[440px] max-w-full mt-3">
          <AlertInfo message="Only administrators can reset passwords online. Non-admin users must contact their ICT Administrator." />
        </div>
      </div>

      {/* Footer */}
      <div className="login-footer">
        <span>Terms of use</span>
        <span>Privacy &amp; cookies</span>
        <span>© {new Date().getFullYear()} KeNHA KMTAMS v1.0</span>
      </div>

    </div>
  );
};