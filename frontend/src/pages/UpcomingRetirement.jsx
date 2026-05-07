import { useState, useEffect, useMemo } from 'react';
import { Search, RotateCcw, Eye, Play, CalendarClock, CheckCircle2, Bell, Filter } from 'lucide-react';
import Swal from 'sweetalert2';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import SearchableSelect from '../components/SearchableSelect';

const STATUS_COLORS = {
    Upcoming:   { bg: '#EFF6FF', color: '#2563EB' },
    Notified:   { bg: '#FFF7ED', color: '#C2410C' },
    'In Process': { bg: '#FEF9C3', color: '#A16207' },
    Completed:  { bg: '#F0FDF4', color: '#16A34A' },
    Extended:   { bg: '#F5F3FF', color: '#7C3AED' },
};

const DAY_COLOR = (days) => {
    if (days < 0) return { bg: '#FEF2F2', color: '#EF4444', label: 'Overdue' };
    if (days <= 30) return { bg: '#FEF2F2', color: '#EF4444', label: 'Critical' };
    if (days <= 90) return { bg: '#FFF7ED', color: '#F97316', label: 'Soon' };
    return { bg: '#F0FDF4', color: '#16A34A', label: 'Upcoming' };
};

const fmt = (date) => date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

const StatCard = ({ label, value, bg, color }) => (
    <div className="hrm-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color }}>{value}</span>
        </div>
        <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{value}</p>
        </div>
    </div>
);

