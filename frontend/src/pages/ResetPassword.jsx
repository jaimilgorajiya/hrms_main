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

    if (!token) return (
        <div className="login-page">
            <div className="login-container">
                <div className="logo-wrapper">
                    <img src="/iipl-horizontal-logo.png" alt="IIPL Logo" />
                </div>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
                    <p style={{ color: '#ef4444', fontWeight: '700', marginBottom: '24px' }}>Invalid or missing reset token.</p>
                    <button className="login-btn" onClick={() => navigate('/login')}>Back to Login</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="logo-wrapper">
                    <img src="/iipl-horizontal-logo.png" alt="IIPL Logo" />
                </div>

                {!done ? (
                    <>
                        <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '800', color: '#1E293B', textAlign: 'center' }}>Set New Password</h2>
                        <p style={{ margin: '0 0 32px', fontSize: '14px', color: '#64748B', textAlign: 'center', fontWeight: '500' }}>Secure your account with a strong password</p>
                        
                        {error && (
                            <div style={{ 
                                background: '#FEF2F2', 
                                border: '1px solid #FEE2E2',
                                color: '#991B1B', 
                                padding: '12px 16px', 
                                borderRadius: '12px', 
                                marginBottom: '24px', 
                                fontSize: '13px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>New Password</label>
                                <div className="input-wrapper">
                                    <input 
                                        type="password" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        required 
                                        placeholder="Enter new password" 
                                        style={{ width: '100%', padding: '14px 16px', border: '1.5px solid #E2E8F0', borderRadius: '12px', fontSize: '15px' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginTop: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>Confirm Password</label>
                                <div className="input-wrapper">
                                    <input 
                                        type="password" 
                                        value={confirm} 
                                        onChange={e => setConfirm(e.target.value)} 
                                        required 
                                        placeholder="Repeat your password" 
                                        style={{ width: '100%', padding: '14px 16px', border: '1.5px solid #E2E8F0', borderRadius: '12px', fontSize: '15px' }}
                                    />
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="login-btn" style={{ marginTop: '32px' }}>
                                {loading ? 'Updating Password...' : 'Reset Password'}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '24px' }}>
                                <a onClick={() => navigate('/login')} style={{ fontSize: '14px', fontWeight: '700', color: '#2563EB', cursor: 'pointer' }}>
                                    ← Back to Login
                                </a>
                            </div>
                        </form>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ 
                            width: '80px', 
                            height: '80px', 
                            background: '#F0FDF4', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            margin: '0 auto 24px',
                            color: '#16A34A',
                            fontSize: '40px'
                        }}>
                            ✅
                        </div>
                        <h2 style={{ margin: '0 0 12px', fontSize: '24px', fontWeight: '800', color: '#1E293B' }}>Password Reset!</h2>
                        <p style={{ color: '#64748B', fontSize: '15px', fontWeight: '500', marginBottom: '32px', lineHeight: '1.6' }}>
                            Your password has been successfully updated. You can now use your new password to access your account.
                        </p>
                        <button className="login-btn" onClick={() => navigate('/login')}>
                            Login Now
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;

