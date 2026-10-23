import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    TrendingUp, TrendingDown, Plus, Search, RotateCcw,
    Calendar, DollarSign, Percent, X, Save, Eye,
    AlertCircle, BarChart3, ArrowUpRight, ArrowDownRight,
    History, Undo2, Clock, CheckCircle2, AlertTriangle, Info
} from 'lucide-react';
import Swal from 'sweetalert2';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import SearchableSelect from '../components/SearchableSelect';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';
const fmtCurrency = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtPct = n => `${Number(n || 0) >= 0 ? '+' : ''}${Number(n || 0).toFixed(2)}%`;
const fmtMonthStr = s => {
    if (!s) return '';
    const [y, m] = s.split('-');
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const EMPTY_FORM = {
    employeeId: '',
    adjustmentMode: 'percentage',
    adjustmentValue: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    remark: ''
};

// ── Main Component ────────────────────────────────────────────────────────────
const SalaryRevision = () => {
    const [revisions, setRevisions] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRevision, setSelectedRevision] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [employeeCTC, setEmployeeCTC] = useState(null);
    const [ctcLoading, setCtcLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [previewSalary, setPreviewSalary] = useState(null);
    const [arrearsPreview, setArrearsPreview] = useState(null);
    const [arrearsLoading, setArrearsLoading] = useState(false);
    const [settlingId, setSettlingId] = useState(null);

    useEffect(() => { fetchAll(); }, []);

    // Debounced arrears preview fetch when form changes
    useEffect(() => {
        if (!form.employeeId || !form.adjustmentValue || !form.effectiveDate || !employeeCTC) {
            setArrearsPreview(null);
            return;
        }
        const val = parseFloat(form.adjustmentValue);
        if (isNaN(val) || val === 0) { setArrearsPreview(null); return; }

        // Compute local preview first (instant)
        const prevNet = employeeCTC.netSalary || 0;
        let newNet;
        if (form.adjustmentMode === 'percentage') {
            newNet = Math.round(prevNet * (1 + val / 100));
        } else {
            newNet = Math.round(prevNet + val / 12);
        }

        const prevAnnual = employeeCTC.annualCTC || 0;
        const prevMonthly = employeeCTC.monthlyGross || 0;
        let newAnnual, newMonthly;
        if (form.adjustmentMode === 'percentage') {
            const f = 1 + val / 100;
            newAnnual = Math.round(prevAnnual * f);
            newMonthly = Math.round(prevMonthly * f);
        } else {
            newAnnual = Math.round(prevAnnual + val);
            newMonthly = Math.round(prevMonthly + val / 12);
        }

        const delta = newAnnual - prevAnnual;
        const deltaPct = prevAnnual > 0 ? ((delta / prevAnnual) * 100).toFixed(2) : 0;
        setPreviewSalary({ prevAnnual, prevMonthly, prevNet, newAnnual, newMonthly, newNet, delta, deltaPct, type: delta >= 0 ? 'Increment' : 'Decrement' });

        // Fetch server-side arrears preview (checks actual slip existence)
        const timer = setTimeout(async () => {
            setArrearsLoading(true);
            try {
                const res = await authenticatedFetch(`${API_URL}/api/salary-revision/preview-arrears`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employeeId: form.employeeId,
                        adjustmentMode: form.adjustmentMode,
                        adjustmentValue: val,
                        effectiveDate: form.effectiveDate
                    })
                });
                const data = await res.json();
                if (data.success) setArrearsPreview(data.preview);
            } catch { /* silently fail */ }
            finally { setArrearsLoading(false); }
        }, 600);
        return () => clearTimeout(timer);
    }, [form.adjustmentValue, form.adjustmentMode, form.effectiveDate, form.employeeId, employeeCTC]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [rRes, eRes, sRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/salary-revision`),
                authenticatedFetch(`${API_URL}/api/users`),
                authenticatedFetch(`${API_URL}/api/salary-revision/stats`)
            ]);
            const [rData, eData, sData] = await Promise.all([rRes.json(), eRes.json(), sRes.json()]);
            if (rData.success) setRevisions(rData.revisions || []);
            if (eData.success) setEmployees((eData.users || []).filter(u => u.role !== 'Admin' && !['Ex-Employee', 'Terminated'].includes(u.status)));
            if (sData.success) setStats(sData.stats);
        } catch {
            Swal.fire('Error', 'Failed to load revision data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEmployeeChange = async (empId) => {
        setForm(f => ({ ...f, employeeId: empId }));
        setArrearsPreview(null);
        setPreviewSalary(null);
        if (!empId) { setEmployeeCTC(null); return; }
        setCtcLoading(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/employee-ctc/${empId}`);
            const data = await res.json();
            if (data.success) setEmployeeCTC(data.ctc);
            else { setEmployeeCTC(null); }
        } catch { setEmployeeCTC(null); }
        finally { setCtcLoading(false); }
    };

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.employeeId || !form.adjustmentValue || !form.effectiveDate || !employeeCTC) {
            Swal.fire('Validation', 'Please fill all required fields.', 'warning'); return;
        }

        const arrearsHtml = arrearsPreview?.isBackdated && arrearsPreview?.arrearsAmount !== 0
            ? `<div style="margin-top:12px;padding:10px 12px;background:${arrearsPreview.arrearsAmount > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(220,38,38,0.08)'};border-radius:8px;border:1px solid ${arrearsPreview.arrearsAmount > 0 ? '#f59e0b' : '#dc2626'};text-align:left;font-size:13px">
                <b>⚠ Backdated Effective Date Detected</b><br/>
                <b>Arrears: ${fmtCurrency(arrearsPreview.arrearsAmount)}</b> across <b>${arrearsPreview.arrearsMonths?.length} month(s)</b><br/>
                <span style="color:#64748b;font-size:12px">You'll need to settle these arrears separately.</span>
               </div>`
            : '';

        const { isConfirmed } = await Swal.fire({
            title: `Confirm Salary ${previewSalary?.type || 'Revision'}`,
            html: previewSalary
                ? `<div style="text-align:left;font-size:14px">
                    <b>Annual CTC:</b> ${fmtCurrency(previewSalary.prevAnnual)} → <b>${fmtCurrency(previewSalary.newAnnual)}</b><br/>
                    <b>Monthly Gross:</b> ${fmtCurrency(previewSalary.prevMonthly)} → <b>${fmtCurrency(previewSalary.newMonthly)}</b><br/>
                    <b>Delta:</b> ${fmtCurrency(previewSalary.delta)} (${fmtPct(previewSalary.deltaPct)})<br/>
                    <b>Effective From:</b> ${fmtDate(form.effectiveDate)}
                   </div>${arrearsHtml}`
                : 'Apply this salary revision?',
            icon: previewSalary?.type === 'Increment' ? 'success' : 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Apply',
            cancelButtonText: 'Cancel',
            confirmButtonColor: previewSalary?.type === 'Increment' ? '#16a34a' : '#dc2626'
        });
        if (!isConfirmed) return;

        setSaving(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/salary-revision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, adjustmentValue: parseFloat(form.adjustmentValue) })
            });
            const data = await res.json();
            if (data.success) {
                // Show arrears notification if backdated
                if (data.arrearsInfo?.isBackdated && data.arrearsInfo?.arrearsAmount !== 0) {
                    await Swal.fire({
                        title: 'Revision Applied + Arrears Detected',
                        html: `<div style="text-align:left;font-size:14px">
                            ✅ Salary ${data.revision.revisionType.toLowerCase()} applied successfully.<br/><br/>
                            <b>📅 Backdated Arrears:</b><br/>
                            • <b>${fmtCurrency(data.arrearsInfo.arrearsAmount)}</b> owed across <b>${data.arrearsInfo.arrearsMonths?.length} month(s)</b><br/>
                            • Months: ${(data.arrearsInfo.arrearsMonths || []).map(m => fmtMonthStr(m.monthStr)).join(', ')}<br/><br/>
                            <span style="color:#64748b;font-size:12px">Please settle these arrears in the next salary cycle or manually adjust the affected salary slips.</span>
                        </div>`,
                        icon: 'info',
                        confirmButtonText: 'Got it'
                    });
                } else {
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: data.message, showConfirmButton: false, timer: 3000 });
                }
                setShowModal(false);
                setForm(EMPTY_FORM);
                setEmployeeCTC(null);
                setPreviewSalary(null);
                setArrearsPreview(null);
                fetchAll();
            } else {
                Swal.fire('Error', data.message || 'Failed to apply revision', 'error');
            }
        } catch { Swal.fire('Error', 'Network error', 'error'); }
        finally { setSaving(false); }
    };

    const handleRevert = async (rev) => {
        const { isConfirmed } = await Swal.fire({
            title: 'Revert This Revision?',
            html: `This will restore the salary to <b>${fmtCurrency(rev.previousAnnualCTC)}</b> annual CTC.`,
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Yes, Revert', confirmButtonColor: '#dc2626'
        });
        if (!isConfirmed) return;
        try {
            const res = await authenticatedFetch(`${API_URL}/api/salary-revision/${rev._id}/revert`, { method: 'PATCH' });
            const data = await res.json();
            if (data.success) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Revision reverted', showConfirmButton: false, timer: 2500 });
                fetchAll();
            } else Swal.fire('Error', data.message, 'error');
        } catch { Swal.fire('Error', 'Network error', 'error'); }
    };

    const handleSettleArrears = async (rev) => {
        const { value: remark, isConfirmed } = await Swal.fire({
            title: `Settle Arrears — ${fmtCurrency(rev.arrearsAmount)}`,
            html: `<div style="text-align:left;font-size:14px;margin-bottom:12px">
                <b>Affected months:</b><br/>
                ${(rev.arrearsMonths || []).map(m => `• ${fmtMonthStr(m.monthStr)} — ${fmtCurrency(m.monthlyDelta)}`).join('<br/>')}
            </div>
            <input id="swal-remark" class="swal2-input" placeholder="Settlement remark (optional)">`,
            showCancelButton: true, confirmButtonText: 'Mark as Settled',
            confirmButtonColor: '#16a34a',
            preConfirm: () => document.getElementById('swal-remark')?.value || ''
        });
        if (!isConfirmed) return;
        setSettlingId(rev._id);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/salary-revision/${rev._id}/settle-arrears`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ remark: remark || '' })
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Arrears settled', showConfirmButton: false, timer: 2500 });
                fetchAll();
            } else Swal.fire('Error', data.message, 'error');
        } catch { Swal.fire('Error', 'Network error', 'error'); }
        finally { setSettlingId(null); }
    };

    const openDetail = (rev) => { setSelectedRevision(rev); setShowDetailModal(true); };
    const closeModals = () => {
        setShowModal(false); setShowDetailModal(false);
        setForm(EMPTY_FORM); setEmployeeCTC(null);
        setPreviewSalary(null); setArrearsPreview(null);
    };

    const filtered = useMemo(() => revisions.filter(r => {
        const name = r.employeeId?.name?.toLowerCase() || '';
        const empId = r.employeeId?.employeeId?.toLowerCase() || '';
        const q = search.toLowerCase();
        return (!search || name.includes(q) || empId.includes(q)) &&
               (!filterType || r.revisionType === filterType);
    }), [revisions, search, filterType]);

    const employeeOptions = employees.map(e => ({
        value: e._id,
        label: `${e.name} (${e.employeeId || 'No ID'}) — ${e.designation || 'N/A'}`
    }));

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: '24px', minHeight: '100vh', background: 'var(--bg-primary, #f8fafc)' }}>
            {/* ── Header ── */}
            <div className="hrm-header" style={{ marginBottom: 28 }}>
                <div>
                    <h1 className="hrm-title" style={{ margin: 0 }}>Salary Revision</h1>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #64748b)', fontSize: 14 }}>
                        Increment / decrement with effective dates — supports backdated revisions &amp; arrears tracking
                    </p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="btn-hrm btn-hrm-primary"
                    style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={16} /> APPLY SALARY REVISION
                </button>
            </div>

            {/* ── Stats ── */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 16, marginBottom: 28 }}>
                    <StatCard icon={<TrendingUp size={20} />} label="Total Increments" value={stats.totalIncrements} color="#16a34a" bg="rgba(22,163,74,0.1)" />
                    <StatCard icon={<TrendingDown size={20} />} label="Total Decrements" value={stats.totalDecrements} color="#dc2626" bg="rgba(220,38,38,0.1)" />
                    <StatCard icon={<Percent size={20} />} label="Avg Delta" value={`${stats.avgDeltaPercentage}%`} color="var(--primary-blue, #2563eb)" bg="rgba(37,99,235,0.1)" />
                    <StatCard icon={<Clock size={20} />} label="Pending Arrears" value={stats.pendingArrears} color="#f59e0b" bg="rgba(245,158,11,0.1)"
                        sub={stats.totalPendingArrearsAmount > 0 ? fmtCurrency(stats.totalPendingArrearsAmount) : null} />
                </div>
            )}

            {/* ── Pending Arrears Banner ── */}
            {stats?.pendingArrears > 0 && (
                <div style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(234,179,8,0.06))', border: '1.5px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
                    <div>
                        <div style={{ fontWeight: 700, color: '#92400e', fontSize: 14 }}>
                            {stats.pendingArrears} revision(s) have unsettled backdated arrears totalling {fmtCurrency(stats.totalPendingArrearsAmount)}
                        </div>
                        <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>
                            Use the "Settle Arrears" button on each revision to mark them as paid.
                        </div>
                    </div>
                </div>
            )}

            {/* ── Filters ── */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or ID..."
                        style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
                </div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    style={{ padding: '10px 16px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff', cursor: 'pointer' }}>
                    <option value="">All Types</option>
                    <option value="Increment">Increments</option>
                    <option value="Decrement">Decrements</option>
                </select>
                <button onClick={fetchAll} className="btn-hrm btn-hrm-secondary" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RotateCcw size={14} /> Refresh
                </button>
            </div>

            {/* ── Table ── */}
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: 'var(--primary-blue, #2563eb)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                        Loading revisions...
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                        <BarChart3 size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <p style={{ margin: 0 }}>No salary revisions found.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                                    {['Employee', 'Type', 'Previous CTC', 'New CTC', 'Delta', 'Effective From', 'Arrears', 'Status', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', fontSize: 13 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((rev, idx) => {
                                    const isInc = rev.revisionType === 'Increment';
                                    const isReverted = rev.status === 'Reverted';
                                    const hasPendingArrears = rev.isBackdated && rev.arrearsStatus === 'Pending' && rev.arrearsAmount !== 0;
                                    return (
                                        <tr key={rev._id}
                                            style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafbfc'}>
                                            {/* Employee */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    {rev.employeeId?.profilePhoto
                                                        ? <img src={rev.employeeId.profilePhoto} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                                                        : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                                                            {(rev.employeeId?.name || 'E')[0].toUpperCase()}
                                                          </div>}
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{rev.employeeId?.name || 'N/A'}</div>
                                                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{rev.employeeId?.employeeId} · {rev.employeeId?.designation}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Type */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: isInc ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)', color: isInc ? '#16a34a' : '#dc2626' }}>
                                                    {isInc ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {rev.revisionType}
                                                </span>
                                                {rev.isBackdated && (
                                                    <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                                                        <Clock size={11} /> Backdated
                                                    </div>
                                                )}
                                            </td>
                                            {/* CTCs */}
                                            <td style={{ padding: '12px 16px', color: '#64748b' }}>{fmtCurrency(rev.previousAnnualCTC)}<div style={{ fontSize: 11, color: '#94a3b8' }}>Annual</div></td>
                                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{fmtCurrency(rev.newAnnualCTC)}<div style={{ fontSize: 11, color: '#94a3b8' }}>Annual</div></td>
                                            {/* Delta */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ fontWeight: 700, color: rev.deltaAmount >= 0 ? '#16a34a' : '#dc2626', fontSize: 13 }}>
                                                    {rev.deltaAmount >= 0 ? '+' : ''}{fmtCurrency(rev.deltaAmount)}
                                                </span>
                                                <div style={{ fontSize: 11, color: rev.deltaPercentage >= 0 ? '#16a34a' : '#dc2626' }}>{fmtPct(rev.deltaPercentage)}</div>
                                            </td>
                                            {/* Effective Date */}
                                            <td style={{ padding: '12px 16px', color: '#64748b' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} />{fmtDate(rev.effectiveDate)}</div>
                                            </td>
                                            {/* Arrears */}
                                            <td style={{ padding: '12px 16px' }}>
                                                {!rev.isBackdated || rev.arrearsAmount === 0
                                                    ? <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                                                    : <div>
                                                        <div style={{ fontWeight: 700, fontSize: 13, color: hasPendingArrears ? '#f59e0b' : '#16a34a' }}>
                                                            {fmtCurrency(rev.arrearsAmount)}
                                                        </div>
                                                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: hasPendingArrears ? 'rgba(245,158,11,0.12)' : 'rgba(220,38,38,0.1)', color: hasPendingArrears ? '#b45309' : '#dc2626' }}>
                                                            {rev.arrearsStatus}
                                                        </span>
                                                      </div>
                                                }
                                            </td>
                                            {/* Status */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: isReverted ? 'rgba(100,116,139,0.1)' : 'rgba(22,163,74,0.1)', color: isReverted ? '#64748b' : '#16a34a' }}>
                                                    {rev.status}
                                                </span>
                                            </td>
                                            {/* Actions */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                    <button onClick={() => openDetail(rev)}
                                                        style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--primary-blue, #2563eb)', fontWeight: 600 }}>
                                                        <Eye size={13} /> View
                                                    </button>
                                                    {hasPendingArrears && !isReverted && (
                                                        <button onClick={() => handleSettleArrears(rev)} disabled={settlingId === rev._id}
                                                            style={{ background: 'rgba(245,158,11,0.1)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#b45309', fontWeight: 600 }}>
                                                            <CheckCircle2 size={13} /> Settle
                                                        </button>
                                                    )}
                                                    {!isReverted && (
                                                        <button onClick={() => handleRevert(rev)}
                                                            style={{ background: '#fef2f2', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                                                            <Undo2 size={13} /> Revert
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
                )}
            </div>

            {/* ── Create Modal ── */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={e => { if (e.target === e.currentTarget) closeModals(); }}>
                    <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        {/* Header */}
                        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 8, padding: '4px 8px', display: 'inline-flex' }}><TrendingUp size={18} color="#fff" /></span>
                                    Apply Salary Revision
                                </h2>
                                <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 13 }}>Backdated dates will auto-calculate arrears</p>
                            </div>
                            <button onClick={closeModals} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}><X size={18} color="#64748b" /></button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ padding: '22px 26px 26px' }}>
                            {/* Employee */}
                            <div style={{ marginBottom: 18 }}>
                                <label style={labelStyle}>Employee <span style={{ color: '#dc2626' }}>*</span></label>
                                <SearchableSelect options={employeeOptions} value={form.employeeId} onChange={handleEmployeeChange} placeholder="Search and select employee..." />
                            </div>

                            {/* Current CTC box */}
                            {ctcLoading && <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 10, color: '#64748b', fontSize: 13, marginBottom: 18 }}>Loading CTC info...</div>}
                            {!ctcLoading && employeeCTC && (
                                <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.06))', border: '1.5px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 18 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Salary</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                        <div><div style={{ fontSize: 11, color: '#94a3b8' }}>Annual CTC</div><div style={{ fontWeight: 700, color: '#1e293b' }}>{fmtCurrency(employeeCTC.annualCTC)}</div></div>
                                        <div><div style={{ fontSize: 11, color: '#94a3b8' }}>Monthly Gross</div><div style={{ fontWeight: 700, color: '#1e293b' }}>{fmtCurrency(employeeCTC.monthlyGross)}</div></div>
                                        <div><div style={{ fontSize: 11, color: '#94a3b8' }}>Net Salary</div><div style={{ fontWeight: 700, color: '#1e293b' }}>{fmtCurrency(employeeCTC.netSalary)}</div></div>
                                    </div>
                                    {employeeCTC.effectiveDate && (
                                        <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>Effective since: {fmtDate(employeeCTC.effectiveDate)}</div>
                                    )}
                                </div>
                            )}
                            {!ctcLoading && form.employeeId && !employeeCTC && (
                                <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#dc2626' }}>
                                    <AlertCircle size={16} /> No CTC record. Please assign CTC first.
                                </div>
                            )}

                            {/* Adjustment Mode */}
                            <div style={{ marginBottom: 18 }}>
                                <label style={labelStyle}>Adjustment Mode <span style={{ color: '#dc2626' }}>*</span></label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {[{ v: 'percentage', icon: <Percent size={15} />, l: 'Percentage' }, { v: 'fixed', icon: <DollarSign size={15} />, l: 'Fixed Amount (₹)' }].map(opt => (
                                        <label key={opt.v} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, padding: '11px 14px', border: `2px solid ${form.adjustmentMode === opt.v ? 'var(--primary-blue, #2563eb)' : '#e2e8f0'}`, borderRadius: 10, cursor: 'pointer', fontSize: 14, background: form.adjustmentMode === opt.v ? 'rgba(37,99,235,0.06)' : '#fff', color: form.adjustmentMode === opt.v ? 'var(--primary-blue, #2563eb)' : '#64748b', fontWeight: form.adjustmentMode === opt.v ? 600 : 400 }}>
                                            <input type="radio" value={opt.v} checked={form.adjustmentMode === opt.v} onChange={() => set('adjustmentMode', opt.v)} style={{ display: 'none' }} />
                                            {opt.icon} {opt.l}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Value */}
                            <div style={{ marginBottom: 18 }}>
                                <label style={labelStyle}>
                                    {form.adjustmentMode === 'percentage' ? 'Percentage Change' : 'Annual Amount Change (₹)'}
                                    <span style={{ color: '#dc2626' }}> *</span>
                                    <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
                                        {form.adjustmentMode === 'percentage' ? '(negative for decrement, e.g. -10)' : '(negative for decrement, e.g. -60000)'}
                                    </span>
                                </label>
                                <input type="number" step="0.01" value={form.adjustmentValue} onChange={e => set('adjustmentValue', e.target.value)}
                                    placeholder={form.adjustmentMode === 'percentage' ? 'e.g. 10 or -5' : 'e.g. 60000 or -30000'} style={inputStyle} />
                            </div>

                            {/* Live Salary Preview */}
                            {previewSalary && (
                                <div style={{ background: previewSalary.type === 'Increment' ? 'rgba(22,163,74,0.05)' : 'rgba(220,38,38,0.05)', border: `1.5px solid ${previewSalary.type === 'Increment' ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`, borderRadius: 12, padding: '12px 16px', marginBottom: 18 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: previewSalary.type === 'Increment' ? '#16a34a' : '#dc2626', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                                        {previewSalary.type === 'Increment' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                        PREVIEW — {previewSalary.type.toUpperCase()}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                        <PreviewRow label="Annual CTC" before={fmtCurrency(previewSalary.prevAnnual)} after={fmtCurrency(previewSalary.newAnnual)} isInc={previewSalary.type === 'Increment'} />
                                        <PreviewRow label="Monthly Gross" before={fmtCurrency(previewSalary.prevMonthly)} after={fmtCurrency(previewSalary.newMonthly)} isInc={previewSalary.type === 'Increment'} />
                                        <PreviewRow label="Net Salary" before={fmtCurrency(previewSalary.prevNet)} after={fmtCurrency(previewSalary.newNet)} isInc={previewSalary.type === 'Increment'} />
                                    </div>
                                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed rgba(0,0,0,0.1)', fontSize: 13, fontWeight: 700, color: previewSalary.type === 'Increment' ? '#16a34a' : '#dc2626' }}>
                                        Net change: {previewSalary.delta >= 0 ? '+' : ''}{fmtCurrency(previewSalary.delta)} / year ({fmtPct(previewSalary.deltaPct)})
                                    </div>
                                </div>
                            )}

                            {/* Effective Date */}
                            <div style={{ marginBottom: 18 }}>
                                <label style={labelStyle}>
                                    Effective Date <span style={{ color: '#dc2626' }}>*</span>
                                    <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
                                        (can be a past date — system will compute arrears automatically)
                                    </span>
                                </label>
                                <input type="date" value={form.effectiveDate} onChange={e => set('effectiveDate', e.target.value)} style={inputStyle} />
                            </div>

                            {/* Arrears Preview */}
                            {arrearsLoading && (
                                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 10, color: '#64748b', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 14, height: 14, border: '2px solid #e2e8f0', borderTopColor: 'var(--primary-blue, #2563eb)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                    Calculating arrears...
                                </div>
                            )}
                            {!arrearsLoading && arrearsPreview && arrearsPreview.isBackdated && (
                                <div style={{ background: arrearsPreview.arrearsAmount > 0 ? 'rgba(245,158,11,0.06)' : 'rgba(220,38,38,0.06)', border: `1.5px solid ${arrearsPreview.arrearsAmount > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(220,38,38,0.2)'}`, borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: arrearsPreview.arrearsAmount > 0 ? '#92400e' : '#dc2626', fontSize: 14, marginBottom: 10 }}>
                                        <Clock size={16} />
                                        Backdated — {fmtDate(form.effectiveDate)} Effective
                                        {arrearsPreview.arrearsAmount !== 0 && <span style={{ marginLeft: 8, background: '#f59e0b', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>
                                            Arrears: {fmtCurrency(arrearsPreview.arrearsAmount)}
                                        </span>}
                                    </div>
                                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                                        Months affected ({arrearsPreview.arrearsMonths?.length}):
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {(arrearsPreview.arrearsMonths || []).map(m => (
                                            <span key={m.monthStr} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, background: m.slipExists ? 'rgba(37,99,235,0.08)' : 'rgba(100,116,139,0.08)', color: m.slipExists ? 'var(--primary-blue, #2563eb)' : '#64748b', border: `1px solid ${m.slipExists ? 'rgba(37,99,235,0.2)' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {m.slipExists && <Info size={11} />}
                                                {fmtMonthStr(m.monthStr)}
                                                {m.slipExists && <span style={{ fontSize: 10, color: 'var(--primary-blue, #2563eb)' }}>(slip exists)</span>}
                                            </span>
                                        ))}
                                    </div>
                                    {arrearsPreview.arrearsMonths?.some(m => m.slipExists) && (
                                        <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(37,99,235,0.06)', borderRadius: 8, fontSize: 12, color: 'var(--primary-blue, #2563eb)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                            <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                                            Some months already have salary slips. Those slips will use the new revised salary when regenerated.
                                        </div>
                                    )}
                                    <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
                                        Monthly difference: {fmtCurrency(arrearsPreview.monthlyDelta)} / month. Settle arrears separately after applying.
                                    </div>
                                </div>
                            )}
                            {!arrearsLoading && arrearsPreview && !arrearsPreview.isBackdated && form.effectiveDate && (
                                <div style={{ padding: '8px 14px', background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 10, marginBottom: 18, fontSize: 12, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CheckCircle2 size={14} /> Effective date is current or future — no backdated arrears.
                                </div>
                            )}

                            {/* Remark */}
                            <div style={{ marginBottom: 26 }}>
                                <label style={labelStyle}>Remark / Reason</label>
                                <textarea value={form.remark} onChange={e => set('remark', e.target.value)}
                                    placeholder="Optional: e.g. Annual appraisal 2025-26, performance bonus, correction..." rows={2}
                                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-hrm btn-hrm-secondary" onClick={closeModals} style={{ padding: '10px 24px' }}>CANCEL</button>
                                <button type="submit" className="btn-hrm btn-hrm-primary" disabled={saving || !form.employeeId || !form.adjustmentValue || !employeeCTC}
                                    style={{ padding: '10px 24px', opacity: saving || !form.employeeId || !form.adjustmentValue || !employeeCTC ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {saving ? 'Applying...' : <><Save size={16} /> APPLY REVISION</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Detail Modal ── */}
            {showDetailModal && selectedRevision && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={e => { if (e.target === e.currentTarget) closeModals(); }}>
                    <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Revision Details</h2>
                            <button onClick={closeModals} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}><X size={18} color="#64748b" /></button>
                        </div>
                        <div style={{ padding: '22px 26px 26px' }}>
                            <DetailSection label="Employee">
                                {selectedRevision.employeeId?.name} ({selectedRevision.employeeId?.employeeId})
                                <br /><span style={{ fontSize: 12, color: '#94a3b8' }}>{selectedRevision.employeeId?.designation} · {selectedRevision.employeeId?.department}</span>
                            </DetailSection>
                            <DetailRow label="Revision Type" value={<span style={{ fontWeight: 700, color: selectedRevision.revisionType === 'Increment' ? '#16a34a' : '#dc2626' }}>{selectedRevision.revisionType}</span>} />
                            <DetailRow label="Adjustment" value={selectedRevision.adjustmentMode === 'percentage' ? `${selectedRevision.adjustmentValue}%` : fmtCurrency(selectedRevision.adjustmentValue)} />
                            <DetailRow label="Effective Date" value={<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{fmtDate(selectedRevision.effectiveDate)}{selectedRevision.isBackdated && <span style={{ background: 'rgba(245,158,11,0.1)', color: '#b45309', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Backdated</span>}</span>} />
                            <DetailRow label="Applied On" value={fmtDate(selectedRevision.createdAt)} />
                            <DetailRow label="Status" value={selectedRevision.status} />
                            {selectedRevision.remark && <DetailRow label="Remark" value={selectedRevision.remark} />}

                            {/* Arrears section */}
                            {selectedRevision.isBackdated && selectedRevision.arrearsAmount !== 0 && (
                                <div style={{ margin: '18px 0', padding: '14px 16px', background: selectedRevision.arrearsStatus === 'Settled' ? 'rgba(22,163,74,0.06)' : 'rgba(245,158,11,0.06)', border: `1.5px solid ${selectedRevision.arrearsStatus === 'Settled' ? 'rgba(22,163,74,0.2)' : 'rgba(245,158,11,0.2)'}`, borderRadius: 12 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: selectedRevision.arrearsStatus === 'Settled' ? '#16a34a' : '#92400e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Clock size={15} /> Backdated Arrears — {fmtCurrency(selectedRevision.arrearsAmount)}
                                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: selectedRevision.arrearsStatus === 'Settled' ? 'rgba(22,163,74,0.1)' : 'rgba(245,158,11,0.15)', color: selectedRevision.arrearsStatus === 'Settled' ? '#16a34a' : '#b45309' }}>{selectedRevision.arrearsStatus}</span>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#64748b' }}>
                                        {(selectedRevision.arrearsMonths || []).map((m, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                                                <span>{fmtMonthStr(m.monthStr)}</span>
                                                <span style={{ fontWeight: 600, color: m.monthlyDelta >= 0 ? '#16a34a' : '#dc2626' }}>{m.monthlyDelta >= 0 ? '+' : ''}{fmtCurrency(m.monthlyDelta)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedRevision.arrearsSettledAt && (
                                        <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                                            Settled on: {fmtDate(selectedRevision.arrearsSettledAt)}
                                            {selectedRevision.arrearsSettledRemark && ` — ${selectedRevision.arrearsSettledRemark}`}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Salary comparison */}
                            <div style={{ margin: '18px 0', borderTop: '1px solid #f1f5f9', paddingTop: 18 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Salary Comparison</div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b' }}>Component</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>Before</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>After</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <CompRow label="Annual CTC" before={selectedRevision.previousAnnualCTC} after={selectedRevision.newAnnualCTC} />
                                        <CompRow label="Monthly Gross" before={selectedRevision.previousMonthlyGross} after={selectedRevision.newMonthlyGross} />
                                        <CompRow label="Net Salary" before={selectedRevision.previousNetSalary} after={selectedRevision.newNetSalary} />
                                    </tbody>
                                </table>
                                <div style={{ marginTop: 10, padding: '10px 12px', background: selectedRevision.deltaAmount >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', borderRadius: 8, fontSize: 13, fontWeight: 700, color: selectedRevision.deltaAmount >= 0 ? '#16a34a' : '#dc2626' }}>
                                    Net Change: {selectedRevision.deltaAmount >= 0 ? '+' : ''}{fmtCurrency(selectedRevision.deltaAmount)} / year ({fmtPct(selectedRevision.deltaPercentage)})
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

// ── Sub-components ────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, bg, sub }) => (
    <div style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
        <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{value}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{label}</div>
            {sub && <div style={{ fontSize: 12, fontWeight: 700, color }}>{sub}</div>}
        </div>
    </div>
);

const PreviewRow = ({ label, before, after, isInc }) => (
    <div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: '#64748b', textDecoration: 'line-through' }}>{before}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: isInc ? '#16a34a' : '#dc2626' }}>{after}</div>
    </div>
);

const DetailRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc', fontSize: 14 }}>
        <span style={{ color: '#64748b' }}>{label}</span>
        <span style={{ fontWeight: 600, color: '#1e293b', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
);
const DetailSection = ({ label, children }) => (
    <div style={{ padding: '12px 0', borderBottom: '1px solid #f8fafc' }}>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{children}</div>
    </div>
);
const CompRow = ({ label, before, after }) => (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
        <td style={{ padding: '8px 12px', color: '#64748b' }}>{label}</td>
        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>{fmtCurrency(before)}</td>
        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: after >= before ? '#16a34a' : '#dc2626' }}>{fmtCurrency(after)}</td>
    </tr>
);

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit', color: '#1e293b' };

export default SalaryRevision;
