import React, { useState, useEffect } from 'react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import { Search, Calendar, FileText, Filter, Eye, Download, History } from 'lucide-react';
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
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Payroll Archive</h1>
                    </div>
                
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="hrm-search-container">
                        <Search size={18} className="hrm-search-icon" />
                        <input 
                            type="text" 
                            className="hrm-search-input" 
                            placeholder="Search records..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="hrm-date-filter" style={{ minWidth: '180px' }}>
                        <Calendar size={18} />
                        <input 
                            type="month" 
                            className="hrm-date-input"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
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
                                <th>Employee</th>
                                <th>Net Payout</th>
                                <th>Status</th>
                                <th>Audit Trail</th>
                                <th>Document</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Loading archive...</td></tr>
                            ) : filteredPayouts.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No payroll records found for this period.</td></tr>
                            ) : filteredPayouts.map((p, i) => (
                                <tr key={i}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{p.month}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Cycle Reference</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{p.employeeId?.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.employeeId?.employeeId}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{p.finalPayout?.toLocaleString()}</div>
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
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                            {new Date(p.initiatedAt).toLocaleString()}
                                        </div>
                                    </td>
                                    <td>
                                        <button 
                                            className="btn-hrm-icon" 
                                            style={{ color: 'var(--primary-blue)' }}
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
