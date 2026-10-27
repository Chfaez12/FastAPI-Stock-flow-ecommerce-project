import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Field } from '../../components/ui/Common';
import { Alert, Spinner } from '../../components/ui/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage, getErrorReason } from '../../lib/errors';
import { ResendVerification } from './ResendVerification';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnverified(false);
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      // Route guards send a user with the wrong role to their own home, so `from` is safe to reuse.
      navigate(from ?? (user.role === 'BUSINESS' ? '/admin' : '/'), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email or password.'));
      setUnverified(getErrorReason(err) === 'email_not_verified');
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="auth-title">Sign in</h1>
      <p className="auth-sub">Welcome back. Enter your details to continue.</p>

      <form className="stack" onSubmit={handleSubmit} noValidate>
        {error && <Alert kind={unverified ? 'warning' : 'danger'}>{error}</Alert>}

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

        <Field label="Password">
          <div className="input-group">
            <Lock />
            <input
              className="input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="input-suffix">
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </span>
          </div>
        </Field>

        <Link to="/forgot-password" className="forgot-link">
          Forgot password?
        </Link>

        <button className="btn btn-primary btn-lg btn-block" disabled={loading || !email || !password}>
          {loading && <Spinner />}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {unverified && (
        <div className="stack-sm" style={{ marginTop: 16 }}>
          <span className="muted" style={{ fontSize: 13 }}>Didn't get the email?</span>
          <ResendVerification initialEmail={email.trim()} />
        </div>
      )}

      <p className="auth-switch">
        New to StockFlow? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  );
};
