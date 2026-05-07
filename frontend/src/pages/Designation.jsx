import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Upload, X, Check, Search, Save, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import Swal from 'sweetalert2';

const Designation = () => {
    const [designations, setDesignations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [entriesPerPage, setEntriesPerPage] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDesignations, setSelectedDesignations] = useState([]);

    const [formData, setFormData] = useState({
        designationName: '',
        designationAlias: '',
        jobDescription: ''
    });

    useEffect(() => {
        fetchDesignations();
    }, []);

    const fetchDesignations = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await authenticatedFetch(`${API_URL}/api/designations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setDesignations(data.designations);
            }
        } catch (error) {
            console.error("Error fetching designations:", error);
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
        const endpoint = isEditing ? `${API_URL}/api/designations/${currentId}` : `${API_URL}/api/designations/add`;
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
                    text: isEditing ? 'Designation updated successfully.' : 'Designation added successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                setIsModalOpen(false);
                setFormData({ designationName: '', designationAlias: '', jobDescription: '' });
                setIsEditing(false);
                fetchDesignations();
            } else {
                Swal.fire('Error', data.error || 'Something went wrong', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to save designation', 'error');
        }
    };

    const handleEdit = (designation) => {
        setFormData({
            designationName: designation.designationName,
            designationAlias: designation.designationAlias || '',
            jobDescription: designation.jobDescription || ''
        });
        setCurrentId(designation._id);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--danger)',
            cancelButtonColor: 'var(--text-muted)',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const response = await authenticatedFetch(`${API_URL}/api/designations/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    Swal.fire('Deleted!', 'Designation has been deleted.', 'success');
                    fetchDesignations();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete designation', 'error');
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedDesignations.length === 0) {
            Swal.fire('Info', 'Please select designations to delete', 'info');
            return;
        }

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Delete ${selectedDesignations.length} selected items?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--danger)',
            cancelButtonColor: 'var(--text-muted)',
            confirmButtonText: 'Yes, delete all!'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                for (let id of selectedDesignations) {
                    await authenticatedFetch(`${API_URL}/api/designations/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
                Swal.fire('Deleted!', 'Designations deleted.', 'success');
                setSelectedDesignations([]);
                fetchDesignations();
            } catch (error) {
                Swal.fire('Error', 'Failed to delete some designations', 'error');
            }
        }
    };

    const filteredDesignations = designations.filter(d => 
        d.designationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.designationAlias && d.designationAlias.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = filteredDesignations.slice(indexOfFirstEntry, indexOfLastEntry);
    const totalPages = Math.ceil(filteredDesignations.length / entriesPerPage);

    const toggleSelectAll = () => {
        if (selectedDesignations.length === currentEntries.length) {
            setSelectedDesignations([]);
        } else {
            setSelectedDesignations(currentEntries.map(d => d._id));
        }
    };

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Designations</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Define roles and responsibilities within your organization
                    </p>
                </div>
                <div className="hrm-header-actions" style={{ gap: '12px' }}>
                    <button className="btn-hrm btn-hrm-primary" onClick={() => { setIsEditing(false); setFormData({ designationName: '', designationAlias: '', jobDescription: '' }); setIsModalOpen(true); }}>
                        <Plus size={18} /> ADD NEW
                    </button>
                    {selectedDesignations.length > 0 && (
                        <button className="btn-hrm btn-hrm-danger" onClick={handleBulkDelete}>
                            <Trash2 size={18} /> DELETE SELECTED ({selectedDesignations.length})
                        </button>
                    )}
                </div>
            </div>

            <div className="hrm-card">
                <div className="hrm-card-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)' }}>
                        TOTAL: {filteredDesignations.length} RECORDS
                    </div>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input 
                            type="text" className="hrm-input" placeholder="Search designations..." 
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
                                    <input type="checkbox" checked={currentEntries.length > 0 && selectedDesignations.length === currentEntries.length} onChange={toggleSelectAll} />
                                </th>
                                <th>Code</th>
                                <th>Designation Name</th>
                                <th>Alias</th>
                                <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px' }}>
                                    <div style={{ color: 'var(--text-muted)' }}>Loading records...</div>
                                </td></tr>
                            ) : currentEntries.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px' }}>
                                    <div style={{ color: 'var(--text-muted)' }}>No records found</div>
                                </td></tr>
                            ) : (
                                currentEntries.map((d, index) => (
                                    <tr key={d._id}>
                                        <td>{indexOfFirstEntry + index + 1}</td>
                                        <td>
                                            <input type="checkbox" checked={selectedDesignations.includes(d._id)} onChange={() => setSelectedDesignations(prev => prev.includes(d._id) ? prev.filter(i => i !== d._id) : [...prev, d._id])} />
                                        </td>
                                        <td>
                                            <span style={{ background: 'var(--bg-main)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', color: 'var(--primary-blue)', border: '1px solid var(--border)' }}>
                                                {d.designationCode}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{d.designationName}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{d.designationAlias || '--'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="btn-action-edit" onClick={() => handleEdit(d)} title="Edit" style={{ width: '32px', height: '32px' }}><Edit2 size={14} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            Showing {indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, filteredDesignations.length)} of {filteredDesignations.length} entries
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
                    <div className="hrm-modal-content" style={{ maxWidth: '600px', width: '100%' }}>
                        <div className="hrm-modal-header" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ 
                                    background: 'var(--primary-gradient)', 
                                    padding: '10px', 
                                    borderRadius: '12px', 
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                                }}>
                                    <Briefcase size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>
                                        {isEditing ? 'Update Designation' : 'Create Designation'}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                                        Define role names and job responsibilities
                                    </p>
                                </div>
                            </div>
                            <button className="icon-btn" onClick={() => setIsModalOpen(false)} style={{ background: 'white', border: '1px solid #E2E8F0' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="hrm-modal-body" style={{ padding: '32px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                    <div className="hrm-form-group" style={{ margin: 0 }}>
                                        <label className="hrm-label">Designation Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                                        <input 
                                            type="text" 
                                            className="hrm-input" 
                                            name="designationName" 
                                            value={formData.designationName} 
                                            onChange={handleInputChange} 
                                            placeholder="e.g. Senior Software Engineer" 
                                            style={{ height: '52px' }}
                                            required 
                                        />
                                    </div>
                                    <div className="hrm-form-group" style={{ margin: 0 }}>
                                        <label className="hrm-label">Short Alias</label>
                                        <input 
                                            type="text" 
                                            className="hrm-input" 
                                            name="designationAlias" 
                                            value={formData.designationAlias} 
                                            onChange={handleInputChange} 
                                            placeholder="e.g. SSE" 
                                            style={{ height: '52px' }}
                                        />
                                    </div>
                                </div>

                                <div className="hrm-form-group" style={{ margin: 0 }}>
                                    <label className="hrm-label">Job Description</label>
                                    <textarea 
                                        className="hrm-textarea" 
                                        name="jobDescription" 
                                        value={formData.jobDescription} 
                                        onChange={handleInputChange} 
                                        placeholder="Outline key responsibilities and expectations for this role..." 
                                        style={{ minHeight: '160px', padding: '16px', lineHeight: '1.6' }}
                                    ></textarea>
                                </div>
                            </div>
                            <div className="hrm-modal-footer" style={{ background: '#F8FAFC', padding: '24px 32px' }}>
                                <button type="button" className="btn-hrm btn-hrm-secondary" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 28px' }}>
                                    DISCARD
                                </button>
                                <button type="submit" className="btn-hrm btn-hrm-primary" style={{ padding: '12px 32px' }}>
                                    <Save size={18} /> {isEditing ? 'UPDATE DESIGNATION' : 'SAVE DESIGNATION'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Designation;