const UpcomingRetirement = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, within30: 0, within90: 0, beyond90: 0 });
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [allowExtension, setAllowExtension] = useState(false);
    const [maxExtMonths, setMaxExtMonths] = useState(12);

    const [filterDept, setFilterDept] = useState('');
    const [filterDesig, setFilterDesig] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [search, setSearch] = useState('');

    const [viewRecord, setViewRecord] = useState(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [rRes, sRes, dRes, desRes, settingRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/retirement`),
                authenticatedFetch(`${API_URL}/api/retirement/stats`),
                authenticatedFetch(`${API_URL}/api/departments`),
                authenticatedFetch(`${API_URL}/api/designations`),
                authenticatedFetch(`${API_URL}/api/retirement/settings`),
            ]);
            const rData = await rRes.json();
            const sData = await sRes.json();
            const dData = await dRes.json();
            const desData = await desRes.json();
            const settingData = await settingRes.json();

            if (rData.success) setRecords(rData.records);
            if (sData.success) setStats(sData.stats);
            if (dData.success) setDepartments(dData.departments || []);
            if (desData.success) setDesignations(desData.designations || []);
            if (settingData.success) {
                setAllowExtension(settingData.setting?.allowExtension || false);
                setMaxExtMonths(settingData.setting?.maxExtensionMonths || 12);
            }
        } catch {
            Swal.fire('Error', 'Failed to load retirement data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        return records.filter(r => {
            if (filterDept && r.department !== filterDept) return false;
            if (filterDesig && r.designation !== filterDesig) return false;
            if (filterStatus && r.status !== filterStatus) return false;
            if (filterFrom && new Date(r.retirementDate) < new Date(filterFrom)) return false;
            if (filterTo && new Date(r.retirementDate) > new Date(filterTo)) return false;
            if (search && !r.name?.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [records, filterDept, filterDesig, filterStatus, filterFrom, filterTo, search]);

    const handleInitiateExit = async (id, name) => {
        const result = await Swal.fire({
            title: `Initiate Exit for ${name}?`,
            text: 'This will mark the retirement as In Process.',
            icon: 'question', showCancelButton: true,
            confirmButtonColor: '#2563EB', confirmButtonText: 'Yes, Initiate'
        });
        if (!result.isConfirmed) return;
        const res = await authenticatedFetch(`${API_URL}/api/retirement/${id}/initiate-exit`, { method: 'PUT' });
        const data = await res.json();
        if (data.success) { Swal.fire({ title: 'Done', icon: 'success', timer: 1500, showConfirmButton: false }); fetchAll(); }
        else Swal.fire('Error', data.message, 'error');
    };

    const handleMarkCompleted = async (id, name) => {
        const result = await Swal.fire({
            title: `Mark ${name} as Completed?`,
            icon: 'question', showCancelButton: true,
            confirmButtonColor: '#16A34A', confirmButtonText: 'Yes, Complete'
        });
        if (!result.isConfirmed) return;
        const res = await authenticatedFetch(`${API_URL}/api/retirement/${id}/complete`, { method: 'PUT' });
        const data = await res.json();
        if (data.success) { Swal.fire({ title: 'Completed', icon: 'success', timer: 1500, showConfirmButton: false }); fetchAll(); }
        else Swal.fire('Error', data.message, 'error');
    };

    const handleExtend = async (record) => {
        if (!allowExtension) {
            return Swal.fire('Not Allowed', 'Retirement extensions are disabled in company settings.', 'warning');
        }
        const { value: formValues } = await Swal.fire({
            title: `Extend Retirement — ${record.name}`,
            html: `
                <div style="text-align:left">
                    <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px">Extension Duration (months) <span style="color:red">*</span></label>
                    <input id="swal-months" type="number" min="1" max="${maxExtMonths}" class="swal2-input" placeholder="e.g. 6" style="margin:0 0 14px;width:100%">
                    <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px">Reason <span style="color:red">*</span></label>
                    <textarea id="swal-reason" class="swal2-textarea" placeholder="Reason for extension..." style="margin:0;width:100%;height:80px"></textarea>
                    <p style="font-size:11px;color:#94A3B8;margin-top:8px">Max allowed: ${maxExtMonths} months</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#7C3AED',
            confirmButtonText: 'Extend',
            preConfirm: () => {
                const months = document.getElementById('swal-months').value;
                const reason = document.getElementById('swal-reason').value;
                if (!months || months <= 0) { Swal.showValidationMessage('Extension duration is required'); return false; }
                if (!reason.trim()) { Swal.showValidationMessage('Reason is required'); return false; }
                return { months: Number(months), reason };
            }
        });
        if (!formValues) return;

        const res = await authenticatedFetch(`${API_URL}/api/retirement/${record._id}/extend`, {
            method: 'PUT',
            body: JSON.stringify({ extensionMonths: formValues.months, reason: formValues.reason })
        });
        const data = await res.json();
        if (data.success) { Swal.fire({ title: 'Extended', icon: 'success', timer: 1500, showConfirmButton: false }); fetchAll(); }
        else Swal.fire('Error', data.message, 'error');
    };

    const handleRunNotifications = async () => {
        const res = await authenticatedFetch(`${API_URL}/api/retirement/run-notifications`, { method: 'POST' });
        const data = await res.json();
        Swal.fire({ title: data.success ? 'Done' : 'Error', text: data.message, icon: data.success ? 'success' : 'error', timer: 2000, showConfirmButton: false });
        if (data.success) fetchAll();
    };

    const resetFilters = () => {
        setFilterDept(''); setFilterDesig(''); setFilterStatus('');
        setFilterFrom(''); setFilterTo(''); setSearch('');
    };

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <h1 className="hrm-title">Upcoming Retirement</h1>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-hrm btn-hrm-secondary" onClick={handleRunNotifications} title="Send pending notifications">
                        <Bell size={15} /> RUN NOTIFICATIONS
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <StatCard label="Within 30 Days" value={stats.within30} bg="#FEF2F2" color="#EF4444" />
                <StatCard label="Within 90 Days" value={stats.within90} bg="#FFF7ED" color="#F97316" />
                <StatCard label="In Process" value={records.filter(r => r.status === 'In Process').length} bg="#FEF9C3" color="#A16207" />
                <StatCard label="Completed" value={records.filter(r => r.status === 'Completed').length} bg="#F0FDF4" color="#16A34A" />
            </div>

            {/* Filters */}
            <div className="hrm-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr auto', gap: 14, alignItems: 'end' }}>
                    <div>
                        <label className="hrm-label">Department</label>
                        <SearchableSelect
                            options={[{ value: '', label: 'All ' }, ...departments.map(d => ({ value: d.name, label: d.name }))]}
                            value={filterDept} onChange={setFilterDept} placeholder="All Departments"
                        />
                    </div>
                    <div>
                        <label className="hrm-label">Designation</label>
                        <SearchableSelect
                            options={[{ value: '', label: 'All' }, ...designations.map(d => ({ value: d.designationName, label: d.designationName }))]}
                            value={filterDesig} onChange={setFilterDesig} placeholder="All Designations"
                        />
                    </div>
                    <div>
                        <label className="hrm-label">Status</label>
                        <SearchableSelect
                            options={[
                                { value: '', label: 'All ' },
                                { value: 'Upcoming', label: 'Upcoming' },
                                { value: 'Notified', label: 'Notified' },
                                { value: 'In Process', label: 'In Process' },
                                { value: 'Completed', label: 'Completed' },
                                { value: 'Extended', label: 'Extended' },
                            ]}
                            value={filterStatus} onChange={setFilterStatus} placeholder="All Status"
                        />
                    </div>
                    <div>
                        <label className="hrm-label">From Date</label>
                        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="hrm-input" />
                    </div>
                    <div>
                        <label className="hrm-label">To Date</label>
                        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="hrm-input" />
                    </div>
                    <div>
                        <label className="hrm-label">Search</label>
                        <div className="search-wrapper">
                            <Search size={15} color="var(--text-secondary)" />
                            <input type="text" placeholder="Employee name..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                    <button className="btn-hrm btn-hrm-secondary" onClick={resetFilters} title="Reset filters">
                        <RotateCcw size={15} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="hrm-card">
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> employee(s) found
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Employees retiring within the next 6 months</span>
                </div>
                <div className="hrm-table-wrapper">
                    <table className="hrm-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Date of Birth</th>
                                <th>Retirement Date</th>
                                <th>Days Remaining</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                                        <Filter size={36} style={{ opacity: 0.3, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                                        No retirement records found
                                    </td>
                                </tr>
                            ) : filtered.map(r => {
                                const dc = DAY_COLOR(r.daysRemaining);
                                const sc = STATUS_COLORS[r.status] || STATUS_COLORS.Upcoming;
                                return (
                                    <tr key={r._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#2563EB', flexShrink: 0 }}>
                                                    {r.name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{r.name}</p>
                                                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.employmentType || '--'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmt(r.dateOfBirth)}</td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                            {fmt(r.retirementDate)}
                                            {r.status === 'Extended' && r.originalRetirementDate && (
                                                <p style={{ fontSize: 11, color: '#7C3AED', marginTop: 2 }}>
                                                    Extended from {fmt(r.originalRetirementDate)}
                                                </p>
                                            )}
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: dc.bg, color: dc.color }}>
                                                {r.daysRemaining < 0 ? `${Math.abs(r.daysRemaining)}d overdue` : `${r.daysRemaining} days`}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.department || '--'}</td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.designation || '--'}</td>
                                        <td>
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button title="View Details" onClick={() => setViewRecord(r)}
                                                    style={{ background: '#EFF6FF', border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#2563EB' }}>
                                                    <Eye size={14} />
                                                </button>
                                                {r.status !== 'Completed' && r.status !== 'In Process' && (
                                                    <button title="Initiate Exit" onClick={() => handleInitiateExit(r._id, r.name)}
                                                        style={{ background: '#FFF7ED', border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#C2410C' }}>
                                                        <Play size={14} />
                                                    </button>
                                                )}
                                                {allowExtension && r.status !== 'Completed' && (
                                                    <button title="Extend Retirement" onClick={() => handleExtend(r)}
                                                        style={{ background: '#F5F3FF', border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#7C3AED' }}>
                                                        <CalendarClock size={14} />
                                                    </button>
                                                )}
                                                {r.status === 'In Process' && (
                                                    <button title="Mark Completed" onClick={() => handleMarkCompleted(r._id, r.name)}
                                                        style={{ background: '#F0FDF4', border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#16A34A' }}>
                                                        <CheckCircle2 size={14} />
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

            {/* View Details Modal */}
            {viewRecord && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setViewRecord(null)}>
                    <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 480, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Retirement Details</h2>
                            <button onClick={() => setViewRecord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>✕</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {[
                                ['Employee', viewRecord.name],
                                ['Department', viewRecord.department || '--'],
                                ['Designation', viewRecord.designation || '--'],
                                ['Employment Type', viewRecord.employmentType || '--'],
                                ['Date of Birth', fmt(viewRecord.dateOfBirth)],
                                ['Retirement Age', `${viewRecord.retirementAge} years`],
                                ['Retirement Date', fmt(viewRecord.retirementDate)],
                                ['Days Remaining', `${viewRecord.daysRemaining} days`],
                                ['Status', viewRecord.status],
                                ['Branch', viewRecord.branch || '--'],
                            ].map(([label, value]) => (
                                <div key={label} style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px' }}>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</p>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>{value}</p>
                                </div>
                            ))}
                        </div>
                        {viewRecord.status === 'Extended' && (
                            <div style={{ marginTop: 16, background: '#F5F3FF', borderRadius: 10, padding: '12px 14px', border: '1px solid #DDD6FE' }}>
                                <p style={{ fontSize: 12, color: '#7C3AED', fontWeight: 700 }}>Extension Details</p>
                                <p style={{ fontSize: 13, color: '#374151', marginTop: 6 }}>Duration: {viewRecord.extensionMonths} month(s)</p>
                                <p style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>Reason: {viewRecord.extensionReason}</p>
                                <p style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>Original Date: {fmt(viewRecord.originalRetirementDate)}</p>
                            </div>
                        )}
                        {viewRecord.notificationsSent?.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 8 }}>Notifications Sent</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {viewRecord.notificationsSent.map((n, i) => (
                                        <span key={i} style={{ fontSize: 11, background: '#EFF6FF', color: '#2563EB', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                                            {n.days}d — {fmt(n.sentAt)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UpcomingRetirement;
