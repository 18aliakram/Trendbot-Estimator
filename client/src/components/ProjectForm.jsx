import React, { useState } from 'react';
import { FileUp, Info, AlertTriangle, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { api } from '../api';

export default function ProjectForm({ onProjectCreated, onCancel }) {
  const [step, setStep] = useState(1);
  
  // Form values
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('San Jose');
  const [state, setState] = useState('CA');
  const [zipCode, setZipCode] = useState('');
  const [type, setType] = useState('ADU');
  const [notes, setNotes] = useState('');

  // Upload values
  const [projectId, setProjectId] = useState(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [error, setError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);

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

  // Steps of processing for the progress UI (simulated progress on top of api stage alerts)
  const processingStages = [
    'Uploading PDF plan file to server...',
    'Reading architectural sheets...',
    'Detecting plan dimensions and scales...',
    'Extracting walls, doors, and flooring dimensions...',
    'Compiling materials quantity takeoff...',
    'Linking prices with San Jose builder database...',
    'Finalizing quantity checklist review...'
  ];

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!name || !clientName) {
      setError('Project Name and Client Name are required.');
      return;
    }
    setError('');

    try {
      const data = {
        name,
        clientName,
        clientCompany,
        address,
        city,
        state,
        zipCode,
        type,
        notes
      };
      const created = await api.createProject(data);
      setProjectId(created.id);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to create project.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError('');
    } else {
      setError('Please select a PDF document only.');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a PDF document only.');
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file || !projectId) return;

    setIsUploading(true);
    setError('');
    setUploadProgress(10);
    setCurrentStage('Uploading drawing sheet PDF...');

    // Simulate progress bar movement along with API stage updates
    let progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressTimer);
          return 90;
        }
        return prev + 5;
      });
    }, 1500);

    // Call API stages simulation inside server
    try {
      const stages = [
        { label: 'Reading structural drawings...', progress: 20 },
        { label: 'Identifying drawing scales...', progress: 40 },
        { label: 'Detecting building boundaries...', progress: 55 },
        { label: 'Identifying components (Lumber, Drywall, Concrete)...', progress: 70 },
        { label: 'Matching San Jose starter database pricing...', progress: 85 },
        { label: 'Preparing final takeoff sheet...', progress: 95 }
      ];

      // Execute actual file upload api call
      // Wait for it to process
      let stageIndex = 0;
      const stageUpdater = setInterval(() => {
        if (stageIndex < stages.length) {
          setCurrentStage(stages[stageIndex].label);
          setUploadProgress(stages[stageIndex].progress);
          stageIndex++;
        } else {
          clearInterval(stageUpdater);
        }
      }, 2000);

      const res = await api.uploadPlans(projectId, file);
      
      clearInterval(progressTimer);
      clearInterval(stageUpdater);
      
      setUploadProgress(100);
      setCurrentStage('Analysis completed!');
      setAnalysisResult(res);
      setIsUploading(false);

      // Timeout to show success state before proceeding
      setTimeout(() => {
        onProjectCreated(projectId);
      }, 1000);

    } catch (err) {
      clearInterval(progressTimer);
      setIsUploading(false);
      setError(err.message || 'Plan analysis failed. Check PDF readability.');
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <button className="btn btn-secondary" onClick={onCancel} style={{ marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2>{step === 1 ? 'Step 1: Project Information' : 'Step 2: Upload Blueprints'}</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{
              width: '28px', height: '28px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: step === 1 ? 'var(--primary)' : 'var(--primary-light)',
              color: step === 1 ? 'white' : 'var(--primary-hover)', fontWeight: 'bold', fontSize: '13px'
            }}>1</span>
            <span style={{
              width: '28px', height: '28px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: step === 2 ? 'var(--primary)' : '#e2e8f0',
              color: step === 2 ? 'white' : 'var(--text-muted)', fontWeight: 'bold', fontSize: '13px'
            }}>2</span>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            <AlertTriangle size={18} />
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleCreateProject}>
            <div className="form-group">
              <label>Project Name*</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g., Willow Street ADU"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Client Name*</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Jane Miller"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Client Company (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Miller Properties"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Site Address</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g., 456 Willow St"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>City</label>
                <input
                  type="text"
                  className="form-control"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>State</label>
                <input
                  type="text"
                  className="form-control"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>ZIP Code</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="95125"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Project Scope / Type</label>
              <select
                className="form-control"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {projectTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Project Notes</label>
              <textarea
                className="form-control"
                placeholder="List project requirements, custom finish constraints, or plumbing hookup considerations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary">
                Next: Upload Plans <ArrowRight size={16} />
              </button>
            </div>
          </form>
        ) : (
          <div>
            {!isUploading ? (
              <div>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  style={{
                    border: '2px dashed var(--border-hover)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '48px 24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-main)',
                    transition: 'all 0.2s ease',
                    marginBottom: '24px'
                  }}
                  onClick={() => document.getElementById('fileInput').click()}
                >
                  <FileUp size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                  <h3 style={{ marginBottom: '8px' }}>Drag & Drop Plans Here</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                    or click to browse your files. Supported files: <strong>PDF</strong>.
                  </p>
                  <input
                    type="file"
                    id="fileInput"
                    style={{ display: 'none' }}
                    accept="application/pdf"
                    onChange={handleFileChange}
                  />
                  {file && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'white',
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      fontWeight: '500',
                      fontSize: '13px'
                    }}>
                      📄 {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                  )}
                </div>

                <div className="alert alert-warning" style={{ fontSize: '13px' }}>
                  <Info size={16} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>AI Safety Disclaimer:</strong> Architectural blueprints are scanned. The AI will extract quantities, areas, and openings. You will be able to review, modify, or override all values on the Takeoff review sheet before pricing is applied.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                  <button className="btn btn-secondary" onClick={() => setStep(1)}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleUploadAndAnalyze}
                    disabled={!file}
                    style={{ opacity: file ? 1 : 0.6 }}
                  >
                    Analyze plans & extract quantities <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{
                  position: 'relative', width: '80px', height: '80px', margin: '0 auto 24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{
                    position: 'absolute', width: '100%', height: '100%',
                    border: '6px solid var(--primary-light)', borderRadius: '50%'
                  }}></div>
                  <div style={{
                    position: 'absolute', width: '100%', height: '100%',
                    border: '6px solid transparent', borderTopColor: 'var(--primary)',
                    borderRadius: '50%', animation: 'spin 1s linear infinite'
                  }}></div>
                </div>
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
                
                <h3 style={{ marginBottom: '8px' }}>Analyzing your plans...</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                  Please do not close this window. We are processing the drawing sheets.
                </p>

                {/* Progress Bar */}
                <div style={{
                  width: '100%', height: '10px', backgroundColor: '#e2e8f0',
                  borderRadius: '9999px', overflow: 'hidden', marginBottom: '16px'
                }}>
                  <div style={{
                    width: `${uploadProgress}%`, height: '100%', backgroundColor: 'var(--primary)',
                    borderRadius: '9999px', transition: 'width 0.3s ease'
                  }}></div>
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-main)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-dark)'
                }}>
                  <span className="badge badge-analyzing" style={{ animation: 'none', padding: '2px 6px' }}>Status</span>
                  {currentStage}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
