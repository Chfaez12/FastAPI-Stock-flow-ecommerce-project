import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { ProductResponse } from '../types/api';
import { formatMoney } from '../lib/format';
import { categoryHue, categoryIcon } from '../lib/categoryIcon';
import { useCart } from '../context/CartContext';
import { RatingLine } from './Stars';
import { WishlistButton } from './WishlistButton';

const hueStyle = (categoryId?: string | null) =>
  ({ ['--hue' as string]: categoryHue(categoryId) }) as React.CSSProperties;

/** Square thumbnail: the product photo when there is one, otherwise a colored category icon. */
export const ProductIcon: React.FC<{
  categoryId?: string | null;
  categoryName?: string;
  imageUrl?: string | null;
  alt?: string;
  size?: number;
}> = ({ categoryId, categoryName, imageUrl, alt = '', size = 44 }) => {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, ...hueStyle(categoryId) };

  if (imageUrl && !failed) {
    return (
      <span className="product-icon product-icon-img" style={style}>
        <img src={imageUrl} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      </span>
    );
  }
  return (
    <span className="product-icon" style={style} aria-hidden>
      {React.createElement(categoryIcon(categoryName), { size: Math.round(size * 0.45) })}
    </span>
  );
};

/** Wide media area for cards and the product page; falls back to a tinted panel with the category icon. */
export const ProductMedia: React.FC<{
  product: ProductResponse;
  categoryName?: string;
  className?: string;
  children?: React.ReactNode;
}> = ({ product, categoryName, className = '', children }) => {
  const [failed, setFailed] = useState(false);
  const hasImage = !!product.image_url && !failed;

  return (
    <div className={`product-media ${hasImage ? '' : 'is-empty'} ${className}`} style={hueStyle(product.category_id)}>
      {hasImage ? (
        <img src={product.image_url!} alt={product.name} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        React.createElement(categoryIcon(categoryName), { size: 44, strokeWidth: 1.5, 'aria-hidden': true })
      )}
      {children}
    </div>
  );
};

export const StockMeter: React.FC<{ stock: number }> = ({ stock }) => {
  const tone = stock <= 0 ? 'bad' : stock <= 5 ? 'warn' : '';
  const label = stock <= 0 ? 'Sold out' : stock <= 5 ? `Only ${stock} left` : `${stock} in stock`;
  return (
    <div className="stock-meter">
      <div className={`progress ${tone}`}>
        <span style={{ width: `${Math.min(100, (stock / 20) * 100)}%` }} />
      </div>
      <span className={`stock-label ${tone}`}>{label}</span>
    </div>
  );
};

export const ProductCard: React.FC<{
  product: ProductResponse;
  categoryName?: string;
  layout?: 'grid' | 'list';
}> = ({ product, categoryName, layout = 'grid' }) => {
  const { addToCart } = useCart();
  const stock = product.available_stock ?? 0;

  const addButton = (
    <button
      className={`btn ${stock > 0 ? 'btn-primary' : 'btn-secondary'} btn-sm`}
      disabled={stock <= 0}
      onClick={(e) => {
        e.preventDefault();
        addToCart(product);
      }}
    >
      {stock > 0 ? (
        <>
          <Plus /> Add
        </>
      ) : (
        'Sold out'
      )}
    </button>
  );

  if (layout === 'list') {
    return (
      <Link to={`/products/${product.id}`} className="product-row">
        <ProductIcon
          categoryId={product.category_id}
          categoryName={categoryName}
          imageUrl={product.image_url}
          alt={product.name}
          size={56}
        />
        <div className="grow">
          <div className="product-name truncate">{product.name}</div>
          <div className="cell-sub truncate">
            {categoryName ?? 'Uncategorized'} · <span className="mono">{product.sku}</span>
            {product.description && <span className="hide-sm"> · {product.description}</span>}
          </div>
          <RatingLine average={product.average_rating} count={product.review_count} />
        </div>
        <div className="hide-sm" style={{ width: 140 }}>
          <StockMeter stock={stock} />
        </div>
        <span className="price" style={{ minWidth: 90, textAlign: 'right' }}>{formatMoney(product.price)}</span>
        <WishlistButton product={product} />
        {addButton}
      </Link>
    );
  }

  return (
    <Link to={`/products/${product.id}`} className="card product-card">
      <ProductMedia product={product} categoryName={categoryName}>
        <span className="media-tag">{categoryName ?? 'Uncategorized'}</span>
        <WishlistButton product={product} />
      </ProductMedia>
      <div className="product-info">
        <span className="product-name">{product.name}</span>
        <RatingLine average={product.average_rating} count={product.review_count} />
        <span className="product-desc">{product.description || 'No description provided.'}</span>
        <StockMeter stock={stock} />
        <div className="product-bottom">
          <span className="price">{formatMoney(product.price)}</span>
          {addButton}
        </div>
      </div>
    </Link>
  );
};
