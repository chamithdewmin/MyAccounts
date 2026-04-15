import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/lib/api';
import loginBg from '@/assets/login-background.webp';
import AppleLogoWhite from '@/assets/Apple_logo_white.svg';
import './Login.css';

const apiMessage = (data) =>
  (data && (data.message || data.error || data.data?.message || data.data?.error)) || '';

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

const SuccessIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12.5 11 15l5-6" />
  </svg>
);

const ErrorIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 7v7" />
    <circle cx="12" cy="16" r="0.8" />
  </svg>
);

const getPasswordRuleState = (password, { email } = {}) => {
  const value = password || '';
  const lower = value.toLowerCase();
  const emailName = (email || '').split('@')[0]?.toLowerCase() || '';
  return {
    length: value.length >= 8,
    upper: /[A-Z]/.test(value),
    number: /\d/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
    noPersonal: value.length > 0 ? !(emailName && lower.includes(emailName)) : false,
  };
};

const PasswordChecklist = ({ password, email }) => {
  const hasValue = (password || '').length > 0;
  const rules = getPasswordRuleState(password, { email });
  const items = [
    { key: 'length', label: 'Be at least 8 characters' },
    { key: 'noPersonal', label: 'Not contain your email or username' },
    { key: 'upper', label: 'Include at least one uppercase letter' },
    { key: 'number', label: 'Include at least one number' },
    { key: 'symbol', label: 'Include at least one symbol' },
  ];
  return (
    <div className="password-rules">
      <p className="password-rules-title">Password must include:</p>
      <ul>
        {items.map((item) => {
          const ok = hasValue && rules[item.key];
          return (
            <li key={item.key} className={ok ? 'password-rule password-rule--ok' : 'password-rule'}>
              <span className="password-rule-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke={ok ? '#22c55e' : '#4b5563'}
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8.5 12.5 11 15l4.5-5.5" />
                </svg>
              </span>
              <span className="password-rule-text">{item.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const publicFetch = async (path, options = {}) => {
  const base = getApiUrl();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { message: 'Network error' } };
  }
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.initialView === 'forgot') {
      setView('forgot');
    }
  }, [location.state]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const id = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login((email || '').trim(), password);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Invalid email or password. Please try again.');
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpSuccess('');
    const normalizedEmail = (forgotEmail || '').trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail.length < 3) {
      setOtpError('Please enter your email (min 3 characters)');
      return;
    }
    setLoading(true);
    const { ok, data } = await publicFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: normalizedEmail }),
    });
    setLoading(false);
    if (ok) {
      let msg = apiMessage(data) || 'OTP sent to your registered phone number.';
      if (data?.devOtp) {
        msg = `${msg} (dev OTP: ${data.devOtp})`;
      }
      setOtpSuccess(msg);
      setView('otp');
      setCountdown(60);
    } else {
      setOtpError(apiMessage(data) || 'Failed to send OTP.');
    }
  };

  const handleOtpChange = (val, i) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    setOtpError('');
    if (val && i < otp.length - 1) {
      const nextInput = document.getElementById(`otp-${i + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKey = (e, i) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      const prev = document.getElementById(`otp-${i - 1}`);
      prev?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.every((d) => d !== '')) {
      setOtpError('Please enter the complete OTP code');
      return;
    }
    setOtpError('');
    setOtpSuccess('');
    const code = otp.join('');
    const normalizedEmail = (forgotEmail || '').trim().toLowerCase();
    setLoading(true);
    const { ok, data } = await publicFetch('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        email: normalizedEmail,
        otp: code,
      }),
    });
    setLoading(false);
    if (ok && data?.resetToken) {
      setResetToken(data.resetToken);
      setOtpSuccess(apiMessage(data) || 'OTP verified.');
      setView('reset');
    } else {
      setOtpError(apiMessage(data) || 'Invalid or expired OTP. Please try again or request a new code.');
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setOtpError('');
    const ruleState = getPasswordRuleState(newPassword, { email: forgotEmail });
    const rulesOk = Object.values(ruleState).every(Boolean);
    if (!rulesOk) {
      setOtpError('Password does not meet all requirements');
      return;
    }
    if (newPassword !== confirmPassword) {
      setOtpError('Passwords do not match');
      return;
    }
    if (!resetToken) {
      setOtpError('Session expired. Please verify the OTP again.');
      return;
    }
    setLoading(true);
    const { ok, data } = await publicFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        resetToken,
        newPassword,
      }),
    });
    setLoading(false);
    if (ok) {
      setOtpSuccess(apiMessage(data) || 'Password reset successfully.');
      setView('login');
      setOtp(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
      setForgotEmail('');
      setResetToken('');
    } else {
      setOtpError(apiMessage(data) || 'Failed to reset password.');
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    setOtpSuccess('');
    const normalizedEmail = (forgotEmail || '').trim().toLowerCase();
    setLoading(true);
    const { ok, data } = await publicFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: normalizedEmail }),
    });
    setLoading(false);
    if (ok) {
      let msg = 'OTP resent successfully.';
      if (data?.devOtp) {
        msg = `${msg} (dev OTP: ${data.devOtp})`;
      }
      setOtpSuccess(msg);
      setCountdown(60);
    } else {
      setOtpError(apiMessage(data) || 'Failed to resend OTP.');
    }
  };

  const otpFilled = otp.every((d) => d !== '');
  const notifications = [];
  if (error) notifications.push({ type: 'error', message: error });
  if (otpError) notifications.push({ type: 'error', message: otpError });
  if (otpSuccess) notifications.push({ type: 'success', message: otpSuccess });

  const passwordRules = getPasswordRuleState(newPassword, { email: forgotEmail });
  const allPasswordRulesOk = Object.values(passwordRules).every(Boolean);

  useEffect(() => {
    if (!error && !otpError && !otpSuccess) return undefined;
    const t = setTimeout(() => {
      setError('');
      setOtpError('');
      setOtpSuccess('');
    }, 5000);
    return () => clearTimeout(t);
  }, [error, otpError, otpSuccess]);

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
                <img src={AppleLogoWhite} alt="" className="logo-image" />
                <span className="logo-text vp-logo-text">
                  Logozo<span>POS</span>
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
            {view === 'login' && (
              <form className="panel-inner" onSubmit={handleLogin}>
                <p className="panel-eyebrow p1">Welcome Back</p>
                <h2 className="panel-title p2">Sign in</h2>
                <p className="panel-sub p2">Enter your email and password to sign in.</p>
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
                  <button type="button" className="forgot-link" onClick={() => setView('forgot')}>
                    Forgot password?
                  </button>
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
            )}

            {view === 'forgot' && (
              <form className="panel-inner" onSubmit={handleSendOtp}>
                <button
                  type="button"
                  className="back-btn p1"
                  onClick={() => {
                    setView('login');
                    setOtpError('');
                    setOtpSuccess('');
                    setForgotEmail('');
                  }}
                >
                  ← Back to Sign In
                </button>
                <p className="panel-eyebrow p1">Account Recovery</p>
                <h2 className="panel-title p2">
                  Forgot Your
                  <br />
                  Password?
                </h2>
                <p className="panel-sub p2">
                  Enter your registered account email. We will send a one-time code to the phone number on file for this
                  account.
                </p>
                <div className="form-group p3">
                  <label className="form-label">Email Address</label>
                  <input
                    className="form-input"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      setOtpError('');
                    }}
                    placeholder="john@example.com"
                    autoComplete="email"
                  />
                </div>
                <button className="submit-btn p4" type="submit" disabled={loading || !forgotEmail.trim()}>
                  {loading ? 'Sending...' : 'Send OTP →'}
                </button>
                <p className="note-text p5">
                  Remember your password?{' '}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setView('login');
                    }}
                  >
                    Sign in here
                  </a>
                </p>
              </form>
            )}

            {view === 'otp' && (
              <form
                className="panel-inner"
                onSubmit={handleVerifyOtp}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <h2 className="panel-title" style={{ marginBottom: 6 }}>
                  Enter OTP
                </h2>
                <p className="panel-sub" style={{ marginBottom: 12 }}>
                  We sent a 6-digit code to your registered phone. Code is valid for a few minutes.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleOtpChange(e.target.value, i)}
                      onKeyDown={(e) => handleOtpKey(e, i)}
                      style={{
                        width: 60,
                        height: 60,
                        textAlign: 'center',
                        fontSize: 24,
                        borderRadius: 14,
                        border: '1px solid #2a2a2a',
                        background: '#1a1a1a',
                        color: '#f0f0f0',
                      }}
                    />
                  ))}
                </div>
                <div style={{ textAlign: 'center', fontSize: 13 }}>
                  {countdown > 0 ? (
                    <span>
                      Resend OTP in <span style={{ color: '#3b82f6', fontWeight: 600 }}>{countdown}s</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#bbbbbb',
                      }}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
                <button className="submit-btn p4" type="submit" disabled={loading || !otpFilled}>
                  {loading ? 'Verifying...' : 'Verify OTP →'}
                </button>
                <button
                  type="button"
                  className="back-btn p5"
                  onClick={() => {
                    setView('forgot');
                    setOtp(['', '', '', '', '', '']);
                    setOtpError('');
                    setOtpSuccess('');
                  }}
                >
                  ← Change email
                </button>
              </form>
            )}

            {view === 'reset' && (
              <form
                className="panel-inner"
                onSubmit={handleReset}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <h2 className="panel-title" style={{ marginBottom: 6 }}>
                  Set new password
                </h2>
                <p className="panel-sub" style={{ marginBottom: 12 }}>
                  OTP verified. Create your new password for <strong>{(forgotEmail || '').trim()}</strong>.
                </p>
                <div className="form-group">
                  <label className="form-label">New password</label>
                  <div className="password-input-wrapper">
                    <input
                      className="form-input password-input-large"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword((v) => !v)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon open={showNewPassword} />
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm password</label>
                  <div className="password-input-wrapper">
                    <input
                      className="form-input password-input-large"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon open={showConfirmPassword} />
                    </button>
                  </div>
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p
                      style={{
                        fontSize: 12,
                        color: '#fca5a5',
                        marginTop: 4,
                      }}
                    >
                      Passwords do not match.
                    </p>
                  )}
                </div>
                <PasswordChecklist password={newPassword} email={forgotEmail} />
                <button
                  className="submit-btn p4"
                  type="submit"
                  disabled={
                    loading ||
                    !allPasswordRulesOk ||
                    !newPassword ||
                    newPassword !== confirmPassword ||
                    !resetToken
                  }
                >
                  {loading ? 'Saving...' : 'Reset password →'}
                </button>
              </form>
            )}

            {notifications.length > 0 && (
              <div className="login-notifications">
                {notifications.map((n, idx) => (
                  <div key={idx} className={`login-notification login-notification--${n.type}`}>
                    <span className="login-notification-icon">
                      {n.type === 'success' && <SuccessIcon />}
                      {n.type === 'error' && <ErrorIcon />}
                    </span>
                    <span className="login-notification-text">{n.message}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
