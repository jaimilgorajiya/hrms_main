import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, Search, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const EarningDeductionType = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        type: 'Earnings',
        allowanceType: 'None',
        description: ''
    });

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch(`${API_URL}/api/earning-deduction-types`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const resData = await response.json();
            if (resData.success) {
                setData(resData.earningDeductionTypes);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isEditing ? `${API_URL}/api/earning-deduction-types/${currentId}` : `${API_URL}/api/earning-deduction-types/add`;
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

            const resData = await response.json();
            if (resData.success) {
                Swal.fire({
                    title: 'Success!',
                    text: isEditing ? 'Updated successfully' : 'Added successfully',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                setIsModalOpen(false);
                resetForm();
                fetchData();
            } else {
                Swal.fire('Error', resData.error || 'Something went wrong', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to save data', 'error');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            type: 'Earnings',
            allowanceType: 'None',
            description: ''
        });
        setIsEditing(false);
        setCurrentId(null);
    };

    const handleEdit = (item) => {
        setFormData({
            name: item.name,
            type: item.type,
            allowanceType: item.allowanceType || 'None',
            description: item.description || ''
        });
        setCurrentId(item._id);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'var(--text-secondary)',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const response = await authenticatedFetch(`${API_URL}/api/earning-deduction-types/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const resData = await response.json();
                if (resData.success) {
                    Swal.fire('Deleted!', 'Item has been deleted.', 'success');
                    fetchData();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete item', 'error');
            }
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        const isActive = currentStatus === 'Active';
        const result = await Swal.fire({
            title: isActive ? 'Deactivate Component?' : 'Activate Component?',
            text: `Are you sure you want to ${isActive ? 'deactivate' : 'activate'} this salary component?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-blue)',
            cancelButtonColor: 'var(--text-secondary)',
            confirmButtonText: `Yes, ${isActive ? 'Deactivate' : 'Activate'}`
        });

        if (result.isConfirmed) {
            try {
                const response = await authenticatedFetch(`${API_URL}/api/earning-deduction-types/status/${id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const resData = await response.json();
                if (resData.success) {
                    Swal.fire({
                        title: 'Updated!',
                        text: `Status updated successfully.`,
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    fetchData();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to update status', 'error');
            }
        }
    };

    const earnings = data.filter(item => item.type === 'Earnings');
    const deductions = data.filter(item => item.type === 'Deductions');

    const renderTable = (items, title) => (
        <div className="hrm-card" style={{ flex: '1 1 450px', minWidth: '350px' }}>
            <div className="hrm-modal-header" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-main)', padding: '16px 24px' }}>
                <h3 className="hrm-modal-title" style={{ fontSize: '15px' }}>{title}</h3>
                <span className="hrm-badge hrm-badge-primary" style={{ marginLeft: 'auto' }}>{items.length} Items</span>
            </div>
            <div className="hrm-table-container">
                <table className="hrm-table">
                    <thead>
                        <tr>
                            <th style={{ width: '80px', textAlign: 'center' }}>SR. NO</th>
                            <th>NAME</th>
                            <th style={{ width: '120px', textAlign: 'center' }}>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px' }}><div className="animate-spin">⌛</div></td></tr>
                        ) : items.length > 0 ? items.map((item, index) => (
                            <tr key={item._id}>
                                <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>{index + 1}</td>
                                <td>
                                    <div style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{item.name}</div>
                                    {item.allowanceType !== 'None' && (
                                        <div style={{ fontSize: '11px', color: 'var(--primary-blue)', marginTop: '2px' }}>{item.allowanceType}</div>
                                    )}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <button 
                                            onClick={() => toggleStatus(item._id, item.status)}
                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                            title={item.status === 'Active' ? 'Deactivate' : 'Activate'}
                                        >
                                            {item.status === 'Active' ? <ToggleRight size={24} color="var(--success)" /> : <ToggleLeft size={24} color="var(--text-muted)" />}
                                        </button>
                                        <button 
                                            onClick={() => handleEdit(item)}
                                            className="icon-btn"
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(item._id)}
                                            className="icon-btn"
                                            style={{ color: 'var(--danger)' }}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                                <Info size={32} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
                                <div>No {title.toLowerCase()} configured</div>
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Payroll Components</h1>
                    <p className="hrm-subtitle">Manage earning types and deduction categories for salary structures</p>
                </div>
                <button className="btn-hrm btn-hrm-primary" onClick={() => { resetForm(); setIsModalOpen(true); }}>
                    <Plus size={18} /> ADD COMPONENT
                </button>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {renderTable(earnings, "Earnings List")}
                {renderTable(deductions, "Deductions List")}
            </div>

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
                                    <Plus size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>
                                        {isEditing ? 'Edit Component' : 'Add New Component'}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                                        {isEditing ? 'Modify existing payroll component' : 'Create a new earning or deduction type'}
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
                                    <label className="hrm-label">Component Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input 
                                        type="text" 
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="hrm-input"
                                        placeholder="e.g. Basic Salary, HRA, PF"
                                        style={{ height: '52px', fontSize: '15px' }}
                                        required 
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                    <div className="hrm-form-group" style={{ margin: 0 }}>
                                        <SearchableSelect 
                                            label="Component Type"
                                            required={true}
                                            options={[
                                                { label: 'Earnings', value: 'Earnings' },
                                                { label: 'Deductions', value: 'Deductions' }
                                            ]}
                                            value={formData.type}
                                            onChange={(val) => setFormData({ ...formData, type: val, allowanceType: val === 'Earnings' ? formData.allowanceType : 'None' })}
                                        />
                                    </div>

                                    {formData.type === 'Earnings' ? (
                                        <div className="hrm-form-group" style={{ margin: 0 }}>
                                            <SearchableSelect 
                                                label="Allowance Type"
                                                required={true}
                                                options={[
                                                    { label: 'None', value: 'None' },
                                                    { label: 'Bonus Allowance', value: 'Bonus Allowance' },
                                                    { label: 'Special Allowance', value: 'Special Allowance' },
                                                    { label: 'Transport Allowance', value: 'Transport Allowance' },
                                                    { label: 'Other', value: 'Other' }
                                                ]}
                                                value={formData.allowanceType}
                                                onChange={(val) => setFormData({ ...formData, allowanceType: val })}
                                                searchable={true}
                                            />
                                        </div>
                                    ) : (
                                        <div className="hrm-form-group" style={{ margin: 0, opacity: 0.5, pointerEvents: 'none' }}>
                                            <SearchableSelect 
                                                label="Allowance Type"
                                                options={[{ label: 'Not Applicable', value: 'None' }]}
                                                value="None"
                                                onChange={() => {}}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="hrm-form-group" style={{ margin: 0 }}>
                                    <label className="hrm-label">Description</label>
                                    <textarea 
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        className="hrm-input"
                                        placeholder="Brief details about this component"
                                        style={{ height: '100px', resize: 'none', padding: '12px', fontSize: '14px' }}
                                    />
                                </div>
                            </div>

                            <div className="hrm-modal-footer" style={{ background: '#F8FAFC', padding: '24px 32px' }}>
                                <button type="button" className="btn-hrm btn-hrm-secondary" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 28px' }}>
                                    DISCARD
                                </button>
                                <button type="submit" className="btn-hrm btn-hrm-primary" style={{ padding: '12px 32px' }}>
                                    <Check size={18} /> {isEditing ? 'UPDATE COMPONENT' : 'SAVE COMPONENT'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EarningDeductionType;
