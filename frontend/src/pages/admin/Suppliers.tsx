import React, { useState } from 'react';
import { Mail, MapPin, Pencil, Phone, Plus, Trash2, Truck, UserRound } from 'lucide-react';
import { PurchaseOrderService, SupplierService } from '../../services/endpoints';
import { useAsync } from '../../lib/useAsync';
import { getErrorMessage } from '../../lib/errors';
import { formatDate, formatMoney, shortId } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { Field, PageHeader, SearchInput } from '../../components/ui/Common';
import { Alert, EmptyState, ErrorState, PageLoader, SkeletonRows, Spinner } from '../../components/ui/Feedback';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { PurchaseOrderResponse, SupplierResponse } from '../../types/api';

const EMPTY = { name: '', contact_name: '', email: '', phone: '', address: '' };

const SupplierForm: React.FC<{
  supplier: SupplierResponse | null;
  onClose: () => void;
  onSaved: (s: SupplierResponse, isNew: boolean) => void;
}> = ({ supplier, onClose, onSaved }) => {
  const [form, setForm] = useState(
    supplier
      ? {
          name: supplier.name,
          contact_name: supplier.contact_name ?? '',
          email: supplier.email ?? '',
          phone: supplier.phone ?? '',
          address: supplier.address ?? '',
        }
      : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      contact_name: form.contact_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
    };
    try {
      const res = supplier ? await SupplierService.update(supplier.id, payload) : await SupplierService.create(payload);
      onSaved(res.data, !supplier);
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
      title={supplier ? 'Edit supplier' : 'New supplier'}
      description="Suppliers are used when raising purchase orders."
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="supplier-form" disabled={!form.name.trim() || saving}>
            {saving && <Spinner />} {supplier ? 'Save changes' : 'Create supplier'}
          </button>
        </>
      }
    >
      <form id="supplier-form" className="stack" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <div className="form-grid">
          <Field label="Company name" className="span-2">
            <input className="input" value={form.name} onChange={set('name')} required autoFocus />
          </Field>
          <Field label="Contact person">
            <input className="input" value={form.contact_name} onChange={set('contact_name')} />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Phone">
            <input className="input" type="tel" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Address" className="span-2">
            <textarea className="textarea" value={form.address} onChange={set('address')} rows={2} />
          </Field>
        </div>
      </form>
    </Modal>
  );
};

