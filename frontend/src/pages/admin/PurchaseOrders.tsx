import React, { useMemo, useState } from 'react';
import { ClipboardList, Plus, Trash2 } from 'lucide-react';
import { ProductService, PurchaseOrderService, SupplierService } from '../../services/endpoints';
import { useAsync } from '../../lib/useAsync';
import { getErrorMessage } from '../../lib/errors';
import { formatDateTime, formatMoney, relativeTime, shortId } from '../../lib/format';
import { PO_ACTION_LABEL, PO_NEXT } from '../../lib/workflow';
import { useToast } from '../../context/ToastContext';
import { Field, PageHeader, Tabs } from '../../components/ui/Common';
import { Alert, EmptyState, ErrorState, PageLoader, SkeletonRows, Spinner } from '../../components/ui/Feedback';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import type { ProductResponse, PurchaseOrderResponse, PurchaseOrderStatus, SupplierResponse } from '../../types/api';

interface Line {
  key: number;
  product_id: string;
  quantity: string;
  unit_cost: string;
}

const newLine = (): Line => ({ key: Date.now() + Math.random(), product_id: '', quantity: '1', unit_cost: '' });

const CreatePO: React.FC<{
  suppliers: SupplierResponse[];
  products: ProductResponse[];
  onClose: () => void;
  onCreated: (po: PurchaseOrderResponse) => void;
}> = ({ suppliers, products, onClose, onCreated }) => {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0);
  const valid =
    supplierId &&
    lines.length > 0 &&
    lines.every((l) => l.product_id && Number(l.quantity) > 0 && Number(l.unit_cost) > 0) &&
    new Set(lines.map((l) => l.product_id)).size === lines.length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await PurchaseOrderService.create({
        supplier_id: supplierId,
        items: lines.map((l) => ({
          product_id: l.product_id,
          quantity: Math.floor(Number(l.quantity)),
          unit_cost: l.unit_cost,
        })),
      });
      onCreated(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="New purchase order"
      description="Purchase orders start as drafts. Stock is added when you mark them received."
      footer={
        <>
          <span className="grow" style={{ fontWeight: 600 }}>Total {formatMoney(total)}</span>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="po-form" disabled={!valid || saving}>
            {saving && <Spinner />} Create draft
          </button>
        </>
      }
    >
      {suppliers.length === 0 ? (
        <Alert kind="warning">Add a supplier first — purchase orders need one.</Alert>
      ) : (
        <form id="po-form" className="stack" onSubmit={submit}>
          {error && <Alert>{error}</Alert>}
          <Field label="Supplier">
            <select className="select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>

          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>Line items</div>
            <div className="stack-sm">
              {lines.map((l) => {
                const taken = new Set(lines.filter((x) => x.key !== l.key).map((x) => x.product_id));
                return (
                  <div key={l.key} className="row" style={{ alignItems: 'flex-end', gap: 10 }}>
                    <Field label="Product" className="grow">
                      <select className="select" value={l.product_id} onChange={(e) => update(l.key, { product_id: e.target.value })}>
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id} disabled={taken.has(p.id)}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Qty" className="" >
                      <input className="input" style={{ width: 80 }} type="number" min="1" step="1" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} />
                    </Field>
                    <Field label="Unit cost">
                      <input className="input" style={{ width: 110 }} type="number" min="0.01" step="0.01" value={l.unit_cost} onChange={(e) => update(l.key, { unit_cost: e.target.value })} placeholder="0.00" />
                    </Field>
                    <button
                      type="button"
                      className="btn btn-danger-ghost btn-icon"
                      disabled={lines.length === 1}
                      onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                      aria-label="Remove line"
                    >
                      <Trash2 />
                    </button>
                  </div>
                );
              })}
            </div>
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setLines((ls) => [...ls, newLine()])}>
              <Plus /> Add line
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

