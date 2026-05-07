import { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Pencil, Search, RotateCcw, TrendingUp, Save, 
    X, Briefcase, Calendar, MessageSquare, User, Filter,
    ChevronRight, ArrowUpRight
} from 'lucide-react';
import Swal from 'sweetalert2';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import SearchableSelect from '../components/SearchableSelect';

const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

const EMPTY = {
    employeeId: '', branch: '', department: '', newDesignation: '', promotionFrom: new Date().toISOString().split('T')[0], remark: ''
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
            if (eData.success) setEmployees(eData.users.filter(u => u.role !== 'Admin' && u.status !== 'Ex-Employee'));
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
            promotionFrom: p.promotionFrom ? p.promotionFrom.slice(0, 10) : new Date().toISOString().split('T')[0],
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
                Swal.fire({ 
                    title: editingId ? 'Promotion Updated' : 'Promotion Recorded', 
                    text: 'The employee record has been successfully updated.',
                    icon: 'success', 
                    timer: 2000, 
                    showConfirmButton: false 
                });
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
            const matchSearch = !search || name.includes(search.toLowerCase()) || p.employeeId?.employeeId?.toLowerCase().includes(search.toLowerCase());
            const matchBranch = !filterBranch || p.branch === filterBranch;
            return matchSearch && matchBranch;
        });
    }, [promotions, search, filterBranch]);

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Career Progression</h1>
                    <p className="hrm-subtitle">Manage employee promotions, title changes, and organizational growth</p>
                </div>
                <button className="btn-hrm btn-hrm-primary" onClick={openAdd}>
                    <Plus size={18} /> NEW PROMOTION
                </button>
            </div>

            {/* Stats / Filter Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div className="hrm-card" style={{ padding: '20px 24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            className="hrm-input" 
                            placeholder="Search by name or Employee ID..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: '44px' }}
                        />
                    </div>
                    <div style={{ width: '220px' }}>
                        <SearchableSelect 
                            options={[{ value: '', label: 'All Branches' }, ...branches.map(b => ({ value: b.branchName, label: b.branchName }))]}
                            value={filterBranch}
                            onChange={setFilterBranch}
                            placeholder="Filter by Branch"
                        />
                    </div>
                    <button className="btn-hrm btn-hrm-secondary" onClick={() => { setSearch(''); setFilterBranch(''); }}>
                        <RotateCcw size={16} /> RESET
                    </button>
                </div>

                <div className="hrm-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Promotions</p>
                        <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--primary-blue)', margin: 0 }}>{promotions.length}</h3>
                    </div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-blue)' }}>
                        <TrendingUp size={24} />
                    </div>
                </div>
            </div>

            {/* Main Content Table */}
            <div className="hrm-card">
                <div className="hrm-table-container">
                    <table className="hrm-table">
                        <thead>
                            <tr>
                                <th>Employee Details</th>
                                <th>Branch & Dept</th>
                                <th>Previous Title</th>
                                <th>New Designation</th>
                                <th>Effective Date</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ padding: '100px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>Loading promotion history...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="7" style={{ padding: '100px', textAlign: 'center' }}>
                                    <TrendingUp size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                    <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>No promotion records found</p>
                                </td></tr>
                            ) : filtered.map(p => (
                                <tr key={p._id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800', color: 'var(--primary-blue)', border: '1px solid var(--border)' }}>
                                                {p.employeeId?.name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>{p.employeeId?.name || 'Unknown'}</p>
                                                <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', margin: 0 }}>{p.employeeId?.employeeId || 'ID N/A'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)', margin: 0 }}>{p.branch}</p>
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{p.department}</p>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', background: 'var(--bg-main)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                            {p.previousDesignation || '--'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: '800', fontSize: '13px' }}>
                                            <ArrowUpRight size={14} />
                                            {p.newDesignation}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                                            <Calendar size={14} color="var(--text-muted)" />
                                            {fmt(p.promotionFrom)}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="hrm-badge hrm-badge-success" style={{ fontSize: '10px' }}>COMPLETED</span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <button className="btn-action-edit" onClick={() => openEdit(p)} title="Edit Record">
                                                <Pencil size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal - Modern Drawer Style */}
            {showModal && (
                <div className="hrm-modal-overlay" onClick={closeModal}>
                    <div 
                        className="hrm-modal-content" 
                        style={{ 
                            width: '550px', height: '100%', margin: 0, borderRadius: 0, marginLeft: 'auto',
                            display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease-out'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="hrm-modal-header" style={{ background: 'var(--primary-gradient)', color: 'white', padding: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.3)' }}>
                                    <TrendingUp size={24} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ color: 'white', fontSize: '20px', fontWeight: 900, margin: 0 }}>
                                        {editingId ? 'Edit Promotion' : 'Record Promotion'}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                                        Assign new title and career milestones
                                    </p>
                                </div>
                            </div>
                            <button className="icon-btn" style={{ color: 'white', background: 'rgba(255,255,255,0.1)', border: 'none' }} onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="hrm-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="hrm-form-group">
                                        <label className="hrm-label">BRANCH <span style={{ color: 'var(--danger)' }}>*</span></label>
                                        <SearchableSelect 
                                            options={branches.map(b => ({ value: b.branchName, label: b.branchName }))} 
                                            value={form.branch} 
                                            onChange={handleBranchChange} 
                                            placeholder="Select Branch" 
                                        />
                                    </div>
                                    <div className="hrm-form-group">
                                        <label className="hrm-label">DEPARTMENT <span style={{ color: 'var(--danger)' }}>*</span></label>
                                        <SearchableSelect 
                                            options={filteredDepts.map(d => ({ value: d.name, label: d.name }))} 
                                            value={form.department} 
                                            onChange={v => set('department', v)} 
                                            placeholder="Select Dept" 
                                        />
                                    </div>
                                </div>

                                <div className="hrm-form-group">
                                    <label className="hrm-label">SELECT EMPLOYEE <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <SearchableSelect 
                                        options={branchEmployees.map(e => ({ value: e._id, label: `${e.name} (${e.employeeId || 'No ID'})` }))} 
                                        value={form.employeeId} 
                                        onChange={handleEmployeeChange} 
                                        placeholder="Search by name..." 
                                        searchable 
                                    />
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Only active employees in the selected branch are shown</p>
                                </div>

                                <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '18px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className="hrm-form-group">
                                            <label className="hrm-label">NEW DESIGNATION <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <SearchableSelect 
                                                options={designations.map(d => ({ value: d.designationName, label: d.designationName }))} 
                                                value={form.newDesignation} 
                                                onChange={v => set('newDesignation', v)} 
                                                placeholder="Select Title" 
                                            />
                                        </div>
                                        <div className="hrm-form-group">
                                            <label className="hrm-label">EFFECTIVE DATE <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <div style={{ position: 'relative' }}>
                                                <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input 
                                                    type="date" 
                                                    className="hrm-input" 
                                                    style={{ paddingLeft: '40px' }}
                                                    value={form.promotionFrom} 
                                                    onChange={e => set('promotionFrom', e.target.value)} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="hrm-form-group">
                                    <label className="hrm-label">REMARK / NOTES</label>
                                    <div style={{ position: 'relative' }}>
                                        <MessageSquare size={16} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-muted)' }} />
                                        <textarea 
                                            className="hrm-input"
                                            value={form.remark} 
                                            onChange={e => set('remark', e.target.value)} 
                                            rows={4} 
                                            placeholder="Enter reason for promotion or internal notes..." 
                                            style={{ paddingLeft: '40px', paddingTop: '12px', minHeight: '120px' }} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="hrm-modal-footer" style={{ background: 'var(--bg-main)', borderTop: '1px solid var(--border)', padding: '24px 32px' }}>
                            <button className="btn-hrm btn-hrm-secondary" style={{ flex: 1 }} onClick={closeModal}>DISCARD</button>
                            <button className="btn-hrm btn-hrm-primary" style={{ flex: 1.5 }} onClick={handleSave} disabled={saving}>
                                <Save size={18} /> {saving ? 'SAVING...' : editingId ? 'UPDATE RECORD' : 'SAVE PROMOTION'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>
                {`
                    @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                    .badge-purple {
                        background: #F5F3FF;
                        color: #7C3AED;
                        padding: 4px 10px;
                        border-radius: 8px;
                        font-size: 12px;
                        font-weight: 800;
                        border: 1px solid #DDD6FE;
                    }
                `}
            </style>
        </div>
    );
};

export default EmployeePromotion;
