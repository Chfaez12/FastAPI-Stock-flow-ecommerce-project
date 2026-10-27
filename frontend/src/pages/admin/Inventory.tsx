import React, { useMemo, useState } from 'react';
import { Minus, Plus, SlidersHorizontal, Warehouse } from 'lucide-react';
import { InventoryService, ProductService } from '../../services/endpoints';
import { useAsync } from '../../lib/useAsync';
import { getErrorMessage } from '../../lib/errors';
import { relativeTime } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { Field, PageHeader, SearchInput, Tabs } from '../../components/ui/Common';
import { Alert, EmptyState, ErrorState, SkeletonRows, Spinner } from '../../components/ui/Feedback';
import { StockBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import type { InventoryResponse, ProductResponse } from '../../types/api';

type Row = InventoryResponse & { product?: ProductResponse };
type Filter = 'all' | 'low' | 'out';

const AdjustDialog: React.FC<{ row: Row; onClose: () => void; onSaved: (inv: InventoryResponse) => void }> = ({
  row,
  onClose,
  onSaved,
}) => {
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('');
  const [reorder, setReorder] = useState(String(row.reorder_level));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qty = Math.max(0, Math.floor(Number(amount) || 0));
  const delta = mode === 'add' ? qty : -qty;
  const after = row.quantity + delta;
  const reorderNum = Math.max(0, Math.floor(Number(reorder) || 0));
  const reorderChanged = reorderNum !== row.reorder_level;
  const valid = (qty > 0 || reorderChanged) && after >= 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await InventoryService.adjust(row.product_id, {
        quantity_delta: delta,
        reorder_level: reorderChanged ? reorderNum : null,
      });
      onSaved(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Adjust stock"
      description={row.product?.name ?? row.product_id}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="adjust-form" disabled={!valid || saving}>
            {saving && <Spinner />} Save adjustment
          </button>
        </>
      }
    >
      <form id="adjust-form" className="stack" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <Tabs
          value={mode}
          onChange={setMode}
          options={[
            { value: 'add', label: 'Add stock' },
            { value: 'remove', label: 'Remove stock' },
          ]}
        />
        <div className="form-grid">
          <Field label={mode === 'add' ? 'Units to add' : 'Units to remove'}>
            <div className="input-group">
              {mode === 'add' ? <Plus /> : <Minus />}
              <input className="input" type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
            </div>
          </Field>
          <Field label="Reorder level" hint="Alert when stock falls to this level">
            <input className="input" type="number" min="0" step="1" value={reorder} onChange={(e) => setReorder(e.target.value)} />
          </Field>
        </div>
        <div className="line-items">
          <div className="line-item">
            <span className="grow muted">Current on hand</span>
            <strong>{row.quantity}</strong>
          </div>
          <div className="line-item">
            <span className="grow muted">Change</span>
            <strong style={{ color: delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--danger)' : undefined }}>
              {delta > 0 ? `+${delta}` : delta}
            </strong>
          </div>
          <div className="line-total">
            <span>After adjustment</span>
            <span style={{ color: after < 0 ? 'var(--danger)' : undefined }}>{after}</span>
          </div>
        </div>
        {after < 0 && <Alert>You can't remove more units than are on hand.</Alert>}
      </form>
    </Modal>
  );
};

export const Inventory: React.FC = () => {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [adjusting, setAdjusting] = useState<Row | null>(null);

  const inventory = useAsync(() => InventoryService.getAll().then((r) => r.data), []);
  const products = useAsync(() => ProductService.getAll(), []);

  const rows: Row[] = useMemo(() => {
    const byId = new Map((products.data ?? []).map((p) => [p.id, p]));
    return (inventory.data ?? []).map((i) => ({ ...i, product: byId.get(i.product_id) }));
  }, [inventory.data, products.data]);

  const counts = {
    all: rows.length,
    low: rows.filter((r) => r.quantity > 0 && r.quantity <= r.reorder_level).length,
    out: rows.filter((r) => r.quantity <= 0).length,
  };

  const visible = rows
    .filter((r) => {
      const q = query.trim().toLowerCase();
      if (q && !(r.product?.name.toLowerCase().includes(q) || r.product?.sku.toLowerCase().includes(q))) return false;
      if (filter === 'low') return r.quantity > 0 && r.quantity <= r.reorder_level;
      if (filter === 'out') return r.quantity <= 0;
      return true;
    })
    .sort((a, b) => a.quantity - a.reorder_level - (b.quantity - b.reorder_level));

  const totalUnits = rows.reduce((s, r) => s + r.quantity, 0);

  const onSaved = (inv: InventoryResponse) => {
    inventory.setData((prev) => (prev ?? []).map((i) => (i.product_id === inv.product_id ? inv : i)));
    toast.success(`Stock updated for ${adjusting?.product?.name ?? 'product'} (now ${inv.quantity}).`);
    setAdjusting(null);
  };

  const loading = inventory.loading || products.loading;

  return (
    <>
      <PageHeader
        title="Inventory"
        description={`${totalUnits.toLocaleString()} units on hand across ${rows.length} products.`}
      />

      <div className="card">
        <div className="toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by product or SKU" />
          <Tabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'low', label: 'Low stock', count: counts.low },
              { value: 'out', label: 'Out of stock', count: counts.out },
            ]}
          />
        </div>

        {inventory.error ? (
          <ErrorState message={inventory.error} onRetry={() => inventory.reload()} />
        ) : !loading && visible.length === 0 ? (
          <EmptyState icon={Warehouse} title="Nothing to show" description={rows.length ? 'No products match this filter.' : 'Inventory records are created with each product.'} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Status</th>
                  <th style={{ width: '22%' }}>Level</th>
                  <th className="right">On hand</th>
                  <th className="right">Reorder at</th>
                  <th className="hide-sm">Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={7} />
                ) : (
                  visible.map((r) => {
                    const target = Math.max(r.reorder_level * 3, 1);
                    const pct = Math.min(100, (r.quantity / target) * 100);
                    const tone = r.quantity <= 0 ? 'bad' : r.quantity <= r.reorder_level ? 'warn' : '';
                    return (
                      <tr key={r.product_id}>
                        <td>
                          <div className="cell-title">{r.product?.name ?? 'Unknown product'}</div>
                          <div className="cell-sub mono">{r.product?.sku ?? r.product_id.slice(0, 8)}</div>
                        </td>
                        <td><StockBadge qty={r.quantity} reorderLevel={r.reorder_level} /></td>
                        <td>
                          <div className={`progress ${tone}`}><span style={{ width: `${pct}%` }} /></div>
                        </td>
                        <td className="right cell-title">{r.quantity}</td>
                        <td className="right muted">{r.reorder_level}</td>
                        <td className="muted nowrap hide-sm">{relativeTime(r.updated_at)}</td>
                        <td className="right">
                          <button className="btn btn-secondary btn-sm" onClick={() => setAdjusting(r)}>
                            <SlidersHorizontal /> Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adjusting && <AdjustDialog row={adjusting} onClose={() => setAdjusting(null)} onSaved={onSaved} />}
    </>
  );
};
