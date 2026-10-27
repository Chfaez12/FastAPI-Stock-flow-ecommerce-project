import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import type { ProductResponse } from '../types/api';
import { useWishlist } from '../context/WishlistContext';

export const WishlistButton: React.FC<{ product: ProductResponse; variant?: 'overlay' | 'button' }> = ({
  product,
  variant = 'overlay',
}) => {
  const { has, toggle } = useWishlist();
  const [busy, setBusy] = useState(false);
  const saved = has(product.id);

  const onClick = async (e: React.MouseEvent) => {
    // Cards are links, so keep the click from opening the product page.
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    await toggle(product);
    setBusy(false);
  };

  if (variant === 'button') {
    return (
      <button className={`btn btn-secondary btn-lg wish-btn ${saved ? 'saved' : ''}`} onClick={onClick} disabled={busy} aria-pressed={saved}>
        <Heart />
        {saved ? 'Saved' : 'Save'}
      </button>
    );
  }

  return (
    <button
      className={`wish-toggle ${saved ? 'saved' : ''}`}
      onClick={onClick}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
    >
      <Heart />
    </button>
  );
};
