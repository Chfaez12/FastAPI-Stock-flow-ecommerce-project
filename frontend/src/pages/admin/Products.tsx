import React, { useMemo, useState } from 'react';
import { Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { CategoryService, ProductService } from '../../services/endpoints';
import { useAsync } from '../../lib/useAsync';
import { getErrorMessage } from '../../lib/errors';
import { formatMoney, relativeTime } from '../../lib/format';
import { ImageUploader } from '../../components/ImageUploader';
import { ProductIcon } from '../../components/ProductCard';
import { useToast } from '../../context/ToastContext';
import { Field, PageHeader, SearchInput } from '../../components/ui/Common';
import { Alert, EmptyState, ErrorState, SkeletonRows, Spinner } from '../../components/ui/Feedback';
import { StatusBadge, StockBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { CategoryResponse, ProductResponse, ProductStatus } from '../../types/api';

interface FormState {
  sku: string;
  name: string;
  description: string;
  price: string;
  status: ProductStatus;
  category_id: string;
  initial_quantity: string;
}

const EMPTY: FormState = {
  sku: '',
  name: '',
  description: '',
  price: '',
  status: 'ACTIVE',
  category_id: '',
  initial_quantity: '0',
};

const ProductForm: React.FC<{
  product: ProductResponse | null;
  categories: CategoryResponse[];
  onClose: () => void;
  onSaved: (p: ProductResponse, isNew: boolean, imageError?: string) => void;
}> = ({ product, categories, onClose, onSaved }) => {
  const [form, setForm] = useState<FormState>(
    product
      ? {
          sku: product.sku,
          name: product.name,
          description: product.description ?? '',
          price: String(Number(product.price)),
          status: product.status ?? 'ACTIVE',
          category_id: product.category_id ?? '',
          initial_quantity: '0',
        }
      : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const valid = form.sku.trim() && form.name.trim() && Number(form.price) > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const base = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.price,
      status: form.status,
      category_id: form.category_id || null,
    };
    let saved: ProductResponse;
    try {
      saved = product
        ? { ...(await ProductService.update(product.id, base)).data, available_stock: product.available_stock }
        : (await ProductService.create({ ...base, initial_quantity: Number(form.initial_quantity) || 0 })).data;
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
      return;
    }

    // The product is saved at this point; an image failure is reported without losing the product.
    let imageError: string | undefined;
    try {
      if (imageFile) {
        saved = { ...(await ProductService.uploadImage(saved.id, imageFile)).data, available_stock: saved.available_stock };
      } else if (imageRemoved && saved.image_url) {
        saved = { ...(await ProductService.deleteImage(saved.id)).data, available_stock: saved.available_stock };
      }
    } catch (err) {
      imageError = getErrorMessage(err, 'Image upload failed.');
    }
    onSaved(saved, !product, imageError);
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={product ? 'Edit product' : 'New product'}
      description={product ? `Update details for ${product.name}.` : 'Add a product to your catalog.'}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-primary" form="product-form" disabled={!valid || saving}>
            {saving && <Spinner />} {product ? 'Save changes' : 'Create product'}
          </button>
        </>
      }
    >
      <form id="product-form" className="stack" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <ImageUploader
          value={product?.image_url ?? null}
          file={imageFile}
          removed={imageRemoved}
          disabled={saving}
          onFileChange={(f) => {
            setImageFile(f);
            if (f) setImageRemoved(false);
          }}
          onRemove={() => setImageRemoved(true)}
        />
        <div className="form-grid">
          <Field label="Product name" className="span-2">
            <input className="input" value={form.name} onChange={set('name')} required autoFocus />
          </Field>
          <Field label="SKU" hint="Must be unique">
            <input className="input mono" value={form.sku} onChange={set('sku')} required />
          </Field>
          <Field label="Price (USD)">
            <input className="input" type="number" min="0.01" step="0.01" value={form.price} onChange={set('price')} required />
          </Field>
          <Field label="Category">
            <select className="select" value={form.category_id} onChange={set('category_id')}>
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Status" hint="Only active products appear in the shop">
            <select className="select" value={form.status} onChange={set('status')}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </Field>
          {!product && (
            <Field label="Opening stock" hint="Units on hand right now">
              <input className="input" type="number" min="0" step="1" value={form.initial_quantity} onChange={set('initial_quantity')} />
            </Field>
          )}
          <Field label="Description" className="span-2">
            <textarea className="textarea" value={form.description} onChange={set('description')} rows={4} />
          </Field>
        </div>
        {product && (
          <p className="muted" style={{ fontSize: 13 }}>
            To change stock levels, use the Inventory page.
          </p>
        )}
      </form>
    </Modal>
  );
};

