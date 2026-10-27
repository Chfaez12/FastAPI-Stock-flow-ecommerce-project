import React from 'react';
import { BarChart3, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { Logo } from '../components/ui/Common';

const POINTS = [
  { icon: ShoppingBag, text: 'Shop a live catalog with real-time stock availability.' },
  { icon: BarChart3, text: 'Track revenue, orders and low-stock alerts from one dashboard.' },
  { icon: Truck, text: 'Raise purchase orders and restock automatically on receipt.' },
  { icon: ShieldCheck, text: 'Secure sign-in backed by Supabase Auth.' },
];

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="auth">
    <aside className="auth-aside">
      <Logo />
      <div>
        <h2 className="auth-quote">Commerce and inventory, finally in the same place.</h2>
        <div className="auth-points">
          {POINTS.map(({ icon: Icon, text }) => (
            <div className="auth-point" key={text}>
              <Icon />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="auth-foot">© {new Date().getFullYear()} StockFlow</div>
    </aside>
    <main className="auth-main">
      <div className="auth-card">{children}</div>
    </main>
  </div>
);
