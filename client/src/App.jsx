import React, { useState, useEffect } from 'react';
import { 
  Briefcase, FolderKanban, BookOpen, ShieldCheck, 
  Settings as SettingsIcon, LogOut, HardHat, 
  User, HelpCircle, FileText, BellRing, Search, Menu, X 
} from 'lucide-react';
import { api } from './api';

// Components
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ProjectForm from './components/ProjectForm';
import TakeoffViewer from './components/TakeoffViewer';
import PricingManager from './components/PricingManager';
import EstimateReview from './components/EstimateReview';
import Settings from './components/Settings';
import AuditLogs from './components/AuditLogs';
import ProjectsManager from './components/ProjectsManager';

export default function App() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, projects, pricing, audit-logs, settings, new-project, project-takeoff, project-estimate
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [takeoffItems, setTakeoffItems] = useState([]);

  // UI state
  const [toasts, setToasts] = useState([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      fetchProjects();
    }
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
      addToast('Failed to load projects.');
    }
  };

  const addToast = (message) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    addToast(`Logged in successfully as ${userData.fullName}`);
    fetchProjects();
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setProjects([]);
    setActiveView('dashboard');
    addToast('Logged out successfully.');
  };

  // Navigations & project selectors
  const handleSelectProject = async (id) => {
    try {
      const projectDetails = await api.getProject(id);
      const items = await api.getTakeoff(id);
      setSelectedProjectId(id);
      setSelectedProject(projectDetails);
      setTakeoffItems(items);

      // Determine routing based on project status
      if (projectDetails.status === 'Draft' && items.length === 0) {
        // If draft and has no drawings yet, open project details for uploading
        setActiveView('new-project');
      } else if (projectDetails.status === 'Review Required' || projectDetails.status === 'Draft') {
        setActiveView('project-takeoff');
      } else {
        setActiveView('project-estimate');
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load project details.');
    }
  };

  const handleProjectCreated = (newId) => {
    addToast('Project created successfully!');
    fetchProjects();
    handleSelectProject(newId);
  };

  // Takeoff item updates
  const handleUpdateTakeoffItem = async (itemId, updates) => {
    try {
      const updated = await api.updateTakeoffItem(selectedProjectId, itemId, updates);
      setTakeoffItems(prev => prev.map(item => item.id === itemId ? updated : item));
      addToast('Takeoff quantity updated.');
      
      // Update local project details status in case status changed
      if (updates.status) {
        setSelectedProject(prev => ({ ...prev, status: updates.status }));
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to edit takeoff item.');
    }
  };

  const handleAddTakeoffItem = async (data) => {
    try {
      const added = await api.addTakeoffItem(selectedProjectId, data);
      setTakeoffItems(prev => [...prev, added]);
      addToast('Takeoff item added manually.');
    } catch (err) {
      console.error(err);
      addToast('Failed to append takeoff item.');
    }
  };

  const handleDeleteTakeoffItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this takeoff item?')) return;
    try {
      await api.deleteTakeoffItem(selectedProjectId, itemId);
      setTakeoffItems(prev => prev.filter(item => item.id !== itemId));
      addToast('Takeoff item deleted.');
    } catch (err) {
      console.error(err);
      addToast('Failed to remove item.');
    }
  };

  // Pricing calculations navigate
  const handleProceedToPricing = () => {
    setActiveView('project-estimate');
  };

  // Global search trigger
  const handleGlobalSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`/api/search?q=${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Render subviews
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard 
            projects={projects} 
            onSelectProject={handleSelectProject}
            onCreateProjectClick={() => setActiveView('new-project')}
            onViewPricing={() => setActiveView('pricing')}
          />
        );
      case 'projects':
        return (
          <ProjectsManager
            onSelectProject={handleSelectProject}
            onCreateProjectClick={() => setActiveView('new-project')}
            onToast={addToast}
          />
        );
      case 'new-project':
        return (
          <ProjectForm 
            onProjectCreated={handleProjectCreated}
            onCancel={() => {
              setSelectedProjectId(null);
              setSelectedProject(null);
              setActiveView('dashboard');
            }}
          />
        );
      case 'project-takeoff':
        return (
          <TakeoffViewer
            projectId={selectedProjectId}
            takeoffItems={takeoffItems}
            onUpdateItem={handleUpdateTakeoffItem}
            onDeleteItem={handleDeleteTakeoffItem}
            onAddItem={handleAddTakeoffItem}
            onProceedToPricing={handleProceedToPricing}
          />
        );
      case 'project-estimate':
        return (
          <EstimateReview
            projectId={selectedProjectId}
            project={selectedProject}
            onToast={addToast}
            onBackToTakeoff={() => setActiveView('project-takeoff')}
            onEstimateStatusChanged={() => {
              fetchProjects();
              if (selectedProjectId) handleSelectProject(selectedProjectId);
            }}
          />
        );
      case 'pricing':
        return <PricingManager onToast={addToast} />;
      case 'audit-logs':
        return <AuditLogs onToast={addToast} />;
      case 'settings':
        return <Settings onToast={addToast} />;
      default:
        return <div>View not implemented yet.</div>;
    }
  };

  // Render auth page if user not signed in
  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HardHat size={26} style={{ color: 'var(--primary)' }} />
            <span className="sidebar-logo-text">
              BuildEstimate <span className="sidebar-logo-orange">AI</span>
            </span>
          </div>
          <button 
            className="mobile-toggle"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label="Toggle navigation menu"
          >
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Global Search Box */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-light)', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '26px', top: '26px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '32px', fontSize: '13px', paddingHeight: '32px' }}
            placeholder="Search projects..."
            value={searchQuery}
            onChange={handleGlobalSearch}
          />
          {searchResults && searchQuery.trim() && (
            <div style={{
              position: 'absolute', top: '56px', left: '16px', right: '16px',
              backgroundColor: 'white', border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
              zIndex: 300, maxHeight: '220px', overflowY: 'auto', padding: '8px'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px' }}>Projects found:</div>
              {searchResults.projects.length === 0 ? (
                <div style={{ fontSize: '12px', padding: '6px', color: 'var(--text-muted)' }}>No matches</div>
              ) : (
                searchResults.projects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults(null);
                      handleSelectProject(p.id);
                      setShowMobileMenu(false);
                    }}
                    style={{ fontSize: '12px', padding: '6px', cursor: 'pointer', borderRadius: '4px', hover: { backgroundColor: '#f1f5f9' } }}
                    className="search-item-hover"
                  >
                    {p.name} ({p.clientName})
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <nav className={`sidebar-menu ${showMobileMenu ? 'show' : ''}`}>
          <button 
            className={`sidebar-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveView('dashboard'); setSelectedProjectId(null); setShowMobileMenu(false); }}
          >
            <FolderKanban size={18} />
            Dashboard
          </button>

          <button 
            className={`sidebar-item ${activeView === 'projects' ? 'active' : ''}`}
            onClick={() => { setActiveView('projects'); setSelectedProjectId(null); setShowMobileMenu(false); }}
          >
            <Briefcase size={18} />
            Projects
          </button>

          {/* Active project tabs indicators */}
          {selectedProject && (
            <div style={{ marginTop: '12px', borderLeft: '2px solid var(--primary-light)', paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', padding: '4px 8px' }}>
                ACTIVE: {selectedProject.name.toUpperCase().substring(0, 16)}
              </div>
              <button 
                className={`sidebar-item ${activeView === 'project-takeoff' ? 'active' : ''}`}
                onClick={() => { setActiveView('project-takeoff'); setShowMobileMenu(false); }}
                style={{ padding: '8px 12px', fontSize: '13px' }}
              >
                <FileText size={16} /> Takeoff items
              </button>
              <button 
                className={`sidebar-item ${activeView === 'project-estimate' ? 'active' : ''}`}
                onClick={() => { setActiveView('project-estimate'); setShowMobileMenu(false); }}
                style={{ padding: '8px 12px', fontSize: '13px' }}
              >
                <Briefcase size={16} /> Estimate Bid
              </button>
            </div>
          )}

          <button 
            className={`sidebar-item ${activeView === 'pricing' ? 'active' : ''}`}
            onClick={() => { setActiveView('pricing'); setShowMobileMenu(false); }}
          >
            <BookOpen size={18} />
            Pricing Database
          </button>

          <button 
            className={`sidebar-item ${activeView === 'audit-logs' ? 'active' : ''}`}
            onClick={() => { setActiveView('audit-logs'); setShowMobileMenu(false); }}
          >
            <ShieldCheck size={18} />
            Audit Logs
          </button>

          <button 
            className={`sidebar-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => { setActiveView('settings'); setShowMobileMenu(false); }}
          >
            <SettingsIcon size={18} />
            Settings
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className={`sidebar-footer ${showMobileMenu ? 'show' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-dark)' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
            }}>
              {user.fullName.substring(0, 1).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: '600' }}>{user.fullName}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.companyName}</div>
            </div>
          </div>
          <button className="sidebar-item" onClick={handleLogout} style={{ border: 'none', background: 'none', width: '100%', marginTop: '8px' }}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main workspace */}
      <main className="main-content">
        {renderView()}
      </main>

      {/* Toast notifications container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <BellRing size={16} />
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
