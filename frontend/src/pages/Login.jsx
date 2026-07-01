import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API_URL from '../config/api';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (data.success) setForgotDone(true);
      else setForgotError(data.message || 'Something went wrong');
    } catch {
      setForgotError('Failed to connect to server');
    } finally {
      setForgotLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      setError("Your session has expired. Please login again.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.search]);

  const [formData, setFormData] = useState(() => {
    const remembered = localStorage.getItem("rememberedCredentials");
    if (remembered) {
      try {
        const { email, password } = JSON.parse(remembered);
        return { email: email || "", password: password || "", rememberMe: true };
      } catch (e) {
        console.error("Error parsing remembered credentials:", e);
      }
    }
    return { email: "", password: "", rememberMe: false };
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const userString = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (token && userString) {
      try {
        const user = JSON.parse(userString);
        if (user && user.role) {
          const path = user.role === "Admin" ? "/admin" : 
                       user.role === "Manager" ? "/manager-dashboard" : "/employee";
          navigate(path, { replace: true });
          return;
        }
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedPassword = formData.password;

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("token", data.user.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (formData.rememberMe) {
          localStorage.setItem("rememberedCredentials", JSON.stringify({
            email: trimmedEmail,
            password: trimmedPassword
          }));
        } else {
          localStorage.removeItem("rememberedCredentials");
        }

        const role = data.user.role;
        if (role === "Admin") {
          navigate("/admin");
        } else if (role === "Manager") {
          navigate("/manager-dashboard");
        } else {
          navigate("/employee");
        }
      } else {
        setError(data.message || "An error occurred");
      }
    } catch (err) {
      console.error("Auth Error:", err);
      setError("Failed to connect to the server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-auth-layout">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .modern-auth-layout {
            display: flex;
            min-height: 100vh;
            width: 100vw;
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: #FFFFFF;
        }

        /* LEFT SIDE - BRANDING (Hidden on Mobile) */
        .auth-banner {
            flex: 1;
            background: linear-gradient(rgba(30, 58, 138, 0.7), rgba(37, 99, 235, 0.7)), url('/login_img.png');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 60px;
            color: white;
        }

        @media (max-width: 900px) {
            .auth-banner {
                display: none;
            }
        }

        .auth-banner::before {
            content: '';
            position: absolute;
            top: -20%; right: -20%; width: 600px; height: 600px;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
            border-radius: 50%;
        }

        .auth-banner::after {
            content: '';
            position: absolute;
            bottom: -10%; left: -10%; width: 400px; height: 400px;
            background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%);
            border-radius: 50%;
        }

        .banner-logo img {
            filter: brightness(0) invert(1);
            max-width: 100%;
        }

        .banner-content {
            z-index: 1;
            max-width: 480px;
        }

        .banner-title {
            font-size: 48px;
            font-weight: 800;
            line-height: 1.1;
            margin: 0 0 24px 0;
            letter-spacing: -0.03em;
        }

        .banner-text {
            font-size: 18px;
            font-weight: 400;
            line-height: 1.6;
            color: rgba(255,255,255,0.8);
            margin: 0;
        }

        .banner-footer {
            z-index: 1;
            font-size: 14px;
            color: rgba(255,255,255,0.6);
        }

        /* RIGHT SIDE - FORM */
        .auth-form-section {
            width: 100%;
            max-width: 580px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #FFFFFF;
            padding: 40px;
        }

        @media (max-width: 900px) {
            .auth-form-section {
                max-width: 100%;
            }
        }

        .auth-form-container {
            width: 100%;
            max-width: 420px;
        }

        .mobile-logo {
            display: none;
            margin-bottom: 40px;
        }

        .mobile-logo img {
            width: 180px;
            height: auto;
            object-fit: contain;
        }

        @media (max-width: 900px) {
            .mobile-logo {
                display: block;
            }
        }

        .form-header {
            margin-bottom: 40px;
        }

        .form-title {
            font-size: 32px;
            font-weight: 700;
            color: #0F172A;
            margin: 0 0 12px 0;
            letter-spacing: -0.02em;
        }

        .form-subtitle {
            font-size: 16px;
            color: #64748B;
            margin: 0;
        }

        .error-alert {
            background: #FEF2F2;
            color: #DC2626;
            padding: 16px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 24px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            border: 1px solid #FEE2E2;
        }

        .input-block {
            margin-bottom: 24px;
        }

        .input-label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #334155;
            margin-bottom: 8px;
        }

        .input-field-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }

        body.dark-mode .modern-auth-layout .auth-input,
        .auth-input {
            width: 100%;
            background: #F8FAFC !important;
            border: 1px solid #E2E8F0 !important;
            border-radius: 12px;
            padding: 16px 16px 16px 46px;
            font-size: 15px;
            color: #0F172A !important;
            font-family: 'Plus Jakarta Sans', sans-serif;
            transition: all 0.2s ease;
            box-sizing: border-box;
        }

        body.dark-mode .modern-auth-layout .auth-input:focus,
        .auth-input:focus {
            outline: none;
            background: #FFFFFF !important;
            border-color: #0052ff !important;
            box-shadow: 0 0 0 4px rgba(37,99,235,0.1);
        }

        body.dark-mode .modern-auth-layout .auth-input::placeholder,
        .auth-input::placeholder {
            color: #94A3B8 !important;
        }

        .input-icon {
            position: absolute;
            left: 16px;
            color: #94A3B8;
            pointer-events: none;
            transition: color 0.2s;
        }

        .auth-input:focus + .input-icon {
            color: #0052ff;
        }

        .eye-btn {
            position: absolute;
            right: 16px;
            background: none;
            border: none;
            color: #64748B;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .eye-btn:hover {
            color: #0F172A;
        }

        .form-options {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
        }

        .checkbox-container {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
        }

        .checkbox-input {
            width: 18px;
            height: 18px;
            border-radius: 4px;
            border: 2px solid #CBD5E1;
            cursor: pointer;
            accent-color: #0052ff;
        }

        .checkbox-label {
            font-size: 14px;
            font-weight: 500;
            color: #475569;
            user-select: none;
        }

        .forgot-password {
            font-size: 14px;
            font-weight: 600;
            color: #0052ff;
            text-decoration: none;
            cursor: pointer;
        }

        .forgot-password:hover {
            text-decoration: underline;
        }

        .auth-submit-btn {
            width: 100%;
            background: #0052ff;
            color: #FFFFFF;
            border: none;
            border-radius: 12px;
            padding: 16px;
            font-size: 16px;
            font-weight: 600;
            font-family: 'Plus Jakarta Sans', sans-serif;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(37,99,235,0.2);
        }

        .auth-submit-btn:hover {
            background: #1D4ED8;
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(37,99,235,0.3);
        }

        .auth-submit-btn:disabled {
            background: #94A3B8;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .auth-redirect {
            text-align: center;
            margin-top: 32px;
            font-size: 15px;
            color: #64748B;
        }

        .auth-redirect a {
            color: #0052ff;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            margin-left: 4px;
        }

        .auth-redirect a:hover {
            text-decoration: underline;
        }

        /* Modal Overlay */
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .modal-content {
            background: #FFFFFF;
            border-radius: 20px;
            padding: 40px;
            width: 100%;
            max-width: 440px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            margin: 20px;
        }

        .modal-title {
            font-size: 24px;
            font-weight: 700;
            color: #0F172A;
            margin: 0 0 8px 0;
        }

        .modal-subtitle {
            font-size: 15px;
            color: #64748B;
            margin: 0 0 24px 0;
            line-height: 1.5;
        }
      `}</style>

      {/* LEFT SIDE - BRAND BANNER */}
      <div className="auth-banner">
        <div></div>
        <div className="banner-content">
          <div className="banner-logo" style={{ marginBottom: '32px' }}>
            <img src="/iipl-horizontal-logo.png" alt="IIPL Logo" style={{ width: '260px', height: 'auto', objectFit: 'contain' }} />
          </div>
          <h1 className="banner-title">Welcome to your HR Ecosystem.</h1>
          <p className="banner-text">Seamlessly manage your workforce, automate payroll, and drive productivity from one unified command center.</p>
          </div>
        <div className="banner-footer">
          © {new Date().getFullYear()} Iflora Info Pvt. Ltd. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE - FORM CONTAINER */}
      <div className="auth-form-section">
        <div className="auth-form-container">
          
          <div className="mobile-logo">
            <img src="/iipl-horizontal-logo.png" alt="IIPL Logo" style={{ width: '220px' }} />
          </div>

          <div className="form-header">
            <h2 className="form-title">Log in to your account</h2>
            <p className="form-subtitle">Enter your credentials to access the dashboard</p>
          </div>

          {error && (
            <div className="error-alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-block">
              <label className="input-label">Email Address</label>
              <div className="input-field-wrapper">
                <input
                  type="email"
                  name="email"
                  className="auth-input"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
                <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
            </div>

            <div className="input-block">
              <label className="input-label">Password</label>
              <div className="input-field-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="auth-input"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
                <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  name="rememberMe"
                  className="checkbox-input"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                />
                <span className="checkbox-label">Remember Me</span>
              </label>
              <a onClick={() => setForgotOpen(true)} className="forgot-password">Forgot password?</a>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-redirect">
            Don't have an account? <a onClick={() => navigate('/register')}>Create workspace</a>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="modal-overlay" onClick={() => setForgotOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {!forgotDone ? (
              <>
                <h3 className="modal-title">Reset password</h3>
                <p className="modal-subtitle">Enter your email address and we'll send you a link to reset your password.</p>
                {forgotError && (
                  <div className="error-alert" style={{ marginBottom: '20px', padding: '12px' }}>
                    {forgotError}
                  </div>
                )}
                <form onSubmit={handleForgotSubmit}>
                  <div className="input-block" style={{ marginBottom: '32px' }}>
                    <label className="input-label">Email Address</label>
                    <input
                      type="email"
                      className="auth-input"
                      placeholder="name@company.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      required
                      style={{ paddingLeft: '16px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button type="button" onClick={() => setForgotOpen(false)} style={{ flex: 1, padding: '14px', background: '#F1F5F9', border: 'none', borderRadius: '12px', fontWeight: '600', color: '#475569', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans' }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={forgotLoading} className="auth-submit-btn" style={{ flex: 1, margin: 0 }}>
                      {forgotLoading ? 'Sending...' : 'Send reset link'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', background: '#EFF6FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0052ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </div>
                <h3 className="modal-title">Check your email</h3>
                <p className="modal-subtitle">We have sent a password reset link to <strong>{forgotEmail}</strong>.</p>
                <button onClick={() => setForgotOpen(false)} className="auth-submit-btn" style={{ width: '100%' }}>
                  Back to login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
