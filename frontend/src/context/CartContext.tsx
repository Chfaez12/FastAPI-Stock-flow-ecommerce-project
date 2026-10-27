import React, { createContext, useContext, useEffect, useState } from 'react';
import type { OrderResponse, ProductResponse } from '../types/api';
import { OrderService } from '../services/endpoints';
import { useToast } from './ToastContext';

export interface CartItem {
  product: ProductResponse;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: ProductResponse, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  count: number;
  checkout: (couponCode?: string | null) => Promise<OrderResponse>;
}

const CartContext = createContext<CartContextType>({} as CartContextType);
const STORAGE_KEY = 'stockflow_cart';

function loadCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const toast = useToast();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items]);

  const addToCart = (product: ProductResponse, quantity = 1) => {
    const stock = product.available_stock ?? 0;
    const existing = items.find((i) => i.product.id === product.id);
    const current = existing?.quantity ?? 0;

    if (stock <= 0) {
      toast.error(`${product.name} is out of stock.`);
      return;
    }
    if (current + quantity > stock) {
      toast.error(`Only ${stock} of ${product.name} available.`);
      return;
    }

    setItems((prev) =>
      existing
        ? prev.map((i) =>
            i.product.id === product.id ? { product, quantity: i.quantity + quantity } : i,
          )
        : [...prev, { product, quantity }],
    );
    toast.success(`Added ${product.name} to cart`);
  };

  const removeFromCart = (productId: string) =>
    setItems((prev) => prev.filter((i) => i.product.id !== productId));

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) return removeFromCart(productId);
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: Math.min(quantity, i.product.available_stock ?? quantity) }
          : i,
      ),
    );
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  const checkout = async (couponCode?: string | null) => {
    const res = await OrderService.placeOrder({
      items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
      coupon_code: couponCode || null,
    });
    clearCart();
    return res.data;
  };

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, subtotal, count, checkout }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
