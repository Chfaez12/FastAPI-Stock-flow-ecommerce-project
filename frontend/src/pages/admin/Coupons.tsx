import React, { useState } from 'react';
import { Pencil, Plus, TicketPercent, Trash2 } from 'lucide-react';
import { CouponService } from '../../services/endpoints';
import { useAsync } from '../../lib/useAsync';
import { useDebounced } from '../../lib/useDebounced';
import { getErrorMessage } from '../../lib/errors';
import { formatDate, formatMoney } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { Field, PageHeader, SearchInput, Tabs } from '../../components/ui/Common';
import { Alert, EmptyState, ErrorState, SkeletonRows, Spinner } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Pagination } from '../../components/ui/Pagination';
import type { CouponCreate, CouponResponse, DiscountType } from '../../types/api';

const PAGE_SIZE = 20;

type Filter = 'all' | 'active' | 'inactive';

interface FormState {
  code: string;
  description: string;
  discount_type: DiscountType;
  discount_value: string;
  min_order_amount: string;
  max_discount_amount: string;
  starts_at: string;
  expires_at: string;
  usage_limit: string;
  usage_limit_per_user: string;
  is_active: boolean;
}

const EMPTY: FormState = {
  code: '',
  description: '',
  discount_type: 'PERCENTAGE',
  discount_value: '',
  min_order_amount: '',
  max_discount_amount: '',
  starts_at: '',
  expires_at: '',
  usage_limit: '',
  usage_limit_per_user: '',
  is_active: true,
};

// <input type="date"> works in local dates; the API stores UTC instants.
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
const startOfDay = (d: string) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const endOfDay = (d: string) => (d ? new Date(`${d}T23:59:59`).toISOString() : null);
const numOrNull = (v: string) => (v.trim() === '' ? null : v.trim());
const intOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

const describeDiscount = (c: Pick<CouponResponse, 'discount_type' | 'discount_value' | 'max_discount_amount'>) =>
  c.discount_type === 'PERCENTAGE'
    ? `${Number(c.discount_value)}% off${c.max_discount_amount ? ` (max ${formatMoney(c.max_discount_amount)})` : ''}`
    : `${formatMoney(c.discount_value)} off`;

function couponState(c: CouponResponse, now: number): { label: string; tone: string } {
  if (!c.is_active) return { label: 'Inactive', tone: '' };
  if (c.expires_at && new Date(c.expires_at).getTime() <= now) return { label: 'Expired', tone: 'badge-danger' };
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { label: 'Scheduled', tone: 'badge-info' };
  if (c.usage_limit != null && c.times_used >= c.usage_limit) return { label: 'Used up', tone: 'badge-warning' };
  return { label: 'Active', tone: 'badge-success' };
}

