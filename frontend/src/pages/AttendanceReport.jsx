import React, { useState, useEffect } from 'react';
import { FileText, Download, Search, RefreshCw, TrendingUp, Users, Clock, AlertCircle } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';

const STATUS_STYLE = {
    'Present':  { color: '#10B981', bg: '#DCFCE7' },
    'Absent':   { color: '#EF4444', bg: '#FEE2E2' },
    'Half Day': { color: '#F59E0B', bg: '#FEF3C7' },
    'On Leave': { color: '#8B5CF6', bg: '#EDE9FE' },
};

const SummaryCard = ({ icon, label, value, color }) => (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '18px 22px', flex: 1, minWidth: 130 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ color, background: color + '20', borderRadius: 8, padding: 6, display: 'flex' }}>{icon}</div>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{label}</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>{value}</div>
    </div>
);

const AttendanceReport = () => {
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = today.slice(0, 7) + '-01';

    const [from, setFrom] = useState(firstOfMonth);
    const [to, setTo] = useState(today);
    const [department, setDepartment] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [status, setStatus] = useState('All');
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        authenticatedFetch(`${API_URL}/api/users`)
            .then(r => r.json())
            .then(j => {
                if (j.success) {
                    setEmployees(j.users);
                    const depts = [...new Set(j.users.map(u => u.department).filter(Boolean))];
                    setDepartments(depts);
                }
            }).catch(console.error);
    }, []);

    const fetchReport = async () => {
        if (!from || !to) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ from, to });
            if (department) params.append('department', department);
            if (employeeId) params.append('employeeId', employeeId);
            if (status !== 'All') params.append('status', status);

            const res = await authenticatedFetch(`${API_URL}/api/admin/reports/attendance?${params}`);
            const data = await res.json();
            if (data.success) { setRows(data.rows); setSummary(data.summary); setSearched(true); }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const exportCSV = () => {
        if (!rows.length) return;
        const headers = ['Date', 'Emp ID', 'Name', 'Department', 'Designation', 'Status', 'Punch In', 'Punch Out', 'Work Hours', 'Late In', 'Penalty', 'Approval'];
        const csvRows = [headers.join(','), ...rows.map(r => [
            r.date, r.employeeId, `"${r.name}"`, `"${r.department}"`, `"${r.designation}"`,
            r.status, r.punchIn, r.punchOut, r.workHours, r.lateIn, r.penalty, r.approvalStatus
        ].join(','))];
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `attendance_report_${from}_to_${to}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const filtered = rows.filter(r => {
        if (!search) return true;
        const q = search.toLowerCase();
        return r.name.toLowerCase().includes(q) || r.employeeId.toLowerCase().includes(q) || r.department.toLowerCase().includes(q);
    });

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <h1 className="hrm-title">Attendance Report</h1>
            </div>

            {/* Filters */}
            <div className="hrm-card" style={{ marginBottom: 20, overflow: 'visible' }}>
                <div className="hrm-card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
                        <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                            <label className="hrm-label">From Date <span className="req">*</span></label>
                            <input type="date" className="hrm-input" value={from} onChange={e => setFrom(e.target.value)} />
                        </div>
                        <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                            <label className="hrm-label">To Date <span className="req">*</span></label>
                            <input type="date" className="hrm-input" value={to} onChange={e => setTo(e.target.value)} />
                        </div>
                        <div style={{ minWidth: 180 }}>
                            <SearchableSelect
                                label="Department"
                                options={[{ label: 'All Departments', value: '' }, ...departments.map(d => ({ label: d, value: d }))]}
                                value={department}
                                onChange={setDepartment}
                                placeholder="All Departments"
                                searchable
                            />
                        </div>
                        <div style={{ minWidth: 200 }}>
                            <SearchableSelect
                                label="Employee"
                                options={[{ label: 'All Employees', value: '' }, ...employees.map(e => ({ label: `${e.name} (${e.employeeId || ''})`, value: e._id }))]}
                                value={employeeId}
                                onChange={setEmployeeId}
                                placeholder="All Employees"
                                searchable
                            />
                        </div>
                        <div style={{ minWidth: 160 }}>
                            <SearchableSelect
                                label="Status"
                                options={['All', 'Present', 'Absent', 'Half Day', 'On Leave'].map(s => ({ label: s, value: s }))}
                                value={status}
                                onChange={setStatus}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                            <button className="btn-hrm btn-hrm-primary" style={{ flex: 1 }} onClick={fetchReport} disabled={loading}>
                                {loading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
                                {loading ? 'Loading...' : 'Generate'}
                            </button>
                            {rows.length > 0 && (
                                <button className="btn-hrm btn-hrm-secondary" onClick={exportCSV} title="Export CSV">
                                    <Download size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
                    <SummaryCard icon={<Users size={16} />}      label="Total Records" value={summary.totalRecords} color="#3B82F6" />
                    <SummaryCard icon={<TrendingUp size={16} />} label="Present"       value={summary.present}      color="#10B981" />
                    <SummaryCard icon={<AlertCircle size={16} />}label="Absent"        value={summary.absent}       color="#EF4444" />
                    <SummaryCard icon={<Clock size={16} />}      label="Half Day"      value={summary.halfDay}      color="#F59E0B" />
                    <SummaryCard icon={<FileText size={16} />}   label="On Leave"      value={summary.onLeave}      color="#8B5CF6" />
                    <SummaryCard icon={<Clock size={16} />}      label="Late In"       value={summary.lateIn}       color="#F97316" />
                    <SummaryCard icon={<AlertCircle size={16} />}label="Total Penalty" value={`₹${summary.totalPenalty}`} color="#EF4444" />
                </div>
            )}

            {/* Table */}
            {searched && (
                <div className="hrm-card">
                    <div className="hrm-card-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                            <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>
                                {filtered.length} record{filtered.length !== 1 ? 's' : ''} found
                                {from && to && <span style={{ fontWeight: 400, color: '#64748b', fontSize: 13 }}> · {from} to {to}</span>}
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input className="hrm-input" style={{ paddingLeft: 30, width: 220 }} placeholder="Search name, ID, dept..." value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                        </div>

                        {filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                                <FileText size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
                                <p>No records found for the selected filters.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="hrm-table" style={{ width: '100%', fontSize: 13 }}>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Emp ID</th>
                                            <th>Name</th>
                                            <th>Department</th>
                                            <th>Status</th>
                                            <th>Punch In</th>
                                            <th>Punch Out</th>
                                            <th>Work Hours</th>
                                            <th>Late In</th>
                                            <th>Penalty</th>
                                            <th>Approval</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((r, i) => {
                                            const st = STATUS_STYLE[r.status];
                                            return (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 500 }}>{r.date}</td>
                                                    <td style={{ color: '#64748b' }}>{r.employeeId}</td>
                                                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                                                    <td style={{ color: '#64748b' }}>{r.department}</td>
                                                    <td>
                                                        {st ? (
                                                            <span style={{ background: st.bg, color: st.color, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 500 }}>{r.status}</span>
                                                        ) : r.status}
                                                    </td>
                                                    <td>{r.punchIn}</td>
                                                    <td>{r.punchOut}</td>
                                                    <td>{r.workHours}</td>
                                                    <td>
                                                        <span style={{ color: r.lateIn === 'Yes' ? '#F59E0B' : '#94a3b8', fontWeight: r.lateIn === 'Yes' ? 600 : 400 }}>{r.lateIn}</span>
                                                    </td>
                                                    <td style={{ color: r.penalty > 0 ? '#EF4444' : '#94a3b8', fontWeight: r.penalty > 0 ? 600 : 400 }}>
                                                        {r.penalty > 0 ? `₹${r.penalty}` : '—'}
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            fontSize: 12, fontWeight: 500, borderRadius: 6, padding: '3px 10px',
                                                            background: r.approvalStatus === 'Approved' ? '#DCFCE7' : r.approvalStatus === 'Rejected' ? '#FEE2E2' : '#FEF3C7',
                                                            color: r.approvalStatus === 'Approved' ? '#10B981' : r.approvalStatus === 'Rejected' ? '#EF4444' : '#F59E0B',
                                                        }}>{r.approvalStatus}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!searched && !loading && (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
                    <FileText size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ fontSize: 15 }}>Set your filters and click Generate to view the report.</p>
                </div>
            )}
        </div>
    );
};

export default AttendanceReport;
