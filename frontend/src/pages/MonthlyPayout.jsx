import React, { useState, useEffect } from 'react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import { Search, Download, User, Clock, AlertCircle, X, ChevronRight, Calculator, Calendar } from 'lucide-react';
import Swal from 'sweetalert2';

const MonthlyPayout = () => {
    const today = new Date();
    const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmp, setSelectedEmp] = useState(null);

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const res = await authenticatedFetch(`${API_URL}/api/payroll/summary?month=${month}`);
            const data = await res.json();
            if (data.success) {
                setSummary(data.summary);
            } else {
                Swal.fire('Error', data.message || 'Failed to fetch summary', 'error');
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Internal Server Error', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, [month]);

    const filtered = summary.filter(s => 
        s.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <h1 className="hrm-title">Monthly Payout Summary</h1>
                <div style={{ display: 'flex', gap: '15px' }}>
                     <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                        <input 
                            type="month" 
                            className="hrm-input" 
                            value={month} 
                            onChange={(e) => setMonth(e.target.value)} 
                        />
                    </div>
                    <button className="btn-hrm btn-hrm-secondary" onClick={() => window.print()}>
                        <Download size={18} /> Export PDF
                    </button>
                </div>
            </div>

            <div className="hrm-card" style={{ padding: 0 }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                    <div className="search-bar" style={{ width: '300px' }}>
                        <Search size={18} />
                        <input 
                            type="text" 
                            placeholder="Search employee..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="hrm-table hrm-table-hoverable">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Attendance Score</th>
                                <th>Total Deductions</th>
                                <th>Final Payout (Net)</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '50px' }}>Loading summary data...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '50px' }}>No records found for this month.</td></tr>
                            ) : filtered.map((s, i) => (
                                <tr key={i} onClick={() => setSelectedEmp(s)} style={{ cursor: 'pointer' }}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '35px', height: '35px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User size={18} color="#64748b" />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{s.employee.name}</div>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>{s.employee.employeeId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500, color: '#10b981' }}>{s.attendance.present + (s.attendance.halfDay * 0.5) + s.attendance.weekOff + s.attendance.holiday} / 31 Days</div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{s.attendance.present}P | {s.attendance.absent}A | {s.attendance.paidLeave}L</div>
                                    </td>
                                    <td>
                                        <div style={{ color: '#ef4444', fontWeight: 600 }}>-₹{s.penalties.total.toLocaleString()}</div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>Policy Penalties</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#2563eb' }}>
                                            ₹{s.salary.accruedNet.toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#64748b' }}>Base: ₹{s.salary.monthlyNet}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                className="btn-hrm btn-hrm-primary" 
                                                style={{ padding: '6px 12px', fontSize: '11px' }}
                                                onClick={(e) => { e.stopPropagation(); Swal.fire('Success', `Payout initiated for ${s.employee.name}`, 'success'); }}
                                            >
                                                Initiate
                                            </button>
                                            <ChevronRight size={18} color="#cbd5e1" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payout Detail Modal */}
            {selectedEmp && (
                <div className="hrm-modal-overlay">
                    <div className="hrm-modal-content" style={{ width: '800px', maxWidth: '95%' }}>
                        <div className="hrm-modal-header">
                            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Payout Audit: {selectedEmp.employee.name}</h2>
                            <button 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }} 
                                onClick={() => setSelectedEmp(null)}
                            >
                                <X size={20}/>
                            </button>
                        </div>
                        <div className="hrm-modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {/* Attendance Summary */}
                                <div className="hrm-card" style={{ padding: '15px', background: '#f8fafc' }}>
                                    <h4 style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}><Calendar size={14}/> Attendance Breakdown</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div style={{ fontSize: '13px' }}><span style={{ color: '#059669', fontWeight: 600 }}>{selectedEmp.attendance.present}</span> Present</div>
                                        <div style={{ fontSize: '13px' }}><span style={{ color: '#ef4444', fontWeight: 600 }}>{selectedEmp.attendance.absent}</span> Absent</div>
                                        <div style={{ fontSize: '13px' }}><span style={{ color: '#0284c7', fontWeight: 600 }}>{selectedEmp.attendance.halfDay}</span> Half Days</div>
                                        <div style={{ fontSize: '13px' }}><span style={{ color: '#6366f1', fontWeight: 600 }}>{selectedEmp.attendance.weekOff}</span> Week Offs</div>
                                        <div style={{ fontSize: '13px' }}><span style={{ color: '#db2777', fontWeight: 600 }}>{selectedEmp.attendance.paidLeave}</span> Paid Leaves</div>
                                        <div style={{ fontSize: '13px' }}><span style={{ color: '#ea580c', fontWeight: 600 }}>{selectedEmp.attendance.unpaidLeave}</span> Unpaid Leaves</div>
                                    </div>
                                </div>

                                {/* Work Hours Summary */}
                                <div className="hrm-card" style={{ padding: '15px', background: '#f8fafc' }}>
                                    <h4 style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={14}/> Hours Analysis</h4>
                                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#334155' }}>{selectedEmp.hours.worked}</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Worked this Month</div>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '10px' }}>Shift Expectancy: {selectedEmp.hours.expected}</div>
                                    </div>
                                </div>

                                {/* Penalty Summary */}
                                <div className="hrm-card" style={{ padding: '15px', background: '#fef2f2', border: '1px solid #fee2e2' }}>
                                    <h4 style={{ fontSize: '12px', color: '#ef4444', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}><AlertCircle size={14}/> Policy Penalties</h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span style={{ fontSize: '13px' }}>Late In Total:</span>
                                        <span style={{ fontWeight: 600 }}>₹{selectedEmp.penalties.lateIn}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span style={{ fontSize: '13px' }}>Early Out Total:</span>
                                        <span style={{ fontWeight: 600 }}>₹{selectedEmp.penalties.earlyOut}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #fecaca' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Total Performance Deduction:</span>
                                        <span style={{ fontWeight: 700, color: '#ef4444' }}>₹{selectedEmp.penalties.total}</span>
                                    </div>
                                </div>

                                {/* Salary Calculation */}
                                <div className="hrm-card" style={{ padding: '15px', background: '#ecfdf5', border: '1px solid #d1fae5' }}>
                                    <h4 style={{ fontSize: '12px', color: '#059669', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}><Calculator size={14}/> Accrual Logic</h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span style={{ fontSize: '13px' }}>Monthly Net Salary:</span>
                                        <span style={{ fontWeight: 600 }}>₹{selectedEmp.salary.monthlyNet}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span style={{ fontSize: '13px' }}>LOP Deduction:</span>
                                        <span style={{ fontWeight: 600, color: '#ef4444' }}>-₹{selectedEmp.salary.unpaidLeaveDeduction}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #a7f3d0' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 700 }}>Final Net Accrued:</span>
                                        <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '18px' }}>₹{selectedEmp.salary.accruedNet.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="hrm-modal-footer">
                            <button className="btn-hrm btn-hrm-secondary" onClick={() => setSelectedEmp(null)}>Close Audit</button>
                            <button className="btn-hrm btn-hrm-primary" onClick={() => { Swal.fire('Success', `Payout initiated for ${selectedEmp.employee.name}`, 'success'); setSelectedEmp(null); }}>Initiate Payout</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthlyPayout;
