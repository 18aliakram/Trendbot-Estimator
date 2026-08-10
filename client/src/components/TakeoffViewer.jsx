import React, { useState } from 'react';
import { Layers, HelpCircle, Save, Plus, Trash2, Edit2, AlertCircle, Eye } from 'lucide-react';

export default function TakeoffViewer({ projectId, takeoffItems, onUpdateItem, onDeleteItem, onAddItem, onProceedToPricing }) {
  const [editingId, setEditingId] = useState(null);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editQuantity, setEditQuantity] = useState(0);
  const [editUnit, setEditUnit] = useState('SF');
  const [editSheet, setEditSheet] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState(0);

  // Add item form state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Framing');
  const [newQuantity, setNewQuantity] = useState(0);
  const [newUnit, setNewUnit] = useState('SF');
  const [newSheet, setNewSheet] = useState('A-101');
  const [newNotes, setNewNotes] = useState('');
  const [newUnitPrice, setNewUnitPrice] = useState(0);

  // Drawing simulator active sheet state
  const [activeSheet, setActiveSheet] = useState('A-101');
  const [isBlueprintZoomed, setIsBlueprintZoomed] = useState(false);

  const categories = [
    'Concrete', 'Framing', 'Drywall', 'Insulation', 'Roofing',
    'Flooring', 'Painting', 'Doors & Windows', 'Cabinets',
    'Electrical', 'Plumbing', 'HVAC', 'Sitework', 'General Conditions'
  ];

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditQuantity(item.quantity);
    setEditUnit(item.unit);
    setEditSheet(item.sheet || 'A-101');
    setEditNotes(item.notes || '');
    setEditUnitPrice(item.unitPrice || 0);
    setActiveSheet(item.sheet || 'A-101');
  };

  const handleSaveEdit = (id) => {
    onUpdateItem(id, {
      name: editName,
      category: editCategory,
      quantity: Number(editQuantity),
      unit: editUnit,
      sheet: editSheet,
      notes: editNotes,
      unitPrice: Number(editUnitPrice)
    });
    setEditingId(null);
  };

  const handleApproveItem = (id) => {
    onUpdateItem(id, { status: 'Contractor Approved' });
  };

  const handleAddItemSubmit = (e) => {
    e.preventDefault();
    if (!newName || newQuantity <= 0) return;
    onAddItem({
      name: newName,
      category: newCategory,
      quantity: Number(newQuantity),
      unit: newUnit,
      sheet: newSheet,
      notes: newNotes,
      unitPrice: Number(newUnitPrice)
    });
    setIsAdding(false);
    // Reset add form
    setNewName('');
    setNewQuantity(0);
    setNewNotes('');
    setNewUnitPrice(0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'AI Detected':
        return <span className="badge badge-draft">AI Detected</span>;
      case 'Review Required':
        return <span className="badge badge-review">Review Required</span>;
      case 'Contractor Approved':
        return <span className="badge badge-ready">Approved</span>;
      case 'Contractor Edited':
        return <span className="badge badge-approved" style={{ backgroundColor: '#bfdbfe', color: '#1e40af' }}>Edited</span>;
      default:
        return <span className="badge badge-draft">{status}</span>;
    }
  };

  // Simulated visual blueprints for sheets
  const renderBlueprintMockup = () => {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0f172a',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#38bdf8',
        padding: '20px',
        border: '1px solid #334155',
        overflow: 'hidden'
      }}>
        {/* Grid Overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'linear-gradient(rgba(56, 189, 248, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.07) 1px, transparent 1px)',
          backgroundSize: '20px 20px', pointerEvents: 'none'
        }}></div>

        {/* Blueprint drawings details based on sheet code */}
        <div style={{
          zIndex: 1, textAlign: 'center',
          transform: isBlueprintZoomed ? 'scale(1.4)' : 'scale(1)',
          transition: 'transform 0.3s ease'
        }}>
          <h2 style={{ color: '#0ea5e9', fontSize: '18px', marginBottom: '12px' }}>
            {activeSheet} — ARCHITECTURAL DRAWING
          </h2>
          
          {activeSheet === 'S-101' ? (
            <div style={{ width: '220px', height: '140px', border: '2px solid #38bdf8', borderRadius: '4px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <span style={{ fontSize: '11px', position: 'absolute', top: '10px' }}>CONCRETE FOOTING DETAILS</span>
              <div style={{ width: '180px', height: '100px', border: '1px dashed #38bdf8', margin: '20px auto 0' }}></div>
              <span style={{ fontSize: '10px', position: 'absolute', bottom: '5px' }}>Grid 4000 PSI / Slab Thk: 4"</span>
            </div>
          ) : activeSheet === 'A-102' ? (
            <div style={{ width: '200px', height: '150px', border: '2px solid #38bdf8', borderRadius: '4px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', contentVisibility: 'auto' }}>
              <div style={{ width: '100px', height: '75px', border: '1px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>Bed 1</div>
              <div style={{ width: '100px', height: '75px', border: '1px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>Bath</div>
              <div style={{ width: '200px', height: '75px', border: '1px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>Living / Kitchen</div>
            </div>
          ) : activeSheet === 'A-103' ? (
            <div style={{ width: '200px', height: '120px', border: '2px solid #38bdf8', margin: '0 auto', position: 'relative' }}>
              <span style={{ fontSize: '10px', position: 'absolute', left: '10px', top: '40px' }}>DRYWALL AREAS: 2,200 SF</span>
              <div style={{ width: '4px', height: '100%', backgroundColor: '#38bdf8', position: 'absolute', left: '120px' }}></div>
            </div>
          ) : (
            <div style={{ width: '180px', height: '130px', border: '2px solid #38bdf8', borderRadius: '8px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={36} style={{ opacity: 0.5 }} />
            </div>
          )}
          
          <p style={{ fontSize: '11px', color: '#0284c7', marginTop: '16px' }}>
            Scale: 1/4" = 1'-0" | San Jose Residential Code v2026
          </p>
        </div>

        {/* Blueprint Control Bar */}
        <div style={{
          position: 'absolute', bottom: '10px', left: '10px', right: '10px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2
        }}>
          <span style={{ color: 'white', fontSize: '11px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px' }}>
            Sheet: {activeSheet}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsBlueprintZoomed(!isBlueprintZoomed)}
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '4px 8px' }}
          >
            <Eye size={12} /> {isBlueprintZoomed ? 'Zoom Out' : 'Zoom In'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="header-bar" style={{ marginBottom: '16px' }}>
        <div className="header-title-section">
          <h1>Quantity Takeoff Review</h1>
          <p>Verify quantities extracted by the AI from your drawings before checking prices.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => setIsAdding(true)}>
            <Plus size={16} /> Add Item Manually
          </button>
          <button className="btn btn-primary" onClick={onProceedToPricing}>
            Proceed to Estimate Pricing
          </button>
        </div>
      </div>

      <div className="split-pane">
        {/* Plan sheet viewer mockup */}
        <div className="pane-left">
          <div className="pane-header">
            <h3>Blueprint Sheet Viewer</h3>
            <select
              className="form-control"
              style={{ width: '120px', padding: '4px 8px', fontSize: '13px' }}
              value={activeSheet}
              onChange={(e) => setActiveSheet(e.target.value)}
            >
              <option value="S-101">S-101 (Concrete)</option>
              <option value="A-102">A-102 (Framing)</option>
              <option value="A-103">A-103 (Drywall)</option>
              <option value="A-104">A-104 (Roofing)</option>
              <option value="A-105">A-105 (Windows)</option>
              <option value="A-106">A-106 (Cabinets)</option>
              <option value="E-101">E-101 (Electrical)</option>
              <option value="P-101">P-101 (Plumbing)</option>
              <option value="M-101">M-101 (HVAC)</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            {renderBlueprintMockup()}
          </div>
        </div>

        {/* Takeoff items grid */}
        <div className="pane-right" style={{ flex: 1.5 }}>
          <div className="pane-header">
            <h3>Extracted Quantities ({takeoffItems.length} items)</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Check missing prices indicated in red.
            </span>
          </div>

          <div className="pane-body" style={{ padding: 0 }}>
            {takeoffItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                <Layers size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <h3>No takeoff data</h3>
                <p>Run plan analysis to extract drawing details.</p>
              </div>
            ) : (
              <div className="table-container" style={{ border: 'none', borderRadius: 0, marginTop: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Item Description</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Sheet</th>
                      <th>Confidence</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {takeoffItems.map((item) => {
                      const isEditing = editingId === item.id;
                      const isPriceMissing = Number(item.unitPrice) === 0;

                      return (
                        <tr key={item.id} style={{
                          backgroundColor: isEditing ? '#fffbeb' : isPriceMissing ? '#fff5f5' : 'inherit'
                        }}>
                          {isEditing ? (
                            // Editing Form Fields
                            <td colSpan={6} style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <input
                                    type="text"
                                    className="form-control"
                                    style={{ flex: 2 }}
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Item name"
                                  />
                                  <select
                                    className="form-control"
                                    style={{ flex: 1 }}
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                  >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <input
                                    type="number"
                                    className="form-control"
                                    style={{ width: '90px' }}
                                    value={editQuantity}
                                    onChange={(e) => setEditQuantity(e.target.value)}
                                    placeholder="Qty"
                                  />
                                  <input
                                    type="text"
                                    className="form-control"
                                    style={{ width: '70px' }}
                                    value={editUnit}
                                    onChange={(e) => setEditUnit(e.target.value)}
                                    placeholder="Unit"
                                  />
                                  <input
                                    type="text"
                                    className="form-control"
                                    style={{ width: '80px' }}
                                    value={editSheet}
                                    onChange={(e) => setEditSheet(e.target.value)}
                                    placeholder="Sheet"
                                  />
                                  <input
                                    type="number"
                                    className="form-control"
                                    style={{ flex: 1 }}
                                    value={editUnitPrice}
                                    onChange={(e) => setEditUnitPrice(e.target.value)}
                                    placeholder="Price Override ($)"
                                  />
                                </div>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Takeoff rationale/notes"
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                />
                              </div>
                            </td>
                          ) : (
                            // Default display row
                            <>
                              <td>
                                <div style={{ fontWeight: '600' }}>{item.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {item.category} • {item.notes || 'No notes'}
                                </div>
                                {isPriceMissing && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'red', fontSize: '11px', marginTop: '2px', fontWeight: '500' }}>
                                    <AlertCircle size={10} />
                                    No database price matches this item.
                                  </div>
                                )}
                              </td>
                              <td style={{ fontWeight: '700' }}>{item.quantity.toLocaleString()}</td>
                              <td>{item.unit}</td>
                              <td>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '2px 6px', fontSize: '11px', display: 'flex', gap: '2px', alignItems: 'center' }}
                                  onClick={() => setActiveSheet(item.sheet || 'A-101')}
                                >
                                  <Eye size={10} /> {item.sheet || 'A-101'}
                                </button>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: '500' }}>{Math.round((item.confidence || 0.90) * 100)}%</span>
                                  <div style={{ width: '40px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                                    <div style={{
                                      width: `${(item.confidence || 0.9) * 100}%`, height: '100%',
                                      backgroundColor: (item.confidence || 0.90) < 0.90 ? 'var(--color-review)' : 'var(--color-ready)'
                                    }}></div>
                                  </div>
                                </div>
                              </td>
                              <td>{getStatusBadge(item.status)}</td>
                            </>
                          )}

                          <td style={{ textAlign: 'right' }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(item.id)}>
                                  <Save size={12} />
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                {item.status !== 'Contractor Approved' && item.status !== 'Contractor Edited' && (
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleApproveItem(item.id)}
                                    title="Approve quantity"
                                    style={{ color: 'var(--color-ready)' }}
                                  >
                                    Approve
                                  </button>
                                )}
                                <button className="btn btn-secondary btn-sm" onClick={() => handleEditClick(item)}>
                                  <Edit2 size={12} />
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => onDeleteItem(item.id)}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Item Add Modal */}
      {isAdding && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleAddItemSubmit}>
              <div className="modal-header">
                <h3>Add Takeoff Item Manually</h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAdding(false)}>X</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Item Name*</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., 2x4x8 Lumber Stud"
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
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Sheet Source</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. A-102"
                      value={newSheet}
                      onChange={(e) => setNewSheet(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity*</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      min="0.01"
                      step="any"
                      required
                    />
                  </div>
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
                    <label>Price Override ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0.00"
                      value={newUnitPrice}
                      onChange={(e) => setNewUnitPrice(e.target.value)}
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    className="form-control"
                    placeholder="Provide context or explanation for this takeoff line..."
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
