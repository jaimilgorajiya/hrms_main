import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, Coffee, Utensils, Clock, ToggleLeft, ToggleRight, Save, RotateCcw, AlertCircle, Settings } from 'lucide-react';
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
                Swal.fire({ title: 'Success!', text: isEditing ? 'Break Type updated' : 'Break Type added', icon: 'success', timer: 1500, showConfirmButton: false });
                setIsModalOpen(false);
                setFormData({ name: '', minutes: '' });
                setIsEditing(false);
                fetchBreakTypes();
            } else {
                Swal.fire('Error', data.message || 'Something went wrong', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to save', 'error');
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
            confirmButtonColor: 'var(--danger)',
            cancelButtonColor: 'var(--text-secondary)',
            confirmButtonText: 'Yes, delete it'
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
                    Swal.fire('Deleted!', 'Break type removed.', 'success');
                    fetchBreakTypes();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete', 'error');
            }
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        const result = await Swal.fire({
            title: currentStatus ? 'Deactivate Break?' : 'Activate Break?',
            text: `Confirm to ${currentStatus ? 'deactivate' : 'activate'} this break type.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-blue)',
            cancelButtonColor: 'var(--text-secondary)',
            confirmButtonText: 'Yes, proceed'
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
                    Swal.fire({ title: 'Success!', text: `Break type ${!currentStatus ? 'activated' : 'deactivated'}`, icon: 'success', timer: 1500, showConfirmButton: false });
                    fetchBreakTypes();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to update', 'error');
            }
        }
    };

    if (loading) return (
        <div className="hrm-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div style={{ color: 'var(--text-muted)' }}>Loading Break Configurations...</div>
        </div>
    );

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Shift Break Types</h1>
                    <p className="hrm-subtitle">Manage default break durations and categories available during shifts</p>
                </div>
                <button className="btn-hrm btn-hrm-primary" onClick={() => { setIsEditing(false); setFormData({ name: '', minutes: '' }); setIsModalOpen(true); }}>
                    <Plus size={18} /> ADD NEW BREAK
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                {breakTypes.length === 0 ? (
                    <div className="hrm-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px', borderStyle: 'dashed' }}>
                        <Coffee size={48} style={{ opacity: 0.1, margin: '0 auto 16px' }} />
                        <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>No break types configured yet.</p>
                    </div>
                ) : breakTypes.map((bt, index) => (
                    <div key={bt._id} className="hrm-card" style={{ opacity: bt.isActive ? 1 : 0.75, transition: 'all 0.3s ease' }}>
                        <div style={{ padding: '28px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ padding: '12px', background: 'var(--primary-light)', borderRadius: '14px', color: 'var(--primary-blue)', border: '1px solid var(--primary-light)' }}>
                                        <Coffee size={24} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-dark)' }}>{bt.name}</h3>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>CATEGORY #{index + 1}</div>
                                    </div>
                                </div>
                                <div className={`hrm-badge ${bt.isActive ? 'hrm-badge-primary' : 'hrm-badge-secondary'}`} style={{ padding: '4px 12px' }}>
                                    {bt.isActive ? 'Active' : 'Inactive'}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px', padding: '18px', background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '700' }}>
                                    <Clock size={18} color="var(--primary-blue)" />
                                    <span>Duration:</span>
                                    <span style={{ color: 'var(--text-dark)', fontWeight: '800', marginLeft: '4px', fontSize: '16px' }}>
                                        {bt.minutes} {bt.minutes !== "As Per Shift" ? 'Minutes' : ''}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button className="icon-btn" onClick={() => handleEdit(bt)} title="Edit Settings">
                                        <Edit2 size={16} />
                                    </button>
                                    <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(bt._id)} title="Remove Break Type">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => toggleStatus(bt._id, bt.isActive)}
                                    style={{
                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        color: bt.isActive ? 'var(--success)' : 'var(--text-muted)',
                                        fontWeight: '800', fontSize: '13px', padding: '4px 8px', borderRadius: '8px'
                                    }}
                                >
                                    {bt.isActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                    <span style={{ width: '60px' }}>{bt.isActive ? 'ENABLED' : 'DISABLED'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="hrm-modal-overlay">
                    <div className="hrm-modal-content" style={{ width: '500px' }}>
                        <div className="hrm-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Settings size={24} color="var(--primary-blue)" />
                                <h2>{isEditing ? 'Edit Break Configuration' : 'Create Break Category'}</h2>
                            </div>
                            <button className="icon-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="hrm-modal-body" style={{ padding: '32px' }}>
                                <div className="hrm-form-group">
                                    <label className="hrm-label">Break Category Name <span className="req">*</span></label>
                                    <input type="text" name="name" className="hrm-input" value={formData.name} onChange={handleInputChange} placeholder="e.g. Lunch Break" required />
                                </div>
                                <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                    <label className="hrm-label">Default Duration (Minutes)</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type="number" name="minutes" className="hrm-input" value={formData.minutes} onChange={handleInputChange} placeholder="30" />
                                        <Clock size={16} style={{ position: 'absolute', right: '12px', top: '13px', color: 'var(--text-muted)' }} />
                                    </div>
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <AlertCircle size={12} /> Leave empty to allow shift-specific durations.
                                    </p>
                                </div>
                            </div>
                            <div className="hrm-modal-footer">
                                <button type="button" className="btn-hrm btn-hrm-secondary" onClick={() => setIsModalOpen(false)}>CANCEL</button>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="button" onClick={() => setFormData({ name: '', minutes: '' })} className="btn-hrm btn-hrm-secondary" style={{ color: 'var(--danger)' }}>
                                        <RotateCcw size={16} /> RESET
                                    </button>
                                    <button type="submit" className="btn-hrm btn-hrm-primary">
                                        <Save size={18} /> {isEditing ? 'UPDATE BREAK' : 'SAVE BREAK'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BreakType;
