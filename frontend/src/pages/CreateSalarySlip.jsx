import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, RefreshCw, Calendar, DollarSign, Briefcase } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import '../pages/AdminDashboard.css';

/* ─── Helpers ─────────────────────────────────────────── */
const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

const countWeekoffs = (year, month) => {
    const d = new Date(year, month - 1, 1);
    let count = 0;
    while (d.getMonth() === month - 1) {
        if (d.getDay() === 0 || d.getDay() === 6) count++;
        d.setDate(d.getDate() + 1);
    }
    return count;
};

const fmt = (n, dec = 2) =>
    Number(n || 0).toLocaleString('en-IN', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec
    });

const round2 = (n) => Math.round((n || 0) * 100) / 100;

/* ─── Default form state ──────────────────────────────── */
const defaultForm = () => ({
    // salaryType: 'Per Day Salary Month Wise',
    monthWorkingDays: 26,
    employeeWorkingDays: 26,
    paidLeave: 0,
    unpaidLeave: 0,
    extraDays: 0,
    extraDaysPaid: 0,
    paidHolidays: 0,
    paidWeekOff: 0,
    otherEarnings: 0,
    otherDeduction: 0,
    description: ''
});

/* ─── Component ───────────────────────────────────────── */
const CreateSalarySlip = () => {
    const navigate = useNavigate();
    const today = new Date();
    const todayMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    /* Data */
    const [allEmployees, setAllEmployees] = useState([]);
    const [ctcData, setCtcData] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ctcLoading, setCtcLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    /* Filters */
    const [branch, setBranch] = useState('');
    const [department, setDepartment] = useState('');
    const [monthYear, setMonthYear] = useState(todayMonthYear);

    /* Editable form fields */
    const [form, setForm] = useState(defaultForm());

    /* ── Fetch all employees with CTC on mount ── */
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await authenticatedFetch(`${API_URL}/api/employee-ctc/all`);
                const data = await res.json();     
                if (data.success) {
                    setAllEmployees((data.data || []).filter(e => e.ctcDetails));
                }
            } catch (e) {
                console.error('Fetch employees error:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    /* ── Auto-populate days when monthYear changes ── */
    useEffect(() => {
        if (!monthYear) return;
        const [yr, mn] = monthYear.split('-').map(Number);
        const totalDays = getDaysInMonth(yr, mn);
        const wkoffs = countWeekoffs(yr, mn);
        setForm(prev => ({
            ...prev,
            monthWorkingDays: totalDays - wkoffs,
            paidWeekOff: wkoffs
        }));
    }, [monthYear]);

    /* ── Fetch Attendance Summary for Employee & Month ── */
    useEffect(() => {
        if (!selectedEmployee || !monthYear) return;
        
        (async () => {
            try {
                const res = await authenticatedFetch(`${API_URL}/api/attendance/admin/employee-monthly-summary?employeeId=${selectedEmployee._id}&month=${monthYear}`);
                const data = await res.json();
                if (data.success && data.summary) {
                    const s = data.summary;
                    setForm(prev => ({
                        ...prev,
                        employeeWorkingDays: s.present + (s.halfDay * 0.5),
                        paidLeave: s.paidLeave || 0,
                        unpaidLeave: s.unpaidLeave || 0,
                        extraDays: s.extraDays || 0,
                        extraDaysPaid: s.extraDays || 0,
                        paidHolidays: s.holiday || 0,
                        paidWeekOff: s.weekOff || 0,
                        monthWorkingDays: s.monthWorkingDays !== undefined ? s.monthWorkingDays : prev.monthWorkingDays
                    }));
                }
            } catch (e) {
                console.error('Fetch attendance summary error:', e);
            }
        })();
    }, [selectedEmployee, monthYear]);

    /* ── Fetch full CTC for selected employee ── */
    const fetchCTC = async (empId) => {
        try {
            setCtcLoading(true);
            setCtcData(null);
            const res = await authenticatedFetch(`${API_URL}/api/employee-ctc/${empId}`);
            const data = await res.json();
            if (data.success && data.ctc) setCtcData(data.ctc);
            else Swal.fire('No CTC', 'This employee does not have an active CTC configured.', 'warning');
        } catch (e) {
            console.error('Fetch CTC error:', e);
        } finally {
            setCtcLoading(false);
        }
    };

    /* ── Derived dropdowns ── */
    const uniqueBranches = useMemo(() => {
        return [...new Set(allEmployees.map(e => e.branch).filter(Boolean))].sort();
    }, [allEmployees]);

    const filteredDepts = useMemo(() => {
        const base = branch ? allEmployees.filter(e => e.branch === branch) : allEmployees;
        return [...new Set(base.map(e => e.department).filter(Boolean))].sort();
    }, [allEmployees, branch]);

    const filteredEmps = useMemo(() => {
        return allEmployees.filter(e => {
            if (branch && e.branch !== branch) return false;
            if (department && e.department !== department) return false;
            return true;
        });
    }, [allEmployees, branch, department]);

    /* ── Handlers ── */
    const handleBranchChange = (val) => {
        setBranch(val);
        setDepartment('');
        setSelectedEmployee(null);
        setCtcData(null);
    };

    const handleDeptChange = (val) => {
        setDepartment(val);
        setSelectedEmployee(null);
        setCtcData(null);
    };

    const handleEmployeeChange = (empId) => {
        if (!empId) { setSelectedEmployee(null); setCtcData(null); return; }
        const emp = allEmployees.find(e => e._id === empId);
        setSelectedEmployee(emp || null);
        if (emp) fetchCTC(emp._id);
    };

    const setField = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

    /* ── All auto-calculations (reactive) ── */
    const derived = useMemo(() => {
        if (!ctcData) return null;

        const grossMonthly = ctcData.monthlyGross || 0;
        const mwd  = Math.max(Number(form.monthWorkingDays) || 1, 1);
        const ewd  = Number(form.employeeWorkingDays) || 0;
        const pl   = Number(form.paidLeave) || 0;
        const ul   = Number(form.unpaidLeave) || 0;
        const ph   = Number(form.paidHolidays) || 0;
        const pwo  = Number(form.paidWeekOff) || 0;
        const edp  = Number(form.extraDaysPaid) || 0;
        const oe   = Number(form.otherEarnings) || 0;
        const od   = Number(form.otherDeduction) || 0;

        const totalLeaves      = pl + ul;
        const totalDivisor     = Math.max(mwd + pwo + ph, 1);
        const perDaySalary     = round2(grossMonthly / totalDivisor);
        const perDaySalaryExt  = perDaySalary;
        const paidDays         = ewd + pl + ph + pwo;
        const thisMonthGross   = round2(perDaySalary * paidDays);
        const extraEarning     = round2(edp * perDaySalaryExt);

        const earnings = (ctcData.earnings || []).map(e => ({
            componentName:    e.componentName,
            monthlyAmount:    Number(e.amount) || 0,
            calculatedAmount: grossMonthly > 0
                ? round2(((e.amount || 0) / grossMonthly) * thisMonthGross)
                : 0
        }));

        const deductions = (ctcData.deductions || []).map(d => ({
            componentName: d.componentName,
            amount: Number(d.amount) || 0
        }));

        const totalEarnings   = round2(earnings.reduce((s, e) => s + e.calculatedAmount, 0) + oe + extraEarning);
        const totalDeductions = round2(deductions.reduce((s, d) => s + d.amount, 0) + od);
        const netSalary       = round2(totalEarnings - totalDeductions);

        return {
            totalLeaves, perDaySalary, perDaySalaryExt, thisMonthGross,
            earnings, deductions, extraEarning,
            totalEarnings, totalDeductions, netSalary,
            joiningNetSalary:    ctcData.netSalary     || 0,
            joiningMonthlyGross: grossMonthly
        };
    }, [ctcData, form]);

    /* ── Month date range for title ── */
    const monthDateRange = useMemo(() => {
        if (!monthYear) return '';
        const [yr, mn] = monthYear.split('-').map(Number);
        const last = getDaysInMonth(yr, mn);
        const p = n => String(n).padStart(2, '0');
        return `Start Date ${p(1)}-${p(mn)}-${yr} – End Date ${p(last)}-${p(mn)}-${yr}`;
    }, [monthYear]);

    const monthLabel = useMemo(() => {
        if (!monthYear) return '';
        const [yr, mn] = monthYear.split('-').map(Number);
        return new Date(yr, mn - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    }, [monthYear]);

    /* ── Submit ── */
    const handleSubmit = async () => {
        if (!selectedEmployee || !ctcData || !derived) {
            return Swal.fire('Incomplete', 'Please select branch, department, month and employee first.', 'warning');
        }
        const [yr, mn] = monthYear.split('-').map(Number);
        const payload = {
            employeeId:           selectedEmployee._id,
            month:                mn,
            year:                 yr,
            branch:               selectedEmployee.branch || '',
            department:           selectedEmployee.department || '',
            designation:          selectedEmployee.designation || '',
            salaryType:           form.salaryType,
            monthWorkingDays:     Number(form.monthWorkingDays),
            employeeWorkingDays:  Number(form.employeeWorkingDays),
            paidLeave:            Number(form.paidLeave),
            unpaidLeave:          Number(form.unpaidLeave),
            totalLeaves:          derived.totalLeaves,
            extraDays:            Number(form.extraDaysPaid),
            extraDaysPaid:        Number(form.extraDaysPaid),
            paidHolidays:         0,
            paidWeekOff:          Number(form.paidWeekOff),
            joiningNetSalary:     derived.joiningNetSalary,
            joiningMonthlyGross:  derived.joiningMonthlyGross,
            thisMonthGross:       derived.thisMonthGross,
            perDaySalary:         derived.perDaySalary,
            perDaySalaryExtra:    derived.perDaySalaryExt,
            earnings:             derived.earnings,
            deductions:           derived.deductions,
            otherEarnings:        Number(form.otherEarnings),
            otherDeduction:       Number(form.otherDeduction),
            totalEarnings:        derived.totalEarnings,
            totalDeductions:      derived.totalDeductions,
            netSalary:            derived.netSalary,
            description:          form.description,
            status:               'Generated'
        };

        setSubmitting(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/salary-slip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Salary Slip Generated!',
                    html: `Slip for <strong>${selectedEmployee.name}</strong> — ${monthLabel}<br/>Net Salary: <strong>₹${fmt(derived.netSalary)}</strong>`,
                    confirmButtonColor: '#3B648B'
                });
                setSelectedEmployee(null);
                setCtcData(null);
                navigate('/admin/payroll/generate-slip');
            } else {
                Swal.fire('Error', data.message || 'Failed to save salary slip', 'error');
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Server connection error', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Style helpers ── */
    const inp = (ro = false) => ({
        width: '100%', height: '42px', padding: '9px 12px', boxSizing: 'border-box',
        background: ro ? 'var(--bg-main)' : 'var(--card-bg)',
        border: '1px solid var(--border)', borderRadius: '8px',
        color: ro ? 'var(--text-secondary)' : 'var(--text-dark)',
        fontSize: '13px', fontWeight: ro ? 500 : 600,
        outline: 'none', transition: 'border-color 0.2s',
        cursor: ro ? 'default' : 'auto'
    });

    const lbl = {
        display: 'block', fontSize: '11px', fontWeight: 700,
        color: 'var(--text-secondary)', marginBottom: '6px',
        textTransform: 'uppercase', letterSpacing: '0.5px'
    };

    const row = (cols) => ({
        display: 'grid', gridTemplateColumns: cols, gap: '18px', marginBottom: '18px'
    });

    const fld = { display: 'flex', flexDirection: 'column' };

    /* ── Render ── */
    return (
        <div className="hrm-container" style={{ fontFamily: "'Inter', sans-serif", paddingBottom: '60px' }}>
            {/* ── Page Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <button
                    className="icon-btn"
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', flexShrink: 0 }}
                    onClick={() => navigate('/admin/payroll/employee-ctc')}
                    title="Back"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)', margin: 0, lineHeight: 1.2, letterSpacing: '-0.4px' }}>
                        Create Salary Slip
                    </h1>
                    {selectedEmployee && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {monthDateRange}
                        </p>
                    )}
                </div>
            </div>

            {/* ── Selection Card (Filters) ── */}
            <div className="hrm-card" style={{ padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    <div style={fld}>
                        <label style={lbl}>Branch <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <select value={branch} onChange={e => handleBranchChange(e.target.value)} style={inp()}>
                            <option value="">-- Select --</option>
                            {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div style={fld}>
                        <label style={lbl}>Department <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <select value={department} onChange={e => handleDeptChange(e.target.value)} style={inp()} disabled={!branch}>
                            <option value="">-- Select --</option>
                            {filteredDepts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div style={fld}>
                        <label style={lbl}>Month Year <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                type="month"
                                value={monthYear}
                                onChange={e => setMonthYear(e.target.value)}
                                onClick={e => {
                                    try {
                                        e.target.showPicker();
                                    } catch (err) {}
                                }}
                                style={{ ...inp(), cursor: 'pointer' }}
                            />
                        </div>
                    </div>
                    <div style={fld}>
                        <label style={lbl}>Employee Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <select 
                            value={selectedEmployee?._id || ''} 
                            onChange={e => handleEmployeeChange(e.target.value)} 
                            style={inp(!branch || !department)}
                            disabled={!branch || !department}
                        >
                            <option value="">-- Select --</option>
                            {filteredEmps.map(emp => (
                                <option key={emp._id} value={emp._id}>
                                    {emp.name}{emp.employeeId ? ` (${emp.employeeId})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Loading CTC ── */}
            {ctcLoading && (
                <div className="hrm-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>Loading employee CTC data…</p>
                </div>
            )}

            {/* ── Empty state ── */}
            {!ctcLoading && !selectedEmployee && (
                <div className="hrm-card" style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
                    <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <p style={{ fontWeight: 600, fontSize: '15px', margin: 0 }}>Select branch, department, month and employee to generate slip</p>
                </div>
            )}

            {/* ── Main Work Grid ── */}
            {!ctcLoading && selectedEmployee && derived && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '24px', alignItems: 'start' }}>
                    
                    {/* LEFT PANEL: Inputs & Detailed Breakdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* CARD 1: Attendance & Days */}
                        <div className="hrm-card" style={{ padding: '24px' }}>
                            <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={18} style={{ color: 'var(--primary-blue)' }} /> Attendance & Days
                            </h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div style={fld}>
                                    <label style={lbl}>Month Work Days</label>
                                    <input value={form.monthWorkingDays} disabled readOnly style={inp(true)} />
                                </div>
                                <div style={fld}>
                                    <label style={lbl}>Emp Work Days <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input type="number" value={form.employeeWorkingDays} onChange={e => setField('employeeWorkingDays', e.target.value)} style={inp()} min="0" step="0.5" />
                                </div>
                                <div style={fld}>
                                    <label style={lbl}>Paid Week-Off</label>
                                    <input value={form.paidWeekOff} disabled readOnly style={inp(true)} />
                                </div>
                                <div style={fld}>
                                    <label style={lbl}>Extra Days (Paid) <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input type="number" value={form.extraDaysPaid} onChange={e => setField('extraDaysPaid', e.target.value)} style={inp()} min="0" step="0.5" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                                <div style={fld}>
                                    <label style={lbl}>Paid Leave <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input type="number" value={form.paidLeave} onChange={e => setField('paidLeave', e.target.value)} style={inp()} min="0" step="0.5" />
                                </div>
                                <div style={fld}>
                                    <label style={lbl}>Unpaid Leave <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input type="number" value={form.unpaidLeave} onChange={e => setField('unpaidLeave', e.target.value)} style={inp()} min="0" step="0.5" />
                                </div>
                                <div style={fld}>
                                    <label style={lbl}>Total Leaves</label>
                                    <input value={derived.totalLeaves} disabled readOnly style={inp(true)} />
                                </div>
                                <div style={fld} /> {/* Align grid */}
                            </div>
                        </div>

                        {/* CARD 2: Earnings & Deductions Breakdown */}
                        <div className="hrm-card" style={{ padding: '24px' }}>
                            <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <DollarSign size={18} style={{ color: 'var(--primary-blue)' }} /> Salary Breakdown (This Month)
                            </h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {/* Left Sub-card: Earnings */}
                                <div style={{ background: 'var(--bg-main)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
                                    <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 700, color: 'var(--success)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                                        Earnings
                                    </h4>
                                    {derived.earnings.map((e, idx) => (
                                        <div key={idx} style={{ marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>{e.componentName}</span>
                                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Base: ₹{fmt(e.monthlyAmount)}</span>
                                            </div>
                                            <input value={fmt(e.calculatedAmount)} readOnly style={{ ...inp(true), background: 'var(--card-bg)' }} />
                                        </div>
                                    ))}
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={lbl}>Other Earnings</label>
                                        <input
                                            type="number"
                                            value={form.otherEarnings}
                                            onChange={e => setField('otherEarnings', e.target.value)}
                                            style={inp()}
                                            min="0"
                                            step="any"
                                        />
                                    </div>
                                </div>

                                {/* Right Sub-card: Deductions */}
                                <div style={{ background: 'var(--bg-main)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
                                    <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 700, color: 'var(--danger)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                                        Deductions
                                    </h4>
                                    {derived.deductions.map((d, idx) => (
                                        <div key={idx} style={{ marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>{d.componentName}</span>
                                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Base: ₹{fmt(d.amount)}</span>
                                            </div>
                                            <input value={fmt(d.amount)} readOnly style={{ ...inp(true), background: 'var(--card-bg)' }} />
                                        </div>
                                    ))}
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={lbl}>Other Deduction</label>
                                        <input
                                            type="number"
                                            value={form.otherDeduction}
                                            onChange={e => setField('otherDeduction', e.target.value)}
                                            style={inp()}
                                            min="0"
                                            step="any"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 500, margin: '16px 0 0 0', fontStyle: 'italic', textAlign: 'center' }}>
                                * To edit or delete any earning/deduction component, please update the employee's CTC configuration.
                            </p>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Sticky Summary & Action */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '24px' }}>
                        
                        {/* CARD 3: Employee Info & CTC Snapshot */}
                        <div className="hrm-card" style={{ padding: '20px' }}>
                            <h3 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Briefcase size={16} style={{ color: 'var(--primary-blue)' }} /> CTC Snapshot
                            </h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dotted var(--border)' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Joining Monthly Gross</span>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>₹{fmt(derived.joiningMonthlyGross)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dotted var(--border)' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Joining Net Salary</span>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>₹{fmt(derived.joiningNetSalary)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dotted var(--border)' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Per Day (Working)</span>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>₹{fmt(derived.perDaySalary)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Per Day (Extra)</span>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>₹{fmt(derived.perDaySalaryExt)}</span>
                                </div>
                            </div>
                        </div>

                        {/* CARD 4: Payout Summary */}
                        <div className="hrm-card" style={{ padding: '20px', background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>
                                Payout Summary
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>This Month Gross</span>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-blue)' }}>₹{fmt(derived.thisMonthGross)}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Earnings</span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success)' }}>+ ₹{fmt(derived.totalEarnings)}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Deductions</span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger)' }}>- ₹{fmt(derived.totalDeductions)}</span>
                                </div>
                            </div>

                            {/* Net Salary Box */}
                            <div style={{ textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                                <span style={{ ...lbl, textAlign: 'center', fontSize: '10px', marginBottom: '4px' }}>Net Salary Payout ({monthLabel})</span>
                                <span style={{
                                    fontSize: '20px',
                                    fontWeight: 800,
                                    color: derived.netSalary >= 0 ? 'var(--primary-blue)' : 'var(--danger)',
                                    display: 'block'
                                }}>
                                    ₹{fmt(derived.netSalary)}
                                </span>
                            </div>

                            {/* Description */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={lbl}>Description / Notes</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setField('description', e.target.value)}
                                    style={{ ...inp(), background: 'var(--card-bg)', height: 'auto', resize: 'vertical', minHeight: '60px' }}
                                    placeholder="Add remarks..."
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                className="btn-hrm btn-hrm-primary"
                                onClick={handleSubmit}
                                disabled={submitting}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '12px',
                                    fontSize: '13px',
                                    fontWeight: 700
                                }}
                            >
                                <FileText size={16} />
                                {submitting ? 'Saving…' : 'Generate Salary Slip'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Inline animation style ── */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default CreateSalarySlip;
