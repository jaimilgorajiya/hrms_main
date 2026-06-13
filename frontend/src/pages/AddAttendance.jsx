import React, { useState, useEffect, useCallback } from 'react';
import { User, Calendar, Clock, MessageSquare, Save, RefreshCw, CheckCircle, ArrowLeft, Plus, XCircle, Search, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchableSelect from '../components/SearchableSelect';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';

// Convert "10:03 am" / "10:03 PM" / "10:03" → "10:03" (24-hr HH:MM for <input type="time">)
const to24hr = (timeStr) => {
    if (!timeStr) return '';
    const s = timeStr.trim();
    const match = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) return s; // already HH:MM or unknown format – return as-is
    let [, h, m, , period] = match;
    h = parseInt(h, 10);
    if (period) {
        const p = period.toLowerCase();
        if (p === 'am' && h === 12) h = 0;
        if (p === 'pm' && h !== 12) h += 12;
    }
    return `${String(h).padStart(2, '0')}:${m}`;
};

const AddAttendance = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const today = new Date().toISOString().split('T')[0];
    
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    
    const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
    
    const [formData, setFormData] = useState({
        employeeId: '',
        date: today,
        status: 'Present',
        inTime: '09:00',
        outTime: '',
        remark: ''
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/attendance/admin/missing`);
            const json = await res.json();
            if (json.success) setRecords(json.records);
            
            const empRes = await authenticatedFetch(`${API_URL}/api/users`);
            const empJson = await empRes.json();
            if (empJson.success) setEmployees(empJson.users);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenModal = (record = null) => {
        if (record) {
            setSelectedEmployeeName(record.employee.name);
            // Both punch-in and punch-out are editable for the admin
            const hasPunchIn = !!record.punchIn;
            const hasPunchOut = !!record.punchOut;
            setFormData({
                employeeId: record.employee._id,
                date: record.date,
                status: record.punchIn ? 'Present' : 'Present',
                inTime: record.punchIn ? to24hr(record.punchIn) : '09:00',
                outTime: record.punchOut ? to24hr(record.punchOut) : '',
                remark: `Correction for ${record.status} on ${record.date}`
            });
        } else {
            setSelectedEmployeeName('');
            setFormData({
                employeeId: '',
                date: today,
                status: 'Present',
                inTime: '09:00',
                outTime: '',
                remark: ''
            });
        }
        setModalOpen(true);
    };

    useEffect(() => {
        if (location.state?.openModal) {
            handleOpenModal();
            // Clear location state to prevent reopening on page refresh or navigation
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const payload = { ...formData };
            if (payload.status === 'On Leave' || payload.status === 'Absent') {
                payload.inTime = '';
                payload.outTime = '';
            }
            const res = await authenticatedFetch(`${API_URL}/api/attendance/admin/add-manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.success) {
                setModalOpen(false);
                fetchData();
                Swal.fire({
                    title: 'Success!',
                    text: 'Record updated successfully.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                Swal.fire('Error', json.message, 'error');
            }
        } catch (e) { console.error(e); }
        finally { setFormLoading(false); }
    };

    const filtered = records.filter(r => {
        const matchesSearch =
            r.employee?.name?.toLowerCase().includes(search.toLowerCase()) ||
            r.employee?.employeeId?.toLowerCase().includes(search.toLowerCase());
        const recordDate = r.date ? r.date.split('T')[0] : '';
        const matchesFrom = !dateFrom || recordDate >= dateFrom;
        const matchesTo   = !dateTo   || recordDate <= dateTo;
        return matchesSearch && matchesFrom && matchesTo;
    });

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 4px' }}>Add & Correct Attendance</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Resolve missing logs and rejected attendance records</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="btn-primary-hrm"
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
                        borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer'
                    }}
                >
                    <Plus size={18} /> Add Manual Log
                </button>
            </div>

            {/* Filters Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text" placeholder="Search by name or ID..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="hrm-input"
                        style={{ width: '100%', padding: '11px 12px 11px 42px', border: '1.5px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', borderRadius: '12px', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                </div>

                {/* From Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        style={{ padding: '10px 12px', border: '1.5px solid var(--border)', background: 'var(--bg-base)', borderRadius: '12px', outline: 'none', fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer' }}
                    />
                </div>

                {/* To Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>To</label>
                    <input
                        type="date"
                        value={dateTo}
                        min={dateFrom || undefined}
                        onChange={e => setDateTo(e.target.value)}
                        style={{ padding: '10px 12px', border: '1.5px solid var(--border)', background: 'var(--bg-base)', borderRadius: '12px', outline: 'none', fontSize: '14px', color: 'var(--text-primary)', cursor: 'pointer' }}
                    />
                </div>

                {/* Clear filters */}
                {(dateFrom || dateTo || search) && (
                    <button
                        onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); }}
                        style={{ padding: '10px 16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1.5px solid rgba(239, 68, 68, 0.2)', color: '#EF4444', fontWeight: '700', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <XCircle size={14} /> Clear Filters
                    </button>
                )}

                {/* Result count */}
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    {filtered.length} record{filtered.length !== 1 ? 's' : ''} found
                </span>
            </div>

            {/* Table */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {loading ? (
                    <div style={{ padding: '100px', textAlign: 'center' }}>
                        <RefreshCw className="animate-spin" size={32} color="var(--primary-blue)" />
                        <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>Fetching queue...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '80px', textAlign: 'center' }}>
                        <CheckCircle size={48} color="#10B981" style={{ opacity: 0.3, marginBottom: '16px' }} />
                        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>All Clear!</h3>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>No rejected or missing attendance records found matching your search.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
                                {['Employee', 'Date', 'Previous Status', 'Current Logs', 'Action'].map(h => (
                                    <th key={h} style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => (
                                <tr key={r._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-base)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: 'var(--primary-blue)' }}>
                                                {r.employee?.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{r.employee?.name}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.employee?.employeeId} · {r.employee?.department}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>
                                        {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ 
                                            padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '800',
                                            background: r.approvalStatus === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-base)',
                                            color: r.approvalStatus === 'Rejected' ? '#EF4444' : 'var(--text-secondary)',
                                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                                        }}>
                                            {r.approvalStatus === 'Rejected' ? <XCircle size={12} /> : <AlertCircle size={12} />}
                                            {r.approvalStatus === 'Rejected' ? 'Rejected' : r.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        {r.punchIn ? `In: ${r.punchIn}` : 'No In'} · {r.punchOut ? `Out: ${r.punchOut}` : 'No Out'}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <button 
                                            onClick={() => handleOpenModal(r)}
                                            style={{ 
                                                padding: '8px 16px', borderRadius: '8px', background: 'var(--primary-light)', border: '1.5px solid var(--primary-blue)', 
                                                color: 'var(--primary-blue)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => { e.target.style.background = 'var(--primary-blue)'; e.target.style.color = '#fff'; }}
                                            onMouseLeave={e => { e.target.style.background = 'var(--primary-light)'; e.target.style.color = 'var(--primary-blue)'; }}
                                        >
                                            Fix / Add
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }} />
                    <div style={{ position: 'relative', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '28px', width: '100%', maxWidth: '520px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>{formData.remark.startsWith('Correction') ? 'Correct Attendance' : 'Add Attendance'}</h3>
                            <button onClick={() => setModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><XCircle size={22} /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {formData.remark.startsWith('Correction') ? (
                                    <div style={{ background: 'var(--primary-light)', padding: '16px', borderRadius: '16px', border: '1px solid var(--primary-blue)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', marginBottom: '4px' }}>Correcting For</div>
                                            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{selectedEmployeeName}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', marginBottom: '4px' }}>Log Date</div>
                                            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{new Date(formData.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <SearchableSelect
                                            label="Employee"
                                            required
                                            placeholder="Search an employee..."
                                            searchable={true}
                                            options={employees.map(e => ({ label: `${e.name} (${e.employeeId})`, value: e._id }))}
                                            value={formData.employeeId}
                                            onChange={(val) => setFormData({ ...formData, employeeId: val })}
                                        />
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    {!formData.remark.startsWith('Correction') && (
                                        <div>
                                            <label className="hrm-label">Date</label>
                                            <input type="date" required className="hrm-input"
                                                value={formData.date}
                                                onChange={e => setFormData({...formData, date: e.target.value})}
                                            />
                                        </div>
                                    )}
                                    <div style={{ gridColumn: formData.remark.startsWith('Correction') ? 'span 2' : 'span 1' }}>
                                        <SearchableSelect
                                            label="Set Status"
                                            required
                                            options={[
                                                { label: 'Present', value: 'Present' },
                                                { label: 'Half Day', value: 'Half Day' },
                                                { label: 'On Leave', value: 'On Leave' }
                                            ]}
                                            value={formData.status}
                                            onChange={(val) => setFormData({ ...formData, status: val })}
                                        />
                                    </div>
                                </div>

                                {formData.status !== 'On Leave' && formData.status !== 'Absent' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        {/* Punch In */}
                                        <div>
                                            <label className="hrm-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                Punch In
                                            </label>
                                            <input
                                                type="time"
                                                value={formData.inTime}
                                                onChange={e => setFormData({...formData, inTime: e.target.value})}
                                                className="hrm-input"
                                            />
                                        </div>
                                        {/* Punch Out */}
                                        <div>
                                            <label className="hrm-label">Punch Out</label>
                                            <input type="time" value={formData.outTime} onChange={e => setFormData({...formData, outTime: e.target.value})} className="hrm-input" />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="hrm-label">Administrative Remark</label>
                                    <textarea value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})}
                                        className="hrm-textarea" style={{ height: '80px', resize: 'none' }}
                                    />
                                </div>

                                <button type="submit" disabled={formLoading}
                                    style={{ 
                                        marginTop: '10px', padding: '16px', borderRadius: '16px', background: 'var(--primary-blue)', color: 'white', 
                                        border: 'none', fontWeight: '800', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                    }}
                                >
                                    {formLoading ? <RefreshCw className="animate-spin" size={20} /> : <><Save size={20} /> Update Record</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
};

export default AddAttendance;
