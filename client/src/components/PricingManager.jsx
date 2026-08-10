import React, { useState, useEffect } from 'react';
import { Search, Filter, Edit, Plus, BookOpen, Clock, AlertTriangle } from 'lucide-react';
import { api } from '../api';

export default function PricingManager({ onToast }) {
  const [pricingItems, setPricingItems] = useState([]);
  const [laborRates, setLaborRates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' or 'labor'
  const [loading, setLoading] = useState(false);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editNote, setEditNote] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editType, setEditType] = useState('Material');

  // Pricing History Modal State
  const [historyItem, setHistoryItem] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);

  // Add Catalog Item State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Framing');
  const [newUnit, setNewUnit] = useState('SF');
  const [newPrice, setNewPrice] = useState(0);
  const [newType, setNewType] = useState('Material');
  const [newNotes, setNewNotes] = useState('');

  const categories = [
    'All', 'Concrete', 'Framing', 'Drywall', 'Insulation', 'Roofing',
    'Flooring', 'Painting', 'Doors & Windows', 'Cabinets',
    'Electrical', 'Plumbing', 'HVAC', 'Sitework', 'General Conditions'
  ];

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const items = await api.getPricing();
      const labor = await api.getLaborRates();
      setPricingItems(items);
      setLaborRates(labor);
    } catch (err) {
      console.error(err);
      onToast('Failed to load pricing database.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setEditPrice(item.price);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditUnit(item.unit);
    setEditType(item.type || 'Material');
    setEditNote('');
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      await api.updatePricingItem(editingItem.id, {
        name: editName,
        category: editCategory,
        unit: editUnit,
        type: editType,
        price: Number(editPrice),
        historyNote: editNote || 'Price manually adjusted in Catalog'
      });
      setEditingItem(null);
      onToast('Pricing item updated successfully!');
      fetchPricing();
    } catch (err) {
      console.error(err);
      onToast('Failed to save price.');
    }
  };

  const handleViewHistory = async (item) => {
    setHistoryItem(item);
    try {
      const logs = await api.getPricingHistory(item.id);
      setHistoryLogs(logs);
    } catch (err) {
      console.error(err);
      onToast('Failed to fetch pricing logs.');
    }
  };

  const handleUpdateLaborRate = async (rateId, newRate) => {
    try {
      await api.updateLaborRate(rateId, Number(newRate));
      onToast('Labor rate updated successfully!');
      fetchPricing();
    } catch (err) {
      console.error(err);
      onToast('Failed to update labor rate.');
    }
  };

  const handleAddItemSubmit = async (e) => {
    e.preventDefault();
    if (!newName || newPrice <= 0) return;

    try {
      await api.createPricingItem({
        name: newName,
        category: newCategory,
        type: newType,
        unit: newUnit,
        price: Number(newPrice),
        notes: newNotes || 'Starter Pricing — Verify Before Use'
      });
      setIsAdding(false);
      onToast('Added new item to catalog.');
      fetchPricing();
      // Reset fields
      setNewName('');
      setNewPrice(0);
      setNewNotes('');
    } catch (err) {
      console.error(err);
      onToast('Failed to create catalog item.');
    }
  };

  // Filtering calculations
  const filteredPricing = pricingItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>Company Pricing Catalog</h1>
          <p>Manage unit material costs, equipment charges, and subcontract parameters.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
          <Plus size={16} /> Add Catalog Item
        </button>
      </div>

      {/* Seed Starter Warning Alert */}
      <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center' }}>
        <AlertTriangle size={24} style={{ flexShrink: 0 }} />
        <div>
          <strong>Starter Pricing Notice:</strong> Starter database costs represent general San Jose/Northern California contractor parameters. Always review regional material and labor rates before submitting binding legal estimates.
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-light)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('materials')}
          style={{
            padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '15px', fontWeight: '600',
            color: activeTab === 'materials' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'materials' ? '3px solid var(--primary)' : '3px solid transparent',
            fontFamily: 'var(--font-heading)'
          }}
        >
          Material & Equipment Catalog
        </button>
        <button
          onClick={() => setActiveTab('labor')}
          style={{
            padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '15px', fontWeight: '600',
            color: activeTab === 'labor' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'labor' ? '3px solid var(--primary)' : '3px solid transparent',
            fontFamily: 'var(--font-heading)'
          }}
        >
          Labor Hourly Rates
        </button>
      </div>

      {activeTab === 'materials' ? (
        <div>
          {/* Controls Bar */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '40px' }}
                placeholder="Search materials, equipment, site items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Category selection */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={18} style={{ color: 'var(--text-muted)' }} />
              <select
                className="form-control"
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                style={{ width: '180px' }}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px' }}>Loading pricing catalog...</div>
            ) : filteredPricing.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <h3>No pricing items match your query</h3>
                <p>Try searching for general keywords or reset the category filter.</p>
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none', margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Catalog Name</th>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Unit</th>
                      <th>Current Price</th>
                      <th>Last Updated</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPricing.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: '600' }}>{item.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {item.notes || 'Starter catalog pricing'}
                          </div>
                        </td>
                        <td>{item.category}</td>
                        <td>
                          <span className="badge badge-source" style={{
                            backgroundColor: item.type === 'Equipment' ? '#fef3c7' : item.type === 'Labor' ? '#dbeafe' : '#f3e8ff',
                            color: item.type === 'Equipment' ? '#92400e' : item.type === 'Labor' ? '#1e40af' : '#6b21a8'
                          }}>
                            {item.type || 'Material'}
                          </span>
                        </td>
                        <td>{item.unit}</td>
                        <td style={{ fontWeight: '700' }}>${item.price.toFixed(2)}</td>
                        <td>{item.lastUpdated || 'Aug 10, 2026'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleViewHistory(item)}
                              title="View Price Edit Logs"
                            >
                              <Clock size={13} /> History
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleEditClick(item)}
                            >
                              <Edit size={13} /> Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Hourly Builder Rates</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Set standard internal hourly wage estimates. Productive direct costs use these values as baselines.
          </p>

          <div className="table-container" style={{ marginTop: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Labor Role</th>
                  <th>Hourly Rate (USD)</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {laborRates.map((role) => (
                  <tr key={role.id}>
                    <td style={{ fontWeight: '600' }}>{role.role}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>$</span>
                        <input
                          type="number"
                          className="form-control"
                          style={{ width: '100px', padding: '6px 10px' }}
                          value={role.rate}
                          onChange={(e) => handleUpdateLaborRate(role.id, e.target.value)}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ hr</span>
                      </div>
                    </td>
                    <td>{role.lastUpdated || 'Aug 10, 2026'}</td>
                    <td>
                      <span className="badge badge-ready" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-hover)' }}>
                        Verified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Catalog Price Modal */}
      {editingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleSavePrice}>
              <div className="modal-header">
                <h3>Edit Catalog Item</h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingItem(null)}>X</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Item Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      className="form-control"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                    >
                      {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      className="form-control"
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                    >
                      <option value="Material">Material</option>
                      <option value="Labor">Labor</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Subcontractor">Subcontractor</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Unit</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit Price ($ USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Change Log / Update Note</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Supplier bulk quote increase"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Price</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Log Modal */}
      {historyItem && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Pricing Change Log</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setHistoryItem(null)}>X</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px' }}>
              <div style={{ marginBottom: '16px' }}>
                <strong>{historyItem.name}</strong>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Catalog history of price updates</p>
              </div>

              {historyLogs.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No logs found for this item.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {historyLogs.map((log) => (
                    <div key={log.id} style={{
                      borderLeft: '3px solid var(--primary)',
                      paddingLeft: '12px',
                      fontSize: '13px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                        <span>
                          {log.oldPrice !== null ? `$${log.oldPrice.toFixed(2)} → ` : ''}
                          ${log.newPrice.toFixed(2)} / {historyItem.unit}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>
                          {new Date(log.changedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 2px', color: 'var(--text-dark)' }}>{log.note}</p>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Modified by: {log.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setHistoryItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Catalog Item Modal */}
      {isAdding && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleAddItemSubmit}>
              <div className="modal-header">
                <h3>Add New Catalog Item</h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAdding(false)}>X</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Item Name*</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 5/8 inch Sheetrock Panel"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      className="form-control"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    >
                      {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      className="form-control"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                    >
                      <option value="Material">Material</option>
                      <option value="Labor">Labor</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Subcontractor">Subcontractor</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Unit*</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="SF, LF, CY, EA"
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Standard Price ($ USD)*</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Supplier Catalog Notes</label>
                  <textarea
                    className="form-control"
                    placeholder="e.g., Home Depot local price index"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
