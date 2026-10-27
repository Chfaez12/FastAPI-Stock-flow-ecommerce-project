import React, { useEffect, useState } from 'react';
import { UserService } from '../services/endpoints';
import type { UserResponse } from '../types/api';
import { useAuth } from '../context/AuthContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile Edit State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUserProfile();
    }
  }, [isOpen]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const res = await UserService.getMe();
      setProfile(res.data);
      setName(res.data.name || '');
      setPhone(res.data.phone || '');
    } catch (err: any) {
      setProfileMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to load user profile.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await UserService.updateMe({
        name: name.trim() || null,
        phone: phone.trim() || null,
      });
      setProfile(res.data);
      setProfileMsg({ type: 'success', text: 'Account details updated successfully.' });
    } catch (err: any) {
      setProfileMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update account information.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPass(true);
    setPasswordMsg(null);
    try {
      await UserService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
    } catch (err: any) {
      setPasswordMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Password change failed.',
      });
    } finally {
      setChangingPass(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt(
      'Type "DELETE" to permanently terminate your account. This action cannot be undone:'
    );
    if (confirmation !== 'DELETE') return;

    try {
      await UserService.deleteMe();
      alert('Your account has been deleted.');
      await signOut();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete account.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>Account Settings</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Manage personal info and credentials
            </span>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '4px 10px' }}>
            ✕
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading account information...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Account Overview Metadata */}
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--bg-subtle)',
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '13px',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                <div style={{ fontWeight: 600 }}>{profile?.email}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Role:</span>
                <div>
                  <span className="badge badge-subtle">{profile?.role}</span>
                </div>
              </div>
            </div>

            {/* Profile Update Form */}
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>Personal Information</h3>

              {profileMsg && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    background: profileMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: profileMsg.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
                  }}
                >
                  {profileMsg.text}
                </div>
              )}

              <input
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                placeholder="Phone Number (e.g. +923001234567)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <button
                type="submit"
                disabled={savingProfile}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start' }}
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px' }}>Security & Credentials</h3>

              {passwordMsg && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    background: passwordMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: passwordMsg.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
                  }}
                >
                  {passwordMsg.text}
                </div>
              )}

              <input
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                minLength={6}
              />
              <input
                type="password"
                placeholder="New Password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="submit"
                disabled={changingPass}
                className="btn btn-secondary"
                style={{ alignSelf: 'flex-start' }}
              >
                {changingPass ? 'Updating...' : 'Change Password'}
              </button>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

            {/* Account Deletion Danger Zone */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--danger)' }}>
                  Delete Account
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Permanently erase account profile and all sessions
                </div>
              </div>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="btn btn-outline-danger"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};