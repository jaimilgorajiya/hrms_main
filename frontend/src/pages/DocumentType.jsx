import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Edit2, 
    Trash2, 
    Search, 
    X, 
    Check, 
    ChevronLeft, 
    ChevronRight, 
    ToggleLeft, 
    ToggleRight, 
    FileText, 
    Settings,
    Shield,
    AlertCircle,
    Info,
    Save,
    RotateCcw
} from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const DocumentType = () => {
    const [documents, setDocuments] = useState([]);
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
        requiredBeforeOnboarding: 'No',
        kycType: ''
    });

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch(`${API_URL}/api/document-types`);
            const data = await response.json();
            if (data.success && Array.isArray(data.documentTypes)) {
                setDocuments(data.documentTypes);
            } else if (Array.isArray(data)) {
                setDocuments(data);
            }
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSelectChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isEditing ? `${API_URL}/api/document-types/${currentId}` : `${API_URL}/api/document-types`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await authenticatedFetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
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
                fetchDocuments();
            } else {
                Swal.fire('Error', data.message || 'Something went wrong', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to save document type', 'error');
        }
    };

    const handleEdit = (doc) => {
        setIsEditing(true);
        setCurrentId(doc._id);
        setFormData({
            name: doc.name,
            shortName: doc.shortName || '',
            requiredBeforeOnboarding: doc.requiredBeforeOnboarding,
            kycType: doc.kycType || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Document Type?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--danger)',
            cancelButtonColor: 'var(--text-secondary)',
            confirmButtonText: 'Yes, delete it'
        });

        if (result.isConfirmed) {
            try {
                const response = await authenticatedFetch(`${API_URL}/api/document-types/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    Swal.fire('Deleted!', 'Document type has been deleted.', 'success');
                    fetchDocuments();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete record', 'error');
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        const result = await Swal.fire({
            title: 'Delete Selected?',
            text: `Are you sure you want to delete ${selectedIds.length} records?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--danger)',
            confirmButtonText: 'Yes, delete all'
        });

        if (result.isConfirmed) {
            try {
                const response = await authenticatedFetch(`${API_URL}/api/document-types/bulk-delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: selectedIds })
                });
                if (response.ok) {
                    Swal.fire('Deleted!', 'Selected records deleted successfully.', 'success');
                    setSelectedIds([]);
                    fetchDocuments();
                }
            } catch (error) {
                Swal.fire('Error', 'Batch delete failed', 'error');
            }
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        const result = await Swal.fire({
            title: currentStatus ? 'Deactivate Document?' : 'Activate Document?',
            text: `Are you sure you want to ${currentStatus ? 'Deactivate' : 'Activate'} this document type?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-blue)',
            cancelButtonColor: 'var(--text-secondary)',
            confirmButtonText: 'Yes, proceed'
        });

        if (result.isConfirmed) {
            try {
                const response = await authenticatedFetch(`${API_URL}/api/document-types/toggle-status/${id}`, {
                    method: 'PATCH'
                });
                if (response.ok) {
                    Swal.fire({
                        title: 'Updated!',
                        text: 'Status updated successfully.',
                        icon: 'success',
                        timer: 1000,
                        showConfirmButton: false
                    });
                    fetchDocuments();
                }
            } catch (error) {
                console.error("Status toggle failed", error);
                Swal.fire('Error', 'Failed to update status', 'error');
            }
        }
    };

    const resetForm = () => {
        setIsEditing(false);
        setCurrentId(null);
        setFormData({
            name: '',
            shortName: '',
            requiredBeforeOnboarding: 'No',
            kycType: ''
        });
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(currentRecords.map(doc => doc._id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleRowSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Pagination & Search Logic
    const filteredDocs = documents.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.shortName && doc.shortName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const indexOfLastRecord = currentPage * entriesPerPage;
    const indexOfFirstRecord = indexOfLastRecord - entriesPerPage;
    const currentRecords = filteredDocs.slice(indexOfFirstRecord, indexOfLastRecord);
    const totalPages = Math.ceil(filteredDocs.length / entriesPerPage);

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Employee Document Types</h1>
                    <p className="hrm-subtitle">Manage KYC and compliance documents required for employees</p>
                </div>
                <div className="hrm-header-actions" style={{ gap: '12px' }}>
                    <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn-hrm btn-hrm-primary">
                        <Plus size={18} /> ADD DOCUMENT TYPE
                    </button>
                    {selectedIds.length > 0 && (
                        <button onClick={handleBulkDelete} className="btn-hrm btn-hrm-danger">
                            <Trash2 size={18} /> DELETE SELECTED ({selectedIds.length})
                        </button>
                    )}
                </div>
            </div>

            <div className="hrm-card">
                <div className="hrm-card-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)' }}>
                        TOTAL: {filteredDocs.length} DOCUMENTS
                    </div>
                    <div className="hrm-search-wrapper" style={{ width: '300px' }}>
                        <Search size={16} className="hrm-search-icon" />
                        <input 
                            type="text" 
                            className="hrm-input hrm-search-input" 
                            placeholder="Search by name..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                </div>

                <div className="hrm-table-container">
                    <table className="hrm-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>
                                    <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === currentRecords.length && currentRecords.length > 0} />
                                </th>
                                <th style={{ width: '60px' }}>Sr. No</th>
                                <th>Document Name</th>
                                <th>Short Name</th>
                                <th style={{ textAlign: 'center' }}>Required Before Onboarding</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '60px' }}>
                                        <div style={{ color: 'var(--text-muted)' }}>Loading documents...</div>
                                    </td>
                                </tr>
                            ) : currentRecords.length > 0 ? currentRecords.map((doc, index) => (
                                <tr key={doc._id}>
                                    <td>
                                        <input type="checkbox" checked={selectedIds.includes(doc._id)} onChange={() => handleRowSelect(doc._id)} />
                                    </td>
                                    <td>{indexOfFirstRecord + index + 1}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ background: 'var(--bg-main)', padding: '6px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                <FileText size={16} color="var(--primary-blue)" />
                                            </div>
                                            <span style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{doc.name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="hrm-badge" style={{ background: 'var(--bg-main)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                            {doc.shortName || '--'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`hrm-badge ${doc.requiredBeforeOnboarding === 'Yes' ? 'hrm-badge-primary' : 'hrm-badge-secondary'}`}>
                                            {doc.requiredBeforeOnboarding}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button onClick={() => handleToggleStatus(doc._id, doc.status)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                            {doc.status ? <ToggleRight size={28} color="var(--success)" /> : <ToggleLeft size={28} color="var(--text-muted)" />}
                                        </button>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleEdit(doc)} className="icon-btn" title="Edit">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(doc._id)} className="icon-btn" style={{ color: 'var(--danger)' }} title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '60px' }}>
                                        <AlertCircle size={32} style={{ opacity: 0.1, margin: '0 auto 12px' }} />
                                        <div style={{ color: 'var(--text-muted)' }}>No document types found matching your search.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredDocs.length)} of {filteredDocs.length} entries
                        </div>
                        <div className="pagination">
                            <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                                <ChevronLeft size={16} />
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button key={i} className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>
                                    {i + 1}
                                </button>
                            ))}
                            <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="hrm-modal-overlay">
                    <div className="hrm-modal-content" style={{ width: '600px' }}>
                        <div className="hrm-modal-header" style={{ background: 'var(--primary-blue)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Shield size={24} color="white" />
                                <h2 style={{ color: 'white', margin: 0 }}>{isEditing ? 'Update Document Configuration' : 'Configure New Document'}</h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="hrm-modal-body" style={{ padding: '32px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <div className="hrm-form-group">
                                        <label className="hrm-label">Document Display Name <span className="req">*</span></label>
                                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="hrm-input" required placeholder="e.g. Aadhar Card" />
                                    </div>
                                    <div className="hrm-form-group">
                                        <label className="hrm-label">Short Name / Code</label>
                                        <input type="text" name="shortName" value={formData.shortName} onChange={handleInputChange} className="hrm-input" placeholder="e.g. AADHAR" />
                                    </div>

                                    <div className="hrm-form-group" style={{ gridColumn: 'span 2' }}>
                                        <SearchableSelect 
                                            label="Required Before Onboarding"
                                            required={true}
                                            options={[
                                                { value: 'No', label: 'No (Can be uploaded after joining)' },
                                                { value: 'Yes', label: 'Yes (Mandatory for joining)' }
                                            ]}
                                            value={formData.requiredBeforeOnboarding}
                                            onChange={(val) => handleSelectChange('requiredBeforeOnboarding', val)}
                                        />
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Info size={12} /> This setting enforces document collection during the digital onboarding flow.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="hrm-modal-footer">
                                <button type="button" onClick={() => { resetForm(); setIsModalOpen(false); }} className="btn-hrm btn-hrm-secondary">
                                    CANCEL
                                </button>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button type="button" onClick={resetForm} className="btn-hrm btn-hrm-secondary" style={{ color: 'var(--danger)' }}>
                                        <RotateCcw size={16} /> RESET
                                    </button>
                                    <button type="submit" className="btn-hrm btn-hrm-primary">
                                        <Save size={18} /> {isEditing ? 'UPDATE CONFIG' : 'SAVE DOCUMENT'}
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

export default DocumentType;
