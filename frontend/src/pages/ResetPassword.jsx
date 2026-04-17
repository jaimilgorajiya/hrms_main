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
        <div style={wrap}>
            <div style={card}>
                <p style={{ color: '#ef4444', textAlign: 'center' }}>Invalid or missing reset token.</p>
                <button style={btn} onClick={() => navigate('/login')}>Back to Login</button>
            </div>
        </div>
    );

    return (
        <div style={wrap}>
            <div style={card}>
                {!done ? (
                    <>
                        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Set New Password</h2>
                        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b' }}>Enter your new password below.</p>
                        {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
                        <form onSubmit={handleSubmit}>
                            <label style={label}>New Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={input} placeholder="Min. 6 characters" />
                            <label style={label}>Confirm Password</label>
                            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={input} placeholder="Repeat password" />
                            <button type="submit" disabled={loading} style={btn}>{loading ? 'Resetting...' : 'Reset Password'}</button>
                        </form>
                    </>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                        <h2 style={{ margin: '0 0 8px', color: '#1e293b' }}>Password Reset!</h2>
                        <p style={{ color: '#64748b', marginBottom: 24 }}>Your password has been updated. You can now log in.</p>
                        <button style={btn} onClick={() => navigate('/login')}>Go to Login</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const wrap = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' };
const card = { background: '#fff', borderRadius: 16, padding: 36, width: '100%', maxWidth: 420, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' };
const input = { width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box', display: 'block' };
const label = { display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 };
const btn = { width: '100%', padding: '13px', background: '#2563EB', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, color: '#fff', fontSize: 15, marginTop: 4 };

export default ResetPassword;
