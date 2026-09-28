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
      {/* Background Image & Vignette Overlay */}
      <div className="gercep-bg-overlay" />

      {/* Top Navbar */}
      <header className="gercep-navbar">
        <div className="gercep-nav-brand">
          <div className="vardh-nav-brand">
            <img
              src="/vardh-v-emblem.png"
              alt="VARDH"
              className="vardh-nav-icon"
            />
            <div className="vardh-nav-text">
              <span className="vardh-nav-title">VARDH</span>
              <span className="vardh-nav-subtitle">Technology. Systems. Growth.</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hero Container */}
      <div className="gercep-hero-container">
        {/* Left Hero Content */}
        <div className="gercep-hero-left">
          <h1 className="gercep-hero-headline">
            <span className="gercep-white-text">MOVE WITH</span>{' '}
            <span className="vardh-blue-text">PURPOSE.</span><br />
            <span className="gercep-white-text">GROW WITH</span>{' '}
            <span className="vardh-orange-text">VARDH</span>
          </h1>

          <p className="gercep-hero-description">
            We don't just deliver goods, we deliver trust, efficiency, and growth at
            every destination. Experience the modern standard of logistics.
          </p>
        </div>

        {/* Right Glassmorphic Login Card */}
        <div className="gercep-hero-right">
          <div className="login-card gercep-glass-card">
            <div className="login-card-header">
              <div className="gercep-card-badge">TMS SYSTEM LOGIN</div>
              <h2>Selamat Datang</h2>
              <p>Masuk ke akun TMS VARDH</p>
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
                <label className="form-label">USER NAME</label>
                <input
                  id="login-email"
                  type="text"
                  className="form-input login-input"
                  placeholder=""
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

