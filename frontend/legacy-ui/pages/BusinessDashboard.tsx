import React, { useEffect, useState } from 'react';
import { ProductService, InventoryService, CategoryService } from '../services/endpoints';
import type { ProductResponse, CategoryResponse } from '../types/api';
import { BusinessOrders } from './BusinessOrders';
import { BusinessProcurement } from './BusinessProcurement';
import { BusinessCategories } from './BusinessCategories';
import { Navbar } from '../components/Navbar';

export const BusinessDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'categories' | 'orders' | 'procurement'>('inventory');
  
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  
  // Product Creation Fields
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [initialQuantity, setInitialQuantity] = useState(0);
  const [categoryId, setCategoryId] = useState('');

  const loadDashboardData = async () => {
    try {
      const [prodsRes, catsRes] = await Promise.all([
        ProductService.getAll(),
        CategoryService.getAll(),
      ]);
      setProducts(prodsRes.data);
      setCategories(catsRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'inventory') {
      loadDashboardData();
    }
  }, [activeTab]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ProductService.create({
        sku,
        name,
        price,
        initial_quantity: Number(initialQuantity),
        category_id: categoryId || null,
        status: 'ACTIVE',
      });
      setSku('');
      setName('');
      setPrice('');
      setInitialQuantity(0);
      setCategoryId('');
      loadDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create product');
    }
  };

  const handleStockAdjust = async (productId: string, delta: number) => {
    try {
      await InventoryService.adjust(productId, { quantity_delta: delta });
      loadDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to adjust stock');
    }
  };

  return (
    <div className="app-container">
      <Navbar title="Merchant Management Portal" />

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Catalog & Inventory
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Customer Orders
        </button>
        <button
          onClick={() => setActiveTab('procurement')}
          className={`btn ${activeTab === 'procurement' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Procurement & Restock
        </button>
      </div>

      {/* Tab Views */}
      {activeTab === 'categories' && <BusinessCategories />}
      {activeTab === 'orders' && <BusinessOrders />}
      {activeTab === 'procurement' && <BusinessProcurement />}

      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Add Product Form with Category Dropdown */}
          <section className="card">
            <h3 style={{ margin: '0 0 14px 0' }}>Add New Product</h3>
            <form onSubmit={handleCreateProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <input
                placeholder="SKU (e.g., TECH-001)"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
              />
              <input
                placeholder="Product Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                placeholder="Price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <input
                placeholder="Initial Stock Quantity"
                type="number"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(Number(e.target.value))}
                required
              />

              {/* Category Link */}
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">No Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ height: '100%' }}
              >
                Create Product
              </button>
            </form>
          </section>

          {/* Inventory Table */}
          <section className="card">
            <h3 style={{ margin: '0 0 14px 0' }}>Catalog Overview</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th style={{ textAlign: 'right' }}>Quick Adjust</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const categoryName = categories.find((c) => c.id === p.category_id)?.name || '—';

                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace' }}>{p.sku}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>
                        <span className="badge badge-subtle">{categoryName}</span>
                      </td>
                      <td>{parseFloat(p.price).toFixed(2)}</td>
                      <td>
                        <span className={`badge ${(p.available_stock ?? 0) > 0 ? 'badge-success' : 'badge-danger'}`}>
                          {p.available_stock ?? 0}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleStockAdjust(p.id, 5)}
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', marginRight: '6px' }}
                        >
                          +5
                        </button>
                        <button
                          onClick={() => handleStockAdjust(p.id, -1)}
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px' }}
                        >
                          -1
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
};