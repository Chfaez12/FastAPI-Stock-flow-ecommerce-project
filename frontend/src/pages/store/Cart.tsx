import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ShoppingCart, TicketPercent, Trash2, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../lib/errors';
import { formatMoney, shortId } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { CategoryService, CouponService } from '../../services/endpoints';
import type { CouponValidateResponse } from '../../types/api';
import { ProductIcon } from '../../components/ProductCard';
import { PageHeader, QuantityInput } from '../../components/ui/Common';
import { Alert, EmptyState, Spinner } from '../../components/ui/Feedback';

export const Cart: React.FC = () => {
  const { items, updateQuantity, removeFromCart, clearCart, subtotal, count, checkout } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const categories = useAsync(() => CategoryService.getAll().then((r) => r.data), []);
  const categoryName = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.name])),
    [categories.data],
  );
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponValidateResponse | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const applyCoupon = async (code: string) => {
    setApplying(true);
    setCouponError(null);
    try {
      setCoupon((await CouponService.validate(code, subtotal)).data);
    } catch (err) {
      setCoupon(null);
      setCouponError(getErrorMessage(err, 'This coupon cannot be applied.'));
    } finally {
      setApplying(false);
    }
  };

  // Re-check an applied coupon when the cart changes: the discount (or a minimum order) depends on the subtotal.
  useEffect(() => {
    if (coupon && Number(coupon.subtotal) !== subtotal) void applyCoupon(coupon.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const removeCoupon = () => {
    setCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const discount = coupon ? Number(coupon.discount_amount) : 0;
  const total = Math.max(subtotal - discount, 0);

  const handleCheckout = async () => {
    setPlacing(true);
    setError(null);
    try {
      const order = await checkout(coupon?.code);
      toast.success(`Order ${shortId(order.id)} placed successfully.`);
      navigate('/orders', { state: { highlight: order.id } });
    } catch (err) {
      setError(getErrorMessage(err, 'We could not place your order. Check stock availability.'));
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Your cart" />
        <div className="card">
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Browse the shop and add a few things you like."
            action={<Link to="/" className="btn btn-primary">Start shopping</Link>}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Your cart"
        description={`${count} ${count === 1 ? 'item' : 'items'}`}
        back={{ to: '/', label: 'Continue shopping' }}
        actions={
          <button className="btn btn-ghost" onClick={clearCart}>
            Clear cart
          </button>
        }
      />

      <div className="cart-layout">
        <div className="card">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="cart-item">
              <ProductIcon
                categoryId={product.category_id}
                categoryName={product.category_id ? categoryName.get(product.category_id) : undefined}
                imageUrl={product.image_url}
                alt={product.name}
                size={64}
              />
              <div className="grow">
                <Link to={`/products/${product.id}`} className="cell-title" style={{ color: 'var(--text)' }}>
                  {product.name}
                </Link>
                <div className="cell-sub">{formatMoney(product.price)} each · SKU {product.sku}</div>
                <div className="row" style={{ marginTop: 10 }}>
                  <QuantityInput
                    small
                    value={quantity}
                    max={product.available_stock ?? quantity}
                    onChange={(q) => updateQuantity(product.id, q)}
                  />
                  <button className="btn btn-danger-ghost btn-sm" onClick={() => removeFromCart(product.id)}>
                    <Trash2 /> Remove
                  </button>
                </div>
              </div>
              <div className="price">{formatMoney(Number(product.price) * quantity)}</div>
            </div>
          ))}
        </div>

        <div className="card sticky-card">
          <div className="card-header">
            <span className="card-title">Order summary</span>
          </div>
          <div className="card-body">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            {coupon && (
              <div className="summary-row discount">
                <span>
                  Discount <span className="mono">{coupon.code}</span>
                </span>
                <span>−{formatMoney(discount)}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span>{formatMoney(total)}</span>
            </div>

            <div className="coupon-box">
              {coupon ? (
                <div className="coupon-applied">
                  <TicketPercent />
                  <div className="grow">
                    <div className="mono" style={{ fontWeight: 600 }}>{coupon.code}</div>
                    {coupon.description && <div className="cell-sub">{coupon.description}</div>}
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={removeCoupon} aria-label="Remove coupon">
                    <X />
                  </button>
                </div>
              ) : (
                <form
                  className="row"
                  style={{ gap: 8 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (couponInput.trim()) void applyCoupon(couponInput.trim());
                  }}
                >
                  <input
                    className="input mono"
                    placeholder="Coupon code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    aria-label="Coupon code"
                  />
                  <button className="btn btn-secondary" disabled={applying || !couponInput.trim()}>
                    {applying && <Spinner />}
                    Apply
                  </button>
                </form>
              )}
              {couponError && <div className="field-error" style={{ marginTop: 6 }}>{couponError}</div>}
            </div>
            {error && (
              <div style={{ marginTop: 16 }}>
                <Alert>{error}</Alert>
              </div>
            )}
            <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 20 }} onClick={handleCheckout} disabled={placing}>
              {placing && <Spinner />}
              {placing ? 'Placing order…' : 'Place order'}
            </button>
            <p className="row subtle" style={{ marginTop: 12, fontSize: 12.5, justifyContent: 'center' }}>
              <ShieldCheck size={14} /> Final prices and stock are confirmed at checkout
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
