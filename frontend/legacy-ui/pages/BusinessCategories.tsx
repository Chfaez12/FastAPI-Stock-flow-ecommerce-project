import React, { useEffect, useState } from 'react';
import type { CategoryResponse } from '../types/api';
import { CategoryService } from '../services/endpoints';

export const BusinessCategories: React.FC = () => {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Edit Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await CategoryService.getAll();
      setCategories(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await CategoryService.create({
        name,
        description: description.trim() || null,
      });
      setName('');
      setDescription('');
      await fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create category');
    }
  };

  const startEdit = (cat: CategoryResponse) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description || '');
  };

  const handleUpdate = async (categoryId: string) => {
    try {
      await CategoryService.update(categoryId, {
        name: editName,
        description: editDescription.trim() || null,
      });
      setEditingId(null);
      await fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update category');
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm('Delete this category? Associated products may be affected.')) return;
    try {
      await CategoryService.delete(categoryId);
      await fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete category');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', alignItems: 'flex-start' }}>
        {/* Create Category Panel */}
        <section className="card">
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>Create Category</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              placeholder="Category Name (e.g., Electronics)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <textarea
              placeholder="Description (optional)"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Add Category
            </button>
          </form>
        </section>

        {/* Category List & Edit Table */}
        <section className="card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Categories ({categories.length})</h3>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading categories...</p>
          ) : categories.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No categories created yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const isEditing = editingId === cat.id;

                  return (
                    <tr key={cat.id}>
                      <td style={{ fontWeight: 600 }}>
                        {isEditing ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            style={{ width: '100%' }}
                          />
                        ) : (
                          cat.name
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {isEditing ? (
                          <input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            style={{ width: '100%' }}
                          />
                        ) : (
                          cat.description || '—'
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(cat.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleUpdate(cat.id)}
                              className="btn btn-primary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => startEdit(cat)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(cat.id)}
                              className="btn btn-outline-danger"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
};