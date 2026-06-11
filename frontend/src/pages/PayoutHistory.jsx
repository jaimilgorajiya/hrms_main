import React, { useState, useEffect } from 'react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import { Search, Calendar, FileText, Filter, Eye, Download, History, Wallet, Briefcase } from 'lucide-react';
import Swal from 'sweetalert2';


const PayoutHistory = () => {
    const today = new Date();
    // Start with current month filter
    const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        try {
            const historyRes = await authenticatedFetch(`${API_URL}/api/payroll/history?month=${month}`);
            const historyData = await historyRes.json();

            if (historyData.success) setPayouts(historyData.history);
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

    const filteredPayouts = payouts.filter(p => 
        p.employeeId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.employeeId?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDownload = (payoutId) => {
        const token = localStorage.getItem('token');
        const url = `${API_URL}/api/payroll/download-slip/${payoutId}?token=${token}`;
        window.open(url, '_blank');
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Published': return 'status-published';
            case 'Generated': return 'status-generated';
            case 'Initiated': return 'status-initiated';
            default: return 'status-default';
        }
    };

    return (
        <div className="hrm-container">
            {/* ── Premium Page Header ── */}
            <div className="hrm-header" style={{ marginBottom: '28px' }}>
                <div>
                    <h1 className="hrm-title">Payroll Archive</h1>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="hrm-search-container" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', width: '260px' }}>
                        <Search size={18} className="hrm-search-icon" style={{ color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            className="hrm-search-input" 
                            placeholder="Search records..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', outline: 'none', width: '100%', height: '42px', paddingLeft: '38px', paddingRight: '12px' }}
                        />
                    </div>
                    <div className="hrm-date-filter" style={{ minWidth: '180px', background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', borderRadius: '10px', height: '42px', boxSizing: 'border-box' }}>
                        <Calendar size={18} style={{ color: 'var(--primary-blue)' }} />
                        <input 
                            type="month" 
                            className="hrm-date-input"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', outline: 'none', height: '100%', cursor: 'pointer', flex: 1, colorScheme: 'dark' }}
                        />
                    </div>
                </div>
            </div>

            <div className="hrm-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="hrm-table-container">
                    <table className="hrm-table">
                        <thead>
                            <tr>
                                <th>Month</th>
                                <th>Employee Details</th>
                                <th>Net Payout</th>
                                <th>Status</th>
                                <th>Audit Trail</th>
                                <th>Document</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontWeight: 600 }}>Loading archive...</td></tr>
                            ) : filteredPayouts.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontWeight: 600 }}>No payroll records found for this period.</td></tr>
                            ) : filteredPayouts.map((p, i) => (
                                <tr key={i}>
                                    <td>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>{p.month}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Cycle Reference</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                                {p.employeeId?.profilePhoto ? <img src={`${API_URL}/uploads/${p.employeeId.profilePhoto}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Briefcase size={20} color="var(--text-muted)" />}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>{p.employeeId?.name}</p>
                                                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', margin: 0 }}>{p.employeeId?.employeeId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Wallet size={14} color="var(--success)" />
                                            <span style={{ fontSize: '15px', fontWeight: '900', color: 'var(--success)' }}>
                                                ₹{(p.finalPayout || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${getStatusClass(p.status)}`} style={{ fontSize: '10px' }}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            By {p.initiatedBy?.name || 'System'}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            {new Date(p.initiatedAt).toLocaleString()}
                                        </div>
                                    </td>
                                    <td>
                                        <button 
                                            className="btn-hrm-icon" 
                                            style={{ padding: '6px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
                                            onClick={() => handleDownload(p._id)}
                                            title="View Official Payslip"
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
        </div>
    );
};

export default PayoutHistory;
