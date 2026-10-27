import React from 'react';
import type { OrderStatus, ProductStatus, PurchaseOrderStatus } from '../../types/api';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';

const TONES: Record<string, Tone> = {
  // Orders
  PENDING: 'warning',
  CONFIRMED: 'info',
  SHIPPED: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  // Products
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  ARCHIVED: 'neutral',
  // Purchase orders
  DRAFT: 'neutral',
  ORDERED: 'info',
  RECEIVED: 'success',
};

export const toTitle = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export const StatusBadge: React.FC<{ status: OrderStatus | ProductStatus | PurchaseOrderStatus }> = ({
  status,
}) => {
  const tone = TONES[status] ?? 'neutral';
  return <span className={`badge ${tone === 'neutral' ? '' : `badge-${tone}`}`}>{toTitle(status)}</span>;
};

export function stockTone(qty: number, reorderLevel = 5): { label: string; tone: Tone } {
  if (qty <= 0) return { label: 'Out of stock', tone: 'danger' };
  if (qty <= reorderLevel) return { label: 'Low stock', tone: 'warning' };
  return { label: 'In stock', tone: 'success' };
}

export const StockBadge: React.FC<{ qty: number; reorderLevel?: number }> = ({ qty, reorderLevel }) => {
  const { label, tone } = stockTone(qty, reorderLevel);
  return <span className={`badge badge-${tone}`}>{label}</span>;
};
