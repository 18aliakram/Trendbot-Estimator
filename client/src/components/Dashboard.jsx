import React from 'react';
import { Briefcase, FilePlus2, FileEdit, CheckCircle2, DollarSign, Calendar, MapPin, ArrowRight } from 'lucide-react';

export default function Dashboard({ projects, onSelectProject, onCreateProjectClick, onViewPricing }) {
  // Compute KPI values
  const activeProjects = projects.filter(p => p.status !== 'Approved');
  const estimatesInProgress = projects.filter(p => ['Analyzing', 'Review Required'].includes(p.status));
  const estimatesCompleted = projects.filter(p => p.status === 'Approved');
  const totalValue = projects
    .filter(p => p.estimateTotal)
    .reduce((sum, p) => sum + p.estimateTotal, 0);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Draft':
        return <span className="badge badge-draft">Draft</span>;
      case 'Analyzing':
        return <span className="badge badge-analyzing">Analyzing</span>;
      case 'Review Required':
        return <span className="badge badge-review">Review Required</span>;
      case 'Ready for Approval':
      case 'Ready':
        return <span className="badge badge-ready">Ready for Approval</span>;
      case 'Approved':
        return <span className="badge badge-approved">Approved</span>;
      default:
        return <span className="badge badge-draft">{status}</span>;
    }
  };

  return (
    <div>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>Good morning, Builder</h1>
          <p>Here's what's happening with your projects in the San Jose area.</p>
        </div>
        <button className="btn btn-primary" onClick={onCreateProjectClick}>
          <FilePlus2 size={18} />
          + New Project
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-title">Active Projects</div>
          <div className="stat-card-value">{activeProjects.length}</div>
          <div className="stat-card-footer">In structural design or pricing review</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">Estimates in Progress</div>
          <div className="stat-card-value">{estimatesInProgress.length}</div>
          <div className="stat-card-footer">Pending plan takeoff analysis</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">Approved Estimates</div>
          <div className="stat-card-value">{estimatesCompleted.length}</div>
          <div className="stat-card-footer">Signed contracts / Ready to build</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-title">Total Estimated Value</div>
          <div className="stat-card-value" style={{ color: 'var(--primary)' }}>
            ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <div className="stat-card-footer">Calculated from approved items</div>
        </div>
      </div>

      {/* Recent Projects Table */}
      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Recent Estimates & Bids</span>
          <button className="btn btn-secondary btn-sm" onClick={onCreateProjectClick}>View All</button>
        </div>

        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <Briefcase size={48} style={{ margin: '0 auto 16px', color: 'var(--border-hover)' }} />
            <h3 style={{ marginBottom: '8px', color: 'var(--text-dark)' }}>No projects yet</h3>
            <p style={{ marginBottom: '20px', fontSize: '14px' }}>Create your first project and we'll help you build the estimate.</p>
            <button className="btn btn-primary" onClick={onCreateProjectClick}>
              Create Project
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Client</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Estimate Total</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td style={{ fontWeight: '600' }}>{project.name}</td>
                    <td>{project.clientName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <MapPin size={14} />
                        {project.city || 'San Jose'}, {project.state || 'CA'}
                      </div>
                    </td>
                    <td>{getStatusBadge(project.status)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <Calendar size={14} />
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ fontWeight: '700' }}>
                      {project.estimateTotal > 0 ? (
                        `$${project.estimateTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '13px' }}>Not calculated</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => onSelectProject(project.id)}
                        style={{ padding: '6px 12px' }}
                      >
                        Open Project
                        <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links Card */}
      <div className="dashboard-grid-2">
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ marginBottom: '12px' }}>San Jose Estimating Checklist</h3>
          <ul style={{ listStyle: 'none', paddingLeft: 0, fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span>
              Verify framing spans against Title 24 California building energy requirements.
            </li>
            <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span>
              Ensure concrete starter specs utilize regional 4000 PSI requirements for seismic zone D.
            </li>
            <li style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span>
              Review San Jose ADU setback guidelines when modifying footprint areas.
            </li>
          </ul>
        </div>

        <div className="card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ marginBottom: '12px' }}>Pricing Catalog Status</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Keep your pricing database updated to ensure instant calculations when drawings are analyzed.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={onViewPricing} style={{ alignSelf: 'flex-start' }}>
            Open Pricing Database
          </button>
        </div>
      </div>
    </div>
  );
}
