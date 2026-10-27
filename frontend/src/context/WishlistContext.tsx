import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { WishlistService } from '../services/endpoints';
import type { ProductResponse, WishlistItemResponse } from '../types/api';
import { getErrorMessage } from '../lib/errors';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface WishlistContextType {
  items: WishlistItemResponse[];
  loading: boolean;
  has: (productId: string) => boolean;
  toggle: (product: ProductResponse) => Promise<void>;
  reload: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType>({} as WishlistContextType);

/** Shares the customer's saved products so every heart button stays in sync. */
export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuth();
  const toast = useToast();
  const [loaded, setItems] = useState<WishlistItemResponse[]>([]);
  // Only customers have a wishlist; after signing out the stale list is simply not exposed.
  const items = role === 'CUSTOMER' ? loaded : [];
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (role !== 'CUSTOMER') return;
    setLoading(true);
    try {
      setItems((await WishlistService.getAll()).data);
    } catch {
      /* the wishlist is optional; hearts just show as empty */
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const has = (productId: string) => items.some((i) => i.product_id === productId);

  const toggle = async (product: ProductResponse) => {
    const saved = has(product.id);
    try {
      if (saved) {
        await WishlistService.remove(product.id);
        setItems((prev) => prev.filter((i) => i.product_id !== product.id));
        toast.info(`Removed ${product.name} from your wishlist`);
      } else {
        const res = await WishlistService.add(product.id);
        setItems((prev) => [res.data, ...prev.filter((i) => i.product_id !== product.id)]);
        toast.success(`Saved ${product.name} to your wishlist`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <WishlistContext.Provider value={{ items, loading, has, toggle, reload }}>{children}</WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
