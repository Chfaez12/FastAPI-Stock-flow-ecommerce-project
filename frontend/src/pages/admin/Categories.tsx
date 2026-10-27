import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { CategoryService, ProductService } from '../../services/endpoints';
import { useAsync } from '../../lib/useAsync';
import { getErrorMessage } from '../../lib/errors';
import { formatDate } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { Field, PageHeader, SearchInput } from '../../components/ui/Common';
import { Alert, EmptyState, ErrorState, SkeletonRows, Spinner } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { CategoryResponse } from '../../types/api';

const CategoryForm: React.FC<{
  category: CategoryResponse | null;
  onClose: () => void;
  onSaved: (c: CategoryResponse, isNew: boolean) => void;
}> = ({ category, onClose, onSaved }) => {
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = { name: name.trim(), description: description.trim() || null };
    try {
      const res = category
        ? await CategoryService.update(category.id, payload)
        : await CategoryService.create(payload);
      onSaved(res.data, !category);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={category ? 'Edit category' : 'New category'}
      description="Categories group products in the shop and in reports."
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="category-form" disabled={!name.trim() || saving}>
            {saving && <Spinner />} {category ? 'Save changes' : 'Create category'}
          </button>
        </>
      }
    >
      <form id="category-form" className="stack" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <Field label="Name">
          <input className="input" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} autoFocus required />
        </Field>
        <Field label="Description" hint="Optional — shown to customers as a tooltip">
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
};

export const Categories: React.FC = () => {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<CategoryResponse | null | 'new'>(null);
  const [deleting, setDeleting] = useState<CategoryResponse | null>(null);

  const categories = useAsync(() => CategoryService.getAll().then((r) => r.data), []);
  const products = useAsync(() => ProductService.getAll(), []);

  const productCount = useMemo(() => {
    const map = new Map<string, number>();
    products.data?.forEach((p) => p.category_id && map.set(p.category_id, (map.get(p.category_id) ?? 0) + 1));
    return map;
  }, [products.data]);

  const visible = (categories.data ?? [])
    .filter((c) => !query || c.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const onSaved = (c: CategoryResponse, isNew: boolean) => {
    categories.setData((prev) => (isNew ? [...(prev ?? []), c] : (prev ?? []).map((x) => (x.id === c.id ? c : x))));
    toast.success(isNew ? `Category "${c.name}" created.` : `Category "${c.name}" updated.`);
    setEditing(null);
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await CategoryService.delete(deleting.id);
      categories.setData((prev) => (prev ?? []).filter((c) => c.id !== deleting.id));
      toast.success(`Category "${deleting.name}" deleted.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  };

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organize your catalog so customers can find things faster."
        actions={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus /> New category
          </button>
        }
      />

      <div className="card">
        <div className="toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Search categories" />
        </div>
        {categories.error ? (
          <ErrorState message={categories.error} onRetry={() => categories.reload()} />
        ) : !categories.loading && visible.length === 0 ? (
          <EmptyState
            icon={Tags}
            title={query ? 'No matching categories' : 'No categories yet'}
            description={query ? 'Try another search.' : 'Create a category to start grouping products.'}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th className="right">Products</th>
                  <th className="hide-sm">Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {categories.loading ? (
                  <SkeletonRows cols={5} />
                ) : (
                  visible.map((c) => (
                    <tr key={c.id}>
                      <td className="cell-title">{c.name}</td>
                      <td className="muted" style={{ maxWidth: 420 }}>
                        <div className="truncate">{c.description || '—'}</div>
                      </td>
                      <td className="right">{productCount.get(c.id) ?? 0}</td>
                      <td className="muted nowrap hide-sm">{formatDate(c.created_at)}</td>
                      <td className="right nowrap">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}>
                          <Pencil />
                        </button>
                        <button className="btn btn-danger-ghost btn-icon btn-sm" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}>
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
        <CategoryForm category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={onSaved} />
      )}

      <ConfirmDialog
        open={!!deleting}
        title={`Delete "${deleting?.name ?? ''}"?`}
        message={
          deleting && productCount.get(deleting.id)
            ? `${productCount.get(deleting.id)} product(s) use this category. They will become uncategorized if the delete succeeds.`
            : 'This category will be permanently removed.'
        }
        confirmLabel="Delete category"
        danger
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
};
