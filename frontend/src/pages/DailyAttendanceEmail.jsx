import React, { useState } from 'react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import { Mail, Send, Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
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
                confirmButtonColor: '#2563eb',
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
                Swal.fire({
                    title: 'Email Sent!',
                    text: 'The daily attendance report has been dispatched successfully.',
                    icon: 'success',
                    timer: 3000,
                    showConfirmButton: false
                });
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
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>Daily Attendance Email</h1>
                <p style={{ color: '#64748b' }}>Configure and manage automated daily attendance reports for administrators.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Status Card */}
                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '12px', color: '#2563eb' }}>
                            <Clock size={24} />
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Automation Status</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                            <span style={{ color: '#64748b' }}>Scheduled Run:</span>
                            <span style={{ fontWeight: '600', color: '#1e293b' }}>Daily at 07:00 PM IST</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                            <span style={{ color: '#64748b' }}>Recipients:</span>
                            <span style={{ fontWeight: '600', color: '#1e293b' }}>All Active Admins</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f0fdf4', borderRadius: '8px' }}>
                            <span style={{ color: '#16a34a' }}>Service Status:</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: '#16a34a' }}>
                                <CheckCircle size={14} /> Active
                            </span>
                        </div>
                    </div>
                </div>

                {/* Manual Trigger Card */}
                <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ padding: '10px', background: '#fef2f2', borderRadius: '12px', color: '#ef4444' }}>
                            <Send size={24} />
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Manual Operations</h2>
                    </div>

                    <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                        Need an updated report right now? You can manually trigger a report for today's attendance data instantly.
                    </p>

                    <button
                        onClick={handleManualTrigger}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            opacity: loading ? 0.7 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        {loading ? 'Processing...' : <><Mail size={18} /> Send Instant Report</>}
                    </button>
                </div>
            </div>

            {/* Information Card */}
            <div style={{ marginTop: '24px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <AlertCircle style={{ color: '#3b82f6', flexShrink: 0 }} />
                    <div>
                        <h3 style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>What's in the report?</h3>
                        <p style={{ color: '#64748b', fontSize: '14px' }}>
                            The daily report contains a summary of Present/Absent staff counts, along with a detailed list of every employee's first punch-in, last punch-out, and total calculated working hours for the current day.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyAttendanceEmail;
