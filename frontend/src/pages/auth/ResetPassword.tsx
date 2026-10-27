import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Field } from '../../components/ui/Common';
import { Alert, PageLoader, Spinner } from '../../components/ui/Feedback';
import { AuthService } from '../../services/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../lib/errors';
import { readAuthLink } from '../../lib/authLink';

export const ResetPassword: React.FC = () => {
  const { clearSession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [token, setToken] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void readAuthLink().then(({ accessToken, error: err }) => {
      setToken(accessToken);
      setLinkError(err ?? (accessToken ? null : 'This reset link is missing its token. Request a new one.'));
      setChecking(false);
    });
  }, []);

  const passwordError = password && password.length < 6 ? 'Use at least 6 characters.' : undefined;
  const confirmError = confirm && confirm !== password ? 'Passwords do not match.' : undefined;
  const canSubmit = password.length >= 6 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !canSubmit) return;
    setError(null);
    setSaving(true);
    try {
      const res = await AuthService.resetPassword(token, password);
      // The recovery session is single-purpose: drop it so the user signs in with the new password.
      await clearSession();
      toast.success(res.data.message);
      navigate('/login', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not reset your password.'));
      setSaving(false);
    }
  };

  if (checking) return <PageLoader />;

  return (
    <AuthLayout>
      <div className="auth-status-icon">
        <KeyRound />
      </div>
      <h1 className="auth-title">Choose a new password</h1>

      {linkError ? (
        <div className="stack">
          <Alert>{linkError}</Alert>
          <Link to="/forgot-password" className="btn btn-primary btn-block">
            Request a new link
          </Link>
        </div>
      ) : (
        <form className="stack" onSubmit={handleSubmit} noValidate>
          <p className="auth-sub">Pick something you haven't used before.</p>
          {error && <Alert>{error}</Alert>}
          <Field label="New password" error={passwordError}>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
          </Field>
          <Field label="Confirm new password" error={confirmError}>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </Field>
          <button className="btn btn-primary btn-lg btn-block" disabled={saving || !canSubmit}>
            {saving && <Spinner />}
            {saving ? 'Saving…' : 'Reset password'}
          </button>
        </form>
      )}

      <p className="auth-switch">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
};
