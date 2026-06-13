import React, { useState, useEffect, useMemo } from 'react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import { Search, Calendar, FileText, Wallet, Briefcase, Users, CheckCircle, Clock, FileMinus } from 'lucide-react';
import Swal from 'sweetalert2';

const PayoutHistory = () => {
    const today = new Date();
    // Start with current month filter
    const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');

    const fetchData = async () => {
        try {
            setLoading(true);
            const historyRes = await authenticatedFetch(`${API_URL}/api/payroll/history?month=${month}`);
            const historyData = await historyRes.json();

            if (historyData.success) {
                setPayouts(historyData.history || []);
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Failed to fetch payroll archive', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [month]);

    // Derived Statistics
    const stats = useMemo(() => {
        const totalPayout = payouts.reduce((sum, p) => sum + (p.finalPayout || 0), 0);
        const totalEmployees = payouts.length;
        const published = payouts.filter(p => p.status === 'Published').length;
        const generated = payouts.filter(p => p.status === 'Generated').length;
        const initiated = payouts.filter(p => p.status === 'Initiated').length;

        return {
            totalPayout,
            totalEmployees,
            published,
            generated,
            initiated
        };
    }, [payouts]);

    const filteredPayouts = useMemo(() => {
        return payouts.filter(p => {
            const matchesSearch = 
                (p.employeeId?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.employeeId?.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesTab = activeTab === 'All' || p.status === activeTab;
            
            return matchesSearch && matchesTab;
        });
    }, [payouts, searchTerm, activeTab]);

    const handleDownload = async (payoutId) => {
        try {
            Swal.showLoading();
            const res = await authenticatedFetch(`${API_URL}/api/payroll/download-slip/${payoutId}`);
            if (!res.ok) throw new Error("Failed to download slip");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `payslip_${payoutId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            Swal.close();
        } catch (err) {
            Swal.close();
            console.error(err);
            Swal.fire('Error', 'Failed to download payslip', 'error');
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Published':
                return {
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10B981',
                    border: '1px solid rgba(16, 185, 129, 0.25)'
                };
            case 'Generated':
                return {
                    background: 'rgba(59, 130, 246, 0.12)',
                    color: '#3B82F6',
                    border: '1px solid rgba(59, 130, 246, 0.25)'
                };
            case 'Initiated':
                return {
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#F59E0B',
                    border: '1px solid rgba(245, 158, 11, 0.25)'
                };
            default:
                return {
                    background: 'rgba(107, 114, 128, 0.12)',
                    color: '#6B7280',
                    border: '1px solid rgba(107, 114, 128, 0.25)'
                };
        }
    };

    return (
        <div className="hrm-container animate-fade-in" style={{ padding: '0 8px' }}>
            
            {/* Header section with Page Title & Main Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="hrm-title" style={{ margin: 0, fontSize: '24px', fontWeight: '800', tracking: '-0.5px' }}>Payroll Archive</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Review, filter, and export historical employee salary records.</p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', minWidth: '240px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            placeholder="Search employee or ID..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                height: '42px',
                                padding: '0 12px 0 40px',
                                border: '1.5px solid var(--border)',
                                borderRadius: '12px',
                                background: 'var(--card-bg)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                transition: 'all 0.2s',
                                fontSize: '13.5px'
                            }}
                            className="search-input-focus"
                        />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '0 14px', background: 'var(--card-bg)', height: '42px' }}>
                        <Calendar size={16} style={{ color: 'var(--primary-blue)' }} />
                        <input 
                            type="month" 
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: '13.5px',
                                cursor: 'pointer',
                                fontWeight: '600'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                {/* Stat: Total Payout */}
                <div style={{
                    background: 'linear-gradient(135deg, var(--card-bg) 0%, rgba(59, 130, 246, 0.05) 100%)',
                    border: '1.5px solid var(--border)',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Wallet size={24} />
                    </div>
                    <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Payout</span>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '900', color: 'var(--text-dark)' }}>
                            ₹{stats.totalPayout.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </h3>
                    </div>
                </div>

                {/* Stat: Processed Employees */}
                <div style={{
                    background: 'linear-gradient(135deg, var(--card-bg) 0%, rgba(16, 185, 129, 0.05) 100%)',
                    border: '1.5px solid var(--border)',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Records</span>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '900', color: 'var(--text-dark)' }}>{stats.totalEmployees}</h3>
                    </div>
                </div>

                {/* Stat: Published Slips */}
                <div style={{
                    background: 'var(--card-bg)',
                    border: '1.5px solid var(--border)',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={22} />
                    </div>
                    <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Published Slips</span>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '900', color: 'var(--text-dark)' }}>{stats.published}</h3>
                    </div>
                </div>

                {/* Stat: Slips in Pipeline */}
                <div style={{
                    background: 'var(--card-bg)',
                    border: '1.5px solid var(--border)',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={22} />
                    </div>
                    <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>In Progress</span>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '900', color: 'var(--text-dark)' }}>{stats.generated + stats.initiated}</h3>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '24px', paddingBottom: '1px' }}>
                {['All', 'Published', 'Generated', 'Initiated'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '12px 20px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === tab ? '3px solid var(--primary-blue)' : '3px solid transparent',
                            color: activeTab === tab ? 'var(--primary-blue)' : 'var(--text-muted)',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {tab}
                        <span style={{
                            fontSize: '11px',
                            background: activeTab === tab ? 'var(--primary-blue)' : 'var(--bg-elevated)',
                            color: activeTab === tab ? '#FFF' : 'var(--text-secondary)',
                            borderRadius: '20px',
                            padding: '2px 8px',
                            fontWeight: '800'
                        }}>
                            {tab === 'All' ? payouts.length : payouts.filter(p => p.status === tab).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Redesigned Records Card Table */}
            <div className="hrm-card" style={{ padding: 0, overflow: 'hidden', border: '1.5px solid var(--border)', borderRadius: '18px', background: 'var(--card-bg)' }}>
                <div className="hrm-table-container" style={{ margin: 0 }}>
                    <table className="hrm-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', padding: '12px' }}>
                        <thead>
                            <tr style={{ background: 'transparent' }}>
                                <th style={{ borderBottom: 'none', padding: '16px 20px', fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Month</th>
                                <th style={{ borderBottom: 'none', padding: '16px 20px', fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee Details</th>
                                <th style={{ borderBottom: 'none', padding: '16px 20px', fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Payout</th>
                                <th style={{ borderBottom: 'none', padding: '16px 20px', fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                                <th style={{ borderBottom: 'none', padding: '16px 20px', fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Audit Trail</th>
                                <th style={{ borderBottom: 'none', padding: '16px 20px', fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', width: '100px' }}>Document</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '80px 0', textAlign: 'center' }}>
                                        <div className="spinner" style={{ border: '3px solid var(--border)', borderTop: '3px solid var(--primary-blue)', borderRadius: '50%', width: '28px', height: '28px', margin: '0 auto 12px auto', animation: 'spin 1s linear infinite' }}></div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>Fetching archive records...</div>
                                    </td>
                                </tr>
                            ) : filteredPayouts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '80px 0', textAlign: 'center' }}>
                                        <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <FileMinus size={40} style={{ opacity: 0.6 }} />
                                            <span style={{ fontSize: '14.5px', fontWeight: '700' }}>No records match your selection</span>
                                            <span style={{ fontSize: '12px', maxWidth: '300px' }}>Try switching filters, updating the month or adjusting your search term.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPayouts.map((p, i) => (
                                <tr 
                                    key={i} 
                                    className="premium-table-row"
                                    style={{
                                        background: 'var(--bg-main)',
                                        borderRadius: '12px',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <td style={{ padding: '18px 20px', borderRadius: '12px 0 0 12px', borderBottom: 'none' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '850', color: 'var(--text-dark)' }}>{p.month}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Cycle Reference</div>
                                    </td>
                                    <td style={{ padding: '18px 20px', borderBottom: 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1.5px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                                {p.employeeId?.profilePhoto ? (
                                                    <img src={`${API_URL}/uploads/${p.employeeId.profilePhoto}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <Briefcase size={18} color="var(--text-muted)" />
                                                )}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>{p.employeeId?.name || 'N/A'}</p>
                                                <p style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{p.employeeId?.employeeId || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '18px 20px', borderBottom: 'none' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Wallet size={14} color="var(--success)" />
                                            <span style={{ fontSize: '15px', fontWeight: '900', color: 'var(--success)' }}>
                                                ₹{(p.finalPayout || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '18px 20px', borderBottom: 'none' }}>
                                        <span 
                                            style={{
                                                fontSize: '10.5px',
                                                fontWeight: '800',
                                                padding: '6px 14px',
                                                borderRadius: '20px',
                                                display: 'inline-block',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                ...getStatusStyle(p.status)
                                            }}
                                        >
                                            {p.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '18px 20px', borderBottom: 'none' }}>
                                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                            By {p.initiatedBy?.name || 'System'}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '500' }}>
                                            {new Date(p.initiatedAt).toLocaleString()}
                                        </div>
                                    </td>
                                    <td style={{ padding: '18px 20px', borderRadius: '0 12px 12px 0', textAlign: 'center', borderBottom: 'none' }}>
                                        <button 
                                            className="btn-download-slip" 
                                            style={{ 
                                                padding: '8px 12px', 
                                                borderRadius: '10px', 
                                                border: '1.5px solid var(--border)', 
                                                background: 'var(--card-bg)', 
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            onClick={() => handleDownload(p._id)}
                                            title="Download PDF Payslip"
                                        >
                                            <FileText size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Embedded CSS for redising details, hover transformations & focus states */}
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }

                    .search-input-focus:focus {
                        border-color: var(--primary-blue) !important;
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
                    }

                    .premium-table-row:hover {
                        background: var(--bg-elevated) !important;
                        transform: translateY(-2px);
                        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
                    }

                    .btn-download-slip:hover {
                        border-color: var(--primary-blue) !important;
                        background: var(--primary-blue) !important;
                        color: #FFF !important;
                        transform: scale(1.08);
                        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
                    }

                    .animate-fade-in {
                        animation: fadeIn 0.35s ease-out;
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </div>
    );
};

export default PayoutHistory;
