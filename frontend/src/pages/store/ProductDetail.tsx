import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Barcode, Boxes, CalendarDays, PackageX, RotateCcw, ShoppingCart, Tag, Truck } from 'lucide-react';
import { CategoryService, ProductService } from '../../services/endpoints';
import { useAsync } from '../../lib/useAsync';
import { isNotFound } from '../../lib/errors';
import { formatDate, formatMoney } from '../../lib/format';
import { useCart } from '../../context/CartContext';
import { QuantityInput } from '../../components/ui/Common';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback';
import { StockBadge } from '../../components/ui/StatusBadge';
import { ProductCard, ProductMedia, StockMeter } from '../../components/ProductCard';
import { ProductReviews } from '../../components/ProductReviews';
import { RatingLine } from '../../components/Stars';
import { WishlistButton } from '../../components/WishlistButton';
import type { CategoryResponse, ProductResponse } from '../../types/api';

interface Detail {
  product: ProductResponse | null;
  category: CategoryResponse | null;
  related: ProductResponse[];
}

export const ProductDetail: React.FC = () => {
  const { productId = '' } = useParams();
  const { addToCart, items } = useCart();
  const [qty, setQty] = useState(1);

  const { data, loading, error, reload } = useAsync<Detail>(async () => {
    let product: ProductResponse;
    try {
      product = (await ProductService.getById(productId)).data;
    } catch (err) {
      if (isNotFound(err)) return { product: null, category: null, related: [] };
      throw err;
    }
    const [category, siblings] = await Promise.all([
      product.category_id
        ? CategoryService.getById(product.category_id).then((r) => r.data).catch(() => null)
        : Promise.resolve(null),
      ProductService.list({ category_id: product.category_id ?? undefined, status: 'ACTIVE', sort: 'rating', size: 5 }),
    ]);
    return {
      product,
      category,
      related: siblings.data.items.filter((p) => p.id !== product.id).slice(0, 4),
    };
  }, [productId]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={() => reload()} />;
  if (!data?.product || (data.product.status && data.product.status !== 'ACTIVE')) {
    return (
      <EmptyState
        icon={PackageX}
        title="Product unavailable"
        description="This product doesn't exist or is no longer sold."
        action={<Link to="/" className="btn btn-primary">Back to shop</Link>}
      />
    );
  }

  const { product, category, related } = data;
  const stock = product.available_stock ?? 0;
  const inCart = items.find((i) => i.product.id === product.id)?.quantity ?? 0;
  const maxQty = Math.max(stock - inCart, 0);

  return (
    <>
      <Link to="/" className="breadcrumb" style={{ marginBottom: 20 }}>
        <ArrowLeft /> Back to shop
      </Link>
      <div className="pdp">
        <div className="stack">
          <ProductMedia product={product} categoryName={category?.name} className="pdp-media" />
          <div className="card pdp-card">
            <div style={{ fontWeight: 600, fontSize: 15 }}>Product details</div>
          <div className="spec-grid">
            <div className="spec">
              <div className="spec-label"><Barcode /> SKU</div>
              <div className="spec-value mono">{product.sku}</div>
            </div>
            <div className="spec">
              <div className="spec-label"><Tag /> Category</div>
              <div className="spec-value">{category?.name ?? 'Uncategorized'}</div>
            </div>
            <div className="spec">
              <div className="spec-label"><Boxes /> Availability</div>
              <div className="spec-value">{stock > 0 ? `${stock} units` : 'Out of stock'}</div>
            </div>
            <div className="spec">
              <div className="spec-label"><CalendarDays /> Listed</div>
              <div className="spec-value">{formatDate(product.created_at)}</div>
            </div>
          </div>
          <StockMeter stock={stock} />
          {category?.description && <p className="muted" style={{ fontSize: 13.5 }}>{category.description}</p>}
          </div>
        </div>

        <div>
          <span className="product-cat">{category?.name ?? 'Uncategorized'}</span>
          <h1 className="pdp-title">{product.name}</h1>
          {!!product.review_count && (
            <a href="#reviews" className="pdp-rating">
              <RatingLine average={product.average_rating} count={product.review_count} />
            </a>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <StockBadge qty={stock} />
            {stock > 0 && <span className="muted" style={{ fontSize: 13 }}>{stock} available</span>}
          </div>
          <div className="pdp-price">{formatMoney(product.price)}</div>
          <p className="pdp-desc">{product.description || 'No description provided for this product.'}</p>

          <div className="row" style={{ marginTop: 28, gap: 12 }}>
            {maxQty > 0 && <QuantityInput value={Math.min(qty, maxQty)} max={maxQty} onChange={setQty} />}
            <button
              className="btn btn-primary btn-lg"
              disabled={maxQty <= 0}
              onClick={() => {
                addToCart(product, Math.min(qty, maxQty));
                setQty(1);
              }}
            >
              <ShoppingCart />
              {stock <= 0 ? 'Out of stock' : maxQty <= 0 ? 'All stock in cart' : 'Add to cart'}
            </button>
            <WishlistButton product={product} variant="button" />
          </div>
          {inCart > 0 && (
            <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
              {inCart} in your cart · <Link to="/cart">View cart</Link>
            </p>
          )}

          <div className="pdp-meta">
            <div><Truck /> Ships once your order is confirmed</div>
            <div><RotateCcw /> Cancel any time while the order is pending</div>
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} onChange={() => reload({ silent: true })} />

      {related.length > 0 && (
        <section style={{ marginTop: 56 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>More from {category?.name ?? 'the shop'}</h2>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} categoryName={category?.name} />
            ))}
          </div>
        </section>
      )}
    </>
  );
};
