import React, { useState, useEffect } from 'react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import { Search, Download, User, Clock, AlertCircle, X, ChevronRight, Calculator, Calendar, History, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const MonthlyPayout = () => {
    const today = new Date();
    const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [adjustments, setAdjustments] = useState({
        bonus: 0,
        bonusReason: '',
        deduction: 0,
        deductionReason: ''
    });

    useEffect(() => {
        if (selectedEmp) {
            setAdjustments({
                bonus: 0,
                bonusReason: '',
                deduction: 0,
                deductionReason: ''
            });
        }
    }, [selectedEmp]);

    const finalNet = selectedEmp ? (selectedEmp.salary.accruedNet + Number(adjustments.bonus) - Number(adjustments.deduction)) : 0;

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

    const handleInitiatePayout = async (empData) => {
        if (finalNet <= 0) {
            const confirmZero = await Swal.fire({
                title: 'Confirm Zero Payout?',
                text: 'The calculated net payout is ₹0. Are you sure you want to initiate this?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Initiate Zero',
                cancelButtonText: 'No, let me check CTC'
            });
            if (!confirmZero.isConfirmed) return;
        }

        try {
            const res = await authenticatedFetch(`${API_URL}/api/payroll/initiate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: empData.employee._id,
                    month,
                    attendance: empData.attendance,
                    baseSalary: empData.salary.monthlyGross, // Use monthlyGross for base scaling
                    systemAccrued: empData.salary.accruedGross, // Use accruedGross for base scaling
                    penalties: empData.penalties,
                    adjustments: {
                        bonus: { amount: Number(adjustments.bonus), reason: adjustments.bonusReason },
                        deduction: { amount: Number(adjustments.deduction), reason: adjustments.deductionReason }
                    },
                    extraDayBenefit: {
                        days: empData.extraBenefits?.extraDaysWorked || 0,
                        amount: empData.salary?.extraDayAmount || 0
                    },
                    finalPayout: finalNet
                })
            });
            const result = await res.json();
            if (result.success) {
                Swal.fire('Initiated!', `Payout for ${empData.employee.name} has been initiated successfully.`, 'success');
                setSelectedEmp(null);
                fetchSummary(); // Refresh list
            } else {
                Swal.fire('Error', result.message || 'Failed to initiate', 'error');
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Internal Server Error', 'error');
        }
    };

    const handleDeletePayout = async (employeeId) => {
        // Find if we have an initiated payout to delete
        const target = summary.find(s => s.employee._id === employeeId);
        if (!target || !target.isInitiated) return;

        const result = await Swal.fire({
            title: 'Delete Payout Record?',
            text: "This will remove the current initiation record so you can re-calculate with updated CTC/Attendance if needed.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Clear Record',
            confirmButtonColor: '#ef4444'
        });

        if (result.isConfirmed) {
            try {
                // Get the payout ID from history since summary only shows isInitiated boolean
                const historyRes = await authenticatedFetch(`${API_URL}/api/payroll/history?month=${month}&employeeId=${employeeId}`);
                const historyData = await historyRes.json();
                
                if (historyData.success && historyData.history.length > 0) {
                    const payoutId = historyData.history[0]._id;
                    const delRes = await authenticatedFetch(`${API_URL}/api/payroll/${payoutId}`, { method: 'DELETE' });
                    const delData = await delRes.json();
                    if (delData.success) {
                        Swal.fire('Cleared!', 'You can now re-initiate this payout.', 'success');
                        fetchSummary();
                    }
                }
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'Failed to delete record', 'error');
            }
        }
    };

    useEffect(() => {
        fetchSummary();
    }, [month]);

    const filtered = summary.filter(s => 
        s.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const navigate = useNavigate();

    // Helper to format month display: "2026-04" -> "April 2026"
    const formatMonthDisplay = (mStr) => {
        const [y, m] = mStr.split('-');
        const date = new Date(y, m - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="hrm-container">
            <style>{`
                .payout-header-actions {
                    display: flex;
                    gap: 16px;
                    align-items: center;
                }

                .payout-month-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 8px 16px;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }

                .payout-month-container:hover {
                    border-color: #2563eb;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
                }

                .payout-month-label {
                    font-size: 14px;
                    font-weight: 600;
                    color: #1e293b;
                    min-width: 100px;
                }

                .payout-month-input {
                    position: absolute;
                    top: 0;
                    left: 0;
                    opacity: 0;
                    width: 100%;
                    height: 100%;
                    cursor: pointer;
                }

                .btn-payout-initiate {
                    background: linear-gradient(135deg, #2563eb, #1e40af);
                    color: white;
                    border: none;
                    padding: 6px 18px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .btn-payout-initiate:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 12px rgba(37, 99, 235, 0.3);
                    filter: brightness(1.1);
                }

                .btn-payout-initiated {
                    background: #f1f5f9;
                    color: #64748b;
                    border: 1px solid #e2e8f0;
                    padding: 6px 18px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: default;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .redo-container {
                    padding: 6px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    background: #fff5f5;
                    border: 1px solid #fee2e2;
                    color: #ef4444;
                    cursor: pointer;
                }

                .redo-container:hover {
                    background: #ef4444;
                    color: white;
                    box-shadow: 0 4px 8px rgba(239, 68, 68, 0.2);
                }
            `}</style>
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Monthly Payout Summary</h1>
                    <p className="hrm-subtitle">Audit and initiate monthly salaries for employees</p>
                </div>
                
                <div className="payout-header-actions">
                    <button 
                        className="btn-hrm btn-hrm-secondary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '12px' }}
                        onClick={() => navigate('/admin/payout-history')}
                    >
                        <History size={18} /> View Payout History
                    </button>
                    
                    <div style={{ position: 'relative' }}>
                        <Calendar 
                            size={16} 
                            color="#2563eb" 
                            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} 
                        />
                        <input 
                            type="month" 
                            className="hrm-date-input"
                            style={{ 
                                paddingLeft: '40px', 
                                paddingRight: '12px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                fontWeight: '600',
                                color: '#1e293b',
                                background: 'white',
                                height: '42px',
                                cursor: 'pointer',
                                outline: 'none',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
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
                                <th>Employee</th>
                                <th>Attendance Stats</th>
                                <th>Deductions</th>
                                <th>Accrued Net</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Analyzing payroll data...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No eligible employees found for this month.</td></tr>
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
                                        <div style={{ fontWeight: 500, color: s.isInitiated ? '#94a3b8' : '#10b981' }}>{s.attendance.present + (s.attendance.halfDay * 0.5) + s.attendance.weekOff + s.attendance.holiday} / {s.daysInMonth} Days</div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{s.attendance.present}P | {s.attendance.absent}A | {s.attendance.paidLeave}L</div>
                                    </td>
                                    <td>
                                        <div style={{ color: s.isInitiated ? '#94a3b8' : '#ef4444', fontWeight: 600 }}>-₹{s.penalties.total.toLocaleString()}</div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>Policy Penalties</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: s.isInitiated ? '#94a3b8' : '#2563eb' }}>
                                            ₹{s.salary.accruedNet.toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#64748b' }}>Gross: ₹{s.salary.monthlyGross}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            {!s.isInitiated ? (
                                                <button 
                                                    className="btn-payout-initiate"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedEmp(s); }}
                                                >
                                                    <Calculator size={14} /> Initiate
                                                </button>
                                            ) : (
                                                <div className="btn-payout-initiated">
                                                    Initiated
                                                </div>
                                            )}
                                            
                                            {s.isInitiated && (
                                                <div 
                                                    className="redo-container"
                                                    onClick={(e) => { e.stopPropagation(); handleDeletePayout(s.employee._id); }}
                                                    title="Redo / Delete Initiation"
                                                >
                                                    <Trash2 size={16} />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

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
                                <div className="hrm-card" style={{ padding: '15px', background: '#f8fafc' }}>
                                    <h4 style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}><Calendar size={14}/> Attendance Breakdown</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div style={{ fontSize: '13px' }}><span style={{ color: '#059669', fontWeight: 600 }}>{selectedEmp.attendance.present}</span> Present</div>
                                        <div style={{ fontSize: '13px' }}><span style={{ color: '#ef4444', fontWeight: 600 }}>{selectedEmp.attendance.absent}</span> Absent</div>
                                        <div style={{ fontSize: '13px' }}><span style={{ color: '#0284c7', fontWeight: 600 }}>{selectedEmp.attendance.halfDay}</span> Half Days</div>
                                        <div style={{ fontSize: '13px' }}><span style={{ color: '#10B981', fontWeight: 600 }}>{selectedEmp.extraBenefits?.extraDaysWorked || 0}</span> Extra Days</div>
                                        <div style={{ fontSize: '13px' }}><span style={{ color: '#6366f1', fontWeight: 600 }}>{selectedEmp.attendance.weekOff}</span> Week Offs</div>
                                        <div style={{ fontSize: '13px' }}><span style={{ color: '#db2777', fontWeight: 600 }}>{selectedEmp.attendance.paidLeave}</span> Paid Leaves</div>
                                        <div style={{ fontSize: '13px' }}><span style={{ color: '#ea580c', fontWeight: 600 }}>{selectedEmp.attendance.unpaidLeave}</span> Unpaid Leaves</div>
                                        <div style={{ fontSize: '13px' }}><span style={{ color: '#F59E0B', fontWeight: 600 }}>{selectedEmp.extraBenefits?.bonusPayDays || 0}</span> Bonus Days</div>
                                    </div>
                                </div>

                                <div className="hrm-card" style={{ padding: '15px', background: '#f8fafc' }}>
                                    <h4 style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={14}/> Hours Analysis</h4>
                                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#334155' }}>{selectedEmp.hours.worked}</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Worked this Month</div>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '10px' }}>Shift Expectancy: {selectedEmp.hours.expected}</div>
                                    </div>
                                </div>

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

                                <div className="hrm-card" style={{ padding: '15px', background: '#ecfdf5', border: '1px solid #d1fae5' }}>
                                    <h4 style={{ fontSize: '12px', color: '#059669', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}><Calculator size={14}/> Accrual Logic</h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '13px' }}>Monthly Net Base:</span>
                                        <span style={{ fontWeight: 600 }}>₹{selectedEmp.salary.monthlyNet.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '13px' }}>LOP Deduction:</span>
                                        <span style={{ fontWeight: 600, color: '#ef4444' }}>-₹{selectedEmp.salary.unpaidLeaveDeduction.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '13px' }}>Extra Day Benefit:</span>
                                        <span style={{ fontWeight: 600, color: '#059669' }}>+₹{selectedEmp.salary.extraDayAmount?.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '13px' }}>Performance Penalties:</span>
                                        <span style={{ fontWeight: 600, color: '#ef4444' }}>-₹{selectedEmp.penalties.total.toLocaleString()}</span>
                                    </div>
                                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #a7f3d0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>Manual Adjustment (+/-):</span>
                                            <input 
                                                type="number" 
                                                className="hrm-input" 
                                                style={{ width: '100px', height: '30px', textAlign: 'right', fontWeight: 700 }}
                                                value={adjustments.bonus - adjustments.deduction}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (val >= 0) setAdjustments({...adjustments, bonus: val, deduction: 0});
                                                    else setAdjustments({...adjustments, bonus: 0, deduction: Math.abs(val)});
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                             <span style={{ fontSize: '11px', color: '#64748b' }}>Adjustment Reason:</span>
                                             <input 
                                                type="text" 
                                                className="hrm-input" 
                                                style={{ width: '160px', height: '26px', fontSize: '11px' }}
                                                value={adjustments.bonusReason || adjustments.deductionReason}
                                                onChange={(e) => setAdjustments({...adjustments, bonusReason: e.target.value, deductionReason: e.target.value})}
                                                placeholder="e.g. Special Bonus"
                                             />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '12px', borderTop: '2px solid #a7f3d0' }}>
                                        <span style={{ fontSize: '15px', fontWeight: 800 }}>Final Net Accrued:</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ fontWeight: 900, color: '#2563eb', fontSize: '20px' }}>₹</span>
                                            <input 
                                                type="number" 
                                                style={{ background: 'none', border: 'none', fontWeight: 900, color: '#2563eb', fontSize: '20px', width: '120px', textAlign: 'right', outline: 'none' }}
                                                value={finalNet}
                                                onChange={(e) => {
                                                    const newTotal = Number(e.target.value);
                                                    const diff = newTotal - selectedEmp.salary.accruedNet;
                                                    if (diff >= 0) setAdjustments({...adjustments, bonus: diff, deduction: 0});
                                                    else setAdjustments({...adjustments, bonus: 0, deduction: Math.abs(diff)});
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="hrm-modal-footer">
                            <button className="btn-hrm btn-hrm-secondary" onClick={() => setSelectedEmp(null)}>Close Audit</button>
                            <button 
                                className={`btn-hrm ${selectedEmp.isInitiated ? 'btn-hrm-secondary' : 'btn-hrm-primary'}`} 
                                onClick={() => !selectedEmp.isInitiated && handleInitiatePayout(selectedEmp)}
                                disabled={selectedEmp.isInitiated}
                            >
                                {selectedEmp.isInitiated ? 'Already Initiated' : 'Initiate Payout'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthlyPayout;
