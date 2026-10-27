import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, Package, X } from 'lucide-react';
import { OrderService, ProductService } from '../../services/endpoints';
import { useAsync } from '../../lib/useAsync';
import { getErrorMessage } from '../../lib/errors';
import { formatDateTime, formatMoney, shortId } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Tabs } from '../../components/ui/Common';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ProductIcon } from '../../components/ProductCard';
import type { OrderResponse, OrderStatus } from '../../types/api';

const STEPS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

const Timeline: React.FC<{ status: OrderStatus }> = ({ status }) => {
  if (status === 'CANCELLED') return null;
  const reached = STEPS.indexOf(status);
  return (
    <div className="timeline">
      {STEPS.map((step, i) => (
        <React.Fragment key={step}>
          {i > 0 && <div className={`tl-line ${i <= reached ? 'done' : ''}`} />}
          <div className={`tl-step ${i <= reached ? 'done' : ''}`}>
            <span className="tl-dot">{i <= reached && <Check />}</span>
            <span className="hide-sm">{step.charAt(0) + step.slice(1).toLowerCase()}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

type Filter = 'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED';

export const MyOrders: React.FC = () => {
  const toast = useToast();
  const location = useLocation();
  const highlight = (location.state as { highlight?: string } | null)?.highlight;
  const [filter, setFilter] = useState<Filter>('ALL');
  const [cancelling, setCancelling] = useState<OrderResponse | null>(null);

  const orders = useAsync(() => OrderService.getMyOrders(), []);
  const products = useAsync(() => ProductService.getAll(), []);

  const productById = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);

  const sorted = useMemo(
    () => [...(orders.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [orders.data],
  );
  const counts = {
    ALL: sorted.length,
    ACTIVE: sorted.filter((o) => ['PENDING', 'CONFIRMED', 'SHIPPED'].includes(o.status)).length,
    DELIVERED: sorted.filter((o) => o.status === 'DELIVERED').length,
    CANCELLED: sorted.filter((o) => o.status === 'CANCELLED').length,
  };
  const visible = sorted.filter((o) =>
    filter === 'ALL'
      ? true
      : filter === 'ACTIVE'
        ? ['PENDING', 'CONFIRMED', 'SHIPPED'].includes(o.status)
        : o.status === filter,
  );

  const cancelOrder = async () => {
    if (!cancelling) return;
    try {
      const res = await OrderService.cancelOrder(cancelling.id);
      orders.setData((prev) => prev?.map((o) => (o.id === res.data.id ? res.data : o)) ?? null);
      toast.success(`Order ${shortId(cancelling.id)} cancelled.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  };

  return (
    <>
      <PageHeader title="My orders" description="Track deliveries and manage recent purchases." />

      {orders.loading ? (
        <PageLoader />
      ) : orders.error ? (
        <div className="card">
          <ErrorState message={orders.error} onRetry={() => orders.reload()} />
        </div>
      ) : sorted.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="When you place an order it will show up here."
            action={<Link to="/" className="btn btn-primary">Browse products</Link>}
          />
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <Tabs
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'ALL', label: 'All', count: counts.ALL },
                { value: 'ACTIVE', label: 'In progress', count: counts.ACTIVE },
                { value: 'DELIVERED', label: 'Delivered', count: counts.DELIVERED },
                { value: 'CANCELLED', label: 'Cancelled', count: counts.CANCELLED },
              ]}
            />
          </div>

          {visible.length === 0 && (
            <div className="card">
              <EmptyState icon={Package} title="Nothing here" description="No orders match this filter." />
            </div>
          )}

          {visible.map((order) => (
            <div
              key={order.id}
              className="card order-card"
              style={order.id === highlight ? { borderColor: 'var(--primary)', boxShadow: 'var(--ring)' } : undefined}
            >
              <div className="order-head">
                <div>
                  <div className="meta-label">Order</div>
                  <div className="meta-value mono">{shortId(order.id)}</div>
                </div>
                <div>
                  <div className="meta-label">Placed</div>
                  <div className="meta-value">{formatDateTime(order.created_at)}</div>
                </div>
                <div>
                  <div className="meta-label">Total</div>
                  <div className="meta-value">{formatMoney(order.total_amount)}</div>
                </div>
                <div style={{ marginLeft: 'auto' }} className="row">
                  <StatusBadge status={order.status} />
                  {order.status === 'PENDING' && (
                    <button className="btn btn-danger-ghost btn-sm" onClick={() => setCancelling(order)}>
                      <X /> Cancel
                    </button>
                  )}
                </div>
              </div>
              <div className="card-body stack">
                <Timeline status={order.status} />
                <div className="line-items">
                  {order.items.map((item) => (
                    <div key={item.id} className="line-item">
                      <ProductIcon
                        categoryId={productById.get(item.product_id)?.category_id}
                        imageUrl={productById.get(item.product_id)?.image_url}
                        alt={productById.get(item.product_id)?.name}
                        size={44}
                      />
                      <div className="grow">
                        <div className="cell-title">{productById.get(item.product_id)?.name ?? 'Product'}</div>
                        <div className="cell-sub">
                          {item.quantity} × {formatMoney(item.unit_price)}
                        </div>
                      </div>
                      <div style={{ fontWeight: 600 }}>{formatMoney(Number(item.unit_price) * item.quantity)}</div>
                    </div>
                  ))}
                  {Number(order.discount_amount) > 0 && (
                    <div className="line-sub discount">
                      <span>Coupon {order.coupon_code && <span className="mono">{order.coupon_code}</span>}</span>
                      <span>−{formatMoney(order.discount_amount)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      <ConfirmDialog
        open={!!cancelling}
        title="Cancel this order?"
        message={`Order ${cancelling ? shortId(cancelling.id) : ''} will be cancelled and the items returned to stock. This can't be undone.`}
        confirmLabel="Cancel order"
        danger
        onConfirm={cancelOrder}
        onClose={() => setCancelling(null)}
      />
    </>
  );
};
