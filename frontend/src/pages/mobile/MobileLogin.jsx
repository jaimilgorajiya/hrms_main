import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Phone, ArrowRight, Shield, RefreshCw, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useMobileAuth } from './context/MobileAuthContext';
import { useMobileTheme } from './context/MobileThemeContext';
import API_URL from '../../config/api';
import { auth, signInWithPhoneNumber, RecaptchaVerifier } from './context/firebase';
import { signOut } from 'firebase/auth';
import '../../styles/MobileApp.css';

export default function MobileLogin() {
  const { login, loginWithOTP, isAuthenticated } = useMobileAuth();
  const { isDark } = useMobileTheme();
  const navigate = useNavigate();

  const [loginMode, setLoginMode] = useState('password'); // 'password' or 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [animate, setAnimate] = useState(false);

  const recaptchaContainerRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await login(email.trim().toLowerCase(), password);
      if (res.success) {
        navigate('/mobile/dashboard', { replace: true });
      } else {
        setError(res.message || 'Invalid credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => setAnimate(true), 50);
  }, []);

  if (isAuthenticated) return <Navigate to="/mobile/dashboard" replace />;

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phone.trim() || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Verify phone number registration with backend
      const checkRes = await fetch(`${API_URL}/api/auth/check-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const checkJson = await checkRes.json();

      if (!checkJson.success) {
        setError(checkJson.message || 'Mobile number not registered.');
        setLoading(false);
        return;
      }

      // 2. Setup standard invisible recaptcha verifier
      const isLocalhost = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1' ||
                          window.location.hostname.includes('hrms.com');

      if (isLocalhost) {
        // Developer Bypass for localhost: Immediately transition to mock code confirmation
        setConfirm({
          confirm: async (enteredCode) => {
            if (enteredCode === '123456') {
              return true;
            }
            throw new Error('Invalid verification code.');
          },
          isMock: true
        });
        setLoading(false);
        return;
      }

      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: (response) => {
            // reCAPTCHA solved - will trigger sign in
          },
          'expired-callback': () => {
            setError('reCAPTCHA expired. Please try sending OTP again.');
          }
        });
      }

      // 3. Trigger standard SMS OTP from Firebase
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current);
      setConfirm(confirmation);
    } catch (err) {
      console.error('Firebase OTP Send Error:', err);
      setError(err.message || 'Failed to send verification code.');
      // Reset recaptcha verifier if failed so it can be re-created
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!code.trim() || code.length < 6) {
      setError('Please enter the 6-digit verification pin.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await confirm.confirm(code);
      if (result) {
        let idToken;
        if (confirm.isMock) {
          idToken = `mock-token-${phone}`;
        } else {
          const currentUser = auth.currentUser;
          if (!currentUser) throw new Error('Auth session not found.');
          idToken = await currentUser.getIdToken();
        }

        // Pass ID Token to backend to log in
        const apiResult = await loginWithOTP(idToken);

        if (apiResult.success) {
          navigate('/mobile/dashboard', { replace: true });
        } else {
          setError(apiResult.message || 'Verification failed on server.');
          if (!confirm.isMock && auth.currentUser) {
            await signOut(auth);
          }
        }
      }
    } catch (err) {
      console.error('OTP Verification Error:', err);
      setError('The verification code is incorrect or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`mobile-app-root dark`} style={{ minHeight: '100dvh', background: '#0b0f19' }}>
      <div className="m-login-page" style={{ background: '#0b0f19' }}>
        {/* Invisible ReCAPTCHA widget anchor required by Firebase */}
        <div id="recaptcha-container" ref={recaptchaContainerRef}></div>

        {/* Animated blobs */}
        <div className="m-login-blob" style={{
          width: 320, height: 320, top: -100, left: -120,
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
        }} />
        <div className="m-login-blob" style={{
          width: 260, height: 260, bottom: -60, right: -80,
          background: 'linear-gradient(135deg, #10B981, #6366F1)',
        }} />

        {/* Logo area - Outside of card */}
        <div style={{ textAlign: 'center', marginBottom: 28, zIndex: 1 }}>
          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden'
          }}>
            <img src="/iipl-logo.png" alt="IIPL Logo" style={{ width: 70, height: 70, objectFit: 'contain' }} />
          </div>
          <p style={{ fontSize: 15, color: '#94a3b8', margin: 0, fontWeight: 600, letterSpacing: 0.5 }}>
            Employee Management Workspace
          </p>
        </div>

        <div
          className="m-login-card"
          style={{
            opacity: animate ? 1 : 0,
            transform: animate ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
            background: '#1c1b29',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 28,
            padding: '40px 32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: 420,
            boxSizing: 'border-box',
            zIndex: 1
          }}
        >
          {/* Card Header */}
          <div style={{ textAlign: 'center', width: '100%', marginBottom: 24 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', margin: '0 0 10px 0', letterSpacing: -0.5 }}>
              Secure Access
            </h1>
            <div style={{ width: 48, height: 4, background: '#8b5cf6', borderRadius: 2, margin: '0 auto 16px auto' }} />
            <p style={{ fontSize: 14, color: '#8c8a9e', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
              Sign in using your account credentials
            </p>
          </div>

          <form onSubmit={handlePasswordLogin} style={{ width: '100%' }}>
            {/* Email Address Input */}
            <div className="m-input-group" style={{ marginBottom: 20 }}>
              <label className="m-input-label" style={{ color: '#8c8a9e', fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', marginBottom: 8, display: 'block' }}>EMAIL ADDRESS</label>
              <div className="m-input-wrap" style={{ background: '#14131f', borderColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16 }}>
                <Mail size={18} color="#8b5cf6" strokeWidth={2} />
                <input
                  type="email"
                  placeholder="employee@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  style={{ color: '#ffffff' }}
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="m-input-group" style={{ marginBottom: 24 }}>
              <label className="m-input-label" style={{ color: '#8c8a9e', fontSize: 11, fontWeight: 800, letterSpacing: '0.8px', marginBottom: 8, display: 'block' }}>PASSWORD</label>
              <div className="m-input-wrap" style={{ background: '#14131f', borderColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, display: 'flex', alignItems: 'center' }}>
                <Lock size={18} color="#8b5cf6" strokeWidth={2} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ color: '#ffffff', flex: 1, background: 'transparent', border: 'none', outline: 'none', minWidth: 0 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8c8a9e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', margin: '0', flexShrink: 0, width: '36px', height: '36px' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="m-info-banner danger" style={{ marginBottom: 16 }}>
                <Shield size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13 }}>{error}</span>
              </div>
            )}

            {/* Submit btn */}
            <button
              type="submit"
              disabled={loading}
              className="m-btn m-btn-full"
              style={{
                marginTop: 8,
                background: 'linear-gradient(135deg, #4f46e5, #3730a3)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 16,
                padding: '16px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              {loading ? (
                <>
                  <div className="m-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  Processing...
                </>
              ) : (
                <>
                  Log In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer branding */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40, opacity: 0.4, zIndex: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#8c8a9e', textTransform: 'uppercase', letterSpacing: 1 }}>
            SECURE ACCESS &bull; IFLORA HRMS 2026
          </span>
        </div>
      </div>
    </div>
  );
}
