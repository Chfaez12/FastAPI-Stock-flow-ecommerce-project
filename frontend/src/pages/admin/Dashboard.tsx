import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Clock, DollarSign, Package, ShoppingCart } from 'lucide-react';
import {
  InventoryService,
  OrderService,
  ProductService,
  PurchaseOrderService,
} from '../../services/endpoints';
import { useAsync } from '../../lib/useAsync';
import { formatMoney, relativeTime, shortId } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui/Common';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback';
import { StatusBadge } from '../../components/ui/StatusBadge';

const DAYS = 7;

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(async () => {
    const [orders, products, inventory, pos] = await Promise.all([
      OrderService.getAllOrders(),
      ProductService.getAll(),
      InventoryService.getAll().then((r) => r.data),
      PurchaseOrderService.getAll().then((r) => r.data),
    ]);
    return { orders, products, inventory, pos };
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const live = data.orders.filter((o) => o.status !== 'CANCELLED');
    const revenue = live.reduce((s, o) => s + Number(o.total_amount), 0);
    const pending = data.orders.filter((o) => o.status === 'PENDING').length;
    const productName = new Map(data.products.map((p) => [p.id, p]));
    const lowStock = data.inventory
      .filter((i) => i.quantity <= i.reorder_level)
      .map((i) => ({ ...i, product: productName.get(i.product_id) }))
      .sort((a, b) => a.quantity - b.quantity);
    const openPos = data.pos.filter((p) => p.status === 'DRAFT' || p.status === 'ORDERED').length;

    // Revenue per day for the last week
    const days = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (DAYS - 1 - i));
      return d;
    });
    const series = days.map((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const total = live
        .filter((o) => {
          const t = new Date(o.created_at);
          return t >= d && t < next;
        })
        .reduce((s, o) => s + Number(o.total_amount), 0);
      return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), total };
    });
    const weekTotal = series.reduce((s, d) => s + d.total, 0);
    const max = Math.max(...series.map((s) => s.total), 1);

    const recent = [...data.orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
    const activeProducts = data.products.filter((p) => (p.status ?? 'ACTIVE') === 'ACTIVE').length;

    return { revenue, pending, lowStock, openPos, series, weekTotal, max, recent, activeProducts, liveCount: live.length };
  }, [data]);

  if (loading) return <PageLoader />;
  if (error || !data || !stats) return <ErrorState message={error ?? 'No data'} onRetry={() => reload()} />;

  const cards = [
    { label: 'Total revenue', value: formatMoney(stats.revenue), foot: `${stats.liveCount} non-cancelled orders`, icon: DollarSign },
    { label: 'Pending orders', value: stats.pending, foot: 'Awaiting confirmation', icon: Clock },
    { label: 'Active products', value: stats.activeProducts, foot: `${data.products.length} in catalog`, icon: Package },
    { label: 'Low stock alerts', value: stats.lowStock.length, foot: `${stats.openPos} open purchase orders`, icon: AlertTriangle },
  ];

  return (
    <>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${user?.name.split(' ')[0]}`}
        description="Here's what's happening across your store today."
        actions={
          <Link to="/admin/products" className="btn btn-primary">
            <Package /> Manage products
          </Link>
        }
      />

      <div className="stats">
        {cards.map(({ label, value, foot, icon: Icon }) => (
          <div key={label} className="card stat">
            <div className="stat-top">
              <span className="stat-label">{label}</span>
              <span className="stat-icon"><Icon /></span>
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-foot">{foot}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue, last 7 days</div>
              <div className="card-sub">{formatMoney(stats.weekTotal)} from non-cancelled orders</div>
            </div>
          </div>
          <div className="card-body">
            <div className="chart">
              {stats.series.map((d) => (
                <div key={d.label} className="chart-col">
                  <div
                    className="chart-bar"
                    style={{ height: `${(d.total / stats.max) * 100}%` }}
                    data-tip={formatMoney(d.total)}
                  />
                  <span className="chart-label">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Low stock</div>
            <Link to="/admin/inventory" className="btn btn-ghost btn-sm">
              View all <ArrowRight />
            </Link>
          </div>
          {stats.lowStock.length === 0 ? (
            <EmptyState icon={Package} title="All stocked up" description="No products are at or below their reorder level." />
          ) : (
            stats.lowStock.slice(0, 5).map((i) => (
              <div key={i.product_id} className="list-row">
                <div className="grow">
                  <div className="cell-title truncate">{i.product?.name ?? 'Unknown product'}</div>
                  <div className="cell-sub">Reorder at {i.reorder_level}</div>
                </div>
                <span className={`badge ${i.quantity <= 0 ? 'badge-danger' : 'badge-warning'}`}>{i.quantity} left</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div className="card-title">Recent orders</div>
          <Link to="/admin/orders" className="btn btn-ghost btn-sm">
            View all <ArrowRight />
          </Link>
        </div>
        {stats.recent.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders yet" description="New customer orders will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Placed</th>
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((o) => (
                  <tr key={o.id}>
                    <td className="mono cell-title">{shortId(o.id)}</td>
                    <td className="muted">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="muted nowrap">{relativeTime(o.created_at)}</td>
                    <td className="right cell-title">{formatMoney(o.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};
