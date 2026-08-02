import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { KeNHALogo } from '../components/KeNHALogo';
import type { User } from '../data/mockData';
import { useChangePasswordMutation } from '../features/apis/authApi';
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
  email,
  resetOldPass, setResetOldPass,
  resetNewPass,  setResetNewPass,
  resetConfirmPass, setResetConfirmPass,
  showToast,
  navigate,
}) => {
  const [showOld,     setShowOld]     = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [warningMsg,  setWarningMsg]  = useState<string | null>(null);

  const [changePasswordApi] = useChangePasswordMutation();
  const dispatch = useDispatch();

  // Auto-dismiss warnings after 4 s — same as LoginPage
  useEffect(() => {
    if (warningMsg) {
      const t = setTimeout(() => setWarningMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [warningMsg]);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const clearErrors = () => { setErrorMsg(null); setWarningMsg(null); };

  const validate = (): boolean => {
    clearErrors();
    if (!resetOldPass || !resetNewPass || !resetConfirmPass) {
      setWarningMsg('Please fill in all password fields.');
      return false;
    }
    if (resetNewPass.length < 8) {
      setWarningMsg('New password must be at least 8 characters.');
      return false;
    }
    if (resetNewPass === resetOldPass) {
      setWarningMsg('New password cannot be the same as your current password.');
      return false;
    }
    if (resetNewPass !== resetConfirmPass) {
      setWarningMsg('New passwords do not match.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    clearErrors();

    try {
      await changePasswordApi({
        new_password: resetNewPass,
        confirm_password: resetConfirmPass,
      } as any).unwrap();

      dispatch(updateUser({ mustChangePassword: false }));
      showToast('Password changed successfully. Welcome!');
      setResetOldPass('');
      setResetNewPass('');
      setResetConfirmPass('');
      navigate('/dashboard');
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

      {/* Top-right floating alerts — identical to LoginPage */}
      {(warningMsg || errorMsg) && (
        <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
          {warningMsg && <AlertWarning message={warningMsg} />}
          {errorMsg   && <AlertError   message={errorMsg}   />}
        </div>
      )}

      <div className="login-center">
        <div className="login-card">

          {/* Brand — identical to LoginPage */}
          <div className="login-card-brand">
            <KeNHALogo width={38} height={19} />
            <div>
              <div className="login-card-brand-name">KeNHA</div>
              <div className="login-card-brand-sub">KMTAMS</div>
            </div>
          </div>

          {/* Heading */}
          <div className="login-header">
            <h1>Set new password</h1>
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* Current password */}
            <PwField
              id="rp-old"
              placeholder={email ? `Current password (${email})` : 'Current password'}
              value={resetOldPass}
              onChange={setResetOldPass}
              show={showOld}
              onToggle={() => setShowOld(v => !v)}
              autoFocus
              onClearErrors={clearErrors}
            />

            {/* New password */}
            <PwField
              id="rp-new"
              placeholder="New password"
              value={resetNewPass}
              onChange={setResetNewPass}
              show={showNew}
              onToggle={() => setShowNew(v => !v)}
              onClearErrors={clearErrors}
            />

            {/* Confirm new password */}
            <PwField
              id="rp-confirm"
              placeholder="Confirm new password"
              value={resetConfirmPass}
              onChange={setResetConfirmPass}
              show={showConfirm}
              onToggle={() => setShowConfirm(v => !v)}
              onClearErrors={clearErrors}
            />

            {/* Actions row — same spacing/style as LoginPage's login-actions */}
            <div className="login-actions">
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Min. 8 characters, different from current password.
              </span>
            </div>

            {/* Submit — right-aligned yellow button, identical to LoginPage */}
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
        </div>

        {/* Blue info notice — same width/position as LoginPage's AlertInfo */}
        <div className="w-[440px] max-w-full mt-3">
          <AlertInfo message="You must set a new password before accessing the system. Do not share it with anyone." />
        </div>
      </div>

      {/* Footer — identical to LoginPage */}
      <div className="login-footer">
        <span>Terms of use</span>
        <span>Privacy &amp; cookies</span>
        <span>© {new Date().getFullYear()} KeNHA KMTAMS v1.0</span>
      </div>

    </div>
  );
};