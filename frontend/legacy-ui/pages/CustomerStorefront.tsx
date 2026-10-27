import React, { useEffect, useState } from 'react';
import type { ProductResponse, CategoryResponse } from '../types/api';
import { ProductService, CategoryService } from '../services/endpoints';
import { useCart } from '../context/CartContext';
import { Navbar } from '../components/Navbar';

export const CustomerStorefront: React.FC<{ onViewOrders?: () => void }> = ({ onViewOrders }) => {
  const { cart, addToCart, removeFromCart, updateQuantity, totalAmount, totalCount, checkout, isCheckingOut, checkoutError } = useCart();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [c, p] = await Promise.all([CategoryService.getAll(), ProductService.getAll()]);
        setCategories(c.data);
        setProducts(p.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCategoryChange = async (id: string) => {
    setSelectedCategory(id);
    setLoading(true);
    const res = await ProductService.getAll(id || undefined);
    setProducts(res.data);
    setLoading(false);
  };

  return (
    <div className="app-container">
      <Navbar
        title="StockFlow Marketplace"
        extraActions={
          <>
            <button onClick={onViewOrders} className="btn btn-secondary">
              My Orders
            </button>
            <button onClick={() => setIsCartOpen(!isCartOpen)} className="btn btn-primary">
              Cart ({totalCount}) • {totalAmount.toFixed(2)}
            </button>
          </>
        }
      />

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '6px' }}>
        <button
          onClick={() => handleCategoryChange('')}
          className={`btn ${selectedCategory === '' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '999px', padding: '6px 14px' }}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => handleCategoryChange(c.id)}
            className={`btn ${selectedCategory === c.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '999px', padding: '6px 14px' }}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Products Grid */}
        <div style={{ flex: 1 }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading items...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
              {products.map((p) => {
                const stock = p.available_stock ?? 0;
                const outOfStock = stock <= 0;
                return (
                  <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>{p.name}</h3>
                        <span className="badge badge-subtle">{p.sku}</span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', minHeight: '36px' }}>
                        {p.description || 'No description provided.'}
                      </p>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                        <span style={{ fontSize: '20px', fontWeight: 800 }}>{parseFloat(p.price).toFixed(2)}</span>
                        <span className={`badge ${outOfStock ? 'badge-danger' : 'badge-success'}`}>
                          {outOfStock ? 'Out of stock' : `${stock} in stock`}
                        </span>
                      </div>
                      <button
                        onClick={() => addToCart(p)}
                        disabled={outOfStock}
                        className="btn btn-primary"
                        style={{ width: '100%', opacity: outOfStock ? 0.5 : 1 }}
                      >
                        {outOfStock ? 'Unavailable' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Slide-out Cart */}
        {isCartOpen && (
          <aside className="card" style={{ width: '340px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Your Cart</h2>
              <button onClick={() => setIsCartOpen(false)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>✕</button>
            </div>

            {checkoutError && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
                {checkoutError}
              </div>
            )}

            {cart.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '30px 0' }}>Cart is empty.</p>
            ) : (
              <div>
                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
                  {cart.map(({ product, quantity }) => (
                    <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{product.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{parseFloat(product.price).toFixed(2)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => updateQuantity(product.id, quantity - 1)} className="btn btn-secondary" style={{ padding: '2px 8px' }}>-</button>
                        <span style={{ fontSize: '13px', width: '16px', textAlign: 'center' }}>{quantity}</span>
                        <button onClick={() => updateQuantity(product.id, quantity + 1)} className="btn btn-secondary" style={{ padding: '2px 8px' }}>+</button>
                        <button onClick={() => removeFromCart(product.id)} className="btn btn-outline-danger" style={{ padding: '2px 6px' }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px', marginBottom: '16px' }}>
                  <span>Total</span>
                  <span>{totalAmount.toFixed(2)}</span>
                </div>

                <button onClick={checkout} disabled={isCheckingOut} className="btn btn-primary" style={{ width: '100%', padding: '10px' }}>
                  {isCheckingOut ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};