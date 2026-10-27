import React, { useMemo, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { OrderService, ProductService } from '../../services/endpoints';
import { useAsync } from '../../lib/useAsync';
import { getErrorMessage } from '../../lib/errors';
import { formatDateTime, formatMoney, relativeTime, shortId } from '../../lib/format';
import { ORDER_ACTION_LABEL, ORDER_NEXT } from '../../lib/workflow';
import { useToast } from '../../context/ToastContext';
import { PageHeader, SearchInput, Tabs } from '../../components/ui/Common';
import { EmptyState, ErrorState, SkeletonRows, Spinner } from '../../components/ui/Feedback';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import type { OrderResponse, OrderStatus } from '../../types/api';

type Filter = 'ALL' | OrderStatus;
const FILTERS: Filter[] = ['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export const Orders: React.FC = () => {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<OrderStatus | null>(null);

  const orders = useAsync(() => OrderService.getAllOrders(), []);
  const products = useAsync(() => ProductService.getAll(), []);

  const productById = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);
  const all = useMemo(
    () => [...(orders.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [orders.data],
  );
  const counts = Object.fromEntries(
    FILTERS.map((f) => [f, f === 'ALL' ? all.length : all.filter((o) => o.status === f).length]),
  ) as Record<Filter, number>;

  const visible = all.filter((o) => {
    if (filter !== 'ALL' && o.status !== filter) return false;
    const q = query.trim().toLowerCase().replace('#', '');
    return !q || o.id.toLowerCase().includes(q) || o.customer_id.toLowerCase().includes(q);
  });

  const selected = all.find((o) => o.id === selectedId) ?? null;

  const changeStatus = async (order: OrderResponse, status: OrderStatus) => {
    setUpdating(status);
    try {
      const res = await OrderService.updateStatus(order.id, { status });
      orders.setData((prev) => (prev ?? []).map((o) => (o.id === res.data.id ? res.data : o)));
      toast.success(`Order ${shortId(order.id)} is now ${status.toLowerCase()}.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUpdating(null);
    }
  };

  const revenue = all.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + Number(o.total_amount), 0);

  return (
    <>
      <PageHeader
        title="Orders"
        description={`${all.length} orders · ${formatMoney(revenue)} in non-cancelled revenue`}
      />

      <div className="card">
        <div className="toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Search order or customer ID" />
          <Tabs
            value={filter}
            onChange={setFilter}
            options={FILTERS.map((f) => ({
              value: f,
              label: f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase(),
              count: counts[f],
            }))}
          />
        </div>

        {orders.error ? (
          <ErrorState message={orders.error} onRetry={() => orders.reload()} />
        ) : !orders.loading && visible.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders" description={all.length ? 'No orders match this filter.' : 'Customer orders will appear here.'} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th className="hide-sm">Customer</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Placed</th>
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.loading ? (
                  <SkeletonRows cols={6} />
                ) : (
                  visible.map((o) => (
                    <tr key={o.id} className="clickable" onClick={() => setSelectedId(o.id)}>
                      <td className="mono cell-title">{shortId(o.id)}</td>
                      <td className="mono muted hide-sm">{o.customer_id.slice(0, 8)}…</td>
                      <td className="muted">{o.items.reduce((s, i) => s + i.quantity, 0)} units</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="muted nowrap" title={formatDateTime(o.created_at)}>{relativeTime(o.created_at)}</td>
                      <td className="right cell-title">{formatMoney(o.total_amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        variant="drawer"
        title={selected ? `Order ${shortId(selected.id)}` : ''}
        description={selected && <StatusBadge status={selected.status} />}
        footer={
          selected && ORDER_NEXT[selected.status].length > 0 ? (
            ORDER_NEXT[selected.status].map((s) => (
              <button
                key={s}
                className={`btn ${s === 'CANCELLED' ? 'btn-danger-ghost' : 'btn-primary'}`}
                disabled={!!updating}
                onClick={() => changeStatus(selected, s)}
              >
                {updating === s && <Spinner />}
                {ORDER_ACTION_LABEL[s]}
              </button>
            ))
          ) : (
            <span className="muted" style={{ fontSize: 13 }}>This order is closed — no further actions.</span>
          )
        }
      >
        {selected && (
          <div className="stack">
            <dl className="dl">
              <dt>Order ID</dt>
              <dd className="mono">{selected.id}</dd>
              <dt>Customer ID</dt>
              <dd className="mono">{selected.customer_id}</dd>
              <dt>Placed</dt>
              <dd>{formatDateTime(selected.created_at)}</dd>
              <dt>Last updated</dt>
              <dd>{formatDateTime(selected.updated_at)}</dd>
            </dl>
            <div>
              <div className="field-label" style={{ marginBottom: 8 }}>Items</div>
              <div className="line-items">
                {selected.items.map((item) => {
                  const p = productById.get(item.product_id);
                  return (
                    <div key={item.id} className="line-item">
                      <div className="grow">
                        <div className="cell-title">{p?.name ?? 'Deleted product'}</div>
                        <div className="cell-sub">
                          {p?.sku && <span className="mono">{p.sku} · </span>}
                          {item.quantity} × {formatMoney(item.unit_price)}
                        </div>
                      </div>
                      <strong>{formatMoney(Number(item.unit_price) * item.quantity)}</strong>
                    </div>
                  );
                })}
                {Number(selected.discount_amount) > 0 && (
                  <>
                    <div className="line-sub">
                      <span>Subtotal</span>
                      <span>{formatMoney(selected.subtotal_amount)}</span>
                    </div>
                    <div className="line-sub discount">
                      <span>Coupon {selected.coupon_code && <span className="mono">{selected.coupon_code}</span>}</span>
                      <span>−{formatMoney(selected.discount_amount)}</span>
                    </div>
                  </>
                )}
                <div className="line-total">
                  <span>Total</span>
                  <span>{formatMoney(selected.total_amount)}</span>
                </div>
              </div>
            </div>
            {ORDER_NEXT[selected.status].includes('CANCELLED') && (
              <p className="muted" style={{ fontSize: 13 }}>Cancelling returns all items to inventory.</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};
