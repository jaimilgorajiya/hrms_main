import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, Coffee, Utensils, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import Swal from 'sweetalert2';

const BreakType = () => {
    const [breakTypes, setBreakTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        minutes: ''
    });

    

    useEffect(() => {
        fetchBreakTypes();
    }, []);

    const fetchBreakTypes = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await authenticatedFetch(`${API_URL}/api/break-types`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setBreakTypes(data.breakTypes);
            }
        } catch (error) {
            console.error("Error fetching break types:", error);
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
        const endpoint = isEditing ? `${API_URL}/api/break-types/update/${currentId}` : `${API_URL}/api/break-types/add`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await authenticatedFetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    minutes: formData.minutes || "As Per Shift"
                })
            });

            const data = await response.json();
            if (data.success) {
                Swal.fire({
                    title: 'Success!',
                    text: isEditing ? 'Break Type updated successfully.' : 'Break Type added successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                setIsModalOpen(false);
                setFormData({ name: '', minutes: '' });
                setIsEditing(false);
                fetchBreakTypes();
            } else {
                Swal.fire('Error', data.message || 'Something went wrong', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to save break type', 'error');
        }
    };

    const handleEdit = (bt) => {
        setFormData({
            name: bt.name,
            minutes: bt.minutes === "As Per Shift" ? "" : bt.minutes
        });
        setCurrentId(bt._id);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Break Type?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete '
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const response = await authenticatedFetch(`${API_URL}/api/break-types/delete/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    Swal.fire('Deleted!', 'Break type has been removed.', 'success');
                    fetchBreakTypes();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete break type', 'error');
            }
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        const result = await Swal.fire({
            title: currentStatus ? 'Deactivate Break Type?' : 'Activate Break Type?',
            text: `Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this break type?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563EB',
            cancelButtonColor: '#64748b',
            confirmButtonText: `Yes, ${currentStatus ? 'deactivate' : 'activate'} it!`
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const response = await authenticatedFetch(`${API_URL}/api/break-types/update/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ isActive: !currentStatus })
                });
                const data = await response.json();
                if (data.success) {
                    Swal.fire({
                        title: 'Success!',
                        text: `Break type ${!currentStatus ? 'activated' : 'deactivated'} successfully.`,
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    fetchBreakTypes();
                }
            } catch (error) {
                console.error("Error toggling status:", error);
                Swal.fire('Error', 'Failed to update status', 'error');
            }
        }
    };

    if (loading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="designation-container">
            <div className="designation-header">
                <h1 className="profile-title">Break Type</h1>
                <div className="header-actions">
                    <button className="btn-theme btn-theme-primary" onClick={() => { setIsEditing(false); setFormData({ name: '', minutes: '' }); setIsModalOpen(true); }}>
                        <Plus size={16} /> ADD
                    </button>
                </div>
            </div>

            <div className="break-type-grid">
                {breakTypes.map((bt, index) => (
                    <div key={bt._id} className={`break-type-card ${bt.isActive ? 'active' : ''}`}>
                        <div className="card-top">
                            <span className="break-name">{bt.name}</span>
                            <span className="break-index">#{index + 1}</span>
                        </div>
                        <div className="card-body">
                            <div className="break-label-pill">
                                <Coffee size={14} />
                                <span>{bt.name}</span>
                            </div>
                            <div className="info-row">
                                <div className="info-item">
                                    <Clock size={16} className="text-muted" />
                                    <span>Minutes</span>
                                </div>
                                <span className="info-value">{bt.minutes}</span>
                            </div>
                        </div>
                        <div className="card-footer">
                            <div className="footer-left-actions" style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-action-edit" onClick={() => handleEdit(bt)} title="Edit">
                                    <Edit2 size={16} />
                                </button>
                                <button className="btn-action-delete" onClick={() => handleDelete(bt._id)} title="Delete">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="status-toggle-wrapper">
                                <span className="status-text">{bt.isActive ? 'Active' : 'Inactive'}</span>
                                <button className="toggle-btn" onClick={() => toggleStatus(bt._id, bt.isActive)}>
                                    {bt.isActive ? <ToggleRight size={28} className="text-primary-blue" /> : <ToggleLeft size={28} className="text-muted" />}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="modal-theme-overlay">
                    <div className="modal-theme-content" style={{ maxWidth: '540px' }}>
                        <div className="modal-theme-header" style={{ padding: '20px 24px', background: 'white', color: '#1E293B', borderBottom: '1px solid #F1F5F9' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#334155' }}>{isEditing ? 'Update Break Type' : 'Add New Break Type'}</h2>
                            <button className="icon-btn" onClick={() => setIsModalOpen(false)} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-theme-body" style={{ padding: '30px 24px' }}>
                                <div className="form-group-hrm" style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Break Type <span className="text-danger">*</span></label>
                                    <input 
                                        type="text" 
                                        className="form-control-hrm" 
                                        name="name" 
                                        value={formData.name} 
                                        onChange={handleInputChange} 
                                        placeholder="e.g. Lunch Break" 
                                        required 
                                        style={{ height: '45px', fontSize: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                                    />
                                </div>
                                <div className="form-group-hrm">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>Break Time (Minutes)</label>
                                    <input 
                                        type="text" 
                                        className="form-control-hrm" 
                                        name="minutes" 
                                        value={formData.minutes} 
                                        onChange={handleInputChange} 
                                        placeholder="e.g. 30" 
                                        style={{ height: '45px', fontSize: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                                    />
                                </div>
                            </div>
                            <div className="modal-theme-footer" style={{ borderTop: '1px solid #F1F5F9', justifyContent: 'flex-end', gap: '12px', padding: '20px 24px', background: 'white' }}>
                                <button type="button" className="btn-theme btn-theme-secondary" onClick={() => setIsModalOpen(false)} style={{ background: 'white', border: '1px solid #CBD5E1', color: '#334155', padding: '10px 24px', borderRadius: '10px', fontWeight: '700', fontSize: '14px' }}>Cancel</button>
                                <button type="submit" className="btn-theme btn-theme-primary" style={{ padding: '10px 30px', borderRadius: '10px', fontWeight: '700', fontSize: '14px' }}>
                                    <Check size={18} style={{ marginRight: '6px' }} /> {isEditing ? 'Save' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BreakType;
