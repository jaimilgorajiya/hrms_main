import React, { useState, useEffect } from 'react';
import { 
    Search, RefreshCw, CheckCircle, XCircle, Clock, FileText, 
    User, MessageSquare, Filter, Check, MoreVertical, 
    Calendar, AlertCircle, TrendingDown, ClipboardList
} from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const AdminResignation = () => {
    const [resignations, setResignations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('Pending');

    useEffect(() => {
        fetchResignations();
    }, []);

    const fetchResignations = async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/resignation/admin/all`);
            const json = await res.json();
            if (json.success) setResignations(json.resignations);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (resignationId, status) => {
        let noticePeriodDays = 0;
        let comments = "";

        if (status === 'Approved') {
            const { value: formValues } = await Swal.fire({
                title: '<span style="font-size: 24px; font-weight: 800; color: #1E293B;">Approve Resignation</span>',
                html: `
                    <div style="padding: 10px 5px; text-align: left;">
                        <p style="color: #64748B; font-size: 14px; margin-bottom: 24px; line-height: 1.5;">Please set the notice period duration and add any official remarks for the employee.</p>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.8px;">Notice Period (Days)</label>
                            <input id="notice-days" type="number" style="width: 100%; padding: 12px 15px; border: 1.5px solid #E2E8F0; border-radius: 12px; font-size: 15px; color: #1E293B; outline: none;" placeholder="e.g. 30" value="30">
                        </div>

                        <div>
                            <label style="display: block; font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.8px;">Admin Remarks</label>
                            <textarea id="admin-comments" style="width: 100%; height: 100px; padding: 12px 15px; border: 1.5px solid #E2E8F0; border-radius: 12px; font-size: 15px; color: #1E293B; outline: none; resize: none; font-family: inherit;" placeholder="Type your comments here..."></textarea>
                        </div>
                    </div>
                `,
                width: '450px',
                padding: '2.5rem',
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Approve & Process',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#10B981',
                cancelButtonColor: '#F1F5F9',
                customClass: {
                    confirmButton: 'swal-confirm-btn',
                    cancelButton: 'swal-cancel-btn',
                    popup: 'swal-custom-popup'
                },
                preConfirm: () => {
                    const days = document.getElementById('notice-days').value;
                    const comment = document.getElementById('admin-comments').value;
                    if (!days) {
                        Swal.showValidationMessage('Notice period is required');
                        return false;
                    }
                    return { days, comment };
                }
            });

            // Inject styles for Swal buttons if not already present
            if (!document.getElementById('swal-resignation-styles')) {
                const style = document.createElement('style');
                style.id = 'swal-resignation-styles';
                style.innerHTML = `
                    .swal-confirm-btn { padding: 12px 30px !important; border-radius: 12px !important; font-weight: 700 !important; font-size: 14px !important; height: 48px !important; }
                    .swal-cancel-btn { padding: 12px 30px !important; border-radius: 12px !important; font-weight: 700 !important; font-size: 14px !important; height: 48px !important; color: #64748B !important; }
                    .swal-custom-popup { border-radius: 24px !important; }
                `;
                document.head.appendChild(style);
            }

            if (formValues) {
                noticePeriodDays = formValues.days;
                comments = formValues.comment;
            } else return;
        } else {
            const { value: remark } = await Swal.fire({
                title: 'Reject Request',
                input: 'textarea',
                inputLabel: 'Reason for rejection',
                inputPlaceholder: 'Enter clear reasons for rejection...',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                confirmButtonText: 'Confirm Rejection',
                customClass: {
                    popup: 'swal-custom-popup'
                }
            });
            if (remark !== undefined) comments = remark; else return;
        }

        try {
            const res = await authenticatedFetch(`${API_URL}/api/resignation/admin/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resignationId, status, comments, noticePeriodDays })
            });
            const json = await res.json();
            if (json.success) {
                Swal.fire({
                    title: 'Success!',
                    text: `Resignation request has been ${status.toLowerCase()}.`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                fetchResignations();
            }
        } catch (e) {
            Swal.fire('Error', 'Failed to process request', 'error');
        }
    };

    const statusStyles = {
        Approved: { color: '#10B981', bg: '#DCFCE7', icon: <CheckCircle size={14} /> },
        Rejected: { color: '#EF4444', bg: '#FEE2E2', icon: <XCircle size={14} /> },
        Pending: { color: '#F59E0B', bg: '#FEF3C7', icon: <Clock size={14} /> },
    };

    const filtered = resignations.filter(r => {
        const q = search.toLowerCase();
        const matchesSearch = r.employeeId?.name?.toLowerCase().includes(q) || r.employeeId?.employeeId?.toLowerCase().includes(q);
        const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Resignation Requests</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
                        Review and manage employee exit workflows
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-hrm btn-hrm-secondary" onClick={fetchResignations} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="hrm-card" style={{ marginBottom: '24px', overflow: 'visible' }}>
                <div style={{ padding: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <label className="hrm-label">Search Employee</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text" 
                                className="hrm-input"
                                placeholder="Search by name, ID or department..."
                                value={search} 
                                onChange={e => setSearch(e.target.value)}
                                style={{ paddingLeft: '44px' }}
                            />
                        </div>
                    </div>
                    
                    <div style={{ width: '220px' }}>
                        <SearchableSelect
                            label="Status Filter"
                            options={[
                                { label: 'All Requests', value: 'All' },
                                { label: 'Pending', value: 'Pending' },
                                { label: 'Approved', value: 'Approved' },
                                { label: 'Rejected', value: 'Rejected' }
                            ]}
                            value={filterStatus}
                            onChange={setFilterStatus}
                        />
                    </div>
                </div>
            </div>

            {/* Requests List */}
            <div className="hrm-card">
                {loading ? (
                    <div style={{ padding: '100px', textAlign: 'center' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Fetching resignation records...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '100px 40px', textAlign: 'center' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'var(--primary-light)', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 16px -4px rgba(0,0,0,0.05)' }}>
                            <ClipboardList size={40} />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', margin: '0 0 8px' }}>No Requests Found</h3>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto', fontSize: '14px', lineHeight: 1.6 }}>
                            There are no resignation requests matching your current filters. 
                            Try adjusting your search or status selection.
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="hrm-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ paddingLeft: '24px' }}>Employee</th>
                                    <th>Resignation Details</th>
                                    <th>Reason for Exit</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(r => (
                                    <tr key={r._id}>
                                        <td style={{ paddingLeft: '24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div style={{ 
                                                    width: '44px', height: '44px', borderRadius: '12px', 
                                                    background: '#F1F5F9', overflow: 'hidden', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    border: '1.5px solid #E2E8F0'
                                                }}>
                                                    {r.employeeId?.profilePhoto ? (
                                                        <img src={`${API_URL}/uploads/${r.employeeId.profilePhoto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : <User size={20} style={{ color: '#94A3B8' }} />}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '800', fontSize: '14px', color: '#1E293B' }}>{r.employeeId?.name || 'Unknown'}</div>
                                                    <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>{r.employeeId?.employeeId || 'ID N/A'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#1E293B', fontWeight: 600 }}>
                                                    <Calendar size={14} color="var(--primary-blue)" />
                                                    LWD: {new Date(r.lastWorkingDay).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                                                    <Clock size={12} />
                                                    Applied: {new Date(r.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ maxWidth: '350px', fontSize: '13px', color: '#475569', lineHeight: 1.5, fontWeight: 500 }}>
                                                {r.reason}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ 
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                                                background: statusStyles[r.status]?.bg || '#F1F5F9',
                                                color: statusStyles[r.status]?.color || '#64748B',
                                                border: `1.5px solid ${statusStyles[r.status]?.color}20`
                                            }}>
                                                {statusStyles[r.status]?.icon}
                                                {r.status.toUpperCase()}
                                            </div>
                                        </td>
                                        <td style={{ paddingRight: '24px', textAlign: 'right' }}>
                                            {r.status === 'Pending' ? (
                                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                                    <button 
                                                        onClick={() => handleAction(r._id, 'Approved')} 
                                                        className="btn-hrm btn-hrm-primary" 
                                                        style={{ padding: '8px 16px', fontSize: '12px', background: 'var(--success)', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)' }}
                                                    >
                                                        APPROVE
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAction(r._id, 'Rejected')} 
                                                        className="btn-hrm" 
                                                        style={{ padding: '8px 16px', fontSize: '12px', background: '#FEF2F2', color: '#EF4444', border: '1.5px solid #FEE2E2' }}
                                                    >
                                                        REJECT
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '12px', fontWeight: 700, justifyContent: 'flex-end' }}>
                                                    <Check size={16} color="var(--success)" />
                                                    PROCESSED
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminResignation;
