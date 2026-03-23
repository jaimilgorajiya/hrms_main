import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, Search, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight } from 'lucide-react';
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
            cancelButtonColor: '#64748b',
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
            title: isActive ? 'Deactivate?' : 'Activate?',
            text: `Are you sure you want to ${isActive ? 'deactivate' : 'activate'} this?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563EB',
            cancelButtonColor: '#64748B',
            confirmButtonText: `Yes, ${isActive ? 'deactivate' : 'activate'} it!`
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
                        title: 'Success!',
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
        <div style={{ minWidth: '380px', flex: '0 1 auto', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', background: '#fcfcfc' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1E293B' }}>{title}</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className="hrm-table">
                    <thead>
                        <tr>
                            <th style={{ width: '80px', textAlign: 'center' }}>SR. NO</th>
                            <th style={{ width: '220px' }}>{title.includes('Earning') ? 'EARNING NAME' : 'DEDUCTION NAME'}</th>
                            <th style={{ width: '120px', textAlign: 'center' }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center' }}>Loading...</td></tr>
                        ) : items.length > 0 ? items.map((item, index) => (
                            <tr key={item._id}>
                                <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                <td style={{ color: '#3B82F6', fontWeight: '600' }}>{item.name}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <button 
                                            onClick={() => toggleStatus(item._id, item.status)}
                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                        >
                                            {item.status === 'Active' ? <ToggleRight size={24} color="#22C55E" /> : <ToggleLeft size={24} color="#94A3B8" />}
                                        </button>
                                        <button 
                                            onClick={() => handleEdit(item)}
                                            className="btn-action-edit"
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(item._id)}
                                            className="btn-action-delete"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '30px' }}>No {title.toLowerCase()} found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <h1 className="hrm-title">Earning Deduction Type</h1>
                <div className="hrm-header-actions">
                    <button className="btn-hrm btn-hrm-primary" onClick={() => { resetForm(); setIsModalOpen(true); }}>
                        <Plus size={18} /> ADD
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {renderTable(earnings, "Earning List")}
                {renderTable(deductions, "Deduction List")}
            </div>

            {isModalOpen && (
                <div className="hrm-modal-overlay">
                    <div className="hrm-modal-content">
                        <div className="hrm-modal-header">
                            <h2>{isEditing ? 'Edit Earning Deduction Type' : 'Add Earning Deduction Type'}</h2>
                            <button className="icon-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="hrm-modal-body">
                                <div className="hrm-form-group">
                                    <label className="hrm-label">Earning Deduction name <span className="req">*</span></label>
                                    <input 
                                        type="text" 
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="hrm-input"
                                        placeholder="Enter name"
                                        required 
                                    />
                                </div>

                                <div className="hrm-form-group">
                                    <SearchableSelect 
                                        label="Earning Deduction Type"
                                        required={true}
                                        options={[
                                            { label: 'Earnings', value: 'Earnings' },
                                            { label: 'Deductions', value: 'Deductions' }
                                        ]}
                                        value={formData.type}
                                        onChange={(val) => setFormData({ ...formData, type: val })}
                                    />
                                </div>

                                {formData.type === 'Earnings' && (
                                    <div className="hrm-form-group">
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
                                )}

                                <div className="hrm-form-group">
                                    <label className="hrm-label">Description</label>
                                    <textarea 
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        className="hrm-textarea"
                                        placeholder="Enter description"
                                        style={{ height: '80px' }}
                                    />
                                </div>
                            </div>

                            <div className="hrm-modal-footer">
                                <button type="button" className="btn-hrm btn-hrm-secondary" onClick={() => setIsModalOpen(false)}>CANCEL</button>
                                <button type="submit" className="btn-hrm btn-hrm-primary">
                                    <Check size={18} /> {isEditing ? 'UPDATE' : 'SAVE'}
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
