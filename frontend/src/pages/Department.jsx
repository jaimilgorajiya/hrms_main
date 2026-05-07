import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, GripVertical, Building2, Layout, Save } from 'lucide-react';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const Department = () => {
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        branchId: '',
        noticePeriodDays: 30
    });

    const [bulkDepartments, setBulkDepartments] = useState(['']);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const [branchRes, deptRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/branches`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/departments`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const branchData = await branchRes.json();
            const deptData = await deptRes.json();

            if (branchData.success) setBranches(branchData.branches);
            if (deptData.success) {
                setDepartments(deptData.departments.sort((a,b) => a.order - b.order));
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const endpoint = isEditing ? `${API_URL}/api/departments/${currentId}` : `${API_URL}/api/departments/add`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await authenticatedFetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                Swal.fire({
                    title: 'Success!',
                    text: isEditing ? 'Department updated successfully.' : 'Department added successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                setIsModalOpen(false);
                setFormData({ name: '', branchId: '', noticePeriodDays: 30 });
                setIsEditing(false);
                fetchInitialData();
            } else {
                Swal.fire('Error', data.message || 'Something went wrong', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to save department', 'error');
        }
    };

    const handleBulkSubmit = async (e) => {
        e.preventDefault();
        const filteredDepts = bulkDepartments.filter(name => name.trim() !== '');
        if (filteredDepts.length === 0) {
            Swal.fire('Error', 'Please enter at least one department name', 'error');
            return;
        }

        const token = localStorage.getItem('token');
        try {
            const response = await authenticatedFetch(`${API_URL}/api/departments/bulk-add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    departments: filteredDepts,
                    branchId: formData.branchId 
                })
            });

            const data = await response.json();
            if (data.success) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Departments added successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                setIsBulkModalOpen(false);
                setBulkDepartments(['']);
                setFormData({ name: '', branchId: '', noticePeriodDays: 30 });
                fetchInitialData();
            } else {
                Swal.fire('Error', data.message || 'Something went wrong', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to save departments', 'error');
        }
    };

    const handleEdit = (dept) => {
        setFormData({
            name: dept.name,
            branchId: dept.branchId,
            noticePeriodDays: dept.noticePeriodDays || 30
        });
        setCurrentId(dept._id);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Department?',
            text: "All associated roles might be affected!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--danger)',
            cancelButtonColor: 'var(--text-muted)',
            confirmButtonText: 'Yes, delete department'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const response = await authenticatedFetch(`${API_URL}/api/departments/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    Swal.fire('Deleted!', 'Department has been removed.', 'success');
                    fetchInitialData();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete department', 'error');
            }
        }
    };

    const addBulkRow = () => setBulkDepartments([...bulkDepartments, '']);
    const removeBulkRow = (index) => {
        const updated = bulkDepartments.filter((_, i) => i !== index);
        setBulkDepartments(updated.length ? updated : ['']);
    };

    const handleBulkRowChange = (index, value) => {
        const updated = [...bulkDepartments];
        updated[index] = value;
        setBulkDepartments(updated);
    };

    if (loading) return <div className="loading-container">Loading Departments...</div>;

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Departments</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Structure your organization by managing departments across branches
                    </p>
                </div>
                <div className="hrm-header-actions">
                    <button className="btn-hrm btn-hrm-primary" onClick={() => { setIsBulkModalOpen(true); setFormData({ ...formData, branchId: branches[0]?._id }); }}>
                        <Plus size={18} /> ADD MULTIPLE
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {branches.length === 0 ? (
                    <div className="hrm-card" style={{ textAlign: 'center', padding: '100px 0' }}>
                        <Building2 size={48} color="var(--text-muted)" style={{ opacity: 0.2, marginBottom: '16px' }} />
                        <p style={{ color: 'var(--text-muted)' }}>No branches found. Please add branches first.</p>
                    </div>
                ) : (
                    branches.map(branch => {
                        const branchDepts = departments.filter(d => d.branchId === branch._id).sort((a,b) => a.order - b.order);
                        return (
                            <div key={branch._id} style={{ marginBottom: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ background: 'var(--primary-light)', padding: '10px', borderRadius: '12px' }}>
                                            <Building2 size={20} color="var(--primary-blue)" />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                                {branch.branchName}
                                            </h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                                <span className="hrm-badge hrm-badge-primary" style={{ fontSize: '10px' }}>{branchDepts.length} Departments</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="btn-hrm btn-hrm-secondary" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => { setIsEditing(false); setFormData({ name: '', branchId: branch._id, noticePeriodDays: 30 }); setIsModalOpen(true); }}>
                                        <Plus size={14} /> NEW DEPARTMENT
                                    </button>
                                </div>
                                
                                {branchDepts.length === 0 ? (
                                    <div className="hrm-card" style={{ padding: '40px', textAlign: 'center', borderStyle: 'dashed' }}>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>No departments added to this branch yet.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                                        {branchDepts.map((dept) => (
                                            <div key={dept._id} className="hrm-card" style={{ padding: '24px', transition: 'all 0.3s ease', border: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '4px' }}>{dept.name}</h4>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{ fontWeight: '700', color: 'var(--primary-blue)' }}>{dept.noticePeriodDays || 30}</span> Days Notice
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button className="btn-action-edit" onClick={() => handleEdit(dept)} style={{ width: '32px', height: '32px', borderRadius: '8px' }}><Edit2 size={14} /></button>
                                                        <button className="btn-action-delete" onClick={() => handleDelete(dept._id)} style={{ width: '32px', height: '32px', borderRadius: '8px' }}><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modals using standard premium styles */}
            {isModalOpen && (
                <div className="hrm-modal-overlay">
                    <div className="hrm-modal-content" style={{ maxWidth: '550px', width: '100%' }}>
                        <div className="hrm-modal-header" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ 
                                    background: 'var(--primary-gradient)', 
                                    padding: '10px', 
                                    borderRadius: '12px', 
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                                }}>
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>
                                        {isEditing ? 'Update Department' : 'Create Department'}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                                        Configure organizational structure and notice period
                                    </p>
                                </div>
                            </div>
                            <button className="icon-btn" onClick={() => setIsModalOpen(false)} style={{ background: 'white', border: '1px solid #E2E8F0' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="hrm-modal-body" style={{ padding: '32px' }}>
                                <div className="hrm-form-group" style={{ marginBottom: '24px' }}>
                                    <SearchableSelect 
                                        label="Target Branch"
                                        required={true}
                                        options={branches.map(b => ({ value: b._id, label: b.branchName }))}
                                        value={formData.branchId}
                                        onChange={(val) => setFormData({ ...formData, branchId: val })}
                                        disabled={isEditing}
                                    />
                                </div>

                                <div className="hrm-form-group" style={{ marginBottom: '24px' }}>
                                    <label className="hrm-label">Department Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input 
                                        type="text" 
                                        className="hrm-input" 
                                        name="name" 
                                        value={formData.name} 
                                        onChange={handleInputChange} 
                                        placeholder="e.g. Engineering, Sales, HR" 
                                        style={{ height: '52px', fontSize: '15px' }}
                                        required 
                                    />
                                </div>

                                <div className="hrm-form-group" style={{ margin: 0 }}>
                                    <label className="hrm-label">Notice Period (Days) <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input 
                                        type="number" 
                                        className="hrm-input" 
                                        name="noticePeriodDays" 
                                        value={formData.noticePeriodDays} 
                                        onChange={handleInputChange} 
                                        placeholder="30" 
                                        style={{ height: '52px' }}
                                        required 
                                        min="0" 
                                    />
                                    <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#64748B' }}>Standard duration an employee must serve before leaving</p>
                                </div>
                            </div>
                            <div className="hrm-modal-footer" style={{ background: '#F8FAFC', padding: '24px 32px' }}>
                                <button type="button" className="btn-hrm btn-hrm-secondary" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 28px' }}>
                                    DISCARD
                                </button>
                                <button type="submit" className="btn-hrm btn-hrm-primary" style={{ padding: '12px 32px' }}>
                                    <Save size={18} /> {isEditing ? 'UPDATE DEPARTMENT' : 'SAVE DEPARTMENT'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isBulkModalOpen && (
                <div className="hrm-modal-overlay">
                    <div className="hrm-modal-content" style={{ maxWidth: '700px', width: '100%' }}>
                        <div className="hrm-modal-header" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ 
                                    background: 'var(--primary-gradient)', 
                                    padding: '10px', 
                                    borderRadius: '12px', 
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                                }}>
                                    <Layout size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>
                                        Bulk Add Departments
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                                        Quickly add multiple departments to a specific branch
                                    </p>
                                </div>
                            </div>
                            <button className="icon-btn" onClick={() => setIsBulkModalOpen(false)} style={{ background: 'white', border: '1px solid #E2E8F0' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleBulkSubmit}>
                            <div className="hrm-modal-body" style={{ padding: '32px' }}>
                                <div className="hrm-form-group" style={{ marginBottom: '32px' }}>
                                    <SearchableSelect 
                                        label="Target Branch"
                                        required={true}
                                        options={branches.map(b => ({ value: b._id, label: b.branchName }))}
                                        value={formData.branchId}
                                        onChange={(val) => setFormData({ ...formData, branchId: val })}
                                    />
                                </div>
                                
                                <div>
                                    <label className="hrm-label" style={{ marginBottom: '16px' }}>Department Names List</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                                        {bulkDepartments.map((val, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <div style={{ flex: 1, position: 'relative' }}>
                                                    <input 
                                                        type="text" 
                                                        className="hrm-input" 
                                                        value={val} 
                                                        onChange={(e) => handleBulkRowChange(idx, e.target.value)} 
                                                        placeholder={`Department #${idx + 1}`}
                                                        style={{ height: '48px' }}
                                                        required={idx === 0}
                                                    />
                                                </div>
                                                {bulkDepartments.length > 1 && (
                                                    <button type="button" className="btn-hrm" style={{ padding: '12px', background: '#FEF2F2', color: '#EF4444', border: '1px solid #FEE2E2' }} onClick={() => removeBulkRow(idx)}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" className="btn-hrm btn-hrm-secondary" style={{ width: '100%', marginTop: '20px', borderStyle: 'dashed', padding: '12px' }} onClick={addBulkRow}>
                                        <Plus size={16} /> ADD ANOTHER ROW
                                    </button>
                                </div>
                            </div>
                            <div className="hrm-modal-footer" style={{ background: '#F8FAFC', padding: '24px 32px' }}>
                                <button type="button" className="btn-hrm btn-hrm-secondary" onClick={() => setIsBulkModalOpen(false)} style={{ padding: '12px 28px' }}>
                                    DISCARD
                                </button>
                                <button type="submit" className="btn-hrm btn-hrm-primary" style={{ padding: '12px 32px' }}>
                                    <Save size={18} /> SAVE ALL DEPARTMENTS
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Department;
