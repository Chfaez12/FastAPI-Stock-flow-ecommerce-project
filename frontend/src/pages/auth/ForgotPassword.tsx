import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MailCheck } from 'lucide-react';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Field } from '../../components/ui/Common';
import { Alert, Spinner } from '../../components/ui/Feedback';
import { AuthService } from '../../services/endpoints';
import { getErrorMessage } from '../../lib/errors';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await AuthService.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout>
        <div className="auth-status-icon">
          <MailCheck />
        </div>
        <h1 className="auth-title">Check your inbox</h1>
        <p className="auth-sub">
          If an account exists for <strong>{email.trim()}</strong>, we've sent a link to reset your password. The link
          expires after a short time.
        </p>
        <button className="btn btn-secondary btn-block" onClick={() => setSent(false)}>
          Use a different email
        </button>
        <p className="auth-switch">
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">Forgot your password?</h1>
      <p className="auth-sub">Enter the email you signed up with and we'll send you a reset link.</p>

      <form className="stack" onSubmit={handleSubmit} noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Email">
          <div className="input-group">
            <Mail />
            <input
              className="input"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
        </Field>
        <button className="btn btn-primary btn-lg btn-block" disabled={loading || !email.trim()}>
          {loading && <Spinner />}
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="auth-switch">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
};
