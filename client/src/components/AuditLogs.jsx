import React, { useState, useEffect } from 'react';
import { Shield, Clock, User, Award } from 'lucide-react';
import { api } from '../api';

export default function AuditLogs({ onToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
      onToast('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATE_PROJECT':
        return <span className="badge badge-ready" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>Project Created</span>;
      case 'AI_ANALYSIS_COMPLETE':
        return <span className="badge badge-source">AI Takeoff</span>;
      case 'UPDATE_TAKEOFF_ITEM':
        return <span className="badge badge-review">Takeoff Edit</span>;
      case 'UPDATE_ESTIMATE_SETTINGS':
        return <span className="badge badge-draft" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>Margins Update</span>;
      case 'APPROVE_ESTIMATE':
        return <span className="badge badge-approved">Bid Approved</span>;
      case 'UPDATE_PRICING_ITEM':
        return <span className="badge badge-review" style={{ backgroundColor: '#ede9fe', color: '#6d28d9' }}>Price Catalog Edit</span>;
      default:
        return <span className="badge badge-draft">{action}</span>;
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>Contractor Audit Trail</h1>
          <p>Traceability log showing all human overrides, pricing changes, and approval events for estimate credibility.</p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} style={{ color: 'var(--primary)' }} /> Relational Change Log History
        </h3>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '24px' }}>Loading audit logs...</p>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <Clock size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <h3>No audit records</h3>
            <p>Edits and price overrides will register logs automatically.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Contractor</th>
                  <th>Action</th>
                  <th>Change Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500' }}>
                        <User size={13} style={{ color: 'var(--text-muted)' }} />
                        {log.username}
                      </div>
                    </td>
                    <td>{getActionBadge(log.action)}</td>
                    <td>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>{log.reason}</div>
                      {log.oldValue && log.newValue && (
                        <div style={{
                          fontSize: '11px', color: 'var(--text-muted)',
                          fontFamily: 'monospace', marginTop: '4px',
                          backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '4px'
                        }}>
                          Diff registered: Values updated
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
