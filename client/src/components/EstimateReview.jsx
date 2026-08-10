import React, { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle2, ChevronRight, MessageSquare, AlertTriangle, AlertCircle, Bookmark, RefreshCw } from 'lucide-react';
import { api } from '../api';

export default function EstimateReview({ projectId, project, onToast, onBackToTakeoff, onEstimateStatusChanged }) {
  const [estimate, setEstimate] = useState(null);
  const [takeoffItems, setTakeoffItems] = useState([]);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  
  // Margins settings edit state
  const [wastePercent, setWastePercent] = useState(8);
  const [overheadPercent, setOverheadPercent] = useState(10);
  const [contingencyPercent, setContingencyPercent] = useState(5);
  const [profitPercent, setProfitPercent] = useState(12);

  // Checklists for final approval
  const [checkQuantities, setCheckQuantities] = useState(false);
  const [checkPricing, setCheckPricing] = useState(false);
  const [checkMargins, setCheckMargins] = useState(false);
  const [checkLabor, setCheckLabor] = useState(false);

  // Version note state
  const [versionNote, setVersionNote] = useState('');
  const [showVersionModal, setShowVersionModal] = useState(false);

  // AI Explanation State
  const [aiExplanation, setAiExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    fetchEstimateDetails();
  }, [projectId]);

  const fetchEstimateDetails = async () => {
    setLoading(true);
    try {
      const takeoff = await api.getTakeoff(projectId);
      const est = await api.getEstimate(projectId);
      const vers = await api.getEstimateVersions(projectId);

      setTakeoffItems(takeoff);
      setEstimate(est);
      setVersions(vers);

      // Populate settings fields
      if (est.settings) {
        setWastePercent(est.settings.wastePercent);
        setOverheadPercent(est.settings.overheadPercent);
        setContingencyPercent(est.settings.contingencyPercent);
        setProfitPercent(est.settings.profitPercent);
      }
    } catch (err) {
      console.error(err);
      onToast('Failed to load estimate metrics.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMargins = async () => {
    try {
      await api.updateEstimateSettings(projectId, {
        wastePercent: Number(wastePercent),
        overheadPercent: Number(overheadPercent),
        contingencyPercent: Number(contingencyPercent),
        profitPercent: Number(profitPercent)
      });
      onToast('Margin values updated. Recalculating estimate totals...');
      fetchEstimateDetails();
    } catch (err) {
      console.error(err);
      onToast('Failed to save settings.');
    }
  };

  const handleSaveVersion = async (e) => {
    e.preventDefault();
    setSavingVersion(true);
    try {
      await api.saveEstimateVersion(projectId, versionNote || 'Estimate revision saved');
      setVersionNote('');
      setShowVersionModal(false);
      onToast('Estimate revision saved successfully.');
      fetchEstimateDetails();
    } catch (err) {
      console.error(err);
      onToast('Failed to save version.');
    } finally {
      setSavingVersion(false);
    }
  };

  const handleApproveEstimate = async () => {
    if (!checkQuantities || !checkPricing || !checkMargins || !checkLabor) {
      onToast('Please verify and check all checklist review items before approving.');
      return;
    }

    try {
      const res = await api.approveEstimate(projectId);
      onToast('Estimate Approved! Ready to export.');
      onEstimateStatusChanged();
      fetchEstimateDetails();
    } catch (err) {
      console.error(err);
      onToast('Failed to approve estimate.');
    }
  };

  const handleExplainEstimate = async () => {
    setExplaining(true);
    setAiExplanation('');
    try {
      const res = await api.explainEstimate(projectId);
      setAiExplanation(res.explanation);
    } catch (err) {
      console.error(err);
      setAiExplanation('We couldn\'t compile the estimate explanation at this time. Verify PDF is readable.');
    } finally {
      setExplaining(false);
    }
  };

  const handleDownloadPDF = () => {
    // Navigate browser to download endpoint directly
    const token = localStorage.getItem('token');
    window.open(`/api/projects/${projectId}/pdf?token=${token}`, '_blank');
    onToast('Exporting Estimate PDF...');
  };

  const handleExportCSV = () => {
    // Generate CSV string on client side
    let csv = 'Category,Item,Quantity,Unit,Material/Labor Unit Cost ($),Waste (%),Total Line Cost ($),Notes\n';
    
    takeoffItems.forEach(item => {
      const waste = item.category === 'Concrete' || item.category === 'Framing' || item.category === 'Drywall' ? 8 : 0;
      const total = (item.quantity * item.unitPrice) * (1 + waste / 100);
      csv += `"${item.category}","${item.name}",${item.quantity},"${item.unit}",${item.unitPrice},${waste},${total.toFixed(2)},"${item.notes || ''}"\n`;
    });

    // Add summary costs
    csv += '\n';
    csv += `,,,,,Direct Subtotal,${estimate?.subtotal.toFixed(2)}\n`;
    csv += `,,,,,Waste Allowance,${estimate?.wasteAmount.toFixed(2)}\n`;
    csv += `,,,,,Overhead,${estimate?.overheadAmount.toFixed(2)}\n`;
    csv += `,,,,,Contingency,${estimate?.contingencyAmount.toFixed(2)}\n`;
    csv += `,,,,,Profit markup,${estimate?.profitAmount.toFixed(2)}\n`;
    csv += `,,,,,Final Bid Total,${estimate?.total.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `estimate-${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast('Exporting Estimate CSV...');
  };

  if (!estimate) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading project calculations...</div>;
  }

  // Count items needing check
  const lowConfidenceCount = takeoffItems.filter(t => t.confidence < 0.90).length;
  const missingPricingCount = estimate.pricingMissingCount || 0;

  return (
    <div>
      {/* Upper header summary */}
      <div className="header-bar">
        <div className="header-title-section">
          <h1>Estimate Summary & Bids</h1>
          <p>Review subtotal direct costs, apply company overhead percentages, and download customer bids.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={onBackToTakeoff}>
            Back to Takeoff Review
          </button>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            Export Excel/CSV
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPDF}>
            <Download size={16} /> Download Client PDF Bid
          </button>
        </div>
      </div>

      <div className="split-pane">
        {/* Cost breakdown cards */}
        <div className="pane-left">
          <div className="pane-header">
            <h3>Calculated Bid Metrics</h3>
            {estimate.status === 'Approved' ? (
              <span className="badge badge-approved">Approved Estimate</span>
            ) : (
              <span className="badge badge-draft">Draft Mode</span>
            )}
          </div>
          <div className="pane-body">
            
            {/* Risk Warnings Checklist */}
            {(lowConfidenceCount > 0 || missingPricingCount > 0) && (
              <div className="alert alert-danger" style={{ marginBottom: '24px' }}>
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Attention Review Required:</strong>
                  <ul style={{ paddingLeft: '20px', fontSize: '13px', marginTop: '4px' }}>
                    {missingPricingCount > 0 && <li>⚠️ {missingPricingCount} item(s) are missing database pricing values. Costs are currently $0.00.</li>}
                    {lowConfidenceCount > 0 && <li>⚠️ {lowConfidenceCount} item(s) have low AI detection confidence scores.</li>}
                  </ul>
                </div>
              </div>
            )}

            {/* Direct Costs Section */}
            <h4 style={{ marginBottom: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
              Direct Builder Cost Subtotal
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>Material costs subtotal</span>
                <strong>${estimate.materialSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>Labor costs subtotal</span>
                <strong>${estimate.laborSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>Subcontractors cost subtotal</span>
                <strong>${estimate.subcontractorSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>Equipment & other costs subtotal</span>
                <strong>${estimate.equipmentSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px dashed var(--border-light)', paddingTop: '8px', fontWeight: '600' }}>
                <span>Direct Sum</span>
                <span>${estimate.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Markup details */}
            <h4 style={{ marginBottom: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '6px' }}>
              Waste & Builder Markups
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', alignItems: 'center' }}>
                <span>Material Waste Factor ({estimate.wastePercent}%)</span>
                <strong>${estimate.wasteAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', alignItems: 'center' }}>
                <span>Company Overhead ({estimate.settings.overheadPercent}%)</span>
                <strong>${estimate.overheadAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', alignItems: 'center' }}>
                <span>Project Contingency ({estimate.settings.contingencyPercent}%)</span>
                <strong>${estimate.contingencyAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', alignItems: 'center' }}>
                <span>Target Net Profit Margin ({estimate.settings.profitPercent}%)</span>
                <strong>${estimate.profitAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>

              {/* Total final box */}
              <div style={{
                backgroundColor: 'var(--primary-light)',
                border: '1px solid var(--primary)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginTop: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--primary-hover)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Proposed Bid Total (USD)
                  </span>
                  <h2 style={{ fontSize: '32px', color: 'var(--text-dark)', fontWeight: '800', marginTop: '4px' }}>
                    ${estimate.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button className="btn btn-primary" onClick={() => setShowVersionModal(true)}>
                    Save Revision Version
                  </button>
                </div>
              </div>
            </div>

            {/* AI Explanation tool */}
            <div style={{ marginTop: '24px' }}>
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
                onClick={handleExplainEstimate}
                disabled={explaining}
              >
                <MessageSquare size={16} /> 
                {explaining ? 'AI Estimator writing explanation...' : 'AI Explain Estimate & Sheet Sources'}
              </button>

              {aiExplanation && (
                <div className="card" style={{
                  marginTop: '16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-light)',
                  padding: '20px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {aiExplanation}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pricing setting form & checklist */}
        <div className="pane-right">
          <div className="pane-header">
            <h3>Estimator Control Panel</h3>
          </div>
          <div className="pane-body">
            
            {/* Margin adjustments */}
            <div className="card" style={{ padding: '20px', marginBottom: '24px', boxShadow: 'none', border: '1px solid var(--border-light)' }}>
              <h4 style={{ marginBottom: '16px' }}>Adjust Markup Margin settings</h4>
              
              <div className="form-group">
                <label>Material Waste %</label>
                <input
                  type="number"
                  className="form-control"
                  value={wastePercent}
                  onChange={(e) => setWastePercent(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Overhead %</label>
                <input
                  type="number"
                  className="form-control"
                  value={overheadPercent}
                  onChange={(e) => setOverheadPercent(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Contingency %</label>
                <input
                  type="number"
                  className="form-control"
                  value={contingencyPercent}
                  onChange={(e) => setContingencyPercent(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Profit Target %</label>
                <input
                  type="number"
                  className="form-control"
                  value={profitPercent}
                  onChange={(e) => setProfitPercent(e.target.value)}
                />
              </div>

              <button className="btn btn-secondary btn-sm" onClick={handleUpdateMargins} style={{ width: '100%', marginTop: '8px' }}>
                Apply margins & Recalculate
              </button>
            </div>

            {/* Checklist review */}
            <div className="card" style={{ padding: '20px', marginBottom: '24px', boxShadow: 'none', border: '1px solid var(--border-light)' }}>
              <h4 style={{ marginBottom: '16px' }}>Final Approval Checklist</h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                  <input
                    type="checkbox"
                    checked={checkQuantities}
                    onChange={(e) => setCheckQuantities(e.target.checked)}
                  />
                  I have reviewed all AI-extracted quantities.
                </label>
                <label style={{ display: 'flex', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                  <input
                    type="checkbox"
                    checked={checkPricing}
                    onChange={(e) => setCheckPricing(e.target.checked)}
                  />
                  Pricing database unit costs have been verified.
                </label>
                <label style={{ display: 'flex', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                  <input
                    type="checkbox"
                    checked={checkLabor}
                    onChange={(e) => setCheckLabor(e.target.checked)}
                  />
                  Productivity or hourly labor rates align with scope.
                </label>
                <label style={{ display: 'flex', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                  <input
                    type="checkbox"
                    checked={checkMargins}
                    onChange={(e) => setCheckMargins(e.target.checked)}
                  />
                  Overhead, waste, and markup targets are applied correctly.
                </label>
              </div>

              {estimate.status !== 'Approved' ? (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}
                  onClick={handleApproveEstimate}
                >
                  <CheckCircle2 size={16} /> Approve & Lock Estimate
                </button>
              ) : (
                <div style={{
                  marginTop: '16px', padding: '12px',
                  backgroundColor: '#e6fffa', border: '1px solid #319795',
                  color: '#234e52', borderRadius: 'var(--radius-md)',
                  textAlign: 'center', fontWeight: '600', fontSize: '13px'
                }}>
                  ✓ Approved & Signed by Contractor
                </div>
              )}
            </div>

            {/* Version List revisions */}
            <div>
              <h4 style={{ marginBottom: '12px' }}>Estimate Version History</h4>
              {versions.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No saved versions yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {versions.map((ver) => (
                    <div key={ver.id} style={{
                      backgroundColor: 'var(--bg-main)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px'
                    }}>
                      <div>
                        <strong>{ver.version}</strong>
                        <div style={{ color: 'var(--text-muted)' }}>{ver.note}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {new Date(ver.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ fontWeight: '700', color: 'var(--text-dark)' }}>
                        {ver.total ? `$${ver.total.toLocaleString()}` : 'Plan uploaded'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Save Version Modal */}
      {showVersionModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <form onSubmit={handleSaveVersion}>
              <div className="modal-header">
                <h3>Save Estimate Version</h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowVersionModal(false)}>X</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Version Notes / Rationale</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Added grading items, adjusted framing profit"
                    value={versionNote}
                    onChange={(e) => setVersionNote(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowVersionModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingVersion}>
                  {savingVersion ? 'Saving...' : 'Save Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
