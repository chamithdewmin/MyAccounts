import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import loginBg from '@/assets/login-background.webp';
import sidebarLogo from '@/assets/logozopos.png';
import './Login.css';

const EyeIcon = ({ open }) =>
  open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login((email || '').trim(), password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Invalid email or password. Please try again.');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - LogozoPOS</title>
      </Helmet>
      <div className="login-page">
        <div className="page">
          <section
            className="hero"
            style={{
              backgroundImage: `url(${loginBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div className="hero-bg" />
            <nav className="nav a1">
              <a className="logo" href="/login">
                <img
                  src={sidebarLogo}
                  alt=""
                  className="logo-image"
                  width={34}
                  height={34}
                  style={{ objectFit: 'contain', flexShrink: 0 }}
                />
                <span className="logo-text vp-logo-text logo-text-split">
                  <span className="logo-text-strong">Logozo</span>
                  <span className="logo-text-soft">POS</span>
                </span>
              </a>
              <div className="hotline">
                Cloud suite&nbsp;<strong>MyAccounts</strong>
              </div>
            </nav>
            <div className="hero-inner">
              <p className="eyebrow a2">Business management</p>
              <h1 className="headline a3">
                Welcome to
                <br />
                <em>LogozoPOS</em>
              </h1>
              <p className="tagline a4">
                Invoicing, cash flow, inventory, and reporting — everything you need to run your business in one place.
              </p>
            </div>
            <footer className="hero-footer a1">
              <a href="#">Terms of Service</a>
              <a href="#">Privacy Policy</a>
              <a href="#">Contact Us</a>
            </footer>
          </section>

          <section className="panel">
            <form className="panel-inner" onSubmit={handleLogin}>
              <p className="panel-eyebrow p1">Welcome Back</p>
              <h2 className="panel-title p2">Sign in</h2>
              <p className="panel-sub p2">Enter your email and password to sign in.</p>

              {error && (
                <div
                  className="login-notification login-notification--error"
                  style={{ position: 'relative', right: 'auto', bottom: 'auto', marginBottom: 16, maxWidth: 'none' }}
                  role="alert"
                >
                  <span className="login-notification-text">{error}</span>
                </div>
              )}

              <div className="form-group p3">
                <label className="form-label">Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  autoComplete="username"
                />
              </div>
              <div className="form-group p4">
                <label className="form-label">Password</label>
                <div className="password-input-wrapper">
                  <input
                    className="form-input password-input-large"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>
              <div className="forgot-link-row p4">
                <Link to="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              </div>
              <button className="submit-btn p5" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>
              <p className="panel-bottom p6" style={{ marginTop: '18px' }}>
                Powered by{' '}
                <a href="https://www.logozodev.com" target="_blank" rel="noopener noreferrer">
                  LogozoDev
                </a>
              </p>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
