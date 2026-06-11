import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import { 
    Search, Edit, Calendar, CheckSquare, Square, FileText, 
    Wallet, Briefcase, Eye, SlidersHorizontal, ArrowUpDown, X, 
    RefreshCw, Filter, Layers, TrendingUp 
} from 'lucide-react';
import Swal from 'sweetalert2';

const GenerateSalarySlip = () => {
    const navigate = useNavigate();
    const today = new Date();
    const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [breakdownPayout, setBreakdownPayout] = useState(null);

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

    const toggleSelectAll = (filteredList) => {
        if (selectedIds.length === filteredList.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredList.map(p => p._id));
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
                Swal.fire({
                    title: 'Success!',
                    text: `Successfully generated ${selectedIds.length} salary slips.`,
                    icon: 'success',
                    customClass: {
                        popup: 'premium-swal-popup',
                        title: 'premium-swal-title',
                        confirmButton: 'premium-swal-button'
                    }
                });
                fetchInitiatedPayouts();
                setSelectedIds([]);
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Failed to generate slips', 'error');
        }
    };

    // Filter payouts based on search and sort by name by default
    const filteredPayouts = payouts.filter(p => {
        return p.employeeId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               p.employeeId?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    }).sort((a, b) => (a.employeeId?.name || '').localeCompare(b.employeeId?.name || ''));

    // Calculated summary stats
    const totalPayoutAmount = filteredPayouts.reduce((acc, p) => acc + (p.finalPayout || 0), 0);
    const selectedPayoutAmount = filteredPayouts
        .filter(p => selectedIds.includes(p._id))
        .reduce((acc, p) => acc + (p.finalPayout || 0), 0);
    const avgPayoutAmount = filteredPayouts.length ? (totalPayoutAmount / filteredPayouts.length) : 0;

    const formatCurrency = (val) => {
        return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const monthLabel = () => {
        const [y, m] = month.split('-').map(Number);
        return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="hrm-container" style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 16px' }}>
            
            {/* ── Page Header ── */}
            <div className="hrm-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
                <div>
                    <h1 className="hrm-title" style={{ fontSize: '28px', marginBottom: '4px' }}>
                        Generate Salary Slips
                    </h1>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Review, modify, and bulk generate monthly salary payouts for the team.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                        onClick={fetchInitiatedPayouts} 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary-blue)'}
                        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </div>

            {/* ── Filters & Controls Toolbar Card ── */}
            <div className="hrm-card" style={{ padding: '20px', marginBottom: '28px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', borderRadius: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Top Row: Search & Month */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', flex: 1, minWidth: '320px' }}>
                            {/* Search bar */}
                            <div style={{ position: 'relative', flex: 2, minWidth: '240px' }}>
                                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search by employee name or ID..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ 
                                        width: '100%', 
                                        height: '46px', 
                                        paddingLeft: '42px', 
                                        paddingRight: '16px', 
                                        background: 'var(--bg-base)', 
                                        border: '1.5px solid var(--border)', 
                                        borderRadius: '12px', 
                                        outline: 'none', 
                                        fontSize: '13px', 
                                        fontWeight: 600,
                                        color: 'var(--text-primary)',
                                        boxSizing: 'border-box',
                                        transition: 'all 0.2s'
                                    }}
                                />
                            </div>

                            {/* Month input */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-base)', border: '1.5px solid var(--border)', padding: '0 14px', borderRadius: '12px', height: '46px', boxSizing: 'border-box', minWidth: '180px', flex: 1 }}>
                                <Calendar size={16} style={{ color: 'var(--primary-blue)' }} />
                                <input 
                                    type="month" 
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    onClick={e => { try { e.target.showPicker(); } catch (err) {} }}
                                    style={{ 
                                        background: 'transparent', 
                                        color: 'var(--text-primary)', 
                                        border: 'none', 
                                        outline: 'none', 
                                        height: '100%', 
                                        cursor: 'pointer', 
                                        flex: 1, 
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        colorScheme: 'dark' 
                                    }}
                                />
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <button 
                                className="btn-hrm btn-hrm-primary" 
                                onClick={handleGenerate}
                                disabled={selectedIds.length === 0}
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    padding: '0 24px', 
                                    height: '46px', 
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    opacity: selectedIds.length === 0 ? 0.6 : 1,
                                    cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
                                    boxShadow: selectedIds.length > 0 ? '0 4px 14px 0 rgba(81, 72, 215, 0.4)' : 'none'
                                }}
                            >
                                <FileText size={16} /> Generate Slips ({selectedIds.length})
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Table Container ── */}
            <div className="hrm-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elevated)', borderRadius: '20px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="hrm-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border)' }}>
                                <th style={{ width: '50px', padding: '20px', textAlign: 'left' }}>
                                    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => toggleSelectAll(filteredPayouts)}>
                                        {selectedIds.length === filteredPayouts.length && filteredPayouts.length > 0 ? (
                                            <CheckSquare size={19} color="var(--primary-blue)" style={{ transition: 'transform 0.1s ease' }} />
                                        ) : (
                                            <Square size={19} color="var(--text-muted)" style={{ transition: 'transform 0.1s ease' }} />
                                        )}
                                    </div>
                                </th>
                                <th style={{ padding: '20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Employee Details</th>
                                <th style={{ padding: '20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Attendance Summary ({monthLabel()})</th>
                                <th style={{ padding: '20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Payout Details</th>
                                <th style={{ padding: '20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '80px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <RefreshCw className="animate-spin" size={26} style={{ color: 'var(--primary-blue)' }} />
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Loading pending payouts...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPayouts.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <Layers size={44} style={{ opacity: 0.25, color: 'var(--primary-blue)' }} />
                                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>No Pending Slips Found</span>
                                            <span style={{ fontSize: '12px' }}>Try selecting a different month or updating the search filters.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPayouts.map((p, idx) => {
                                const isSelected = selectedIds.includes(p._id);
                                const hasAdjustments = (p.adjustments?.bonus?.amount > 0) || (p.adjustments?.deduction?.amount > 0);
                                return (
                                    <tr 
                                        key={p._id} 
                                        onClick={() => toggleSelect(p._id)} 
                                        style={{ 
                                            cursor: 'pointer', 
                                            borderBottom: idx < filteredPayouts.length - 1 ? '1px solid var(--border)' : 'none',
                                            transition: 'background 0.25s ease',
                                            background: isSelected ? 'rgba(195, 192, 255, 0.04)' : 'transparent'
                                        }}
                                        onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                                        onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <td style={{ padding: '20px' }} onClick={(e) => { e.stopPropagation(); toggleSelect(p._id); }}>
                                            {isSelected ? (
                                                <CheckSquare size={19} color="var(--primary-blue)" />
                                            ) : (
                                                <Square size={19} color="var(--border)" />
                                            )}
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                {/* Profile Photo */}
                                                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1.5px solid var(--border)', flexShrink: 0 }}>
                                                    {p.employeeId?.profilePhoto ? (
                                                        <img src={`${API_URL}/uploads/${p.employeeId.profilePhoto}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                                                            {p.employeeId?.name ? p.employeeId.name.charAt(0) : '?'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{p.employeeId?.name}</p>
                                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>{p.employeeId?.employeeId || 'N/A'}</span>
                                                        <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--text-muted)' }}></span>
                                                        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--primary-blue)', background: 'rgba(195,192,255,0.12)', padding: '1px 6px', borderRadius: '4px' }}>{p.employeeId?.department || 'Staff'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className="status-pill-premium completed" style={{ padding: '4px 10px', fontSize: '10px' }}>{p.attendance?.present || 0} Present</span>
                                                <span className="status-pill-premium failed" style={{ padding: '4px 10px', fontSize: '10px', background: 'rgba(255,180,171,0.15)', color: '#ffb4ab' }}>{p.attendance?.absent || 0} Absent</span>
                                            </div>
                                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '6px' }}>
                                                Leaves: {p.attendance?.paidLeave || 0} Paid · Week Offs: {p.attendance?.weekOff || 0}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--success)' }}>
                                                    ₹{formatCurrency(p.finalPayout || 0)}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Base: ₹{formatCurrency(p.baseSalary || 0)}</span>
                                                    {hasAdjustments && (
                                                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', padding: '1px 5px', borderRadius: '4px' }}>
                                                            Adjusted
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px' }} onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                                {/* View Breakdown */}
                                                <button 
                                                    onClick={() => setBreakdownPayout(p)}
                                                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContents: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary-blue)'; e.currentTarget.style.color = 'var(--primary-blue)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                                    title="View Breakdown Ledger"
                                                >
                                                    <Eye size={16} />
                                                </button>

                                                {/* Edit Salary Slip */}
                                                <button 
                                                    onClick={() => {
                                                        navigate('/admin/payroll/create-salary-slip', {
                                                            state: {
                                                                employeeId: p.employeeId?._id,
                                                                monthYear: month,
                                                                branch: p.employeeId?.branch,
                                                                department: p.employeeId?.department
                                                            }
                                                        });
                                                    }}
                                                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                                    title="Edit Salary Slip"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Stitch Premium Custom Breakdown Modal ── */}
            {breakdownPayout && (
                <div 
                    onClick={() => setBreakdownPayout(null)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 3000, animation: 'fadeIn 0.2s ease' }}
                >
                    <div 
                        onClick={e => e.stopPropagation()}
                        className="modal-content-premium"
                        style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', borderRadius: '24px', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)', animation: 'zoomIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                    >
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg-main)' }}>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                                    Payout Breakdown
                                </h3>
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0 0', fontWeight: 600 }}>
                                    {breakdownPayout.employeeId?.name} ({breakdownPayout.employeeId?.employeeId}) · {monthLabel()}
                                </p>
                            </div>
                            <button 
                                onClick={() => setBreakdownPayout(null)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '28px', overflowY: 'auto', maxHeight: '60vh' }}>
                            {/* Base Salary */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px dashed var(--border)', paddingBottom: '12px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Base Salary</span>
                                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>₹{formatCurrency(breakdownPayout.baseSalary || 0)}</span>
                            </div>

                            {/* Earnings Components */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                                    Earnings Breakdown
                                </div>
                                {breakdownPayout.earnings?.length > 0 ? (
                                    breakdownPayout.earnings.map((earning, eIdx) => (
                                        <div key={eIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', color: 'var(--text-secondary)' }}>
                                            <span>{earning.componentName}</span>
                                            <span style={{ fontWeight: 600, color: 'var(--success)' }}>+ ₹{formatCurrency(earning.calculatedAmount || 0)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No custom earnings configured.</div>
                                )}
                            </div>

                            {/* Deductions Components */}
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                                    Deductions Breakdown
                                </div>
                                {breakdownPayout.deductions?.length > 0 ? (
                                    breakdownPayout.deductions.map((ded, dIdx) => (
                                        <div key={dIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', color: 'var(--text-secondary)' }}>
                                            <span>{ded.componentName}</span>
                                            <span style={{ fontWeight: 600, color: 'var(--danger)' }}>- ₹{formatCurrency(ded.amount || 0)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No custom deductions configured.</div>
                                )}
                            </div>

                            {/* Adjustments (Bonus / Penalty / Deductions) */}
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                                    Adjustments & Accruals
                                </div>
                                
                                {/* System Accrued */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', color: 'var(--text-secondary)' }}>
                                    <span>Attendance-Accrued Salary</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{formatCurrency(breakdownPayout.systemAccrued || 0)}</span>
                                </div>

                                {/* Bonus */}
                                {breakdownPayout.adjustments?.bonus?.amount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', color: 'var(--text-secondary)' }}>
                                        <span>Bonus ({breakdownPayout.adjustments.bonus.reason || 'Accrued'})</span>
                                        <span style={{ fontWeight: 600, color: 'var(--success)' }}>+ ₹{formatCurrency(breakdownPayout.adjustments.bonus.amount)}</span>
                                    </div>
                                )}

                                {/* Penalty */}
                                {breakdownPayout.penalties?.total > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', color: 'var(--text-secondary)' }}>
                                        <span>Penalties (Late-In/Early-Out)</span>
                                        <span style={{ fontWeight: 600, color: 'var(--danger)' }}>- ₹{formatCurrency(breakdownPayout.penalties.total)}</span>
                                    </div>
                                )}

                                {/* Custom Deduction */}
                                {breakdownPayout.adjustments?.deduction?.amount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', color: 'var(--text-secondary)' }}>
                                        <span>Special Deduction ({breakdownPayout.adjustments.deduction.reason || 'Deducted'})</span>
                                        <span style={{ fontWeight: 600, color: 'var(--danger)' }}>- ₹{formatCurrency(breakdownPayout.adjustments.deduction.amount)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', background: 'var(--bg-main)', borderTop: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Net Payable</span>
                                <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--success)', marginTop: '2px' }}>₹{formatCurrency(breakdownPayout.finalPayout || 0)}</span>
                            </div>
                            <button 
                                onClick={() => setBreakdownPayout(null)}
                                style={{ padding: '10px 22px', borderRadius: '10px', background: 'var(--primary-gradient)', border: 'none', color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default GenerateSalarySlip;

