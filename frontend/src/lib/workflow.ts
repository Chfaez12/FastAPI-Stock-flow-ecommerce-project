import type { OrderStatus, PurchaseOrderStatus } from '../types/api';

/**
 * Allowed next states. The API accepts any status change, but moving a cancelled order back to
 * PENDING (or re-receiving a purchase order) would desync inventory, so the UI only offers these.
 */
export const ORDER_NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const PO_NEXT: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  DRAFT: ['ORDERED', 'CANCELLED'],
  ORDERED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

export const ORDER_ACTION_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Mark pending',
  CONFIRMED: 'Confirm order',
  SHIPPED: 'Mark as shipped',
  DELIVERED: 'Mark as delivered',
  CANCELLED: 'Cancel order',
};

export const PO_ACTION_LABEL: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Move to draft',
  ORDERED: 'Send to supplier',
  RECEIVED: 'Mark as received',
  CANCELLED: 'Cancel PO',
};
