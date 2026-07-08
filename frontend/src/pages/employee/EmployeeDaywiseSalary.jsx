import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Calendar, Clock, AlertCircle, Wallet, Info, 
    CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import authenticatedFetch from '../../utils/apiHandler';
import API_URL from '../../config/api';
import '../../styles/EmployeePanel.css';

const EmployeeDaywiseSalary = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBreakdown = async () => {
            try {
                setLoading(true);
                const res = await authenticatedFetch(`${API_URL}/api/payroll/my-slips/${id}/daywise`);
                const json = await res.json();
                if (json.success) {
                    setData(json);
                } else {
                    setError(json.message || "Failed to load salary breakdown.");
                }
            } catch (err) {
                console.error("Error fetching daywise salary:", err);
                setError("An error occurred while loading data.");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchBreakdown();
    }, [id]);

    const getMonthName = (monthStr) => {
        if (!monthStr) return '';
        const [year, month] = monthStr.split('-');
        return new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    };

    const getStatusStyle = (status) => {
        const base = {
            padding: '6px 12px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
        };

        switch (status) {
            case 'Present':
                return { ...base, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.25)' };
            case 'Half Day':
                return { ...base, background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.25)' };
            case 'Week Off':
                return { ...base, background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.25)' };
            case 'Holiday':
                return { ...base, background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6', border: '1px solid rgba(139, 92, 246, 0.25)' };
            case 'Paid Leave':
            case 'Paid Leave (Half)':
                return { ...base, background: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4', border: '1px solid rgba(6, 182, 212, 0.25)' };
            case 'Unpaid Leave':
            case 'Unpaid Leave (Half)':
                return { ...base, background: 'rgba(100, 116, 139, 0.15)', color: '#94A3B8', border: '1px solid rgba(100, 116, 139, 0.25)' };
            case 'Absent':
            default:
                return { ...base, background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.25)' };
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Present':
                return <CheckCircle2 size={12} />;
            case 'Half Day':
            case 'Paid Leave (Half)':
            case 'Unpaid Leave (Half)':
                return <AlertTriangle size={12} />;
            case 'Absent':
                return <XCircle size={12} />;
            default:
                return <Info size={12} />;
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        const dateObj = new Date(year, month - 1, day);
        return dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loader"></div>
                <span>Generating daily breakdown statement...</span>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="ep-page" style={{ textAlign: 'center', padding: '60px' }}>
                <AlertCircle size={48} color="var(--ep-accent-red)" style={{ marginBottom: '16px' }} />
                <h3>Failed to load Statement</h3>
                <p style={{ color: 'var(--ep-text-secondary)', marginBottom: '24px' }}>{error || "We could not fetch your day-wise breakdown."}</p>
                <button className="ep-btn-primary" onClick={() => navigate('/employee/payslips')}>
                    <ArrowLeft size={16} /> Back to Payslips
                </button>
            </div>
        );
    }

    // Totals logic
    const totalDays = data.days?.length || 0;
    const presentCount = data.days?.filter(d => d.status === 'Present').length || 0;
    const halfDayCount = data.days?.filter(d => d.status === 'Half Day').length || 0;
    const unpaidCount = data.days?.filter(d => d.status === 'Absent' || d.status.includes('Unpaid')).length || 0;
    const totalPenalties = data.days?.reduce((sum, d) => sum + d.totalPenalty, 0) || 0;
    const totalNetEarned = data.days?.reduce((sum, d) => sum + d.netEarned, 0) || 0;

    return (
        <div className="ep-page">
            <div className="ep-page-header" style={{ marginBottom: '28px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                        onClick={() => navigate('/employee/payslips')}
                        style={{
                            background: 'var(--ep-surface-elevated)',
                            border: '1px solid var(--ep-border)',
                            color: 'var(--ep-text-main)',
                            padding: '10px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontFamily: 'Sora, sans-serif' }}>Day-wise Earnings Statement</h2>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--ep-text-secondary)', fontSize: '14px' }}>
                            Transparent breakdown for {getMonthName(data.month)}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '8px 16px', borderRadius: '12px', textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--ep-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Daily Rate (Net)</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ep-accent-green)' }}>₹{data.perDayNet?.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* Quick Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                {[
                    { label: 'Calculated Net Earned', value: `₹${totalNetEarned.toLocaleString()}`, sub: 'Sum of daily net pay', icon: <Wallet size={20} />, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
                    { label: 'Total Penalties Applied', value: `₹${totalPenalties.toLocaleString()}`, sub: 'Late In / Early Out penalty', icon: <AlertTriangle size={20} />, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
                    { label: 'Attended Days', value: `${presentCount + halfDayCount * 0.5} / ${totalDays} Days`, sub: `${presentCount} Present, ${halfDayCount} Half-day`, icon: <CheckCircle2 size={20} />, color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
                    { label: 'Unpaid / Absent Days', value: `${unpaidCount} Days`, sub: 'No earnings applied', icon: <XCircle size={20} />, color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.15)' }
                ].map((stat, i) => (
                    <div key={i} className="ep-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: stat.bg, color: stat.color, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {stat.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--ep-text-muted)', fontWeight: 600 }}>{stat.label}</div>
                            <h3 style={{ margin: '4px 0 2px 0', fontSize: '20px', fontWeight: 800, fontFamily: 'Sora, sans-serif' }}>{stat.value}</h3>
                            <div style={{ fontSize: '11px', color: 'var(--ep-text-muted)' }}>{stat.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Daily Detailed Table */}
            <div className="ep-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--ep-border)', background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--ep-text-muted)', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--ep-text-muted)', textTransform: 'uppercase' }}>Day</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--ep-text-muted)', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--ep-text-muted)', textTransform: 'uppercase' }}>Punches (In / Out)</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--ep-text-muted)', textTransform: 'uppercase' }}>Work Time</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--ep-text-muted)', textTransform: 'uppercase' }}>Penalties</th>
                                <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--ep-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Earned Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.days?.map((day, idx) => {
                                const hasPunches = day.punchIn !== '--' || day.punchOut !== '--';
                                const hasPenalty = day.totalPenalty > 0;
                                return (
                                    <tr 
                                        key={idx} 
                                        style={{ 
                                            borderBottom: '1px solid var(--ep-border)', 
                                            background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'; }}
                                    >
                                        <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600 }}>
                                            {formatDate(day.date)}
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--ep-text-secondary)' }}>
                                            {day.dayName}
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <span style={getStatusStyle(day.status)}>
                                                {getStatusIcon(day.status)} {day.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '14px' }}>
                                            {hasPunches ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ color: '#10B981', fontWeight: 600 }}>{day.punchIn}</span>
                                                    <span style={{ color: 'var(--ep-text-muted)' }}>→</span>
                                                    <span style={{ color: '#F59E0B', fontWeight: 600 }}>{day.punchOut}</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--ep-text-muted)' }}>--</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--ep-text-secondary)' }}>
                                            {day.workedMins > 0 ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Clock size={14} color="var(--ep-text-muted)" />
                                                    <span>{day.workedHours}</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--ep-text-muted)' }}>--</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 20px', fontSize: '14px' }}>
                                            {hasPenalty ? (
                                                <span style={{ color: '#EF4444', fontWeight: 700 }}>
                                                    -₹{day.totalPenalty}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--ep-text-muted)' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 800, color: day.netEarned > 0 ? 'var(--ep-accent-green)' : 'var(--ep-text-muted)' }}>
                                                ₹{day.netEarned?.toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--ep-text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                                                <Info size={9} />
                                                <span>{day.rateDescription}</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div style={{ marginTop: '24px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--ep-border)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Info size={20} color="var(--ep-accent-primary-hover)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--ep-text-secondary)' }}>
                    Calculations are transparently synchronized with your registered shifts and approved leaves. The Daily Net Earned is calculated as <code>Daily Base Earned - Late In / Early Out Penalties</code>.
                </span>
            </div>
        </div>
    );
};

export default EmployeeDaywiseSalary;
