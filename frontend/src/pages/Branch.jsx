import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, Building2, MapPin, Grip, GripVertical, Save } from 'lucide-react';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

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
        branchType: '',
        latitude: '',
        longitude: '',
        radius: 500
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
                setFormData({ branchName: '', branchCode: '', branchType: '', latitude: '', longitude: '', radius: 500 });
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
            branchType: branch.branchType,
            latitude: branch.latitude || '',
            longitude: branch.longitude || '',
            radius: branch.radius || 500
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
            confirmButtonColor: 'var(--danger)',
            cancelButtonColor: 'var(--text-muted)',
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
                <div>
                    <h1 className="hrm-title">Branches</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Manage your physical locations and geofencing settings
                    </p>
                </div>
                <div className="hrm-header-actions" style={{ gap: '12px' }}>
                    {isReordering ? (
                        <>
                            <button className="btn-hrm btn-hrm-primary" onClick={handleSaveOrder}><Check size={18} /> SAVE ORDER</button>
                            <button className="btn-hrm btn-hrm-secondary" onClick={() => { setIsReordering(false); fetchBranches(); }}>CANCEL</button>
                        </>
                    ) : (
                        <>
                            <button className="btn-hrm btn-hrm-secondary" onClick={() => setIsReordering(true)}>CHANGE ORDER</button>
                            <button className="btn-hrm btn-hrm-primary" onClick={() => { setIsEditing(false); setFormData({ branchName: '', branchCode: '', branchType: '', latitude: '', longitude: '', radius: 500 }); setIsModalOpen(true); }}>
                                <Plus size={18} /> ADD BRANCH
                            </button>
                        </>
                    )}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '120px 0', color: 'var(--text-muted)' }}>Loading branches...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                    {branches.length === 0 ? (
                        <div className="hrm-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 0', borderStyle: 'dashed' }}>
                            <Building2 size={48} color="var(--text-muted)" style={{ marginBottom: '16px', opacity: 0.3 }} />
                            <p style={{ color: 'var(--text-muted)' }}>No branches found. Add your first branch.</p>
                        </div>
                    ) : (
                        branches.map((branch, index) => (
                            <div 
                                key={branch._id} 
                                className={`hrm-card ${isReordering ? 'draggable' : ''}`}
                                draggable={isReordering}
                                onDragStart={(e) => onDragStart(e, index)}
                                onDragOver={(e) => onDragOver(e, index)}
                                onDragEnd={onDragEnd}
                                style={{ 
                                    padding: '30px', border: '1px solid var(--border)', 
                                    transition: 'all 0.3s ease', position: 'relative',
                                    opacity: draggedItem === branch ? 0.4 : 1,
                                    transform: draggedItem === branch ? 'scale(0.98)' : 'none'
                                }}
                            >
                                {isReordering && (
                                    <div style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-muted)', cursor: 'grab' }}>
                                        <GripVertical size={20} />
                                    </div>
                                )}
                                <div style={{ background: 'var(--primary-light)', padding: '16px', borderRadius: '16px', display: 'inline-flex', marginBottom: '24px' }}>
                                    <Building2 size={32} color="var(--primary-blue)" />
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '8px', margin: 0 }}>{branch.branchName}</h3>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                    <span className="hrm-badge hrm-badge-primary" style={{ fontSize: '11px' }}>{branch.branchType}</span>
                                    {branch.branchCode && <span className="hrm-badge" style={{ fontSize: '11px', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>{branch.branchCode}</span>}
                                </div>
                                
                                <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <MapPin size={14} /> Location Data
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>LATITUDE</div>
                                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)' }}>{branch.latitude || '0.000'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>LONGITUDE</div>
                                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)' }}>{branch.longitude || '0.000'}</div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>GEOFENCE RADIUS</div>
                                        <span className="hrm-badge hrm-badge-success" style={{ fontSize: '10px', padding: '2px 8px' }}>{branch.radius || 500}m</span>
                                    </div>
                                </div>

                                {!isReordering && (
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button className="btn-action-edit" onClick={() => handleEdit(branch)} title="Edit" style={{ flex: 1, height: '36px', borderRadius: '10px' }}><Edit2 size={16} /> Edit</button>
                                        <button className="btn-action-delete" onClick={() => handleDelete(branch._id)} title="Delete" style={{ flex: 1, height: '36px', borderRadius: '10px' }}><Trash2 size={16} /> Remove</button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="hrm-modal-overlay">
                    <div className="hrm-modal-content" style={{ maxWidth: '650px', width: '100%' }}>
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
                                        {isEditing ? 'Update Branch' : 'Create New Branch'}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                                        Configure branch details and attendance geofencing
                                    </p>
                                </div>
                            </div>
                            <button className="icon-btn" onClick={() => setIsModalOpen(false)} style={{ background: 'white', border: '1px solid #E2E8F0' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="hrm-modal-body" style={{ padding: '32px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                    <div className="hrm-form-group" style={{ margin: 0 }}>
                                        <label className="hrm-label">Branch Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                                        <input 
                                            type="text" 
                                            className="hrm-input" 
                                            name="branchName" 
                                            value={formData.branchName} 
                                            onChange={handleInputChange} 
                                            placeholder="e.g. Headquarters" 
                                            style={{ height: '52px' }}
                                            required 
                                        />
                                    </div>
                                    <div className="hrm-form-group" style={{ margin: 0 }}>
                                        <label className="hrm-label">Branch Code</label>
                                        <input 
                                            type="text" 
                                            className="hrm-input" 
                                            name="branchCode" 
                                            value={formData.branchCode} 
                                            onChange={handleInputChange} 
                                            placeholder="e.g. HQ-01" 
                                            style={{ height: '52px' }}
                                        />
                                    </div>
                                </div>

                                <div className="hrm-form-group" style={{ marginBottom: '32px' }}>
                                    <SearchableSelect 
                                        label="Branch Type"
                                        required={true}
                                        options={[
                                            { value: 'Non-Metro city', label: 'Non-Metro City' },
                                            { value: 'Metro city', label: 'Metro City' }
                                        ]}
                                        value={formData.branchType}
                                        onChange={(val) => setFormData({ ...formData, branchType: val })}
                                    />
                                </div>
                                
                                <div style={{ 
                                    padding: '24px', 
                                    background: '#F1F5F9', 
                                    borderRadius: '20px', 
                                    border: '1px solid #E2E8F0',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ background: 'white', padding: '6px', borderRadius: '8px', color: 'var(--primary-blue)', display: 'flex' }}>
                                            <MapPin size={16} />
                                        </div>
                                        GEOFENCING CONFIGURATION
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                        <div className="hrm-form-group" style={{ margin: 0 }}>
                                            <label className="hrm-label" style={{ fontSize: '11px' }}>LATITUDE</label>
                                            <input 
                                                type="number" step="any" className="hrm-input" name="latitude" 
                                                value={formData.latitude} onChange={handleInputChange} 
                                                placeholder="0.000000" style={{ background: 'white', height: '48px' }}
                                            />
                                        </div>
                                        <div className="hrm-form-group" style={{ margin: 0 }}>
                                            <label className="hrm-label" style={{ fontSize: '11px' }}>LONGITUDE</label>
                                            <input 
                                                type="number" step="any" className="hrm-input" name="longitude" 
                                                value={formData.longitude} onChange={handleInputChange} 
                                                placeholder="0.000000" style={{ background: 'white', height: '48px' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="hrm-form-group" style={{ margin: 0 }}>
                                        <label className="hrm-label" style={{ fontSize: '11px' }}>DETECTION RADIUS (METERS)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input 
                                                type="number" className="hrm-input" name="radius" 
                                                value={formData.radius} onChange={handleInputChange} 
                                                placeholder="500" style={{ background: 'white', height: '48px', paddingRight: '44px' }}
                                            />
                                            <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 700, color: '#64748B' }}>m</span>
                                        </div>
                                        <p style={{ fontSize: '11px', color: '#64748B', marginTop: '10px', lineHeight: '1.5', fontStyle: 'italic' }}>
                                            Employees must be within this distance of the coordinates to verify their location during attendance marking.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="hrm-modal-footer" style={{ background: '#F8FAFC', padding: '24px 32px' }}>
                                <button type="button" className="btn-hrm btn-hrm-secondary" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 28px' }}>
                                    DISCARD
                                </button>
                                <button type="submit" className="btn-hrm btn-hrm-primary" style={{ padding: '12px 32px' }}>
                                    <Save size={18} /> {isEditing ? 'UPDATE BRANCH' : 'SAVE BRANCH'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Branch;
