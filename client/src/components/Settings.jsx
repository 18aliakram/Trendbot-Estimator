import React, { useState, useEffect } from 'react';
import { Save, Building, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import { api } from '../api';

export default function Settings({ onToast }) {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyLicense, setCompanyLicense] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.getMe();
      setFullName(data.fullName || '');
      setCompanyName(data.companyName || '');
      setCompanyPhone(data.companyPhone || '');
      setCompanyAddress(data.companyAddress || '');
      setCompanyLicense(data.companyLicense || '');
    } catch (err) {
      console.error(err);
      onToast('Failed to load settings profile.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateSettings({
        fullName,
        companyName,
        companyPhone,
        companyAddress,
        companyLicense
      });
      onToast('Company settings profile updated successfully!');
      fetchSettings();
    } catch (err) {
      console.error(err);
      onToast('Failed to update company settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="header-bar">
        <div className="header-title-section">
          <h1>Settings & Profiles</h1>
          <p>Modify company details, contact information, and licensing defaults for your client bid sheets.</p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
          Contractor Profile
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Contractor Name*</label>
            <input
              type="text"
              className="form-control"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Company Legal Name*</label>
            <div style={{ position: 'relative' }}>
              <Building size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '38px' }}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Company Phone</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '38px' }}
                  placeholder="(408) 555-0199"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>California CSLB License #</label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '38px' }}
                  placeholder="CSLB #1098765"
                  value={companyLicense}
                  onChange={(e) => setCompanyLicense(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Company Office Address</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '38px' }}
                placeholder="100 W Santa Clara St, San Jose, CA 95113"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="alert alert-warning" style={{ fontSize: '13px', marginTop: '24px' }}>
            <strong>Automatic Bid Layout:</strong> The details entered here will dynamically format in the top header and footer terms of the generated client PDF estimates. Keep them clean and professional.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={16} /> {loading ? 'Saving...' : 'Save Profile Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
