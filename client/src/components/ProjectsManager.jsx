import React, { useState, useEffect } from 'react';
import { Search, Filter, Edit, Copy, Trash2, ArrowRight, FolderKanban, Plus, MapPin, Calendar, CheckCircle2, ShieldAlert } from 'lucide-react';
import { api } from '../api';

export default function ProjectsManager({ onSelectProject, onCreateProjectClick, onToast }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  // Edit Modal State
  const [editingProject, setEditingProject] = useState(null);
  const [editName, setEditName] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientCompany, setEditClientCompany] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('CA');
  const [editZipCode, setEditZipCode] = useState('');
  const [editType, setEditType] = useState('ADU');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('Draft');

  const projectTypes = [
    { value: 'New Construction', label: 'New Construction' },
    { value: 'Remodel', label: 'Remodel' },
    { value: 'Addition', label: 'Addition' },
    { value: 'ADU', label: 'Accessory Dwelling Unit (ADU)' },
    { value: 'Kitchen Remodel', label: 'Kitchen Remodel' },
    { value: 'Bathroom Remodel', label: 'Bathroom Remodel' },
    { value: 'Commercial', label: 'Commercial Construction' },
    { value: 'Other Residential', label: 'Other Residential' }
  ];

  const statuses = ['All', 'Draft', 'Analyzing', 'Review Required', 'Approved'];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
      onToast('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (project) => {
    setEditingProject(project);
    setEditName(project.name);
    setEditClientName(project.clientName);
    setEditClientCompany(project.clientCompany || '');
    setEditAddress(project.address || '');
    setEditCity(project.city || 'San Jose');
    setEditState(project.state || 'CA');
    setEditZipCode(project.zipCode || '');
    setEditType(project.type || 'ADU');
    setEditNotes(project.notes || '');
    setEditStatus(project.status || 'Draft');
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!editingProject) return;

    try {
      await api.updateProject(editingProject.id, {
        name: editName,
        clientName: editClientName,
        clientCompany: editClientCompany,
        address: editAddress,
        city: editCity,
        state: editState,
        zipCode: editZipCode,
        type: editType,
        notes: editNotes,
        status: editStatus
      });
      setEditingProject(null);
      onToast('Project details updated successfully!');
      fetchProjects();
    } catch (err) {
      console.error(err);
      onToast('Failed to save project details.');
    }
  };

  const handleDuplicateProject = async (id) => {
    try {
      await api.duplicateProject(id);
      onToast('Project duplicated successfully!');
      fetchProjects();
    } catch (err) {
      console.error(err);
      onToast('Failed to duplicate project.');
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this project? This will erase all AI takeoff sheets, estimates, settings, and versions.')) {
      return;
    }

    try {
      await api.deleteProject(id);
      onToast('Project deleted successfully.');
      fetchProjects();
    } catch (err) {
      console.error(err);
      onToast('Failed to delete project.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Draft':
        return <span className="badge badge-draft">Draft</span>;
      case 'Analyzing':
        return <span className="badge badge-analyzing">Analyzing</span>;
      case 'Review Required':
        return <span className="badge badge-review">Review Required</span>;
      case 'Approved':
        return <span className="badge badge-approved">Approved</span>;
      default:
        return <span className="badge badge-draft">{status}</span>;
    }
  };

  // Filter & Search checks
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeFilter === 'All' || p.status === activeFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>Projects Catalog</h1>
          <p>View, manage, edit details, duplicate, and delete estimate portfolios.</p>
        </div>
        <button className="btn btn-primary" onClick={onCreateProjectClick}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Filter and search controllers */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '40px' }}
            placeholder="Search by project, client, or site address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status filters buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {statuses.map(s => (
            <button
              key={s}
              className={`btn ${activeFilter === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setActiveFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>Loading projects...</div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-muted)' }}>
            <FolderKanban size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <h3>No projects found</h3>
            <p>Try refining your search keyword or create a new project portfolio.</p>
            <button className="btn btn-primary" onClick={onCreateProjectClick} style={{ marginTop: '16px' }}>
              + Create First Project
            </button>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Project Details</th>
                  <th>Client</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Estimate Sum</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <div style={{ fontWeight: '600', fontSize: '15px' }}>{project.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Type: {project.type} {project.notes ? `• ${project.notes.substring(0, 30)}...` : ''}
                      </div>
                    </td>
                    <td>{project.clientName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <MapPin size={13} />
                        {project.city || 'San Jose'}, {project.state || 'CA'}
                      </div>
                    </td>
                    <td>{getStatusBadge(project.status)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <Calendar size={13} />
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ fontWeight: '700' }}>
                      {project.estimateTotal > 0 ? (
                        `$${project.estimateTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '12px' }}>Not calculated</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onSelectProject(project.id)}
                          style={{ color: 'var(--primary)', fontWeight: '600' }}
                        >
                          Open <ArrowRight size={13} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleEditClick(project)}
                          title="Edit Details"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDuplicateProject(project.id)}
                          title="Duplicate Project & Takeoffs"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteProject(project.id)}
                          title="Delete Project Portfolio"
                        >
                          <Trash2 size={13} />
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

      {/* Edit Project details modal */}
      {editingProject && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form onSubmit={handleSaveProject}>
              <div className="modal-header">
                <h3>Edit Project Details</h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingProject(null)}>X</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Project Name*</label>
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
                    <label>Client Name*</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editClientName}
                      onChange={(e) => setEditClientName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Client Company</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editClientCompany}
                      onChange={(e) => setEditClientCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Project Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>City</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>State</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editState}
                      onChange={(e) => setEditState(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>ZIP Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editZipCode}
                      onChange={(e) => setEditZipCode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Project Scope / Type</label>
                    <select
                      className="form-control"
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                    >
                      {projectTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Project Status</label>
                    <select
                      className="form-control"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Analyzing">Analyzing</option>
                      <option value="Review Required">Review Required</option>
                      <option value="Approved">Approved</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Project Notes</label>
                  <textarea
                    className="form-control"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingProject(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Details</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
