import React, { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '../components/ui/Feedback';
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Package,
  ShoppingCart,
  Tags,
  TicketPercent,
  Truck,
  UserRound,
  Warehouse,
} from 'lucide-react';
import { Logo, ThemeToggle } from '../components/ui/Common';
import { UserMenu } from '../components/UserMenu';
import { HealthService } from '../services/endpoints';

const NAV: { section: string; items: { to: string; label: string; icon: typeof Package; end?: boolean }[] }[] = [
  {
    section: 'Overview',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    section: 'Catalog',
    items: [
      { to: '/admin/products', label: 'Products', icon: Package },
      { to: '/admin/categories', label: 'Categories', icon: Tags },
      { to: '/admin/inventory', label: 'Inventory', icon: Warehouse },
    ],
  },
  {
    section: 'Sales',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
      { to: '/admin/coupons', label: 'Coupons', icon: TicketPercent },
    ],
  },
  {
    section: 'Procurement',
    items: [
      { to: '/admin/suppliers', label: 'Suppliers', icon: Truck },
      { to: '/admin/purchase-orders', label: 'Purchase orders', icon: ClipboardList },
    ],
  },
  {
    section: 'Settings',
    items: [{ to: '/admin/account', label: 'Account', icon: UserRound }],
  },
];

const TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/products': 'Products',
  '/admin/categories': 'Categories',
  '/admin/inventory': 'Inventory',
  '/admin/orders': 'Orders',
  '/admin/coupons': 'Coupons',
  '/admin/suppliers': 'Suppliers',
  '/admin/purchase-orders': 'Purchase orders',
  '/admin/account': 'Account',
};

/** Polls GET / so staff can see at a glance whether the API is reachable. */
function useApiHealth() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'down'>('checking');
  useEffect(() => {
    const check = () =>
      HealthService.check()
        .then((r) => setStatus(r.data.status === 'ok' ? 'ok' : 'down'))
        .catch(() => setStatus('down'));
    void check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return status;
}

export const AdminLayout: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const health = useApiHealth();

  return (
    <div className="admin">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-head">
          <Logo to="/admin" />
        </div>
        <nav className="sidebar-nav">
          {NAV.map((group) => (
            <React.Fragment key={group.section}>
              <div className="nav-section">{group.section}</div>
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Icon />
                  {label}
                </NavLink>
              ))}
            </React.Fragment>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="api-status">
            <span className={`api-dot ${health === 'checking' ? '' : health}`} />
            {health === 'ok' ? 'API operational' : health === 'down' ? 'API unreachable' : 'Checking API…'}
          </div>
          <UserMenu placement="sidebar" />
        </div>
      </aside>
      <div className={`sidebar-backdrop ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

      <div className="admin-main">
        <header className="topbar">
          <button className="btn btn-ghost btn-icon mobile-only" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </button>
          <span className="mobile-only row">
            <Boxes size={18} />
          </span>
          <span className="topbar-title">{TITLES[pathname] ?? 'StockFlow'}</span>
          <div style={{ marginLeft: 'auto' }}>
            <ThemeToggle />
          </div>
        </header>
        <main className="admin-content">
          <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
        </main>
      </div>
    </div>
  );
};
