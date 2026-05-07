import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, Search, Filter, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight, Info, Save } from 'lucide-react';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const LeaveType = () => {
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [entriesPerPage, setEntriesPerPage] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        shortName: '',
        applicableFor: 'All',
        isBirthdayAnniversary: false,
        description: '',
    });

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchLeaveTypes();
    }, []);

    const fetchLeaveTypes = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch(`${API_URL}/api/leave-types`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.leaveTypes && Array.isArray(data.leaveTypes)) {
                setLeaveTypes(data.leaveTypes);
            } else if (Array.isArray(data)) {
                setLeaveTypes(data);
            }
        } catch (error) {
            console.error("Error fetching leave types:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isEditing ? `${API_URL}/api/leave-types/${currentId}` : `${API_URL}/api/leave-types`;
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
                    text: data.message,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                setIsModalOpen(false);
                resetForm();
                fetchLeaveTypes();
            } else {
                Swal.fire('Error', data.message || 'Something went wrong', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to save leave type', 'error');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            shortName: '',
            applicableFor: 'All',
            isBirthdayAnniversary: false,
            description: '',
        });
        setIsEditing(false);
        setCurrentId(null);
    };

    const handleEdit = (item) => {
        setFormData({
            name: item.name,
            shortName: item.shortName || '',
            applicableFor: item.applicableFor || 'All',
            isBirthdayAnniversary: item.isBirthdayAnniversary || false,
            description: item.description || '',
        });
        setCurrentId(item._id);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--danger)',
            cancelButtonColor: 'var(--text-muted)',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const response = await authenticatedFetch(`${API_URL}/api/leave-types/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    Swal.fire('Deleted!', 'Leave type has been deleted.', 'success');
                    fetchLeaveTypes();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete leave type', 'error');
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) {
            Swal.fire('Info', 'Please select items to delete', 'info');
            return;
        }

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete ${selectedIds.length} selected items!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--danger)',
            cancelButtonColor: 'var(--text-muted)',
            confirmButtonText: 'Yes, delete selected!'
        });

        if (result.isConfirmed) {
            try {
                const response = await authenticatedFetch(`${API_URL}/api/leave-types/bulk-delete`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ ids: selectedIds })
                });
                const data = await response.json();
                if (data.success) {
                    Swal.fire('Deleted!', data.message, 'success');
                    setSelectedIds([]);
                    fetchLeaveTypes();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete selected items', 'error');
            }
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        const isActive = currentStatus === 'Active';
        const result = await Swal.fire({
            title: isActive ? 'Deactivate Leave Type?' : 'Activate Leave Type?',
            text: `Are you sure you want to ${isActive ? 'deactivate' : 'activate'} this leave type?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-blue)',
            cancelButtonColor: 'var(--text-muted)',
            confirmButtonText: `Yes, ${isActive ? 'deactivate' : 'activate'} it!`
        });

        if (result.isConfirmed) {
            try {
                const response = await authenticatedFetch(`${API_URL}/api/leave-types/${id}/toggle-status`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    Swal.fire({
                        title: 'Success!',
                        text: `Leave type ${isActive ? 'deactivated' : 'activated'} successfully.`,
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    fetchLeaveTypes();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to update status', 'error');
            }
        }
    };

    const filteredData = leaveTypes.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.shortName && item.shortName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalPages = Math.ceil(filteredData.length / entriesPerPage);
    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const paginatedData = filteredData.slice(indexOfFirstEntry, indexOfLastEntry);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(paginatedData.map(item => item._id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Leave Types</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Configure different types of leave available to your employees
                    </p>
                </div>
                <div className="hrm-header-actions" style={{ gap: '12px' }}>
                    <button className="btn-hrm btn-hrm-primary" onClick={() => { resetForm(); setIsModalOpen(true); }}>
                        <Plus size={18} /> ADD TYPE
                    </button>
                    {selectedIds.length > 0 && (
                        <button className="btn-hrm btn-hrm-danger" onClick={handleBulkDelete}>
                            <Trash2 size={18} /> DELETE ({selectedIds.length})
                        </button>
                    )}
                </div>
            </div>

            <div className="hrm-card">
                <div className="hrm-card-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)' }}>
                        TOTAL: {filteredData.length} TYPES
                    </div>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input 
                            type="text" className="hrm-input" placeholder="Search leave types..." 
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                            style={{ paddingLeft: '44px', background: 'var(--bg-main)' }}
                        />
                    </div>
                </div>

                <div className="hrm-table-wrapper">
                    <table className="hrm-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>Sr. No</th>
                                <th style={{ width: '40px' }}>
                                    <input type="checkbox" checked={paginatedData.length > 0 && selectedIds.length === paginatedData.length} onChange={handleSelectAll} />
                                </th>
                                <th style={{ width: '100px' }}>Action</th>
                                <th>Name</th>
                                <th>Short Name</th>
                                <th>Applicable For</th>
                                <th>Description</th>
                                <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '60px' }}>
                                    <div style={{ color: 'var(--text-muted)' }}>Loading leave types...</div>
                                </td></tr>
                            ) : paginatedData.length > 0 ? paginatedData.map((item, index) => (
                                <tr key={item._id}>
                                    <td>{(currentPage - 1) * entriesPerPage + index + 1}</td>
                                    <td><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => handleSelectRow(item._id)} /></td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button className="btn-action-edit" onClick={() => handleEdit(item)} title="Edit"><Edit2 size={14} /></button>
                                            <button className="btn-action-delete" onClick={() => handleDelete(item._id)} title="Delete"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{item.name}</td>
                                    <td>
                                        <span style={{ background: 'var(--bg-main)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', border: '1px solid var(--border)' }}>
                                            {item.shortName || '--'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`hrm-badge ${item.applicableFor === 'All' ? 'hrm-badge-primary' : item.applicableFor === 'Male Only' ? 'hrm-badge-info' : 'hrm-badge-warning'}`} style={{ fontSize: '10px' }}>
                                            {item.applicableFor}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.description || <span style={{ opacity: 0.4 }}>No description</span>}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }} onClick={() => toggleStatus(item._id, item.status)}>
                                            {item.status === 'Active' ? <ToggleRight size={28} color="var(--success)" /> : <ToggleLeft size={28} color="var(--text-muted)" />}
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '60px' }}>
                                    <div style={{ color: 'var(--text-muted)' }}>No records found</div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            Showing {indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, filteredData.length)} of {filteredData.length} entries
                        </div>
                        <div className="pagination">
                            <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}><ChevronLeft size={16} /></button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button key={i} className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                            ))}
                            <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="hrm-modal-overlay">
                    <div className="hrm-modal-content" style={{ width: '600px' }}>
                        <div className="hrm-modal-header">
                            <h2>{isEditing ? 'Update Leave Type' : 'Create Leave Type'}</h2>
                            <button className="icon-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="hrm-modal-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="hrm-form-group">
                                        <label className="hrm-label">Name <span className="req">*</span></label>
                                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="hrm-input" placeholder="e.g. Annual Leave" required />
                                    </div>
                                    <div className="hrm-form-group">
                                        <label className="hrm-label">Short Name</label>
                                        <input type="text" name="shortName" value={formData.shortName} onChange={handleInputChange} className="hrm-input" placeholder="e.g. AL" />
                                    </div>
                                </div>

                                <div className="hrm-form-group">
                                    <label className="hrm-label">Applicable For</label>
                                    <select name="applicableFor" value={formData.applicableFor} onChange={handleInputChange} className="hrm-select">
                                        <option value="All">All Employees</option>
                                        <option value="Male Only">Male Only</option>
                                        <option value="Female Only">Female Only</option>
                                    </select>
                                </div>

                                <div className="hrm-form-group">
                                    <label className="hrm-label">Description</label>
                                    <textarea name="description" value={formData.description} onChange={handleInputChange} className="hrm-textarea" placeholder="Explain the purpose or rules for this leave type..." style={{ minHeight: '120px' }}></textarea>
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
        </div>
    );
};

export default LeaveType;