const CouponForm: React.FC<{
  coupon: CouponResponse | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ coupon, onClose, onSaved }) => {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(
    coupon
      ? {
          code: coupon.code,
          description: coupon.description ?? '',
          discount_type: coupon.discount_type,
          discount_value: String(Number(coupon.discount_value)),
          min_order_amount: coupon.min_order_amount ? String(Number(coupon.min_order_amount)) : '',
          max_discount_amount: coupon.max_discount_amount ? String(Number(coupon.max_discount_amount)) : '',
          starts_at: toDateInput(coupon.starts_at),
          expires_at: toDateInput(coupon.expires_at),
          usage_limit: coupon.usage_limit?.toString() ?? '',
          usage_limit_per_user: coupon.usage_limit_per_user?.toString() ?? '',
          is_active: coupon.is_active,
        }
      : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const isPct = form.discount_type === 'PERCENTAGE';
  const valueError =
    form.discount_value && (Number(form.discount_value) <= 0 || (isPct && Number(form.discount_value) > 100))
      ? isPct ? 'Enter a percentage between 0 and 100.' : 'Enter an amount above 0.'
      : undefined;
  const canSave = form.code.trim().length >= 3 && form.discount_value && !valueError;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload: CouponCreate = {
      code: form.code.trim(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      min_order_amount: numOrNull(form.min_order_amount),
      max_discount_amount: isPct ? numOrNull(form.max_discount_amount) : null,
      starts_at: startOfDay(form.starts_at),
      expires_at: endOfDay(form.expires_at),
      usage_limit: intOrNull(form.usage_limit),
      usage_limit_per_user: intOrNull(form.usage_limit_per_user),
      is_active: form.is_active,
    };
    try {
      if (coupon) {
        const { code: _code, ...changes } = payload;
        await CouponService.update(coupon.id, changes);
      } else {
        await CouponService.create(payload);
      }
      toast.success(coupon ? 'Coupon updated' : `Coupon ${payload.code.toUpperCase()} created`);
      onSaved();
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
      title={coupon ? `Edit ${coupon.code}` : 'New coupon'}
      description="Customers enter the code at checkout. Limits are checked again when the order is placed."
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="coupon-form" disabled={!canSave || saving}>
            {saving && <Spinner />} {coupon ? 'Save changes' : 'Create coupon'}
          </button>
        </>
      }
    >
      <form id="coupon-form" className="stack" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <div className="form-grid">
          <Field label="Code" hint={coupon ? "Codes can't be changed" : 'Letters, numbers, - and _'}>
            <input
              className="input mono"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') }))}
              maxLength={50}
              disabled={!!coupon}
              autoFocus={!coupon}
              placeholder="SUMMER20"
            />
          </Field>
          <Field label="Description" hint="Shown to the customer when applied">
            <input className="input" value={form.description} onChange={set('description')} placeholder="Summer sale" />
          </Field>
          <Field label="Discount type">
            <select className="select" value={form.discount_type} onChange={set('discount_type')}>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed amount</option>
            </select>
          </Field>
          <Field label={isPct ? 'Percent off' : 'Amount off ($)'} error={valueError}>
            <input className="input" type="number" min={0} step="0.01" value={form.discount_value} onChange={set('discount_value')} />
          </Field>
          <Field label="Minimum order ($)" hint="Optional">
            <input className="input" type="number" min={0} step="0.01" value={form.min_order_amount} onChange={set('min_order_amount')} />
          </Field>
          {isPct && (
            <Field label="Maximum discount ($)" hint="Optional cap">
              <input className="input" type="number" min={0} step="0.01" value={form.max_discount_amount} onChange={set('max_discount_amount')} />
            </Field>
          )}
          <Field label="Starts" hint="Optional">
            <input className="input" type="date" value={form.starts_at} onChange={set('starts_at')} />
          </Field>
          <Field label="Expires" hint="Optional, end of day">
            <input className="input" type="date" value={form.expires_at} min={form.starts_at || undefined} onChange={set('expires_at')} />
          </Field>
          <Field label="Total uses" hint="Optional">
            <input className="input" type="number" min={1} step={1} value={form.usage_limit} onChange={set('usage_limit')} />
          </Field>
          <Field label="Uses per customer" hint="Optional">
            <input className="input" type="number" min={1} step={1} value={form.usage_limit_per_user} onChange={set('usage_limit_per_user')} />
          </Field>
          <label className="row span-2" style={{ cursor: 'pointer', gap: 8 }}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
            Active (customers can use it)
          </label>
        </div>
      </form>
    </Modal>
  );
};

export const Coupons: React.FC = () => {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const search = useDebounced(query.trim());
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CouponResponse | 'new' | null>(null);
  const [deleting, setDeleting] = useState<CouponResponse | null>(null);

  // Captured once per load so badges don't shift between renders.
  const [now, setNow] = useState(() => Date.now());

  const changeFilter = (f: Filter) => {
    setFilter(f);
    setPage(1);
  };
  const changeQuery = (q: string) => {
    setQuery(q);
    setPage(1);
  };

  const coupons = useAsync(
    () =>
      CouponService.list({
        page,
        size: PAGE_SIZE,
        search: search || undefined,
        is_active: filter === 'all' ? undefined : filter === 'active',
      }).then((r) => {
        setNow(Date.now());
        return r.data;
      }),
    [page, filter, search],
  );

  const remove = async () => {
    if (!deleting) return;
    try {
      await CouponService.delete(deleting.id);
      toast.success(`Coupon ${deleting.code} deleted`);
      void coupons.reload({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const data = coupons.data;

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Discount codes customers can apply at checkout."
        actions={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus /> New coupon
          </button>
        }
      />

      <div className="card">
        <div className="toolbar">
          <Tabs<Filter>
            value={filter}
            onChange={changeFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
          <SearchInput value={query} onChange={changeQuery} placeholder="Search codes…" />
        </div>
        {coupons.error ? (
          <ErrorState message={coupons.error} onRetry={() => coupons.reload()} />
        ) : data && data.total === 0 ? (
          <EmptyState
            icon={TicketPercent}
            title={search || filter !== 'all' ? 'No matching coupons' : 'No coupons yet'}
            description={search || filter !== 'all' ? undefined : 'Create a code to run a promotion.'}
            action={
              !search && filter === 'all' && (
                <button className="btn btn-primary" onClick={() => setEditing('new')}>
                  <Plus /> New coupon
                </button>
              )
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Rules</th>
                  <th>Used</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!data ? (
                  <SkeletonRows cols={6} />
                ) : (
                  data.items.map((c) => {
                    const state = couponState(c, now);
                    const rules = [
                      c.min_order_amount && `Min ${formatMoney(c.min_order_amount)}`,
                      c.usage_limit_per_user && `${c.usage_limit_per_user}× per customer`,
                      c.expires_at && `Until ${formatDate(c.expires_at)}`,
                      c.starts_at && new Date(c.starts_at).getTime() > now && `From ${formatDate(c.starts_at)}`,
                    ].filter(Boolean);
                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="cell-title mono">{c.code}</div>
                          {c.description && <div className="cell-sub">{c.description}</div>}
                        </td>
                        <td>{describeDiscount(c)}</td>
                        <td className="muted">{rules.length ? rules.join(' · ') : 'None'}</td>
                        <td className="muted nowrap">
                          {c.times_used}
                          {c.usage_limit != null && ` / ${c.usage_limit}`}
                        </td>
                        <td><span className={`badge ${state.tone}`}>{state.label}</span></td>
                        <td className="right nowrap">
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(c)} aria-label={`Edit ${c.code}`}>
                            <Pencil />
                          </button>
                          <button className="btn btn-danger-ghost btn-icon btn-sm" onClick={() => setDeleting(c)} aria-label={`Delete ${c.code}`}>
                            <Trash2 />
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

      {data && (
        <Pagination page={data.page} pages={data.pages} total={data.total} size={data.size} onChange={setPage} noun="coupons" />
      )}

      {editing && (
        <CouponForm
          coupon={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void coupons.reload({ silent: true });
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.code ?? 'coupon'}?`}
        message="Customers will no longer be able to use this code. Past orders keep their discount."
        confirmLabel="Delete coupon"
        danger
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
};