export const Products: React.FC = () => {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>('');
  const [editing, setEditing] = useState<ProductResponse | null | 'new'>(null);
  const [deleting, setDeleting] = useState<ProductResponse | null>(null);

  const products = useAsync(() => ProductService.getAll(), []);
  const categories = useAsync(() => CategoryService.getAll().then((r) => r.data), []);

  const categoryName = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.name])),
    [categories.data],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products.data ?? [])
      .filter(
        (p) =>
          (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) &&
          (!categoryFilter || p.category_id === categoryFilter) &&
          (!statusFilter || p.status === statusFilter),
      )
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [products.data, query, categoryFilter, statusFilter]);

  const onSaved = (p: ProductResponse, isNew: boolean, imageError?: string) => {
    products.setData((prev) => (isNew ? [p, ...(prev ?? [])] : (prev ?? []).map((x) => (x.id === p.id ? p : x))));
    toast.success(isNew ? `${p.name} created.` : `${p.name} updated.`);
    if (imageError) toast.error(`Product saved, but the image wasn't: ${imageError}`);
    setEditing(null);
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await ProductService.delete(deleting.id);
      products.setData((prev) => (prev ?? []).filter((p) => p.id !== deleting.id));
      toast.success(`${deleting.name} deleted.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="Create, edit and organize everything you sell."
        actions={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus /> New product
          </button>
        }
      />

      <div className="card">
        <div className="toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by name or SKU" />
          <select className="select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProductStatus | '')} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <span className="muted" style={{ marginLeft: 'auto', fontSize: 13 }}>
            {visible.length} of {products.data?.length ?? 0}
          </span>
        </div>

        {products.error ? (
          <ErrorState message={products.error} onRetry={() => products.reload()} />
        ) : !products.loading && visible.length === 0 ? (
          <EmptyState
            icon={Package}
            title={products.data?.length ? 'No matching products' : 'No products yet'}
            description={products.data?.length ? 'Try a different search or filter.' : 'Create your first product to start selling.'}
            action={
              !products.data?.length && (
                <button className="btn btn-primary" onClick={() => setEditing('new')}>
                  <Plus /> New product
                </button>
              )
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Stock</th>
                  <th className="right">Price</th>
                  <th className="hide-sm">Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.loading ? (
                  <SkeletonRows cols={7} />
                ) : (
                  visible.map((p) => (
                    <tr key={p.id} className="clickable" onClick={() => setEditing(p)}>
                      <td>
                        <div className="row" style={{ gap: 12 }}>
                          <ProductIcon
                            categoryId={p.category_id}
                            categoryName={p.category_id ? categoryName.get(p.category_id) : undefined}
                            imageUrl={p.image_url}
                            alt={p.name}
                            size={40}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div className="cell-title truncate">{p.name}</div>
                            <div className="cell-sub mono">{p.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="muted">{p.category_id ? categoryName.get(p.category_id) ?? '—' : 'Uncategorized'}</td>
                      <td>{p.status && <StatusBadge status={p.status} />}</td>
                      <td>
                        <div className="row">
                          <span style={{ fontWeight: 500, minWidth: 24 }}>{p.available_stock ?? 0}</span>
                          <StockBadge qty={p.available_stock ?? 0} />
                        </div>
                      </td>
                      <td className="right cell-title">{formatMoney(p.price)}</td>
                      <td className="muted nowrap hide-sm">{relativeTime(p.updated_at)}</td>
                      <td className="right nowrap" onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>
                          <Pencil />
                        </button>
                        <button className="btn btn-danger-ghost btn-icon btn-sm" onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`}>
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

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          categories={categories.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name ?? 'product'}?`}
        message="The product and its inventory record will be removed. Products that appear on customer or purchase orders can't be deleted; set their status to Archived instead."
        confirmLabel="Delete product"
        danger
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
};
