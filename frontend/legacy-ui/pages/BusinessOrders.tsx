import React, { useEffect, useState } from 'react';
import type { OrderResponse, OrderStatus } from '../types/api';
import { OrderService } from '../services/endpoints';

const STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

export const BusinessOrders: React.FC = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await OrderService.getAllOrders();
      setOrders(res.data);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || 'Failed to load customer orders.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await OrderService.updateStatus(orderId, { status: nextStatus });
      await fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'DELIVERED':
        return { bg: '#dcfce7', text: '#15803d' };
      case 'SHIPPED':
        return { bg: '#e0e7ff', text: '#4338ca' };
      case 'CONFIRMED':
        return { bg: '#fef3c7', text: '#b45309' };
      case 'CANCELLED':
        return { bg: '#fee2e2', text: '#b91c1c' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '20px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px' }}>Customer Orders</h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
            Process incoming customer orders and track fulfillment
          </p>
        </div>
        <button
          onClick={fetchOrders}
          style={{ padding: '8px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
        >
          ↻ Refresh
        </button>
      </div>

      {errorMessage && (
        <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '16px' }}>
          {errorMessage}
        </div>
      )}

      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed #d1d5db', borderRadius: '8px', color: '#6b7280' }}>
          No customer orders found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map((order) => {
            const dateStr = new Date(order.created_at).toLocaleString();
            const badge = getStatusColor(order.status);

            return (
              <div key={order.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Order Ref</span>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{order.id}</div>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>Placed: {dateStr}</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Customer ID</span>
                    <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>{order.customer_id}</div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Total Price</span>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>{parseFloat(order.total_amount).toFixed(2)}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: badge.bg,
                        color: badge.text,
                      }}
                    >
                      {order.status}
                    </span>

                    <select
                      value={order.status}
                      disabled={updatingId === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        fontSize: '13px',
                        cursor: updatingId === order.id ? 'wait' : 'pointer',
                      }}
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          Mark as {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ padding: '14px 18px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>LINE ITEMS</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>
                        <th style={{ paddingBottom: '6px' }}>Item ID</th>
                        <th style={{ paddingBottom: '6px' }}>Product ID</th>
                        <th style={{ paddingBottom: '6px' }}>Quantity</th>
                        <th style={{ paddingBottom: '6px', textAlign: 'right' }}>Unit Price</th>
                        <th style={{ paddingBottom: '6px', textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                          <td style={{ padding: '6px 0', fontFamily: 'monospace', color: '#9ca3af' }}>{item.id}</td>
                          <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>{item.product_id}</td>
                          <td style={{ padding: '6px 0' }}>{item.quantity}</td>
                          <td style={{ padding: '6px 0', textAlign: 'right' }}>{parseFloat(item.unit_price).toFixed(2)}</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600 }}>
                            {(parseFloat(item.unit_price) * item.quantity).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};