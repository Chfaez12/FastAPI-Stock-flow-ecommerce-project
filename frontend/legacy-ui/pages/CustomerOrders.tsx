// src/pages/CustomerOrders.tsx
import React, { useEffect, useState } from 'react';
import type { OrderResponse } from '../types/api';
import { OrderService } from '../services/endpoints';
import { Navbar } from '../components/Navbar';

interface CustomerOrdersProps {
  onBackToStore: () => void;
}

export const CustomerOrders: React.FC<CustomerOrdersProps> = ({ onBackToStore }) => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await OrderService.getMyOrders();
      setOrders(res.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to fetch order history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyOrders();
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    const confirmCancel = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmCancel) return;

    setActionLoadingId(orderId);
    try {
      await OrderService.cancelOrder(orderId);
      await fetchMyOrders();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Unable to cancel order.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'badge-success';
      case 'CANCELLED':
        return 'badge-danger';
      default:
        return 'badge-subtle';
    }
  };

  return (
    <div className="app-container">
      <Navbar
        title="My Orders"
        extraActions={
          <button onClick={onBackToStore} className="btn btn-secondary">
            ← Back to Store
          </button>
        }
      />

      {errorMsg && (
        <div
          style={{
            padding: '12px',
            background: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          {errorMsg}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading your orders...</p>
      ) : orders.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            borderStyle: 'dashed',
          }}
        >
          <p style={{ color: 'var(--text-muted)', margin: '0 0 16px', fontSize: '15px' }}>
            You haven't placed any orders yet.
          </p>
          <button onClick={onBackToStore} className="btn btn-primary">
            Start Shopping
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map((order) => {
            const isCancellable = order.status === 'PENDING';
            const formattedDate = new Date(order.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={order.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Order Header Summary */}
                <div
                  style={{
                    padding: '16px 20px',
                    background: 'var(--bg-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      ORDER ID
                    </span>
                    <div style={{ fontWeight: 700, fontSize: '14px', fontFamily: 'monospace' }}>
                      {order.id}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Placed on {formattedDate}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        TOTAL
                      </span>
                      <div style={{ fontWeight: 800, fontSize: '16px' }}>
                        {parseFloat(order.total_amount).toFixed(2)}
                      </div>
                    </div>

                    <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                      {order.status}
                    </span>

                    {isCancellable && (
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={actionLoadingId === order.id}
                        className="btn btn-outline-danger"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        {actionLoadingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Line Items Table */}
                <div style={{ padding: '16px 20px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Product ID</th>
                        <th>Unit Price</th>
                        <th>Qty</th>
                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {item.product_id}
                          </td>
                          <td>{parseFloat(item.unit_price).toFixed(2)}</td>
                          <td>× {item.quantity}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
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