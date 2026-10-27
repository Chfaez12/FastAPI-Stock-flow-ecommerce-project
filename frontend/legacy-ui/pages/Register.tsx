import React, { useState } from 'react';
import { AuthService } from '../services/endpoints';
import { supabase } from '../services/supabase';
import type { UserRole } from '../types/api';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      // 1. Call your FastAPI backend UnifiedRegister endpoint
      const res = await AuthService.register({
        name,
        email,
        password,
        phone: phone.trim() || null,
        role,
      });

      const { access_token, refresh_token } = res.data;

      // 2. Hydrate client-side Supabase session with tokens returned by the API
      if (access_token && refresh_token) {
        await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
      } else {
        // If your Supabase configuration requires email confirmation
        alert('Account created! Please check your email to confirm your account or sign in.');
        onSwitchToLogin();
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setErrorMsg(detail.map((d: any) => d.msg).join(', '));
      } else {
        setErrorMsg(detail || err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '50px auto', padding: '0 16px' }}>
      <div className="card">
        <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800 }}>Create Account</h2>
        <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', fontSize: '14px' }}>
          Join StockFlow as a customer or vendor
        </p>

        {errorMsg && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              marginBottom: '16px',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Account Role Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              I want to:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${role === 'CUSTOMER' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setRole('CUSTOMER')}
              >
                Shop (Customer)
              </button>
              <button
                type="button"
                className={`btn ${role === 'BUSINESS' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setRole('BUSINESS')}
              >
                Sell (Merchant)
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Ali Khan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Phone (Optional)
            </label>
            <input
              type="tel"
              placeholder="+923001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '6px', fontSize: '15px' }}
          >
            {loading ? 'Registering...' : `Sign Up as ${role}`}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};