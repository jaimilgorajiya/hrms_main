import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, GripVertical, Building2, Layout, Save } from 'lucide-react';
import Swal from 'sweetalert2';

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
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
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
                <h1 className="hrm-title">Departments</h1>
                <div className="hrm-header-actions">
                    <button className="btn-hrm btn-hrm-primary" onClick={() => { setIsBulkModalOpen(true); setFormData({ ...formData, branchId: branches[0]?._id }); }}><Plus size={18} /> ADD MULTIPLE</button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {branches.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '100px 0', color: '#94A3B8', background: 'white', borderRadius: '12px' }}>No branches found. Please add branches first.</div>
                ) : (
                    branches.filter(branch => departments.some(d => d.branchId === branch._id)).map(branch => {
                        const branchDepts = departments.filter(d => d.branchId === branch._id).sort((a,b) => a.order - b.order);
                        return (
                            <div key={branch._id} className="hrm-card" style={{ marginBottom: 0 }}>
                                <div className="hrm-card-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ background: '#EEF2FF', padding: '8px', borderRadius: '8px' }}><Building2 size={18} color="#3B82FB" /></div>
                                        <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{branch.branchName} BRANCH</h3>
                                        <span className="dept-count">{branchDepts.length}</span>
                                    </div>
                                    <button className="btn-hrm btn-hrm-secondary" style={{ padding: '6px 16px', fontSize: '12px' }} onClick={() => { setIsEditing(false); setFormData({ name: '', branchId: branch._id }); setIsModalOpen(true); }}><Plus size={14} /> ADD</button>
                                </div>
                                <div className="hrm-card-body">
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                        {branchDepts.map((dept) => (
                                            <div key={dept._id} style={{ background: '#F8FAFC', padding: '16px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: '700', color: '#1E293B', fontSize: '14px' }}>{dept.name}</span>
                                                    <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Notice: {dept.noticePeriodDays || 30} days</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="btn-action-edit" onClick={() => handleEdit(dept)}><Edit2 size={14} /></button>
                                                    <button className="btn-action-delete" onClick={() => handleDelete(dept._id)}><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                
                {!loading && branches.length > 0 && !branches.some(branch => departments.some(d => d.branchId === branch._id)) && (
                    <div className="hrm-card" style={{ padding: '60px', textAlign: 'center' }}>
                        <Layout size={48} style={{ marginBottom: '20px', opacity: 0.2 }} />
                        <p style={{ color: '#64748B' }}>All branches currently have 0 departments.</p>
                        <button className="btn-hrm btn-hrm-primary" style={{ marginTop: '20px' }} onClick={() => { setIsBulkModalOpen(true); setFormData({ ...formData, branchId: branches[0]?._id }); }}>Add Your First Department</button>
                    </div>
                )}
            </div>

            {/* Single Add Modal */}
            {isModalOpen && (
                <div className="hrm-modal-overlay">
                    <div className="hrm-modal-content">
                        <div className="hrm-modal-header">
                            <h2>{isEditing ? 'Edit Department' : 'Add New Department'}</h2>
                            <button className="icon-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="hrm-modal-body">
                                <div className="hrm-form-group">
                                    <label className="hrm-label">Branch <span className="req">*</span></label>
                                    <select className="hrm-select" name="branchId" value={formData.branchId} onChange={handleInputChange} required disabled={isEditing}>
                                        <option value="">-- Select Branch --</option>
                                        {branches.map(b => (
                                            <option key={b._id} value={b._id}>{b.branchName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="hrm-form-group">
                                    <label className="hrm-label">Department Name <span className="req">*</span></label>
                                    <input type="text" className="hrm-input" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Sales" required />
                                </div>
                                <div className="hrm-form-group">
                                    <label className="hrm-label">Notice Period (Days) <span className="req">*</span></label>
                                    <input type="number" className="hrm-input" name="noticePeriodDays" value={formData.noticePeriodDays} onChange={handleInputChange} placeholder="30" required min="0" />
                                </div>
                            </div>
                            <div className="hrm-modal-footer">
                                <button type="button" className="btn-hrm btn-hrm-secondary" onClick={() => setIsModalOpen(false)}>CANCEL</button>
                                <button type="submit" className="btn-hrm btn-hrm-primary"><Save size={18} /> {isEditing ? 'UPDATE' : 'SAVE'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Add Modal */}
            {isBulkModalOpen && (
                <div className="hrm-modal-overlay">
                    <div className="hrm-modal-content" style={{ width: '700px' }}>
                        <div className="hrm-modal-header">
                            <h2>Add Multiple Departments</h2>
                            <button className="icon-btn" onClick={() => setIsBulkModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleBulkSubmit}>
                            <div className="hrm-modal-body">
                                <div className="hrm-form-group">
                                    <label className="hrm-label">Branch <span className="req">*</span></label>
                                    <select className="hrm-select" name="branchId" value={formData.branchId} onChange={handleInputChange} required>
                                        <option value="">-- Select Branch --</option>
                                        {branches.map(b => (
                                            <option key={b._id} value={b._id}>{b.branchName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ marginTop: '30px' }}>
                                    <label className="hrm-label">Department Names</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {bulkDepartments.map((val, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '10px' }}>
                                                <input 
                                                    type="text" 
                                                    className="hrm-input" 
                                                    value={val} 
                                                    onChange={(e) => handleBulkRowChange(idx, e.target.value)} 
                                                    placeholder={`Department #${idx + 1}`}
                                                    required={idx === 0}
                                                />
                                                {bulkDepartments.length > 1 && (
                                                    <button type="button" className="btn-hrm btn-hrm-danger" style={{ padding: '10px' }} onClick={() => removeBulkRow(idx)}><Trash2 size={16} /></button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" className="btn-hrm btn-hrm-secondary" style={{ width: '100%', marginTop: '15px', borderStyle: 'dashed' }} onClick={addBulkRow}><Plus size={16} /> ADD MORE ROW</button>
                                </div>
                            </div>
                            <div className="hrm-modal-footer">
                                <button type="button" className="btn-hrm btn-hrm-secondary" onClick={() => setIsBulkModalOpen(false)}>CANCEL</button>
                                <button type="submit" className="btn-hrm btn-hrm-primary"><Save size={18} /> SAVE ALL</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Department;
