import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldAlert, UserRound } from 'lucide-react';
import { UserService } from '../services/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../lib/errors';
import { initials } from '../lib/format';
import { Field, PageHeader } from '../components/ui/Common';
import { Alert, Spinner } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';

type Section = 'profile' | 'security' | 'danger';

const ProfileSection: React.FC = () => {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);

  // Refresh from GET /users/me so the form reflects the latest server state.
  useEffect(() => {
    UserService.getMe()
      .then((r) => {
        setUser(r.data);
        setName(r.data.name);
        setPhone(r.data.phone ?? '');
      })
      .catch(() => {});
  }, [setUser]);

  const dirty = name.trim() !== user?.name || (phone.trim() || null) !== (user?.phone || null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await UserService.updateMe({ name: name.trim(), phone: phone.trim() || null });
      setUser(res.data);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card" onSubmit={save}>
      <div className="card-header">
        <div>
          <div className="card-title">Profile</div>
          <div className="card-sub">This information is used on your orders and receipts.</div>
        </div>
      </div>
      <div className="card-body stack">
        <div className="row" style={{ gap: 14 }}>
          <span className="avatar" style={{ width: 52, height: 52, fontSize: 18 }}>{initials(user?.name)}</span>
          <div>
            <div style={{ fontWeight: 600 }}>{user?.name}</div>
            <div className="row" style={{ marginTop: 4 }}>
              <span className="badge badge-primary no-dot">{user?.role === 'BUSINESS' ? 'Business' : 'Customer'}</span>
              {user?.is_active && <span className="badge badge-success">Active</span>}
            </div>
          </div>
        </div>
        <div className="form-grid">
          <Field label="Full name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Phone">
            <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Email" hint="Email can't be changed." className="span-2">
            <input className="input" value={user?.email ?? ''} disabled />
          </Field>
        </div>
      </div>
      <div className="card-footer row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" disabled={!dirty || !name.trim() || saving}>
          {saving && <Spinner />} Save changes
        </button>
      </div>
    </form>
  );
};

const SecuritySection: React.FC = () => {
  const toast = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = form.confirm && form.confirm !== form.next;
  const valid = form.current.length >= 6 && form.next.length >= 6 && form.next === form.confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await UserService.changePassword({ current_password: form.current, new_password: form.next });
      setForm({ current: '', next: '', confirm: '' });
      toast.success('Password changed.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-header">
        <div>
          <div className="card-title">Password</div>
          <div className="card-sub">Use at least 6 characters. You'll stay signed in on this device.</div>
        </div>
      </div>
      <div className="card-body stack">
        {error && <Alert>{error}</Alert>}
        <Field label="Current password">
          <input className="input" type="password" autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
        </Field>
        <div className="form-grid">
          <Field label="New password" error={form.next && form.next.length < 6 ? 'Too short.' : undefined}>
            <input className="input" type="password" autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
          </Field>
          <Field label="Confirm new password" error={mismatch ? 'Passwords do not match.' : undefined}>
            <input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="card-footer row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" disabled={!valid || saving}>
          {saving && <Spinner />} Update password
        </button>
      </div>
    </form>
  );
};

const DangerSection: React.FC = () => {
  const { user, clearSession } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await UserService.deleteMe();
      await clearSession();
      toast.info('Your account has been deleted.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="card danger-card">
      <div className="card-header">
        <div>
          <div className="card-title">Delete account</div>
          <div className="card-sub">Permanently remove your account and sign out everywhere.</div>
        </div>
      </div>
      <div className="card-body row-between" style={{ flexWrap: 'wrap' }}>
        <p className="muted" style={{ maxWidth: 460 }}>
          This can't be undone. Order history linked to this account may no longer be accessible.
        </p>
        <button className="btn btn-danger" onClick={() => setOpen(true)}>
          Delete account
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        size="sm"
        title="Delete your account?"
        description={<>Type <strong>{user?.email}</strong> to confirm.</>}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
            <button className="btn btn-danger" disabled={typed !== user?.email || busy} onClick={remove}>
              {busy && <Spinner />} Delete permanently
            </button>
          </>
        }
      >
        <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={user?.email} autoFocus />
      </Modal>
    </div>
  );
};

export const Account: React.FC = () => {
  const [section, setSection] = useState<Section>('profile');
  const nav: { id: Section; label: string; icon: typeof UserRound }[] = [
    { id: 'profile', label: 'Profile', icon: UserRound },
    { id: 'security', label: 'Password', icon: KeyRound },
    { id: 'danger', label: 'Delete account', icon: ShieldAlert },
  ];

  return (
    <>
      <PageHeader title="Account settings" description="Manage your profile and security." />
      <div className="account-grid">
        <nav className="account-nav">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} className={section === id ? 'active' : ''} onClick={() => setSection(id)}>
              <Icon /> {label}
            </button>
          ))}
        </nav>
        <div>
          {section === 'profile' && <ProfileSection />}
          {section === 'security' && <SecuritySection />}
          {section === 'danger' && <DangerSection />}
        </div>
      </div>
    </>
  );
};
