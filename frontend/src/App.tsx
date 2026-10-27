import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { PageLoader, Spinner } from './components/ui/Feedback';
import type { UserRole } from './types/api';

import { StoreLayout } from './layouts/StoreLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { VerifyEmail } from './pages/auth/VerifyEmail';
import { NotFound } from './pages/NotFound';

// Route-level code splitting keeps the initial bundle small.
const Shop = lazy(() => import('./pages/store/Shop').then((m) => ({ default: m.Shop })));
const ProductDetail = lazy(() => import('./pages/store/ProductDetail').then((m) => ({ default: m.ProductDetail })));
const Cart = lazy(() => import('./pages/store/Cart').then((m) => ({ default: m.Cart })));
const Wishlist = lazy(() => import('./pages/store/Wishlist').then((m) => ({ default: m.Wishlist })));
const MyOrders = lazy(() => import('./pages/store/MyOrders').then((m) => ({ default: m.MyOrders })));
const Account = lazy(() => import('./pages/Account').then((m) => ({ default: m.Account })));
const Dashboard = lazy(() => import('./pages/admin/Dashboard').then((m) => ({ default: m.Dashboard })));
const Products = lazy(() => import('./pages/admin/Products').then((m) => ({ default: m.Products })));
const Categories = lazy(() => import('./pages/admin/Categories').then((m) => ({ default: m.Categories })));
const Inventory = lazy(() => import('./pages/admin/Inventory').then((m) => ({ default: m.Inventory })));
const Orders = lazy(() => import('./pages/admin/Orders').then((m) => ({ default: m.Orders })));
const Coupons = lazy(() => import('./pages/admin/Coupons').then((m) => ({ default: m.Coupons })));
const Suppliers = lazy(() => import('./pages/admin/Suppliers').then((m) => ({ default: m.Suppliers })));
const PurchaseOrders = lazy(() => import('./pages/admin/PurchaseOrders').then((m) => ({ default: m.PurchaseOrders })));

const homeFor = (role: UserRole | null) => (role === 'BUSINESS' ? '/admin' : '/');

/** Only signed-in users with the given role may enter; everyone else is redirected. */
const RequireRole: React.FC<{ role: UserRole }> = ({ role }) => {
  const { session, role: current, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="full-loader">
        <Spinner large />
      </div>
    );
  }
  if (!session || !current) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (current !== role) return <Navigate to={homeFor(current)} replace />;
  return <Outlet />;
};

const GuestOnly: React.FC = () => {
  const { session, role, loading } = useAuth();
  if (loading) {
    return (
      <div className="full-loader">
        <Spinner large />
      </div>
    );
  }
  if (session && role) return <Navigate to={homeFor(role)} replace />;
  return <Outlet />;
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <WishlistProvider>
          <CartProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<GuestOnly />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                </Route>
                {/* Email links land here whether or not the user is signed in. */}
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                <Route element={<RequireRole role="CUSTOMER" />}>
                  <Route element={<StoreLayout />}>
                    <Route index element={<Shop />} />
                    <Route path="products/:productId" element={<ProductDetail />} />
                    <Route path="cart" element={<Cart />} />
                    <Route path="wishlist" element={<Wishlist />} />
                    <Route path="orders" element={<MyOrders />} />
                    <Route path="account" element={<Account />} />
                  </Route>
                </Route>

                <Route path="admin" element={<RequireRole role="BUSINESS" />}>
                  <Route element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="products" element={<Products />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="coupons" element={<Coupons />} />
                    <Route path="suppliers" element={<Suppliers />} />
                    <Route path="purchase-orders" element={<PurchaseOrders />} />
                    <Route path="account" element={<Account />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
          </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
