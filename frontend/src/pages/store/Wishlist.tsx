import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { CategoryService } from '../../services/endpoints';
import { useAsync } from '../../lib/useAsync';
import { useWishlist } from '../../context/WishlistContext';
import { ProductCard } from '../../components/ProductCard';
import { PageHeader } from '../../components/ui/Common';
import { EmptyState, PageLoader } from '../../components/ui/Feedback';

export const Wishlist: React.FC = () => {
  const { items, loading } = useWishlist();
  const categories = useAsync(() => CategoryService.getAll().then((r) => r.data), []);
  const categoryName = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.name])),
    [categories.data],
  );

  if (loading && items.length === 0) return <PageLoader />;

  // Products that were deactivated after being saved can no longer be bought.
  const available = items.filter((i) => (i.product.status ?? 'ACTIVE') === 'ACTIVE');
  const unavailable = items.length - available.length;

  return (
    <>
      <PageHeader
        title="Wishlist"
        description={items.length ? `${items.length} saved ${items.length === 1 ? 'product' : 'products'}` : undefined}
      />
      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Heart}
            title="Nothing saved yet"
            description="Tap the heart on any product to keep it here for later."
            action={<Link to="/" className="btn btn-primary">Browse the shop</Link>}
          />
        </div>
      ) : (
        <>
          {unavailable > 0 && (
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
              {unavailable} saved {unavailable === 1 ? 'product is' : 'products are'} no longer sold and hidden.
            </p>
          )}
          <div className="product-grid">
            {available.map(({ product }) => (
              <ProductCard
                key={product.id}
                product={product}
                categoryName={product.category_id ? categoryName.get(product.category_id) : undefined}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
};
