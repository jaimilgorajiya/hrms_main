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
    Shield
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
                // Fallback for old raw array format just in case
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
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3B648B',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
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
            confirmButtonColor: '#3B648B',
            confirmButtonText: 'Yes, delete all!'
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
            title: 'Update Status?',
            text: `Are you sure you want to ${currentStatus ? 'Deactivate' : 'Activate'} this document type?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3B648B',
            cancelButtonColor: '#d33',
            confirmButtonText: `Yes, ${currentStatus ? 'Deactivate' : 'Activate'} it!`
        });

        if (result.isConfirmed) {
            try {
                const response = await authenticatedFetch(`${API_URL}/api/document-types/toggle-status/${id}`, {
                    method: 'PATCH'
                });
                if (response.ok) {
                    Swal.fire({
                        title: 'Updated!',
                        text: 'Status has been changed successfully.',
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
        doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastRecord = currentPage * entriesPerPage;
    const indexOfFirstRecord = indexOfLastRecord - entriesPerPage;
    const currentRecords = filteredDocs.slice(indexOfFirstRecord, indexOfLastRecord);
    const totalPages = Math.ceil(filteredDocs.length / entriesPerPage);

    if (loading) return <div className="loading-container">Scanning Documents...</div>;

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <h1 className="hrm-title">Employee Document Types</h1>
                <div className="hrm-header-actions">
                    <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="btn-hrm btn-hrm-primary">
                        <Plus size={18} /> ADD
                    </button>
                    <button 
                        onClick={handleBulkDelete} 
                        className="btn-hrm btn-hrm-danger"
                        disabled={selectedIds.length === 0}
                        style={{ opacity: selectedIds.length === 0 ? 0.6 : 1, cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer' }}
                    >
                        <Trash2 size={18} /> DELETE
                    </button>
                </div>
            </div>

            <div className="hrm-card">
                <div className="hrm-card-body">
                    

                    <div className="hrm-table-wrapper">
                        <table className="hrm-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>
                                        <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === currentRecords.length && currentRecords.length > 0} />
                                    </th>
                                    <th>Sr. No</th>
                                    <th>Name</th>
                                    <th>Before Onboarding</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentRecords.map((doc, index) => (
                                    <tr key={doc._id}>
                                        <td>
                                            <input type="checkbox" checked={selectedIds.includes(doc._id)} onChange={() => handleRowSelect(doc._id)} />
                                        </td>
                                        <td>{indexOfFirstRecord + index + 1}</td>
                                        <td>{doc.name}</td>
                                        <td>{doc.requiredBeforeOnboarding}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <button onClick={() => handleEdit(doc)} className="btn-action-edit">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleToggleStatus(doc._id, doc.status)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                                                    {doc.status ? <ToggleRight size={28} color="#22c55e" /> : <ToggleLeft size={28} color="#94a3b8" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="hrm-modal-overlay">
                    <div className="hrm-modal-content" style={{ width: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="hrm-modal-header" style={{ background: '#3B648B', flexShrink: 0 }}>
                            <h2 style={{ color: 'white' }}>{isEditing ? 'Edit Document Type' : 'Add Document Type'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div className="hrm-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="hrm-form-group">
                                        <label className="hrm-label">ID Proof Name <span className="req">*</span></label>
                                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="hrm-input" required placeholder="e.g. Aadhar Card" />
                                    </div>
                                    <div className="hrm-form-group">
                                        <label className="hrm-label">Document Short Name</label>
                                        <input type="text" name="shortName" value={formData.shortName} onChange={handleInputChange} className="hrm-input" placeholder="e.g. Aadhar" />
                                    </div>

                                    <div className="hrm-form-group">
                                        <SearchableSelect 
                                            label="Required Before Onboarding"
                                            required={true}
                                            options={[
                                                { value: 'No', label: 'No' },
                                                { value: 'Yes', label: 'Yes' }
                                            ]}
                                            value={formData.requiredBeforeOnboarding}
                                            onChange={(val) => handleSelectChange('requiredBeforeOnboarding', val)}
                                        />
                                    </div>
                                
                                </div>
                            </div>
                            <div className="hrm-modal-footer" style={{ flexShrink: 0, padding: '20px', borderTop: '1px solid #e2e8f0' }}>
                                <button type="submit" className="btn-hrm btn-hrm-primary" style={{ textTransform: 'none' }}>
                                    <Check size={18} /> {isEditing ? 'SAVE CHANGES' : 'ADD'}
                                </button>
                                <button type="button" onClick={resetForm} className="btn-hrm btn-hrm-danger" style={{ textTransform: 'none' }}>
                                    <X size={18} /> RESET
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentType;
