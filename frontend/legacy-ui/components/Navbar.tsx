import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserProfileModal } from './UserProfileModal';

interface NavbarProps {
  title: string;
  extraActions?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({ title, extraActions }) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <header
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          padding: '16px 20px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{title}</h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {user?.email}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {extraActions}

          {/* Profile Trigger */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="btn btn-secondary"
            title="Account Settings"
          >
            ⚙️ Profile
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="btn btn-secondary"
            title="Toggle Light/Dark Theme"
            style={{ padding: '8px 12px' }}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>

          <button onClick={signOut} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </header>

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
};