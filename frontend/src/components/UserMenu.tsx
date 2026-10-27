import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronsUpDown, LogOut, Package, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { initials } from '../lib/format';

/** Avatar button with account links and sign out. `placement="sidebar"` renders the wide sidebar variant. */
export const UserMenu: React.FC<{ placement?: 'topbar' | 'sidebar' }> = ({ placement = 'topbar' }) => {
  const { user, role, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    toast.info('You have been signed out.');
    navigate('/login');
  };

  const accountPath = role === 'BUSINESS' ? '/admin/account' : '/account';

  return (
    <div className="menu-wrap" ref={ref}>
      {placement === 'sidebar' ? (
        <button className="user-btn" onClick={() => setOpen((o) => !o)}>
          <span className="avatar">{initials(user?.name)}</span>
          <span className="grow">
            <div className="user-name truncate">{user?.name}</div>
            <div className="user-email truncate">{user?.email}</div>
          </span>
          <ChevronsUpDown size={16} className="subtle" />
        </button>
      ) : (
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setOpen((o) => !o)}
          aria-label="Account menu"
        >
          <span className="avatar">{initials(user?.name)}</span>
        </button>
      )}

      {open && (
        <div className={`menu ${placement === 'sidebar' ? 'menu-up' : ''}`} role="menu">
          <div className="menu-head">
            <div className="user-name truncate">{user?.name}</div>
            <div className="user-email truncate">{user?.email}</div>
          </div>
          <button className="menu-item" onClick={() => go(accountPath)}>
            <UserRound /> Account settings
          </button>
          {role === 'CUSTOMER' && (
            <button className="menu-item" onClick={() => go('/orders')}>
              <Package /> My orders
            </button>
          )}
          <button className="menu-item danger" onClick={handleLogout}>
            <LogOut /> Sign out
          </button>
        </div>
      )}
    </div>
  );
};
