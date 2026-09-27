import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store';
import { useTenant } from '../context/TenantContext';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { branding } = useTenant();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.ok) {
      navigate('/', { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="gercep-login-page">
      {/* Background Vignette and Glow Overlay */}
      <div className="gercep-bg-overlay" />

      {/* Top Navbar */}
      <header className="gercep-navbar">
        <div className="gercep-nav-brand">
          {branding.logoImage ? (
            <div className="gercep-logo-pill">
              <img
                src={branding.logoImage}
                alt={branding.sidebarTitle}
                className="gercep-logo-img"
              />
            </div>
          ) : (
            <div className="gercep-logo-text">
              <span className="gercep-logo-icon">⚡</span>
              <span>{branding.sidebarTitle}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Hero Container */}
      <div className="gercep-hero-container">
        {/* Left Hero Content */}
        <div className="gercep-hero-left">
          <div className="gercep-badge">
            <span className="gercep-badge-dot"></span>
            ENTERPRISE LOGISTICS SYSTEM
          </div>
          <h1 className="gercep-hero-headline">
            <span className="gercep-white-text">INTELLIGENT</span><br />
            <span className="vardh-gradient-text">SYSTEMS & GROWTH</span><br />
            <span className="gercep-white-text">FOR MODERN FLEET</span>
          </h1>

          <p className="gercep-hero-description">
            Platform manajemen transportasi terpadu untuk efisiensi armada, pengiriman presisi, visibilitas real-time, dan otomasi finansial.
          </p>

          <div className="vardh-hero-features">
            <div className="vardh-feature-item">
              <span className="vardh-feature-bullet" />
              <span>Real-Time Fleet & Order Tracking</span>
            </div>
            <div className="vardh-feature-item">
              <span className="vardh-feature-bullet" />
              <span>Automated Delivery Orders & Billing</span>
            </div>
            <div className="vardh-feature-item">
              <span className="vardh-feature-bullet" />
              <span>Enterprise Role-Based Access Control</span>
            </div>
          </div>
        </div>

        {/* Right Glassmorphic Login Card */}
        <div className="gercep-hero-right">
          <div className="login-card gercep-glass-card">
            <div className="login-card-header">
              <div className="gercep-card-badge">ENTERPRISE TMS ACCESS</div>
              <h2>Selamat Datang</h2>
              <p>Masuk ke portal {branding.name}</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              {/* Error Alert */}
              {error && (
                <div className="login-error">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">User Name</label>
                <input
                  id="login-email"
                  type="text"
                  className="form-input login-input"
                  placeholder="Username (contoh: ersyad.gercepin)"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Password</label>
                </div>
                <div className="login-pass-wrap">
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    className="form-input login-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="login-pass-toggle"
                    onClick={() => setShowPass(s => !s)}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                className={`btn btn-primary btn-lg login-btn ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <span className="login-spinner" />
                ) : (
                  <LogIn size={16} />
                )}
                {loading ? 'Memverifikasi...' : 'Masuk ke System'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

