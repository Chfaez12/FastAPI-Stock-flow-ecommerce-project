import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, MailWarning } from 'lucide-react';
import { AuthLayout } from '../../layouts/AuthLayout';
import { PageLoader } from '../../components/ui/Feedback';
import { useAuth } from '../../context/AuthContext';
import { readAuthLink } from '../../lib/authLink';
import { ResendVerification } from './ResendVerification';

/** Landing page for the "confirm your email" link Supabase sends after sign-up. */
export const VerifyEmail: React.FC = () => {
  const { user, loading } = useAuth();
  const [state, setState] = useState<'checking' | 'verified' | 'failed'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void readAuthLink().then(({ accessToken, error: err }) => {
      setError(err);
      setState(accessToken && !err ? 'verified' : 'failed');
    });
  }, []);

  if (state === 'checking' || loading) return <PageLoader />;

  if (state === 'failed') {
    return (
      <AuthLayout>
        <div className="auth-status-icon is-warning">
          <MailWarning />
        </div>
        <h1 className="auth-title">We couldn't verify your email</h1>
        <p className="auth-sub">
          {(error ?? 'This confirmation link is invalid or has expired').replace(/\.?$/, '.')} Send yourself a new one:
        </p>
        <ResendVerification />
        <p className="auth-switch">
          Already verified? <Link to="/login">Sign in</Link>
        </p>
      </AuthLayout>
    );
  }

  const home = user?.role === 'BUSINESS' ? '/admin' : '/';
  return (
    <AuthLayout>
      <div className="auth-status-icon is-success">
        <MailCheck />
      </div>
      <h1 className="auth-title">Email verified</h1>
      <p className="auth-sub">
        Thanks{user ? `, ${user.name.split(' ')[0]}` : ''}! Your email address is confirmed and your account is ready.
      </p>
      {user ? (
        <Link to={home} className="btn btn-primary btn-lg btn-block">
          Continue to StockFlow
        </Link>
      ) : (
        <Link to="/login" className="btn btn-primary btn-lg btn-block">
          Sign in
        </Link>
      )}
    </AuthLayout>
  );
};