/** Loads the supplier through GET /suppliers/{id} and lists its purchase orders. */
const SupplierDrawer: React.FC<{
  supplierId: string;
  pos: PurchaseOrderResponse[];
  onClose: () => void;
  onEdit: (s: SupplierResponse) => void;
}> = ({ supplierId, pos, onClose, onEdit }) => {
  const { data: s, loading, error, reload } = useAsync(
    () => SupplierService.getById(supplierId).then((r) => r.data),
    [supplierId],
  );
  const theirs = pos.filter((p) => p.supplier_id === supplierId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const spend = theirs.filter((p) => p.status === 'RECEIVED').reduce((sum, p) => sum + Number(p.total_amount), 0);

  return (
    <Modal
      open
      variant="drawer"
      onClose={onClose}
      title={s?.name ?? 'Supplier'}
      description={s ? `Added ${formatDate(s.created_at)}` : undefined}
      footer={s && <button className="btn btn-secondary" onClick={() => onEdit(s)}><Pencil /> Edit supplier</button>}
    >
      {loading ? (
        <PageLoader />
      ) : error || !s ? (
        <ErrorState message={error ?? 'Not found'} onRetry={() => reload()} />
      ) : (
        <div className="stack">
          <div className="stack-sm">
            <div className="row muted"><UserRound size={16} /> {s.contact_name || 'No contact person'}</div>
            <div className="row muted"><Mail size={16} /> {s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : 'No email'}</div>
            <div className="row muted"><Phone size={16} /> {s.phone || 'No phone'}</div>
            <div className="row muted" style={{ alignItems: 'flex-start' }}><MapPin size={16} style={{ marginTop: 2 }} /> {s.address || 'No address'}</div>
          </div>
          <div className="stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="card stat">
              <div className="stat-label">Purchase orders</div>
              <div className="stat-value">{theirs.length}</div>
            </div>
            <div className="card stat">
              <div className="stat-label">Received spend</div>
              <div className="stat-value">{formatMoney(spend)}</div>
            </div>
          </div>
          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>Recent purchase orders</div>
            {theirs.length === 0 ? (
              <p className="muted">No purchase orders with this supplier yet.</p>
            ) : (
              <div className="line-items">
                {theirs.slice(0, 8).map((p) => (
                  <div key={p.id} className="line-item">
                    <div className="grow">
                      <div className="cell-title mono">{shortId(p.id)}</div>
                      <div className="cell-sub">{formatDate(p.created_at)}</div>
                    </div>
                    <StatusBadge status={p.status} />
                    <strong>{formatMoney(p.total_amount)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export const Suppliers: React.FC = () => {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<SupplierResponse | null | 'new'>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<SupplierResponse | null>(null);

  const suppliers = useAsync(() => SupplierService.getAll().then((r) => r.data), []);
  const pos = useAsync(() => PurchaseOrderService.getAll().then((r) => r.data), []);

  const visible = (suppliers.data ?? [])
    .filter((s) => {
      const q = query.trim().toLowerCase();
      return !q || [s.name, s.contact_name, s.email].some((v) => v?.toLowerCase().includes(q));
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const poCount = (id: string) => (pos.data ?? []).filter((p) => p.supplier_id === id).length;

  const onSaved = (s: SupplierResponse, isNew: boolean) => {
    suppliers.setData((prev) => (isNew ? [...(prev ?? []), s] : (prev ?? []).map((x) => (x.id === s.id ? s : x))));
    toast.success(isNew ? `${s.name} added.` : `${s.name} updated.`);
    setEditing(null);
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await SupplierService.delete(deleting.id);
      suppliers.setData((prev) => (prev ?? []).filter((s) => s.id !== deleting.id));
      toast.success(`${deleting.name} deleted.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  };

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Vendors you buy stock from."
        actions={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus /> New supplier
          </button>
        }
      />

      <div className="card">
        <div className="toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, contact or email" />
        </div>
        {suppliers.error ? (
          <ErrorState message={suppliers.error} onRetry={() => suppliers.reload()} />
        ) : !suppliers.loading && visible.length === 0 ? (
          <EmptyState icon={Truck} title={query ? 'No matching suppliers' : 'No suppliers yet'} description={query ? 'Try another search.' : 'Add a supplier to start raising purchase orders.'} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Contact</th>
                  <th className="hide-sm">Phone</th>
                  <th className="right">POs</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {suppliers.loading ? (
                  <SkeletonRows cols={5} />
                ) : (
                  visible.map((s) => (
                    <tr key={s.id} className="clickable" onClick={() => setViewing(s.id)}>
                      <td>
                        <div className="cell-title">{s.name}</div>
                        <div className="cell-sub truncate" style={{ maxWidth: 280 }}>{s.address || '—'}</div>
                      </td>
                      <td>
                        <div>{s.contact_name || '—'}</div>
                        <div className="cell-sub">{s.email || ''}</div>
                      </td>
                      <td className="muted hide-sm">{s.phone || '—'}</td>
                      <td className="right">{poCount(s.id)}</td>
                      <td className="right nowrap" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>
                          <Pencil />
                        </button>
                        <button className="btn btn-danger-ghost btn-icon btn-sm" onClick={() => setDeleting(s)} aria-label={`Delete ${s.name}`}>
                          <Trash2 />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewing && !editing && (
        <SupplierDrawer
          supplierId={viewing}
          pos={pos.data ?? []}
          onClose={() => setViewing(null)}
          onEdit={(s) => {
            setViewing(null);
            setEditing(s);
          }}
        />
      )}
      {editing && <SupplierForm supplier={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={onSaved} />}

      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name ?? 'supplier'}?`}
        message={
          deleting && poCount(deleting.id) > 0
            ? `This supplier has ${poCount(deleting.id)} purchase order(s). Deleting may fail while those exist.`
            : 'This supplier will be permanently removed.'
        }
        confirmLabel="Delete supplier"
        danger
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
};
