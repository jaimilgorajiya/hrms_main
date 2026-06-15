import React, { useState, useEffect, useMemo } from 'react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import { Search, Calendar, Edit2, ShieldAlert, Award, CheckSquare, XSquare, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

const PenaltiesList = () => {
    const today = new Date();
    const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    
    // Dropdown list options
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    
    // Modal state
    const [editingRecord, setEditingRecord] = useState(null);
    const [lateInAmount, setLateInAmount] = useState(0);
    const [earlyOutAmount, setEarlyOutAmount] = useState(0);

    const fetchFilters = async () => {
        try {
            const [branchRes, deptRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/branches`),
                authenticatedFetch(`${API_URL}/api/departments`)
            ]);
            const branchData = await branchRes.json();
            const deptData = await deptRes.json();

            if (branchData.success) setBranches(branchData.branches || []);
            if (deptData.success) setDepartments(deptData.departments || []);
        } catch (error) {
            console.error("Error fetching filters:", error);
        }
    };

    const fetchPenalties = async () => {
        try {
            setLoading(true);
            let url = `${API_URL}/api/attendance/admin/penalties?month=${month}`;
            if (selectedBranch) url += `&branch=${encodeURIComponent(selectedBranch)}`;
            if (selectedDept) url += `&department=${encodeURIComponent(selectedDept)}`;

            const res = await authenticatedFetch(url);
            const data = await res.json();
            if (data.success) {
                setRecords(data.records || []);
            }
        } catch (error) {
            console.error("Error fetching penalties:", error);
            Swal.fire('Error', 'Failed to fetch penalty logs', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFilters();
    }, []);

    useEffect(() => {
        fetchPenalties();
    }, [month, selectedBranch, selectedDept]);

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const name = r.employee?.name || '';
            const empId = r.employee?.employeeId || '';
            return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   empId.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [records, searchTerm]);

    // Derived Statistics
    const stats = useMemo(() => {
        let totalLateIn = 0;
        let totalEarlyOut = 0;
        let totalActive = 0;
        let waivedCount = 0;

        records.forEach(r => {
            const lateAmt = r.lateInPenalty?.amount || 0;
            const earlyAmt = r.earlyOutPenalty?.amount || 0;
            
            totalLateIn += lateAmt;
            totalEarlyOut += earlyAmt;
            totalActive += (lateAmt + earlyAmt);

            // Waived check
            if (r.lateInPenalty?.isLate && !r.lateInPenalty?.isApplied && lateAmt === 0) {
                waivedCount++;
            }
            if (r.earlyOutPenalty?.isEarly && !r.earlyOutPenalty?.isApplied && earlyAmt === 0) {
                waivedCount++;
            }
        });

        return {
            totalLateIn,
            totalEarlyOut,
            totalActive,
            waivedCount
        };
    }, [records]);

    const openEditModal = (record) => {
        setEditingRecord(record);
        setLateInAmount(record.lateInPenalty?.amount || 0);
        setEarlyOutAmount(record.earlyOutPenalty?.amount || 0);
    };

    const handleSavePenalty = async (e) => {
        e.preventDefault();
        try {
            const res = await authenticatedFetch(`${API_URL}/api/attendance/admin/penalties/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attendanceId: editingRecord._id,
                    lateInAmount,
                    earlyOutAmount
                })
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Penalty updated successfully',
                    showConfirmButton: false,
                    timer: 2000
                });
                setEditingRecord(null);
                fetchPenalties();
            } else {
                Swal.fire('Error', data.message || 'Failed to update penalty', 'error');
            }
        } catch (error) {
            console.error("Error updating penalty:", error);
            Swal.fire('Error', 'Connection failed', 'error');
        }
    };

    const handleWaivePenalty = async (record, type) => {
        const confirmResult = await Swal.fire({
            title: `Waive ${type} Penalty?`,
            text: `Are you sure you want to waive the penalty for this record?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3B82F6',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, waive it!'
        });

        if (!confirmResult.isConfirmed) return;

        try {
            const body = { attendanceId: record._id };
            if (type === 'Late In') {
                body.waiveLateIn = true;
            } else {
                body.waiveEarlyOut = true;
            }

            const res = await authenticatedFetch(`${API_URL}/api/attendance/admin/penalties/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: `${type} Penalty waived successfully`,
                    showConfirmButton: false,
                    timer: 2000
                });
                fetchPenalties();
            } else {
                Swal.fire('Error', data.message || 'Failed to waive penalty', 'error');
            }
        } catch (error) {
            console.error("Error waiving penalty:", error);
            Swal.fire('Error', 'Connection failed', 'error');
        }
    };

    return (
        <div className="hrm-container animate-fade-in" style={{ padding: '0 8px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="hrm-title" style={{ margin: 0, fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>Penalty Management</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Review and modify automated shift lateness or early departure penalty deductions.</p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', minWidth: '220px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            placeholder="Search employee name/ID..." 
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

                    <select 
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        style={{ height: '42px', padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: '12px', background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none', fontSize: '13.5px', cursor: 'pointer' }}
                    >
                        <option value="">-- All Branches --</option>
                        {branches.map(b => (
                            <option key={b._id} value={b.branchName}>{b.branchName}</option>
                        ))}
                    </select>

                    <select 
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        style={{ height: '42px', padding: '0 12px', border: '1.5px solid var(--border)', borderRadius: '12px', background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none', fontSize: '13.5px', cursor: 'pointer' }}
                    >
                        <option value="">-- All Departments --</option>
                        {departments.map(d => (
                            <option key={d._id} value={d.name}>{d.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                {/* Stat: Total Active Penalty */}
                <div style={{
                    background: 'linear-gradient(135deg, var(--card-bg) 0%, rgba(239, 68, 68, 0.05) 100%)',
                    border: '1.5px solid var(--border)',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Deductible</span>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '900', color: 'var(--text-dark)' }}>
                            ₹{stats.totalActive.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </h3>
                    </div>
                </div>

                {/* Stat: Late In Penalties */}
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
                        <RefreshCw size={22} className="spin-slow" />
                    </div>
                    <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Late In Total</span>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '900', color: 'var(--text-dark)' }}>
                            ₹{stats.totalLateIn.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </h3>
                    </div>
                </div>

                {/* Stat: Early Out Penalties */}
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
                    <div style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={22} />
                    </div>
                    <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Early Out Total</span>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '900', color: 'var(--text-dark)' }}>
                            ₹{stats.totalEarlyOut.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </h3>
                    </div>
                </div>

                {/* Stat: Waived Penalties count */}
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
                        <Award size={24} />
                    </div>
                    <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Waived Instances</span>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '900', color: 'var(--text-dark)' }}>{stats.waivedCount}</h3>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="hrm-card" style={{ padding: 0, overflow: 'hidden', border: '1.5px solid var(--border)', borderRadius: '18px', background: 'var(--card-bg)' }}>
                <div className="hrm-table-container" style={{ margin: 0 }}>
                    <table className="hrm-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', padding: '12px' }}>
                        <thead>
                            <tr style={{ background: 'transparent' }}>
                                <th style={{ borderBottom: 'none', padding: '16px 20px', fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ borderBottom: 'none', padding: '16px 20px', fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Employee Details</th>
                                <th style={{ borderBottom: 'none', padding: '16px 20px', fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Late In Penalty</th>
                                <th style={{ borderBottom: 'none', padding: '16px 20px', fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Early Out Penalty</th>
                                <th style={{ borderBottom: 'none', padding: '16px 20px', fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Penalty</th>
                                <th style={{ borderBottom: 'none', padding: '16px 20px', fontSize: '11.5px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', width: '120px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '80px 0', textAlign: 'center' }}>
                                        <div className="spinner" style={{ border: '3px solid var(--border)', borderTop: '3px solid var(--primary-blue)', borderRadius: '50%', width: '28px', height: '28px', margin: '0 auto 12px auto', animation: 'spin 1s linear infinite' }}></div>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>Fetching penalty records...</div>
                                    </td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '80px 0', textAlign: 'center' }}>
                                        <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <ShieldAlert size={40} style={{ opacity: 0.6 }} />
                                            <span style={{ fontSize: '14.5px', fontWeight: '700' }}>No penalties found for this period</span>
                                            <span style={{ fontSize: '12px', maxWidth: '300px' }}>No automated shift penalty alerts have been generated based on current filters.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRecords.map((r, i) => {
                                const totalDayPenalty = (r.lateInPenalty?.amount || 0) + (r.earlyOutPenalty?.amount || 0);
                                return (
                                    <tr 
                                        key={r._id || i} 
                                        className="premium-table-row"
                                        style={{
                                            background: 'var(--bg-main)',
                                            borderRadius: '12px',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <td style={{ padding: '18px 20px', borderRadius: '12px 0 0 12px', borderBottom: 'none' }}>
                                            <div style={{ fontSize: '14px', fontWeight: '850', color: 'var(--text-dark)' }}>{r.date}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Attendance Day</div>
                                        </td>
                                        <td style={{ padding: '18px 20px', borderBottom: 'none' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1.5px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                                    {r.employee?.profilePhoto ? (
                                                        <img src={`${API_URL}/uploads/${r.employee.profilePhoto}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <span style={{ fontWeight: '800', color: 'var(--text-muted)', fontSize: '14px' }}>{r.employee?.name ? r.employee.name[0] : 'E'}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>{r.employee?.name || 'N/A'}</p>
                                                    <p style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{r.employee?.employeeId || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '18px 20px', borderBottom: 'none' }}>
                                            {r.lateInPenalty?.isLate ? (
                                                <div>
                                                    <span style={{ fontSize: '13px', fontWeight: '800', color: r.lateInPenalty?.amount > 0 ? '#EF4444' : '#10B981' }}>
                                                        ₹{r.lateInPenalty?.amount || 0}
                                                    </span>
                                                    {r.lateInPenalty?.amount === 0 && (
                                                        <span style={{ fontSize: '10px', display: 'block', color: 'var(--text-muted)', fontWeight: '600' }}>Waived</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>---</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '18px 20px', borderBottom: 'none' }}>
                                            {r.earlyOutPenalty?.isEarly ? (
                                                <div>
                                                    <span style={{ fontSize: '13px', fontWeight: '800', color: r.earlyOutPenalty?.amount > 0 ? '#EF4444' : '#10B981' }}>
                                                        ₹{r.earlyOutPenalty?.amount || 0}
                                                    </span>
                                                    {r.earlyOutPenalty?.amount === 0 && (
                                                        <span style={{ fontSize: '10px', display: 'block', color: 'var(--text-muted)', fontWeight: '600' }}>Waived</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>---</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '18px 20px', borderBottom: 'none' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '900', color: totalDayPenalty > 0 ? '#EF4444' : 'var(--text-secondary)' }}>
                                                ₹{totalDayPenalty}
                                            </span>
                                        </td>
                                        <td style={{ padding: '18px 20px', borderRadius: '0 12px 12px 0', textAlign: 'center', borderBottom: 'none' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                <button 
                                                    className="btn-download-slip" 
                                                    style={{ 
                                                        padding: '6px 10px', 
                                                        borderRadius: '8px', 
                                                        border: '1.5px solid var(--border)', 
                                                        background: 'var(--card-bg)', 
                                                        color: 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: '700'
                                                    }}
                                                    onClick={() => openEditModal(r)}
                                                    title="Edit Penalty Amounts"
                                                >
                                                    <Edit2 size={12} /> Edit
                                                </button>
                                                
                                                {totalDayPenalty > 0 && (
                                                    <button 
                                                        className="btn-download-slip" 
                                                        style={{ 
                                                            padding: '6px 10px', 
                                                            borderRadius: '8px', 
                                                            border: '1.5px solid rgba(16, 185, 129, 0.3)', 
                                                            background: 'rgba(16, 185, 129, 0.05)', 
                                                            color: '#10B981',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            fontSize: '11px',
                                                            fontWeight: '700'
                                                        }}
                                                        onClick={() => {
                                                            if (r.lateInPenalty?.amount > 0) handleWaivePenalty(r, 'Late In');
                                                            if (r.earlyOutPenalty?.amount > 0) handleWaivePenalty(r, 'Early Out');
                                                        }}
                                                        title="Waive all penalties"
                                                    >
                                                        Waive
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit modal */}
            {editingRecord && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    animation: 'fadeIn 0.25s ease-out'
                }}>
                    <div style={{
                        background: 'var(--card-bg)',
                        border: '1.5px solid var(--border)',
                        borderRadius: '18px',
                        padding: '28px',
                        width: '420px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                        position: 'relative'
                    }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '800', color: 'var(--text-dark)' }}>Modify Shift Penalty</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', margin: '0 0 20px 0' }}>
                            Adjust penalty amounts generated for {editingRecord.employee?.name} on {editingRecord.date}.
                        </p>

                        <form onSubmit={handleSavePenalty}>
                            {editingRecord.lateInPenalty?.isLate && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>Late In Penalty (₹)</label>
                                    <input 
                                        type="number" 
                                        value={lateInAmount}
                                        onChange={(e) => setLateInAmount(Number(e.target.value))}
                                        style={{
                                            width: '100%',
                                            height: '40px',
                                            padding: '0 12px',
                                            border: '1.5px solid var(--border)',
                                            borderRadius: '10px',
                                            background: 'var(--bg-main)',
                                            color: 'var(--text-primary)',
                                            outline: 'none',
                                            fontWeight: '700'
                                        }}
                                    />
                                </div>
                            )}

                            {editingRecord.earlyOutPenalty?.isEarly && (
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>Early Out Penalty (₹)</label>
                                    <input 
                                        type="number" 
                                        value={earlyOutAmount}
                                        onChange={(e) => setEarlyOutAmount(Number(e.target.value))}
                                        style={{
                                            width: '100%',
                                            height: '40px',
                                            padding: '0 12px',
                                            border: '1.5px solid var(--border)',
                                            borderRadius: '10px',
                                            background: 'var(--bg-main)',
                                            color: 'var(--text-primary)',
                                            outline: 'none',
                                            fontWeight: '700'
                                        }}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setEditingRecord(null)}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: '10px',
                                        border: '1.5px solid var(--border)',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontWeight: '700',
                                        fontSize: '13px'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'var(--primary-blue)',
                                        color: '#FFF',
                                        cursor: 'pointer',
                                        fontWeight: '800',
                                        fontSize: '13px'
                                    }}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CSS styles */}
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }

                    .spin-slow {
                        animation: spin 12s linear infinite;
                    }

                    .search-input-focus:focus {
                        border-color: var(--primary-blue) !important;
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
                    }

                    .premium-table-row:hover {
                        background: var(--bg-elevated) !important;
                        transform: translateY(-1.5px);
                        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.03);
                    }

                    .animate-fade-in {
                        animation: fadeIn 0.3s ease-out;
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(8px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </div>
    );
};

export default PenaltiesList;
