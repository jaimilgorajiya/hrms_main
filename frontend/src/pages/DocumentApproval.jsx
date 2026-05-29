import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Check, X, Eye, Download, Search, AlertCircle, FileText, 
    Building2, RefreshCw, Clock
} from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const DocumentApproval = () => {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Filters
    const [activeBranchId, setActiveBranchId] = useState('all');
    const [activeStatusTab, setActiveStatusTab] = useState('Pending'); // Default to Pending so admins see tasks
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDocType, setFilterDocType] = useState('all');
    
    // Modal Preview State
    const [previewDoc, setPreviewDoc] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const [docsRes, branchRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/users/documents/all`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/branches`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const docsData = await docsRes.json();
            const branchData = await branchRes.json();

            if (docsData.success) {
                setDocuments(docsData.documents || []);
            }
            if (branchData.success) {
                setBranches(branchData.branches || []);
            }
        } catch (error) {
            console.error("Error fetching documents approval data:", error);
            Swal.fire('Error', 'Failed to fetch document approval details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await authenticatedFetch(`${API_URL}/api/users/documents/all`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) {
                setDocuments(data.documents || []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleApprove = async (doc) => {
        const result = await Swal.fire({
            title: 'Approve Document?',
            html: `Are you sure you want to approve the <b>${doc.documentType}</b> uploaded by <b>${doc.employeeName}</b>?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10B981',
            confirmButtonText: 'Yes, Approve',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                setActionLoading(true);
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/users/${doc.employeeId}/documents/${doc._id}/review`, {
                    method: 'PUT',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: 'Approved' })
                });
                
                const data = await response.json();
                if (data.success) {
                    Swal.fire('Approved!', 'The document has been successfully approved.', 'success');
                    handleRefresh();
                } else {
                    Swal.fire('Error', data.message || 'Failed to approve document', 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'An error occurred during approval', 'error');
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleReject = async (doc) => {
        const { value: reason } = await Swal.fire({
            title: 'Reject Document',
            input: 'textarea',
            inputLabel: 'Reason for Rejection',
            inputPlaceholder: 'Type your reason here...',
            inputAttributes: {
                'aria-label': 'Type your reason here'
            },
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            confirmButtonText: 'Confirm Reject',
            cancelButtonText: 'Cancel',
            inputValidator: (value) => {
                if (!value) {
                    return 'You need to write a reason for rejection!';
                }
            }
        });

        if (reason) {
            try {
                setActionLoading(true);
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/users/${doc.employeeId}/documents/${doc._id}/review`, {
                    method: 'PUT',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: 'Rejected', rejectionReason: reason })
                });
                
                const data = await response.json();
                if (data.success) {
                    Swal.fire('Rejected', 'The document has been marked as rejected.', 'success');
                    handleRefresh();
                } else {
                    Swal.fire('Error', data.message || 'Failed to reject document', 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'An error occurred during rejection', 'error');
            } finally {
                setActionLoading(false);
            }
        }
    };

    const getFileUrl = (url) => {
        if (!url) return '#';
        return url.startsWith('http') ? url : `${API_URL}/uploads/${url}`;
    };

    const getFileExtension = (url) => {
        if (!url) return '';
        return url.split('.').pop()?.toLowerCase();
    };

    const isImage = (url) => {
        const ext = getFileExtension(url);
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    };

    const isPdf = (url) => {
        const ext = getFileExtension(url);
        return ext === 'pdf';
    };

    // Filter Logic
    const filteredDocuments = useMemo(() => {
        return documents.filter(doc => {
            // Branch filter
            let matchesBranch = true;
            if (activeBranchId !== 'all') {
                const branchObj = branches.find(b => b._id === activeBranchId);
                matchesBranch = branchObj ? doc.branch === branchObj.branchName : true;
            }

            // Status filter
            let matchesStatus = true;
            if (activeStatusTab !== 'all') {
                matchesStatus = doc.status === activeStatusTab;
            }

            // Search query filter
            const matchesSearch = searchTerm.trim() === '' || 
                doc.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.documentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase());

            // Doc Type dropdown filter
            const matchesDocType = filterDocType === 'all' || doc.documentType === filterDocType;

            return matchesBranch && matchesStatus && matchesSearch && matchesDocType;
        });
    }, [documents, branches, activeBranchId, activeStatusTab, searchTerm, filterDocType]);

    // Unique Doc Types for Dropdown
    const docTypesList = useMemo(() => {
        return [...new Set(documents.map(d => d.documentType))].sort();
    }, [documents]);

    // Count numbers for status tabs
    const getStatusCount = (status) => {
        return documents.filter(doc => {
            // Apply current branch filter to the counts as well
            let matchesBranch = true;
            if (activeBranchId !== 'all') {
                const branchObj = branches.find(b => b._id === activeBranchId);
                matchesBranch = branchObj ? doc.branch === branchObj.branchName : true;
            }
            if (!matchesBranch) return false;
            return status === 'all' || doc.status === status;
        }).length;
    };

    const getInitials = (name) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    if (loading) return <div className="loading-container">Loading Document Approval Dashboard...</div>;

    return (
        <div className="hrm-container" style={{ paddingBottom: '60px' }}>
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Document Verification</h1>
                    </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '280px' }}>
                        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text" className="hrm-input" placeholder="Search employee, ID, doc..."
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '44px' }}
                        />
                    </div>
                    
                    <div style={{ width: '190px' }}>
                        <SearchableSelect 
                            options={[
                                { value: 'all', label: 'All Doc Types' },
                                ...docTypesList.map(type => ({ value: type, label: type }))
                            ]}
                            value={filterDocType}
                            onChange={setFilterDocType}
                            placeholder="All Doc Types"
                        />
                    </div>

               
                </div>
            </div>

            {/* Branch Selector Tabs */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto', padding: '4px' }}>
                <button
                    onClick={() => setActiveBranchId('all')}
                    style={{
                        padding: '10px 24px', borderRadius: '12px', whiteSpace: 'nowrap',
                        border: '1px solid', borderColor: activeBranchId === 'all' ? 'var(--primary-blue)' : 'var(--border)',
                        background: activeBranchId === 'all' ? 'var(--primary-blue)' : 'var(--bg-surface)',
                        color: activeBranchId === 'all' ? 'white' : 'var(--text-secondary)',
                        fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px',
                        cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: activeBranchId === 'all' ? '0 8px 16px -4px rgba(37, 99, 235, 0.25)' : 'none'
                    }}
                >
                    All Branches
                    <span style={{
                        background: activeBranchId === 'all' ? 'rgba(255,255,255,0.2)' : 'var(--bg-main)',
                        color: activeBranchId === 'all' ? 'white' : 'var(--text-muted)',
                        padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800'
                    }}>{documents.length}</span>
                </button>
                {branches.map(branch => {
                    const isActive = activeBranchId === branch._id;
                    const count = documents.filter(doc => doc.branch === branch.branchName).length;
                    return (
                        <button
                            key={branch._id} onClick={() => setActiveBranchId(branch._id)}
                            style={{
                                padding: '10px 24px', borderRadius: '12px', whiteSpace: 'nowrap',
                                border: '1px solid', borderColor: isActive ? 'var(--primary-blue)' : 'var(--border)',
                                background: isActive ? 'var(--primary-blue)' : 'var(--bg-surface)',
                                color: isActive ? 'white' : 'var(--text-secondary)',
                                fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px',
                                cursor: 'pointer', transition: 'all 0.2s',
                                boxShadow: isActive ? '0 8px 16px -4px rgba(37, 99, 235, 0.25)' : 'none'
                            }}
                        >
                            {branch.branchName}
                            <span style={{
                                background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-main)',
                                color: isActive ? 'white' : 'var(--text-muted)',
                                padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800'
                            }}>{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Status Tabs Navigation */}
            <div style={{ 
                display: 'flex', 
                gap: '8px', 
                borderBottom: '1px solid var(--border)', 
                marginBottom: '24px',
                paddingBottom: '0'
            }}>
                {['Pending', 'Approved', 'Rejected', 'all'].map(statusTab => {
                    const isActive = activeStatusTab === statusTab;
                    const displayLabel = statusTab === 'all' ? 'All Uploads' : statusTab;
                    const tabCount = getStatusCount(statusTab);
                    
                    let activeColor = 'var(--primary-blue)';
                    if (statusTab === 'Pending') activeColor = '#D97706'; // Amber
                    if (statusTab === 'Approved') activeColor = '#10B981'; // Green
                    if (statusTab === 'Rejected') activeColor = '#EF4444'; // Red

                    return (
                        <button
                            key={statusTab}
                            onClick={() => setActiveStatusTab(statusTab)}
                            style={{
                                padding: '12px 20px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: isActive ? `3px solid ${activeColor}` : '3px solid transparent',
                                color: isActive ? 'var(--text-main)' : 'var(--text-secondary)',
                                fontWeight: isActive ? '800' : '600',
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                                paddingBottom: '10px'
                            }}
                        >
                            {displayLabel}
                            <span style={{
                                background: isActive ? activeColor : 'var(--bg-surface)',
                                color: isActive ? 'white' : 'var(--text-secondary)',
                                padding: '2px 8px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '800',
                                border: '1px solid var(--border)'
                            }}>{tabCount}</span>
                        </button>
                    );
                })}
            </div>

            {/* Main Documents Table Grid */}
            <div className="hrm-card">
                <div className="hrm-card-body" style={{ padding: '0' }}>
                    <div className="hrm-table-wrapper" style={{ margin: '0', borderRadius: '16px', overflow: 'hidden' }}>
                        <table className="hrm-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Department/Branch</th>
                                    <th>Document Details</th>
                                    <th>Uploaded At</th>
                                    <th>Status</th>
                                    <th style={{ width: '180px', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDocuments.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '64px 20px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                                                <AlertCircle size={48} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                                                <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-secondary)' }}>No Verification Tasks Found</span>
                                                <span style={{ fontSize: '13px' }}>There are no documents matching your selected branch, type, or verification status.</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDocuments.map(doc => {
                                        const fileUrl = getFileUrl(doc.fileUrl);

                                        return (
                                            <tr key={doc._id} style={{ transition: 'background-color 0.2s' }}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ 
                                                            width: '40px', height: '40px', borderRadius: '12px', 
                                                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
                                                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontWeight: '800', fontSize: '14px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
                                                        }}>
                                                            {getInitials(doc.employeeName)}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>{doc.employeeName}</div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>ID: {doc.employeeCode || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: '700', color: 'var(--text-secondary)', fontSize: '13px' }}>{doc.department || 'Unassigned'}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                        <Building2 size={12} /> {doc.branch || 'Global'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                                                        <FileText size={18} style={{ color: 'var(--primary-blue)', marginTop: '2px' }} />
                                                        <div>
                                                            <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' }}>{doc.documentType}</div>
                                                            {doc.documentNumber && (
                                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                                    No: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{doc.documentNumber}</span>
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                {doc.issueDate && <span>Issued: {new Date(doc.issueDate).toLocaleDateString('en-IN')}</span>}
                                                                {doc.expiryDate && (
                                                                    <span style={{ color: new Date(doc.expiryDate) < new Date() ? '#EF4444' : 'inherit' }}>
                                                                        Expires: {new Date(doc.expiryDate).toLocaleDateString('en-IN')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                                        {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={11} /> {new Date(doc.uploadedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div>
                                                        <span style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                            padding: '6px 12px', borderRadius: '30px', fontSize: '12px', fontWeight: '800',
                                                            background: doc.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : doc.status === 'Rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                            color: doc.status === 'Approved' ? '#10B981' : doc.status === 'Rejected' ? '#EF4444' : '#F59E0B',
                                                            border: '1px solid',
                                                            borderColor: doc.status === 'Approved' ? 'rgba(16, 185, 129, 0.2)' : doc.status === 'Rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'
                                                        }}>
                                                            <span style={{
                                                                width: '6px', height: '6px', borderRadius: '50%',
                                                                background: doc.status === 'Approved' ? '#10B981' : doc.status === 'Rejected' ? '#EF4444' : '#F59E0B'
                                                            }}></span>
                                                            {doc.status || 'Pending'}
                                                        </span>
                                                        
                                                        {doc.status === 'Rejected' && doc.rejectionReason && (
                                                            <div style={{ 
                                                                fontSize: '11px', color: '#EF4444', marginTop: '6px', 
                                                                maxWidth: '200px', whiteSpace: 'normal', lineBreak: 'anywhere',
                                                                background: 'rgba(239, 68, 68, 0.05)', padding: '6px 10px', borderRadius: '8px',
                                                                border: '1px solid rgba(239, 68, 68, 0.1)'
                                                            }}>
                                                                <b>Reason:</b> {doc.rejectionReason}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button 
                                                            onClick={() => setPreviewDoc(doc)}
                                                            className="btn-hrm btn-hrm-secondary"
                                                            style={{ padding: '6px 10px', height: '32px' }}
                                                            title="Preview Document"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        
                                                        <a 
                                                            href={fileUrl} 
                                                            download={doc.originalName} 
                                                            className="btn-hrm btn-hrm-secondary"
                                                            style={{ padding: '6px 10px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                            title="Download File"
                                                        >
                                                            <Download size={14} />
                                                        </a>

                                                        {doc.status === 'Pending' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleApprove(doc)}
                                                                    disabled={actionLoading}
                                                                    style={{ 
                                                                        padding: '6px 10px', height: '32px', background: '#10B981', color: 'white', 
                                                                        border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700',
                                                                        display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s'
                                                                    }}
                                                                    title="Approve Document"
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleReject(doc)}
                                                                    disabled={actionLoading}
                                                                    style={{ 
                                                                        padding: '6px 10px', height: '32px', background: '#EF4444', color: 'white', 
                                                                        border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700',
                                                                        display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s'
                                                                    }}
                                                                    title="Reject Document"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Document Preview Drawer/Modal */}
            {previewDoc && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '24px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
                        borderRadius: '24px', width: '100%', maxWidth: '850px', maxHeight: '90vh',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid var(--border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
                                    {previewDoc.documentType} Preview
                                </h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    Uploaded by {previewDoc.employeeName} ({previewDoc.employeeCode || 'No Code'})
                                </p>
                            </div>
                            <button 
                                onClick={() => setPreviewDoc(null)}
                                style={{
                                    background: 'var(--bg-main)', border: '1px solid var(--border)',
                                    color: 'var(--text-secondary)', padding: '8px', borderRadius: '50%',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Content - File Preview Area */}
                        <div style={{ 
                            flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', 
                            justifyContent: 'center', alignItems: 'center', background: 'var(--bg-main)',
                            minHeight: '350px'
                        }}>
                            {isImage(previewDoc.fileUrl) ? (
                                <img 
                                    src={getFileUrl(previewDoc.fileUrl)} 
                                    alt={previewDoc.documentType}
                                    style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '12px' }}
                                />
                            ) : isPdf(previewDoc.fileUrl) ? (
                                <iframe 
                                    src={getFileUrl(previewDoc.fileUrl)} 
                                    title={previewDoc.documentType}
                                    style={{ width: '100%', height: '55vh', border: 'none', borderRadius: '12px' }}
                                />
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <FileText size={64} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                                    <h4 style={{ fontWeight: '700', marginBottom: '8px' }}>No Viewer Available</h4>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                                        This file extension (.{getFileExtension(previewDoc.fileUrl)}) cannot be previewed directly inside the browser.
                                    </p>
                                    <a 
                                        href={getFileUrl(previewDoc.fileUrl)}
                                        target="_blank" rel="noopener noreferrer"
                                        className="btn-hrm btn-hrm-primary"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        Open in New Tab
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '20px 24px', borderTop: '1px solid var(--border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                Filename: {previewDoc.originalName}
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <a 
                                    href={getFileUrl(previewDoc.fileUrl)} 
                                    download={previewDoc.originalName}
                                    className="btn-hrm btn-hrm-secondary"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <Download size={14} /> Download File
                                </a>

                                {previewDoc.status === 'Pending' && (
                                    <>
                                        <button 
                                            onClick={() => {
                                                const currentDoc = previewDoc;
                                                setPreviewDoc(null);
                                                handleReject(currentDoc);
                                            }}
                                            style={{
                                                padding: '10px 18px', background: '#EF4444', color: 'white',
                                                border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '6px'
                                            }}
                                        >
                                            <X size={14} /> Reject
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const currentDoc = previewDoc;
                                                setPreviewDoc(null);
                                                handleApprove(currentDoc);
                                            }}
                                            style={{
                                                padding: '10px 18px', background: '#10B981', color: 'white',
                                                border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '6px'
                                            }}
                                        >
                                            <Check size={14} /> Approve
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentApproval;
