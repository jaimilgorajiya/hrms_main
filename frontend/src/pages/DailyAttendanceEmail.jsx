import React, { useState } from 'react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import { Mail, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

const DailyAttendanceEmail = () => {
    const [loading, setLoading] = useState(false);

    const handleManualTrigger = async () => {
        try {
            const result = await Swal.fire({
                title: 'Send Daily Report?',
                text: "An attendance summary email will be sent to all Admins immediately.",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3B648B',
                confirmButtonText: 'Yes, Send Now',
                cancelButtonText: 'Cancel'
            });

            if (!result.isConfirmed) return;

            setLoading(true);
            const res = await authenticatedFetch(`${API_URL}/api/admin/reports/trigger-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: new Date().toISOString().split('T')[0] })
            });

            const data = await res.json();
            if (data.success) {
                Swal.fire({ title: 'Email Sent!', text: 'The daily attendance report has been dispatched successfully.', icon: 'success', timer: 3000, showConfirmButton: false });
            } else {
                Swal.fire('Error', data.message || 'Failed to send email', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Communication failure with server', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Daily Attendance Email</h1>
                    <p className="hrm-subtitle">Configure and manage automated daily attendance reports for administrators.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {/* Automation Status Card */}
                <div className="hrm-card" style={{ margin: 0 }}>
                    <div className="hrm-card-header">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ padding: '8px', background: 'var(--accent-primary-glow)', borderRadius: '10px', color: 'var(--accent-primary)', display: 'flex' }}>
                                <Clock size={20} />
                            </span>
                            Automation Status
                        </h2>
                    </div>
                    <div className="hrm-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Scheduled Run:</span>
                            <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>Daily at 07:00 PM IST</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Recipients:</span>
                            <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>HR / Company Email</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(46,204,113,0.08)', borderRadius: '10px', border: '1px solid rgba(46,204,113,0.2)' }}>
                            <span style={{ color: 'var(--accent-green)', fontSize: '14px', fontWeight: '600' }}>Service Status:</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: 'var(--accent-green)', fontSize: '14px' }}>
                                <CheckCircle size={15} /> Active
                            </span>
                        </div>
                    </div>
                </div>

                {/* Manual Trigger Card */}
                <div className="hrm-card" style={{ margin: 0 }}>
                    <div className="hrm-card-header">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ padding: '8px', background: 'rgba(255,92,92,0.1)', borderRadius: '10px', color: 'var(--accent-red)', display: 'flex' }}>
                                <Send size={20} />
                            </span>
                            Manual Operations
                        </h2>
                    </div>
                    <div className="hrm-card-body">
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.6' }}>
                            Need an updated report right now? You can manually trigger a report for today's attendance data instantly.
                        </p>
                        <button
                            onClick={handleManualTrigger}
                            disabled={loading}
                            className="btn-hrm btn-hrm-primary"
                            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', opacity: loading ? 0.7 : 1 }}
                        >
                            <Mail size={18} />
                            {loading ? 'Processing...' : 'Send Instant Report'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Info Card */}
            <div className="hrm-card" style={{ margin: 0 }}>
                <div className="hrm-card-body">
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }}>
                            <AlertCircle size={20} />
                        </span>
                        <div>
                            <h3 style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', fontSize: '15px' }}>What's in the report?</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                                The daily report contains a summary of Present/Absent staff counts, along with a detailed list of every employee's first punch-in, last punch-out, and total calculated working hours for the current day.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyAttendanceEmail;
