import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Upload, X, Check, Search, Save, ChevronLeft, ChevronRight } from 'lucide-react';
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
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
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
            confirmButtonColor: '#ef4444',
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
                <h1 className="hrm-title">Designations</h1>
                <div className="hrm-header-actions">
                  
                    <button className="btn-hrm btn-hrm-primary" onClick={() => { setIsEditing(false); setFormData({ designationName: '', designationAlias: '', jobDescription: '' }); setIsModalOpen(true); }}><Plus size={18} /> ADD</button>
                    <button className="btn-hrm btn-hrm-danger" onClick={handleBulkDelete}><Trash2 size={18} /> DELETE</button>
                </div>
            </div>

            <div className="hrm-card">
                <div className="hrm-card-header" style={{ justifyContent: 'flex-end' }}>
                    <div className="search-wrapper">
                        <Search size={16} color="#64748B" />
                        <input type="text" placeholder="Search designations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <div className="hrm-table-wrapper">
                    <table className="hrm-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>Sr. No</th>
                                <th style={{ width: '40px' }}><input type="checkbox" checked={currentEntries.length > 0 && selectedDesignations.length === currentEntries.length} onChange={toggleSelectAll} /></th>
                                <th>Code</th>
                                <th>Designation Name</th>
                                <th>Alias</th>
                                <th style={{ width: '80px' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
                            ) : currentEntries.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No records found</td></tr>
                            ) : (
                                currentEntries.map((d, index) => (
                                    <tr key={d._id}>
                                        <td>{indexOfFirstEntry + index + 1}</td>
                                        <td><input type="checkbox" checked={selectedDesignations.includes(d._id)} onChange={() => setSelectedDesignations(prev => prev.includes(d._id) ? prev.filter(i => i !== d._id) : [...prev, d._id])} /></td>
                                        <td><span style={{ background: '#F1F5F9', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', color: '#64748B' }}>{d.designationCode}</span></td>
                                        <td style={{ fontWeight: '600', color: '#1E293B' }}>{d.designationName}</td>
                                        <td>{d.designationAlias || '--'}</td>
                                        <td>
                                            <button className="btn-action-edit" onClick={() => handleEdit(d)} title="Edit"><Edit2 size={14} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9' }}>
                         <div style={{ fontSize: '13px', color: '#64748B' }}>Showing {indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, filteredDesignations.length)} of {filteredDesignations.length} entries</div>
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
                    <div className="hrm-modal-content">
                        <div className="hrm-modal-header">
                            <h2>{isEditing ? 'Edit Designation' : 'Add New Designation'}</h2>
                            <button className="icon-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="hrm-modal-body">
                                <div className="hrm-form-group">
                                    <label className="hrm-label">Designation Name <span className="req">*</span></label>
                                    <input type="text" className="hrm-input" name="designationName" value={formData.designationName} onChange={handleInputChange} placeholder="e.g. Software Engineer" required />
                                </div>
                                <div className="hrm-form-group">
                                    <label className="hrm-label">Designation Alias</label>
                                    <input type="text" className="hrm-input" name="designationAlias" value={formData.designationAlias} onChange={handleInputChange} placeholder="e.g. SE" />
                                </div>
                                <div className="hrm-form-group">
                                    <label className="hrm-label">Job Description</label>
                                    <textarea className="hrm-textarea" name="jobDescription" value={formData.jobDescription} onChange={handleInputChange} placeholder="Describe the roles and responsibilities..." style={{ minHeight: '120px' }}></textarea>
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

export default Designation;
