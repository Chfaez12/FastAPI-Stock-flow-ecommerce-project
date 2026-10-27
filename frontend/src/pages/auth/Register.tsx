import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ShoppingBag } from 'lucide-react';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Field } from '../../components/ui/Common';
import { Alert, Spinner } from '../../components/ui/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../lib/errors';
import type { UserRole } from '../../types/api';

const ROLES: { value: UserRole; title: string; desc: string; icon: typeof ShoppingBag }[] = [
  { value: 'CUSTOMER', title: 'Customer', desc: 'Browse and buy products', icon: ShoppingBag },
  { value: 'BUSINESS', title: 'Business', desc: 'Manage stock and orders', icon: Building2 },
];

export const Register: React.FC = () => {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const passwordError =
    form.password && form.password.length < 6 ? 'Use at least 6 characters.' : undefined;
  const confirmError =
    form.confirm && form.confirm !== form.password ? 'Passwords do not match.' : undefined;
  const canSubmit =
    form.name.trim() && form.email.trim() && form.password.length >= 6 && form.password === form.confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const result = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || null,
        role,
      });
      if (result === 'confirm-email') {
        toast.info('Account created. Check your email to confirm it, then sign in.');
        navigate('/login');
      } else {
        toast.success('Your account is ready. Welcome to StockFlow!');
        navigate(role === 'BUSINESS' ? '/admin' : '/', { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed.'));
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="auth-title">Create your account</h1>
      <p className="auth-sub">Get started in less than a minute.</p>

      <form className="stack" onSubmit={handleSubmit} noValidate>
        {error && <Alert>{error}</Alert>}

        <div className="field">
          <span className="field-label">I want to</span>
          <div className="role-picker">
            {ROLES.map(({ value, title, desc, icon: Icon }) => (
              <button
                type="button"
                key={value}
                className={`role-option ${role === value ? 'active' : ''}`}
                onClick={() => setRole(value)}
                aria-pressed={role === value}
              >
                <Icon />
                <strong>{title}</strong>
                <span>{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <Field label="Full name">
          <input className="input" autoComplete="name" value={form.name} onChange={set('name')} placeholder="Jane Doe" required />
        </Field>

        <div className="form-grid">
          <Field label="Email">
            <input className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
          </Field>
          <Field label="Phone" hint="Optional">
            <input className="input" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" />
          </Field>
          <Field label="Password" error={passwordError}>
            <input className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required />
          </Field>
          <Field label="Confirm password" error={confirmError}>
            <input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required />
          </Field>
        </div>

        <button className="btn btn-primary btn-lg btn-block" disabled={loading || !canSubmit}>
          {loading && <Spinner />}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
};
