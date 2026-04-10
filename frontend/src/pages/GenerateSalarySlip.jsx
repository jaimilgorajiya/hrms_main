import React, { useState, useEffect } from 'react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import { Search, Calculator, Calendar, CheckSquare, Square, FileText } from 'lucide-react';
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
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Generate Salary Slips</h1>
                    <p className="hrm-subtitle">Prepare officially generated slips for initiated payouts</p>
                </div>
                
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="hrm-search-container">
                        <Search size={18} className="hrm-search-icon" />
                        <input 
                            type="text" 
                            className="hrm-search-input" 
                            placeholder="Find employee..." 
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

            <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                    {selectedIds.length > 0 && <span>Selected <strong>{selectedIds.length}</strong> employees</span>}
                </div>
                <button 
                    className="btn-hrm btn-hrm-primary" 
                    onClick={handleGenerate}
                    disabled={selectedIds.length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <FileText size={18} /> Generate Selected Slips
                </button>
            </div>

            <div className="hrm-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="hrm-table-container">
                    <table className="hrm-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>
                                    <div style={{ cursor: 'pointer' }} onClick={toggleSelectAll}>
                                        {selectedIds.length === filteredPayouts.length && filteredPayouts.length > 0 ? <CheckSquare size={20} color="#2563eb" /> : <Square size={20} color="#cbd5e1" />}
                                    </div>
                                </th>
                                <th>Employee Details</th>
                                <th>Attendance Summary</th>
                                <th>Net Payable</th>
                                <th>Admin Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Loading initiated payouts...</td></tr>
                            ) : filteredPayouts.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No pending payouts to generate for this month.</td></tr>
                            ) : filteredPayouts.map((p, i) => (
                                <tr key={i} onClick={() => toggleSelect(p._id)} style={{ cursor: 'pointer' }}>
                                    <td onClick={(e) => { e.stopPropagation(); toggleSelect(p._id); }}>
                                        {selectedIds.includes(p._id) ? <CheckSquare size={20} color="#2563eb" /> : <Square size={20} color="#cbd5e1" />}
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{p.employeeId?.name}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>{p.employeeId?.employeeId}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '13px' }}>{p.attendance?.present} Present | {p.attendance?.absent} Absent</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{p.attendance?.paidLeave} Leave Taken</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 700, color: '#0f172a' }}>₹{p.finalPayout.toLocaleString()}</div>
                                        <span className="status-badge status-pending" style={{ fontSize: '9px' }}>Initiated by {p.initiatedBy?.name}</span>
                                    </td>
                                    <td>
                                        <button className="btn-hrm-icon">
                                            <Calculator size={16} color="#64748b" />
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

export default GenerateSalarySlip;
