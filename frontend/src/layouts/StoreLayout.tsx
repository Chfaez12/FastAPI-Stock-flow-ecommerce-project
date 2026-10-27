import React, { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { Logo, ThemeToggle } from '../components/ui/Common';
import { UserMenu } from '../components/UserMenu';
import { PageLoader } from '../components/ui/Feedback';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export const StoreLayout: React.FC = () => {
  const { count } = useCart();
  const { items: saved } = useWishlist();

  return (
    <>
      <header className="store-nav">
        <div className="store-nav-inner">
          <Logo />
          <nav className="store-links">
            <NavLink to="/" end className={({ isActive }) => `store-link ${isActive ? 'active' : ''}`}>
              Shop
            </NavLink>
            <NavLink to="/orders" className={({ isActive }) => `store-link ${isActive ? 'active' : ''}`}>
              Orders
            </NavLink>
          </nav>
          <div className="store-actions">
            <ThemeToggle />
            <Link to="/wishlist" className="btn btn-ghost btn-icon cart-btn" aria-label={`Wishlist, ${saved.length} saved`} title="Wishlist">
              <Heart />
              {saved.length > 0 && <span className="cart-count">{saved.length}</span>}
            </Link>
            <Link to="/cart" className="btn btn-ghost btn-icon cart-btn" aria-label={`Cart, ${count} items`}>
              <ShoppingCart />
              {count > 0 && <span className="cart-count">{count}</span>}
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="store-main">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="store-footer">© {new Date().getFullYear()} StockFlow · All prices in USD</footer>
    </>
  );
};
