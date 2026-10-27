import React, { useEffect, useState } from 'react';
import type {
  SupplierResponse,
  PurchaseOrderResponse,
  PurchaseOrderStatus,
  ProductResponse,
} from '../types/api';
import {
  SupplierService,
  PurchaseOrderService,
  ProductService,
} from '../services/endpoints';

const PO_STATUSES: PurchaseOrderStatus[] = ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'];

export const BusinessProcurement: React.FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Supplier Form State
  const [suppName, setSuppName] = useState('');
  const [suppEmail, setSuppEmail] = useState('');
  const [suppPhone, setSuppPhone] = useState('');

  // PO Form State
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [orderQty, setOrderQty] = useState(10);
  const [unitCost, setUnitCost] = useState('10.00');

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [suppRes, poRes, prodRes] = await Promise.all([
        SupplierService.getAll(),
        PurchaseOrderService.getAll(),
        ProductService.getAll(),
      ]);
      setSuppliers(suppRes.data);
      setPurchaseOrders(poRes.data);
      setProducts(prodRes.data);
      if (suppRes.data.length > 0 && !selectedSupplier) {
        setSelectedSupplier(suppRes.data[0].id);
      }
      if (prodRes.data.length > 0 && !selectedProduct) {
        setSelectedProduct(prodRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load procurement data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await SupplierService.create({
        name: suppName,
        email: suppEmail || null,
        phone: suppPhone || null,
      });
      setSuppName('');
      setSuppEmail('');
      setSuppPhone('');
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create supplier.');
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !selectedProduct) {
      alert('Please select both a supplier and a product.');
      return;
    }

    try {
      await PurchaseOrderService.create({
        supplier_id: selectedSupplier,
        items: [
          {
            product_id: selectedProduct,
            quantity: Number(orderQty),
            unit_cost: unitCost,
          },
        ],
      });
      await loadData();
      alert('Purchase order created successfully.');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create purchase order.');
    }
  };

  const handleStatusUpdate = async (poId: string, status: PurchaseOrderStatus) => {
    setActionLoadingId(poId);
    try {
      await PurchaseOrderService.updateStatus(poId, { status });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update purchase order status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      {loading ? (
        <p>Loading procurement details...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Section 1: Suppliers Management */}
          <div>
            <h3 style={{ margin: '0 0 12px 0' }}>Register Supplier</h3>
            <form
              onSubmit={handleCreateSupplier}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                border: '1px solid #e5e7eb',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
              }}
            >
              <input
                placeholder="Supplier Company Name"
                value={suppName}
                onChange={(e) => setSuppName(e.target.value)}
                required
                style={{ padding: '8px' }}
              />
              <input
                placeholder="Contact Email"
                type="email"
                value={suppEmail}
                onChange={(e) => setSuppEmail(e.target.value)}
                style={{ padding: '8px' }}
              />
              <input
                placeholder="Phone Number"
                value={suppPhone}
                onChange={(e) => setSuppPhone(e.target.value)}
                style={{ padding: '8px' }}
              />
              <button
                type="submit"
                style={{
                  padding: '8px',
                  background: '#111827',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Save Supplier
              </button>
            </form>

            <h4>Registered Suppliers ({suppliers.length})</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '240px', overflowY: 'auto' }}>
              {suppliers.map((s) => (
                <li
                  key={s.id}
                  style={{
                    padding: '10px',
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <strong>{s.name}</strong>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {s.email || 'No email'} | {s.phone || 'No phone'}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>{s.id.slice(0, 8)}...</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 2: Create Purchase Order */}
          <div>
            <h3 style={{ margin: '0 0 12px 0' }}>Issue Purchase Order (Restock)</h3>
            <form
              onSubmit={handleCreatePO}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                border: '1px solid #e5e7eb',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
              }}
            >
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Supplier</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                style={{ padding: '8px' }}
                required
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <label style={{ fontSize: '13px', fontWeight: 600 }}>Target Product</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                style={{ padding: '8px' }}
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Units to Order</label>
                  <input
                    type="number"
                    min={1}
                    value={orderQty}
                    onChange={(e) => setOrderQty(Number(e.target.value))}
                    required
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Unit Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  padding: '8px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  marginTop: '6px',
                }}
              >
                Create Restock Order
              </button>
            </form>
          </div>

          {/* Section 3: Purchase Orders Ledger */}
          <div style={{ gridColumn: 'span 2', marginTop: '12px' }}>
            <h3>Purchase Orders Ledger</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
              <thead style={{ background: '#f9fafb', textAlign: 'left', fontSize: '13px' }}>
                <tr>
                  <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>PO Ref</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Supplier</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Total Cost</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  <th style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>Action</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '13px' }}>
                {purchaseOrders.map((po) => {
                  const supp = suppliers.find((s) => s.id === po.supplier_id);
                  return (
                    <tr key={po.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px', fontFamily: 'monospace' }}>{po.id.slice(0, 8)}...</td>
                      <td style={{ padding: '10px' }}>{supp ? supp.name : po.supplier_id.slice(0, 8)}</td>
                      <td style={{ padding: '10px', fontWeight: 600 }}>{parseFloat(po.total_amount).toFixed(2)}</td>
                      <td style={{ padding: '10px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: po.status === 'RECEIVED' ? '#dcfce7' : '#f3f4f6',
                            color: po.status === 'RECEIVED' ? '#15803d' : '#374151',
                          }}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <select
                          value={po.status}
                          disabled={actionLoadingId === po.id || po.status === 'RECEIVED'}
                          onChange={(e) => handleStatusUpdate(po.id, e.target.value as PurchaseOrderStatus)}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                        >
                          {PO_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              Mark {status}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};