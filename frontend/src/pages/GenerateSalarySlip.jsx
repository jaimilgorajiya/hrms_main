import React, { useState, useEffect } from 'react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import { Search, Calculator, Calendar, CheckSquare, Square, FileText, Wallet, Briefcase } from 'lucide-react';
import Swal from 'sweetalert2';

const GenerateSalarySlip = () => {
    const today = new Date();
    const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchInitiatedPayouts = async () => {
        try {
            setLoading(true);
            const res = await authenticatedFetch(`${API_URL}/api/payroll/history?month=${month}`);
            const data = await res.json();
            if (data.success) {
                // Filter only 'Initiated' ones
                setPayouts(data.history.filter(p => p.status === 'Initiated'));
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Failed to fetch payouts', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitiatedPayouts();
        setSelectedIds([]);
    }, [month]);

    const toggleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredPayouts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredPayouts.map(p => p._id));
        }
    };

    const handleGenerate = async () => {
        if (!selectedIds.length) return Swal.fire('Wait', 'Please select at least one employee', 'info');

        try {
            const res = await authenticatedFetch(`${API_URL}/api/payroll/generate-slip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payoutIds: selectedIds })
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire('Success', `Generated ${selectedIds.length} salary slips`, 'success');
                fetchInitiatedPayouts();
                setSelectedIds([]);
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Failed to generate slips', 'error');
        }
    };

    const filteredPayouts = payouts.filter(p => 
        p.employeeId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.employeeId?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="hrm-container">
            {/* ── Premium Page Header ── */}
            <div className="hrm-header" style={{ marginBottom: '28px' }}>
                <div>
                    <h1 className="hrm-title">Generate Salary Slips</h1>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="search-wrapper" style={{ width: '260px', margin: 0 }}>
                        <Search size={18} color="var(--text-secondary)" />
                        <input 
                            type="text" 
                            placeholder="Find employee..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="search-wrapper" style={{ width: '180px', margin: 0, paddingRight: '12px' }}>
                        <Calendar size={18} color="var(--text-secondary)" />
                        <input 
                            type="month" 
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            onClick={e => { try { e.target.showPicker(); } catch (err) {} }}
                            style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', outline: 'none', height: '100%', cursor: 'pointer', flex: 1, paddingLeft: '8px' }}
                        />
                    </div>
                    <button 
                        className="btn-hrm btn-hrm-primary" 
                        onClick={handleGenerate}
                        disabled={selectedIds.length === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', height: '42px' }}
                    >
                        <FileText size={18} /> Generate Slips
                    </button>
                </div>
            </div>

            {/* ── Selection Indicator Alert ── */}
            {selectedIds.length > 0 && (
                <div style={{ 
                    background: 'rgba(37, 99, 235, 0.08)', 
                    border: '1px solid rgba(37, 99, 235, 0.2)', 
                    borderRadius: '12px', 
                    padding: '12px 20px', 
                    marginBottom: '20px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-blue)' }}>
                        Selected <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? 'employee' : 'employees'} for slip generation.
                    </span>
                    <button 
                        onClick={() => setSelectedIds([])} 
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                    >
                        Clear Selection
                    </button>
                </div>
            )}

            {/* ── Payouts Table ── */}
            <div className="hrm-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="hrm-table-container">
                    <table className="hrm-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>
                                    <div style={{ cursor: 'pointer' }} onClick={toggleSelectAll}>
                                        {selectedIds.length === filteredPayouts.length && filteredPayouts.length > 0 ? <CheckSquare size={20} color="var(--primary-blue)" /> : <Square size={20} color="var(--border)" />}
                                    </div>
                                </th>
                                <th>Employee Details</th>
                                <th>Attendance Summary</th>
                                <th>Net Payable</th>
                                <th style={{ textAlign: 'center' }}>Admin Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontWeight: 600 }}>Loading initiated payouts...</td></tr>
                            ) : filteredPayouts.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontWeight: 600 }}>No pending payouts to generate for this month.</td></tr>
                            ) : filteredPayouts.map((p, i) => (
                                <tr key={i} onClick={() => toggleSelect(p._id)} style={{ cursor: 'pointer' }}>
                                    <td onClick={(e) => { e.stopPropagation(); toggleSelect(p._id); }}>
                                        {selectedIds.includes(p._id) ? <CheckSquare size={20} color="var(--primary-blue)" /> : <Square size={20} color="var(--border)" />}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                                {p.employeeId?.profilePhoto ? <img src={`${API_URL}/uploads/${p.employeeId.profilePhoto}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Briefcase size={20} color="var(--text-muted)" />}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>{p.employeeId?.name}</p>
                                                <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', margin: 0 }}>{p.employeeId?.employeeId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>{p.attendance?.present || 0} Present</span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 6px' }}>|</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{p.attendance?.absent || 0} Absent</span>
                                        </div>
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '2px' }}>
                                            {p.attendance?.paidLeave || 0} Leaves Taken
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Wallet size={14} color="var(--success)" />
                                            <span style={{ fontSize: '15px', fontWeight: '900', color: 'var(--success)' }}>
                                                ₹{(p.finalPayout || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase' }}>
                                            Initiated by {p.initiatedBy?.name || 'Admin'}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <button 
                                                className="btn-hrm-icon" 
                                                style={{ padding: '6px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
                                                title="Calculate Payout"
                                            >
                                                <Calculator size={16} />
                                            </button>
                                        </div>
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

export default GenerateSalarySlip;
