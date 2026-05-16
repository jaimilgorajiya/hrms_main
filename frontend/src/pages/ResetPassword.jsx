import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API_URL from '../config/api';

const ResetPassword = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get('token');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirm) { setError('Passwords do not match'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
        setLoading(true); setError('');
        try {
            const res = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });
            const data = await res.json();
            if (data.success) setDone(true);
            else setError(data.message || 'Something went wrong');
        } catch {
            setError('Failed to connect to server');
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
                    .auth-banner { display: none; }
                }

                .auth-banner::before {
                    content: '';
                    position: absolute;
                    top: -20%; right: -20%; width: 600px; height: 600px;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
                    border-radius: 50%;
                }

                .banner-logo img {
                    filter: brightness(0) invert(1);
                    max-width: 100%;
                }

                .banner-content { z-index: 1; max-width: 480px; }
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
                .banner-footer { z-index: 1; font-size: 14px; color: rgba(255,255,255,0.6); }

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
                    .auth-form-section { max-width: 100%; }
                }

                .auth-form-container { width: 100%; max-width: 420px; }

                .mobile-logo { display: none; margin-bottom: 40px; }
                .mobile-logo img { width: 180px; height: auto; object-fit: contain; }
                @media (max-width: 900px) {
                    .mobile-logo { display: block; }
                }

                .form-header { margin-bottom: 40px; }
                .form-title {
                    font-size: 32px;
                    font-weight: 700;
                    color: #0F172A;
                    margin: 0 0 12px 0;
                    letter-spacing: -0.02em;
                }
                .form-subtitle { font-size: 16px; color: #64748B; margin: 0; }

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

                .input-block { margin-bottom: 24px; }
                .input-label {
                    display: block;
                    font-size: 14px;
                    font-weight: 600;
                    color: #334155;
                    margin-bottom: 8px;
                }
                .input-field-wrapper { position: relative; display: flex; align-items: center; }

                .auth-input {
                    width: 100%;
                    background: #F8FAFC;
                    border: 1px solid #E2E8F0;
                    border-radius: 12px;
                    padding: 16px 16px 16px 46px;
                    font-size: 15px;
                    color: #0F172A;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    transition: all 0.2s ease;
                    box-sizing: border-box;
                }

                .auth-input:focus {
                    outline: none;
                    background: #FFFFFF;
                    border-color: #2563EB;
                    box-shadow: 0 0 0 4px rgba(37,99,235,0.1);
                }

                .input-icon {
                    position: absolute;
                    left: 16px;
                    color: #94A3B8;
                    pointer-events: none;
                }

                .eye-btn {
                    position: absolute;
                    right: 16px;
                    background: none;
                    border: none;
                    color: #64748B;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                }

                .auth-submit-btn {
                    width: 100%;
                    background: #2563EB;
                    color: #FFFFFF;
                    border: none;
                    border-radius: 12px;
                    padding: 16px;
                    font-size: 16px;
                    font-weight: 600;
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
                }

                .auth-redirect {
                    text-align: center;
                    margin-top: 32px;
                    font-size: 15px;
                    color: #64748B;
                }

                .auth-redirect a {
                    color: #2563EB;
                    font-weight: 600;
                    text-decoration: none;
                    cursor: pointer;
                    margin-left: 4px;
                }
            `}</style>

            {/* LEFT SIDE - BRAND BANNER */}
            <div className="auth-banner">
                <div></div>
                <div className="banner-content">
                    <div className="banner-logo" style={{ marginBottom: '32px' }}>
                        <img src="/iipl-horizontal-logo.png" alt="IIPL Logo" style={{ width: '260px', height: 'auto', objectFit: 'contain' }} />
                    </div>
                    <h1 className="banner-title">Reset your access.</h1>
                    <p className="banner-text">Create a new secure password to regain control of your HR command center.</p>
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

                    {!token ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
                            <h2 className="form-title">Invalid Link</h2>
                            <p className="form-subtitle">The password reset token is missing or has expired.</p>
                            <button className="auth-submit-btn" style={{ marginTop: '32px' }} onClick={() => navigate('/login')}>Back to Login</button>
                        </div>
                    ) : !done ? (
                        <>
                            <div className="form-header">
                                <h2 className="form-title">Set New Password</h2>
                                <p className="form-subtitle">Choose a strong password to secure your account</p>
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
                                    <label className="input-label">New Password</label>
                                    <div className="input-field-wrapper">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="auth-input"
                                            placeholder="Minimum 6 characters"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
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

                                <div className="input-block">
                                    <label className="input-label">Confirm Password</label>
                                    <div className="input-field-wrapper">
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            className="auth-input"
                                            placeholder="Repeat your password"
                                            value={confirm}
                                            onChange={e => setConfirm(e.target.value)}
                                            required
                                        />
                                        <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                        </svg>
                                        <button type="button" className="eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                                            {showConfirm ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" className="auth-submit-btn" disabled={loading} style={{ marginTop: '16px' }}>
                                    {loading ? 'Updating Password...' : 'Reset Password'}
                                </button>
                            </form>

                            <div className="auth-redirect">
                                <a onClick={() => navigate('/login')}>← Back to login</a>
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '64px', height: '64px', background: '#F0FDF4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <h2 className="form-title">Password Reset!</h2>
                            <p className="form-subtitle">Your password has been successfully updated. You can now use your new password to access your account.</p>
                            <button className="auth-submit-btn" style={{ marginTop: '32px' }} onClick={() => navigate('/login')}>
                                Login Now
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
