import React, { useState } from 'react';
import { ShieldAlert, KeyRound, HardHat } from 'lucide-react';
import { api } from '../api';

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login(email, password);
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        onAuthSuccess(res.user);
      } else {
        if (!fullName) {
          setError('Full name is required to create an account.');
          setLoading(false);
          return;
        }
        const res = await api.register({
          email,
          password,
          fullName,
          companyName
        });
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        onAuthSuccess(res.user);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-header">
          <HardHat size={44} style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
          <h2>BuildEstimate AI</h2>
          <p>
            {isLogin 
              ? 'Sign in to access your San Jose takeoff projects.' 
              : 'Create your contractor profile to start estimating.'}
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ fontSize: '13px', padding: '10px 14px' }}>
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label>Contractor Full Name*</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Juan Rodriguez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Company Legal Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Rodriguez & Sons Construction"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="contractor@sanjosebuild.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Authenticating...' : isLogin ? 'Login to Dashboard' : 'Register Profile'}
          </button>
        </form>



        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px' }}>
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            style={{
              background: 'none', border: 'none', color: 'var(--primary)',
              cursor: 'pointer', fontWeight: '600', textDecoration: 'underline'
            }}
          >
            {isLogin ? 'Need a new contractor account? Sign up' : 'Already registered? Login here'}
          </button>
        </div>
      </div>
    </div>
  );
}
