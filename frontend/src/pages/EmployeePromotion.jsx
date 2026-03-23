import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Search, RotateCcw, TrendingUp } from 'lucide-react';
import Swal from 'sweetalert2';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import SearchableSelect from '../components/SearchableSelect';

const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

const EMPTY = {
    employeeId: '', branch: '', department: '', newDesignation: '', promotionFrom: '', remark: ''
};

const EmployeePromotion = () => {
    const [promotions, setPromotions] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [search, setSearch] = useState('');
    const [filterBranch, setFilterBranch] = useState('');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [pRes, eRes, bRes, dRes, desRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/promotions`),
                authenticatedFetch(`${API_URL}/api/users`),
                authenticatedFetch(`${API_URL}/api/branches`),
                authenticatedFetch(`${API_URL}/api/departments`),
                authenticatedFetch(`${API_URL}/api/designations`),
            ]);
            const [pData, eData, bData, dData, desData] = await Promise.all([
                pRes.json(), eRes.json(), bRes.json(), dRes.json(), desRes.json()
            ]);
            if (pData.success) setPromotions(pData.promotions);
            if (eData.success) setEmployees(eData.users.filter(u => u.role !== 'Admin'));
            if (bData.success) setBranches(bData.branches);
            if (dData.success) setDepartments(dData.departments);
            if (desData.success) setDesignations(desData.designations);
        } catch {
            Swal.fire('Error', 'Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const filteredDepts = useMemo(() => {
        if (!form.branch) return departments;
        const branch = branches.find(b => b.branchName === form.branch);
        return branch ? departments.filter(d => d.branchId === branch._id) : departments;
    }, [form.branch, branches, departments]);

    const branchEmployees = useMemo(() => {
        if (!form.branch) return employees;
        return employees.filter(e => e.branch === form.branch);
    }, [form.branch, employees]);

    const openAdd = () => { setEditingId(null); setForm(EMPTY); setShowModal(true); };

    const openEdit = (p) => {
        setEditingId(p._id);
        setForm({
            employeeId: p.employeeId?._id || '',
            branch: p.branch || '',
            department: p.department || '',
            newDesignation: p.newDesignation || '',
            promotionFrom: p.promotionFrom ? p.promotionFrom.slice(0, 10) : '',
            remark: p.remark || '',
        });
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingId(null); };

    const handleBranchChange = (val) => {
        setForm(prev => ({ ...prev, branch: val, department: '', employeeId: '' }));
    };

    const handleEmployeeChange = (val) => {
        const emp = employees.find(e => e._id === val);
        setForm(prev => ({
            ...prev,
            employeeId: val,
            department: emp?.department || prev.department,
            newDesignation: emp?.designation || '',
        }));
    };

    const handleSave = async () => {
        if (!form.employeeId) return Swal.fire('Validation', 'Please select an employee', 'warning');
        if (!form.branch) return Swal.fire('Validation', 'Branch is required', 'warning');
        if (!form.department) return Swal.fire('Validation', 'Department is required', 'warning');
        if (!form.newDesignation) return Swal.fire('Validation', 'New designation is required', 'warning');
        if (!form.promotionFrom) return Swal.fire('Validation', 'Promotion date is required', 'warning');

        setSaving(true);
        try {
            const url = editingId
                ? `${API_URL}/api/promotions/${editingId}`
                : `${API_URL}/api/promotions/add`;
            const method = editingId ? 'PUT' : 'POST';
            const res = await authenticatedFetch(url, { method, body: JSON.stringify(form) });
            const data = await res.json();
            if (data.success) {
                Swal.fire({ title: editingId ? 'Updated' : 'Saved', icon: 'success', timer: 1500, showConfirmButton: false });
                closeModal();
                fetchAll();
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        } catch {
            Swal.fire('Error', 'Failed to save', 'error');
        } finally {
            setSaving(false);
        }
    };

    const filtered = useMemo(() => {
        return promotions.filter(p => {
            const name = p.employeeId?.name?.toLowerCase() || '';
            const matchSearch = !search || name.includes(search.toLowerCase());
            const matchBranch = !filterBranch || p.branch === filterBranch;
            return matchSearch && matchBranch;
        });
    }, [promotions, search, filterBranch]);

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h1 className="hrm-title">Employee Promotion</h1>
                </div>
                <button className="btn-hrm btn-hrm-primary" onClick={openAdd}>
                    <Plus size={15} /> ADD PROMOTION
                </button>
            </div>

                       {/* Table */}
            <div className="hrm-card">
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                        <strong style={{ color: '#1E293B' }}>{filtered.length}</strong> promotion record(s)
                    </span>
                </div>
                <div className="hrm-table-wrapper">
                    <table className="hrm-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Branch</th>
                                <th>Department</th>
                                <th>Previous Designation</th>
                                <th>New Designation</th>
                                <th>Promotion Date</th>
                                <th>Remark</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 50, color: '#94A3B8' }}>
                                    <TrendingUp size={36} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                                    No promotion records found
                                </td></tr>
                            ) : filtered.map(p => (
                                <tr key={p._id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            {/* <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#2563EB', flexShrink: 0 }}>
                                                {p.employeeId?.name?.charAt(0)?.toUpperCase()}
                                            </div> */}
                                            <div>
                                                <p style={{ fontWeight: 600, color: '#1E293B', fontSize: 13 }}>{p.employeeId?.name}</p>
                                                <p style={{ fontSize: 11, color: '#94A3B8' }}>{p.employeeId?.employeeId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: 13 }}>{p.branch}</td>
                                    <td style={{ fontSize: 13 }}>{p.department}</td>
                                    <td>
                                        <span style={{ fontSize: 12, color: '#64748B', background: '#F1F5F9', padding: '3px 10px', borderRadius: 20 }}>
                                            {p.previousDesignation || '--'}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '3px 10px', borderRadius: 20 }}>
                                            {p.newDesignation}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 13, color: '#475569' }}>{fmt(p.promotionFrom)}</td>
                                    <td style={{ fontSize: 13, color: '#64748B', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.remark || '--'}</td>
                                    <td>
                                        <button onClick={() => openEdit(p)}
                                            style={{ background: '#EFF6FF', border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#2563EB' }}>
                                            <Pencil size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Promotion Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={closeModal}>
                    <div style={{ background: 'white', borderRadius: 16, width: 620, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}
                        onClick={e => e.stopPropagation()}>

                        {/* Modal Header */}
                        <div style={{ background: 'white', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <TrendingUp size={20} color="#2563EB" />
                                <h2 style={{ color: '#1E293B', fontSize: 16, fontWeight: 800 }}>
                                    {editingId ? 'Edit Promotion' : 'Add Promotion'}
                                </h2>
                            </div>
                            <button onClick={closeModal} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#64748B', fontSize: 16, lineHeight: 1 }}>✕</button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: 28 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                                <div>
                                    <label className="hrm-label">Branch <span className="req">*</span></label>
                                    <SearchableSelect
                                        options={branches.map(b => ({ value: b.branchName, label: b.branchName }))}
                                        value={form.branch} onChange={handleBranchChange} placeholder="Select Branch"
                                    />
                                </div>
                                <div>
                                    <label className="hrm-label">Department <span className="req">*</span></label>
                                    <SearchableSelect
                                        options={filteredDepts.map(d => ({ value: d.name, label: d.name }))}
                                        value={form.department} onChange={v => set('department', v)} placeholder="Select Department"
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label className="hrm-label">Employee <span className="req">*</span></label>
                                    <SearchableSelect
                                        options={branchEmployees.map(e => ({ value: e._id, label: `${e.name}${e.employeeId ? ` (${e.employeeId})` : ''}` }))}
                                        value={form.employeeId} onChange={handleEmployeeChange} placeholder="Select Employee" searchable
                                    />
                                </div>
                                <div>
                                    <label className="hrm-label">New Designation <span className="req">*</span></label>
                                    <SearchableSelect
                                        options={designations.map(d => ({ value: d.designationName, label: d.designationName }))}
                                        value={form.newDesignation} onChange={v => set('newDesignation', v)} placeholder="Select Designation"
                                    />
                                </div>
                                <div>
                                    <label className="hrm-label">Promotion From <span className="req">*</span></label>
                                    <input type="date" value={form.promotionFrom} onChange={e => set('promotionFrom', e.target.value)} className="hrm-input" />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label className="hrm-label">Remark</label>
                                    <textarea value={form.remark} onChange={e => set('remark', e.target.value)}
                                        className="hrm-input" rows={3} placeholder="Optional remark..."
                                        style={{ resize: 'vertical', minHeight: 80 }} />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{ padding: '16px 28px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button className="btn-hrm btn-hrm-secondary" onClick={closeModal}>CANCEL</button>
                            <button className="btn-hrm btn-hrm-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'SAVING...' : 'SAVE'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeePromotion;
