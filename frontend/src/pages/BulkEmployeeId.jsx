import { useState, useEffect, useMemo } from 'react';
import { Search, Save, RotateCcw, Filter, Wand2 } from 'lucide-react';
import Swal from 'sweetalert2';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import SearchableSelect from '../components/SearchableSelect';

// Build an ID from format config + sequential counter
const buildId = (fmt, counter) => {
    const prefix = fmt.prefix || 'EMP';
    const sep = fmt.separator || '';
    const digits = fmt.digitCount || 4;
    const year = new Date().getFullYear();
    const num = String(counter).padStart(digits, '0');
    const yearPart = fmt.includeYear ? `${sep}${year}${sep}` : sep;
    return `${prefix}${yearPart}${num}`;
};

const BulkEmployeeId = () => {
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [empIdFormat, setEmpIdFormat] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [filterBranch, setFilterBranch] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [fetched, setFetched] = useState(false);

    // Local editable employee IDs: { [userId]: newId }
    const [editedIds, setEditedIds] = useState({});
    // Selected employee IDs (Set of _id strings)
    const [selectedIds, setSelectedIds] = useState(new Set());

    useEffect(() => {
        fetchMeta();
    }, []);

    const fetchMeta = async () => {
        const [bRes, dRes, cRes] = await Promise.all([
            authenticatedFetch(`${API_URL}/api/branches`),
            authenticatedFetch(`${API_URL}/api/departments`),
            authenticatedFetch(`${API_URL}/api/company`),
        ]);
        const bData = await bRes.json();
        const dData = await dRes.json();
        const cData = await cRes.json();
        if (bData.success) setBranches(bData.branches);
        if (dData.success) setDepartments(dData.departments);
        if (cData?.employeeIdFormat) setEmpIdFormat(cData.employeeIdFormat);
    };

    const handleGet = async () => {
        setLoading(true);
        setFetched(false);
        setSelectedIds(new Set());
        try {
            const res = await authenticatedFetch(`${API_URL}/api/users`);
            const data = await res.json();
            if (data.success) {
                const today = new Date();
                setEmployees(data.users.filter(u => {
                    if (u.role === 'Admin') return false;
                    if (['Ex-Employee', 'Terminated', 'Absconding', 'Retired'].includes(u.status)) return false;
                    // Resigned: only keep if still on notice period (exitDate in future)
                    if (u.status === 'Resigned') {
                        return u.exitDate && new Date(u.exitDate) > today;
                    }
                    return true;
                }));
                const ids = {};
                data.users.forEach(u => { ids[u._id] = u.employeeId || ''; });
                setEditedIds(ids);
                setFetched(true);
            }
        } catch (err) {
            Swal.fire('Error', 'Failed to fetch employees', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredDepts = useMemo(() => {
        if (!filterBranch) return departments;
        const branch = branches.find(b => b.branchName === filterBranch);
        return branch ? departments.filter(d => d.branchId === branch._id) : departments;
    }, [filterBranch, branches, departments]);

    const filtered = useMemo(() => {
        return employees.filter(emp => {
            const matchBranch = !filterBranch || emp.branch === filterBranch;
            const matchDept = !filterDept || emp.department === filterDept;
            const matchStatus = !filterStatus || emp.status === filterStatus;
            const matchSearch = !searchTerm ||
                emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (editedIds[emp._id] || '').toLowerCase().includes(searchTerm.toLowerCase());
            return matchBranch && matchDept && matchStatus && matchSearch;
        });
    }, [employees, filterBranch, filterDept, filterStatus, searchTerm, editedIds]);

    // Checkbox helpers
    const allFilteredSelected = filtered.length > 0 && filtered.every(emp => selectedIds.has(emp._id));
    const someFilteredSelected = filtered.some(emp => selectedIds.has(emp._id));

    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            // Deselect all filtered
            setSelectedIds(prev => {
                const next = new Set(prev);
                filtered.forEach(emp => next.delete(emp._id));
                return next;
            });
        } else {
            // Select all filtered
            setSelectedIds(prev => {
                const next = new Set(prev);
                filtered.forEach(emp => next.add(emp._id));
                return next;
            });
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleIdChange = (userId, value) => {
        setEditedIds(prev => ({ ...prev, [userId]: value.toUpperCase() }));
    };

    const handleSave = async () => {
        const checkedAndChanged = filtered.filter(
            emp => selectedIds.has(emp._id) && editedIds[emp._id] !== emp.employeeId
        );

        if (checkedAndChanged.length === 0) {
            return Swal.fire('Info', 'No checked employees with changes to save', 'info');
        }

        const updates = checkedAndChanged.map(emp => ({ id: emp._id, employeeId: editedIds[emp._id] }));

        setSaving(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/users/bulk-update-ids`, {
                method: 'POST',
                body: JSON.stringify({ updates }),
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({
                    title: 'Done!',
                    text: data.message,
                    icon: data.results?.failed?.length > 0 ? 'warning' : 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                handleGet();
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        } catch {
            Swal.fire('Error', 'Failed to save', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setFilterBranch('');
        setFilterDept('');
        setFilterStatus('');
        setSearchTerm('');
    };

    const handleApplyFormat = async () => {
        if (!empIdFormat) {
            return Swal.fire('No Format Set', 'Please configure an Employee ID Format first under Company Setting → Employee ID Format.', 'warning');
        }

        const checkedFiltered = filtered.filter(emp => selectedIds.has(emp._id));
        if (checkedFiltered.length === 0) {
            return Swal.fire('No Selection', 'Please check at least one employee to apply the format.', 'warning');
        }

        const result = await Swal.fire({
            title: 'Apply Format to Selected Employees?',
            html: `This will generate new IDs using format <b>${buildId(empIdFormat, 1)}, ${buildId(empIdFormat, 2)}...</b> for <b>${checkedFiltered.length}</b> selected employee(s) and save directly to the database.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563EB',
            confirmButtonText: 'Yes, Apply & Save',
        });

        if (!result.isConfirmed) return;

        let maxCounter = employees.length;
        const updates = checkedFiltered.map((emp, i) => ({
            id: emp._id,
            employeeId: buildId(empIdFormat, maxCounter - checkedFiltered.length + i + 1),
        }));

        setSaving(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/users/bulk-update-ids`, {
                method: 'POST',
                body: JSON.stringify({ updates }),
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({
                    title: 'Done!',
                    text: data.message,
                    icon: data.results?.failed?.length > 0 ? 'warning' : 'success',
                    timer: 2000,
                    showConfirmButton: false,
                });
                handleGet();
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        } catch {
            Swal.fire('Error', 'Failed to apply format', 'error');
        } finally {
            setSaving(false);
        }
    };

    const checkedChangedCount = filtered.filter(
        emp => selectedIds.has(emp._id) && editedIds[emp._id] !== emp.employeeId
    ).length;

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Update Bulk Employee ID</h1>
                    {empIdFormat && (
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                            Current format: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>{buildId(empIdFormat, 1)}</span>, <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>{buildId(empIdFormat, 2)}</span>...
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {fetched && (
                        <>
                            <button className="btn-hrm btn-hrm-secondary" onClick={handleApplyFormat} disabled={saving} title="Generate IDs for checked employees using the saved format and save to DB">
                                <Wand2 size={15} /> APPLY FORMAT TO SELECTED
                            </button>
                            <button className="btn-hrm btn-hrm-primary" onClick={handleSave} disabled={saving}>
                                <Save size={15} /> {saving ? 'SAVING...' : 'SAVE CHANGES'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="hrm-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 16, alignItems: 'end' }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Branch</label>
                        <SearchableSelect
                            options={[{ value: '', label: 'All Branches' }, ...branches.map(b => ({ value: b.branchName, label: b.branchName }))]}
                            value={filterBranch}
                            onChange={val => { setFilterBranch(val); setFilterDept(''); }}
                            placeholder="All Branches"
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Department</label>
                        <SearchableSelect
                            options={[{ value: '', label: 'All Departments' }, ...filteredDepts.map(d => ({ value: d.name, label: d.name }))]}
                            value={filterDept}
                            onChange={setFilterDept}
                            placeholder="All Departments"
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Status</label>
                        <SearchableSelect
                            options={[
                                { value: '', label: 'All Status' },
                                { value: 'Active', label: 'Active' },
                                { value: 'Inactive', label: 'Inactive' },
                                { value: 'Onboarding', label: 'Onboarding' },
                                { value: 'Resigned', label: 'Notice Period' },
                            ]}
                            value={filterStatus}
                            onChange={setFilterStatus}
                            placeholder="All Status"
                        />
                    </div>
                    
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Search</label>
                        <div className="search-wrapper">
                            <Search size={15} color="var(--text-secondary)" />
                            <input type="text" placeholder="Name or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-hrm btn-hrm-secondary" onClick={handleReset} title="Reset filters">
                            <RotateCcw size={15} />
                        </button>
                        <button className="btn-hrm btn-hrm-primary" onClick={handleGet} disabled={loading}>
                            {loading ? 'Loading...' : 'GET'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */} 
            {fetched && (
                <div className="hrm-card">
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                            Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{employees.length}</strong> employees
                            {selectedIds.size > 0 && (
                                <span style={{ marginLeft: 12, color: 'var(--accent-primary)', fontWeight: 700 }}>
                                    · {selectedIds.size} selected
                                </span>
                            )}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Check employees, then edit IDs or apply format</span>
                    </div>
                    <div className="hrm-table-wrapper">
                        <table className="hrm-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 46, textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={allFilteredSelected}
                                            ref={el => { if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected; }}
                                            onChange={toggleSelectAll}
                                            style={{ cursor: 'pointer', width: 15, height: 15, accentColor: '#2563EB' }}
                                        />
                                    </th>
                                    <th>Employee ID</th>
                                    <th>Name</th>
                                    <th>Branch</th>
                                    <th>Department</th>
                                    <th>Designation</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No employees found</td></tr>
                                ) : filtered.map((emp) => {
                                    const isChecked = selectedIds.has(emp._id);
                                    const changed = editedIds[emp._id] !== emp.employeeId;
                                    const highlight = isChecked && changed;
                                    return (
                                        <tr key={emp._id} style={{ background: highlight ? 'rgba(245,166,35,0.08)' : isChecked ? 'var(--accent-primary-glow)' : undefined }}>
                                            <td style={{ textAlign: 'center' }}>
                                                <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(emp._id)} style={{ cursor: 'pointer', width: 15, height: 15, accentColor: 'var(--accent-primary)' }} />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={editedIds[emp._id] || ''}
                                                    onChange={e => handleIdChange(emp._id, e.target.value)}
                                                    style={{
                                                        width: 147, padding: '6px 10px',
                                                        border: `1px solid ${highlight ? 'var(--accent-amber)' : 'var(--border)'}`,
                                                        borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700,
                                                        fontFamily: 'monospace',
                                                        color: highlight ? 'var(--accent-amber)' : 'var(--text-primary)',
                                                        background: highlight ? 'rgba(245,166,35,0.08)' : 'var(--bg-base)',
                                                        outline: 'none', transition: 'all 0.2s'
                                                    }}
                                                />
                                            </td>
                                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</td>
                                            <td>{emp.branch || '--'}</td>
                                            <td>{emp.department || '--'}</td>
                                            <td>{emp.designation || '--'}</td>
                                            <td>
                                                {(() => {
                                                    const isNotice = emp.status === 'Resigned' && emp.exitDate && new Date(emp.exitDate) > new Date();
                                                    const label = isNotice ? 'Notice Period' : emp.status;
                                                    const bg = emp.status === 'Active' ? '#F0FDF4' : isNotice ? '#FFF7ED' : emp.status === 'Inactive' ? '#F8FAFC' : '#FEF2F2';
                                                    const color = emp.status === 'Active' ? '#16A34A' : isNotice ? '#C2410C' : emp.status === 'Inactive' ? '#64748B' : '#EF4444';
                                                    return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: bg, color }}>{label}</span>;
                                                })()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {checkedChangedCount > 0 && (
                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--bg-elevated)' }}>
                            <span style={{ fontSize: 13, color: 'var(--accent-amber)', fontWeight: 600, alignSelf: 'center' }}>
                                {checkedChangedCount} unsaved change(s) in selected employees
                            </span>
                            <button className="btn-primary" onClick={handleSave} disabled={saving}>
                                <Save size={15} /> {saving ? 'SAVING...' : 'SAVE CHANGES'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {!fetched && !loading && (
                <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                    <Filter size={40} style={{ marginBottom: 16, opacity: 0.3 }} />
                    <p style={{ fontSize: 15, fontWeight: 500 }}>Set your filters and click GET to load employees</p>
                </div>
            )}
        </div>
    );
};

export default BulkEmployeeId;