/** Detail drawer backed by GET /purchase-orders/{id}. */
const PODrawer: React.FC<{
  poId: string;
  supplierName: (id: string) => string;
  productById: Map<string, ProductResponse>;
  onClose: () => void;
  onChanged: (po: PurchaseOrderResponse) => void;
}> = ({ poId, supplierName, productById, onClose, onChanged }) => {
  const toast = useToast();
  const [updating, setUpdating] = useState<PurchaseOrderStatus | null>(null);
  const { data: po, setData, loading, error, reload } = useAsync(
    () => PurchaseOrderService.getById(poId).then((r) => r.data),
    [poId],
  );

  const change = async (status: PurchaseOrderStatus) => {
    if (!po) return;
    setUpdating(status);
    try {
      const res = await PurchaseOrderService.updateStatus(po.id, { status });
      setData(res.data);
      onChanged(res.data);
      toast.success(
        status === 'RECEIVED'
          ? `PO ${shortId(po.id)} received — stock updated.`
          : `PO ${shortId(po.id)} is now ${status.toLowerCase()}.`,
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUpdating(null);
    }
  };

  return (
    <Modal
      open
      variant="drawer"
      onClose={onClose}
      title={`Purchase order ${shortId(poId)}`}
      description={po && <StatusBadge status={po.status} />}
      footer={
        po && PO_NEXT[po.status].length > 0 ? (
          PO_NEXT[po.status].map((s) => (
            <button key={s} className={`btn ${s === 'CANCELLED' ? 'btn-danger-ghost' : 'btn-primary'}`} disabled={!!updating} onClick={() => change(s)}>
              {updating === s && <Spinner />} {PO_ACTION_LABEL[s]}
            </button>
          ))
        ) : po ? (
          <span className="muted" style={{ fontSize: 13 }}>This purchase order is closed.</span>
        ) : null
      }
    >
      {loading ? (
        <PageLoader />
      ) : error || !po ? (
        <ErrorState message={error ?? 'Not found'} onRetry={() => reload()} />
      ) : (
        <div className="stack">
          <dl className="dl">
            <dt>Supplier</dt>
            <dd>{supplierName(po.supplier_id)}</dd>
            <dt>Created</dt>
            <dd>{formatDateTime(po.created_at)}</dd>
            <dt>Last updated</dt>
            <dd>{formatDateTime(po.updated_at)}</dd>
          </dl>
          <div className="line-items">
            {po.items.map((item) => {
              const p = productById.get(item.product_id);
              return (
                <div key={item.id} className="line-item">
                  <div className="grow">
                    <div className="cell-title">{p?.name ?? 'Unknown product'}</div>
                    <div className="cell-sub">{item.quantity} × {formatMoney(item.unit_cost)}</div>
                  </div>
                  <strong>{formatMoney(Number(item.unit_cost) * item.quantity)}</strong>
                </div>
              );
            })}
            <div className="line-total">
              <span>Total</span>
              <span>{formatMoney(po.total_amount)}</span>
            </div>
          </div>
          {po.status === 'ORDERED' && (
            <Alert kind="info">Marking this order received adds {po.items.reduce((s, i) => s + i.quantity, 0)} units to inventory.</Alert>
          )}
        </div>
      )}
    </Modal>
  );
};

type Filter = 'ALL' | PurchaseOrderStatus;

export const PurchaseOrders: React.FC = () => {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  const pos = useAsync(() => PurchaseOrderService.getAll().then((r) => r.data), []);
  const suppliers = useAsync(() => SupplierService.getAll().then((r) => r.data), []);
  const products = useAsync(() => ProductService.getAll(), []);

  const productById = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);
  const supplierById = useMemo(() => new Map((suppliers.data ?? []).map((s) => [s.id, s])), [suppliers.data]);
  const supplierName = (id: string) => supplierById.get(id)?.name ?? 'Unknown supplier';

  const all = useMemo(
    () => [...(pos.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [pos.data],
  );
  const filters: Filter[] = ['ALL', 'DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'];
  const visible = all.filter((p) => filter === 'ALL' || p.status === filter);
  const openValue = all
    .filter((p) => p.status === 'DRAFT' || p.status === 'ORDERED')
    .reduce((s, p) => s + Number(p.total_amount), 0);

  const replace = (po: PurchaseOrderResponse) =>
    pos.setData((prev) => (prev ?? []).map((p) => (p.id === po.id ? po : p)));

  return (
    <>
      <PageHeader
        title="Purchase orders"
        description={`${formatMoney(openValue)} in open purchase orders`}
        actions={
          <button className="btn btn-primary" onClick={() => setCreating(true)} disabled={suppliers.loading || products.loading}>
            <Plus /> New purchase order
          </button>
        }
      />

      <div className="card">
        <div className="toolbar">
          <Tabs
            value={filter}
            onChange={setFilter}
            options={filters.map((f) => ({
              value: f,
              label: f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase(),
              count: f === 'ALL' ? all.length : all.filter((p) => p.status === f).length,
            }))}
          />
        </div>

        {pos.error ? (
          <ErrorState message={pos.error} onRetry={() => pos.reload()} />
        ) : !pos.loading && visible.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No purchase orders"
            description={all.length ? 'Nothing matches this filter.' : 'Raise a purchase order to restock from a supplier.'}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>PO</th>
                  <th>Supplier</th>
                  <th>Lines</th>
                  <th>Status</th>
                  <th className="hide-sm">Created</th>
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {pos.loading ? (
                  <SkeletonRows cols={6} />
                ) : (
                  visible.map((p) => (
                    <tr key={p.id} className="clickable" onClick={() => setViewing(p.id)}>
                      <td className="mono cell-title">{shortId(p.id)}</td>
                      <td>{supplierName(p.supplier_id)}</td>
                      <td className="muted">{p.items.length}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td className="muted nowrap hide-sm">{relativeTime(p.created_at)}</td>
                      <td className="right cell-title">{formatMoney(p.total_amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creating && (suppliers.loading || products.loading ? (
        <PageLoader />
      ) : (
        <CreatePO
          suppliers={suppliers.data ?? []}
          products={products.data ?? []}
          onClose={() => setCreating(false)}
          onCreated={(po) => {
            pos.setData((prev) => [po, ...(prev ?? [])]);
            toast.success(`Draft ${shortId(po.id)} created.`);
            setCreating(false);
            setViewing(po.id);
          }}
        />
      ))}

      {viewing && (
        <PODrawer
          poId={viewing}
          supplierName={supplierName}
          productById={productById}
          onClose={() => setViewing(null)}
          onChanged={replace}
        />
      )}
    </>
  );
};
