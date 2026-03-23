import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, Building2, MapPin, Grip, GripVertical } from 'lucide-react';
import Swal from 'sweetalert2';

const Branch = () => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [isReordering, setIsReordering] = useState(false);
    const [draggedItem, setDraggedItem] = useState(null);
    const [formData, setFormData] = useState({
        branchName: '',
        branchCode: '',
        branchType: ''
    });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await authenticatedFetch(`${API_URL}/api/branches`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setBranches(data.branches);
            }
        } catch (error) {
            console.error("Error fetching branches:", error);
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
        const endpoint = isEditing ? `${API_URL}/api/branches/${currentId}` : `${API_URL}/api/branches/add`;
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
                    text: isEditing ? 'Branch updated successfully.' : 'Branch added successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                setIsModalOpen(false);
                setFormData({ branchName: '', branchCode: '', branchType: '' });
                setIsEditing(false);
                fetchBranches();
            } else {
                Swal.fire('Error', data.error || 'Something went wrong', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to save branch', 'error');
        }
    };

    const handleEdit = (branch) => {
        setFormData({
            branchName: branch.branchName,
            branchCode: branch.branchCode || '',
            branchType: branch.branchType
        });
        setCurrentId(branch._id);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Branch?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete branch'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const response = await authenticatedFetch(`${API_URL}/api/branches/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    Swal.fire('Deleted!', 'Branch has been removed.', 'success');
                    fetchBranches();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete branch', 'error');
            }
        }
    };

    const onDragStart = (e, index) => {
        setDraggedItem(branches[index]);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
    };

    const onDragOver = (e, index) => {
        e.preventDefault();
        const draggedOverItem = branches[index];
        if (draggedItem === draggedOverItem) return;
        let items = branches.filter(item => item !== draggedItem);
        items.splice(index, 0, draggedItem);
        setBranches(items);
    };

    const onDragEnd = () => {
        setDraggedItem(null);
    };

    const handleSaveOrder = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await authenticatedFetch(`${API_URL}/api/branches/reorder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reorderedBranches: branches.map((b, i) => ({ _id: b._id, order: i })) })
            });
            const data = await response.json();
            if (data.success) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Order updated successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                setIsReordering(false);
                fetchBranches();
            } else {
                Swal.fire('Error', data.error || 'Failed to update order', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to save order', 'error');
        }
    };

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <h1 className="hrm-title">Branches</h1>
                <div className="hrm-header-actions">
                    {isReordering ? (
                        <>
                            <button className="btn-hrm btn-hrm-primary" onClick={handleSaveOrder}><Check size={18} /> SAVE ORDER</button>
                            <button className="btn-hrm btn-hrm-secondary" onClick={() => { setIsReordering(false); fetchBranches(); }}>CANCEL</button>
                        </>
                    ) : (
                        <>
                            <button className="btn-hrm btn-hrm-secondary" onClick={() => setIsReordering(true)}>CHANGE ORDER</button>
                            <button className="btn-hrm btn-hrm-primary" onClick={() => { setIsEditing(false); setFormData({ branchName: '', branchCode: '', branchType: '' }); setIsModalOpen(true); }}><Plus size={18} /> ADD BRANCH</button>
                        </>
                    )}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px 0', color: '#64748B' }}>Loading branches...</div>
            ) : (
                <div className="branch-grid">
                    {branches.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 0', color: '#94A3B8' }}>
                            <Building2 size={48} style={{ marginBottom: '15px', opacity: 0.3 }} />
                            <p>No branches found. Add your first branch.</p>
                        </div>
                    ) : (
                        branches.map((branch, index) => (
                            <div 
                                key={branch._id} 
                                className={`branch-card ${isReordering ? 'draggable' : ''} ${draggedItem === branch ? 'dragging' : ''}`}
                                draggable={isReordering}
                                onDragStart={(e) => onDragStart(e, index)}
                                onDragOver={(e) => onDragOver(e, index)}
                                onDragEnd={onDragEnd}
                                style={{ padding: '30px' }}
                            >
                                {isReordering && (
                                    <div className="drag-handle" style={{ top: '15px', right: '15px' }}>
                                        <GripVertical size={20} />
                                    </div>
                                )}
                                <div style={{ background: '#EEF2FF', padding: '15px', borderRadius: '12px', display: 'inline-flex', marginBottom: '20px' }}>
                                    <Building2 size={32} color="#3B82FB" />
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', marginBottom: '8px' }}>{branch.branchName}</div>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748B', background: '#F1F5F9', padding: '4px 12px', borderRadius: '20px', marginBottom: '12px' }}>{branch.branchType}</div>
                                {branch.branchCode && (
                                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>Code: {branch.branchCode}</div>
                                )}
                                {!isReordering && (
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '25px' }}>
                                        <button className="btn-action-edit" onClick={() => handleEdit(branch)} title="Edit"><Edit2 size={16} /></button>
                                        <button className="btn-action-delete" onClick={() => handleDelete(branch._id)} title="Delete"><Trash2 size={16} /></button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="hrm-modal-overlay">
                    <div className="hrm-modal-content">
                        <div className="hrm-modal-header">
                            <h2>{isEditing ? 'Edit Branch' : 'Add New Branch'}</h2>
                            <button className="icon-btn" style={{ border: 'none' }} onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="hrm-modal-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="hrm-form-group">
                                        <label className="hrm-label">Branch Name <span className="req">*</span></label>
                                        <input type="text" className="hrm-input" name="branchName" value={formData.branchName} onChange={handleInputChange} placeholder="e.g. Pune Office" required />
                                    </div>
                                    <div className="hrm-form-group">
                                        <label className="hrm-label">Branch Code</label>
                                        <input type="text" className="hrm-input" name="branchCode" value={formData.branchCode} onChange={handleInputChange} placeholder="e.g. PN-01" />
                                    </div>
                                </div>
                                <div className="hrm-form-group">
                                    <label className="hrm-label">Branch Type <span className="req">*</span></label>
                                    <select className="hrm-select" name="branchType" value={formData.branchType} onChange={handleInputChange} required>
                                        <option value="">-- Select Type --</option>
                                        <option value="Non-Metro city">Non-Metro city</option>
                                        <option value="Metro city">Metro city</option>
                                    </select>
                                </div>
                            </div>
                            <div className="hrm-modal-footer">
                                <button type="button" className="btn-hrm btn-hrm-secondary" onClick={() => setIsModalOpen(false)}>CANCEL</button>
                                <button type="submit" className="btn-hrm btn-hrm-primary"><Check size={18} /> {isEditing ? 'UPDATE' : 'SAVE'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Branch;
