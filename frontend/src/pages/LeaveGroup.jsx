import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
import Swal from 'sweetalert2';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';

const LeaveGroup = () => {
    const navigate = useNavigate();
    const [leaveGroups, setLeaveGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [entriesPerPage] = useState(25);
    const [selectedIds, setSelectedIds] = useState([]);
    const token = localStorage.getItem('token');

    useEffect(() => { fetchLeaveGroups(); }, []);

    const fetchLeaveGroups = async () => {
        try {
            setLoading(true);
            const res = await authenticatedFetch(`${API_URL}/api/leave-groups`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.leaveGroups)) {
                setLeaveGroups(data.leaveGroups);
            } else if (Array.isArray(data)) {
                setLeaveGroups(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({ title: 'Are you sure?', text: 'This cannot be undone!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, delete it!' });
        if (result.isConfirmed) {
            const res = await authenticatedFetch(`${API_URL}/api/leave-groups/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) { Swal.fire('Deleted!', 'Leave Group deleted.', 'success'); fetchLeaveGroups(); }
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return Swal.fire('Info', 'Select items to delete', 'info');
        const result = await Swal.fire({ title: 'Are you sure?', text: `Delete ${selectedIds.length} items?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Yes, delete!' });
        if (result.isConfirmed) {
            const res = await authenticatedFetch(`${API_URL}/api/leave-groups/bulk-delete`, { method: 'POST', body: JSON.stringify({ ids: selectedIds }) });
            const data = await res.json();
            if (data.success) { Swal.fire('Deleted!', data.message, 'success'); setSelectedIds([]); fetchLeaveGroups(); }
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        const isActive = currentStatus === 'Active';
        const result = await Swal.fire({ title: isActive ? 'Deactivate?' : 'Activate?', icon: 'question', showCancelButton: true, confirmButtonColor: '#2563EB', confirmButtonText: `Yes, ${isActive ? 'deactivate' : 'activate'}!` });
        if (result.isConfirmed) {
            const res = await authenticatedFetch(`${API_URL}/api/leave-groups/${id}/toggle-status`, { method: 'POST' });
            const data = await res.json();
            if (data.success) { Swal.fire({ title: 'Success!', icon: 'success', timer: 1500, showConfirmButton: false }); fetchLeaveGroups(); }
        }
    };

    const filtered = leaveGroups.filter(g => g.leaveGroupName.toLowerCase().includes(searchTerm.toLowerCase()));
    const totalPages = Math.ceil(filtered.length / entriesPerPage);
    const paginated = filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <h1 className="hrm-title">Leave Groups</h1>
                <div className="hrm-header-actions">
                    <button className="btn-hrm btn-hrm-primary" onClick={() => navigate('/admin/leave/group/add')}><Plus size={18} /> ADD</button>
                    <button className="btn-hrm btn-hrm-danger" onClick={handleBulkDelete}><Trash2 size={18} /> DELETE</button>
                </div>
            </div>
            <div className="hrm-card">
                <div className="hrm-card-header" style={{ justifyContent: 'flex-end' }}>
                    <div className="search-wrapper">
                        <Search size={16} color="var(--text-secondary)" />
                        <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div className="hrm-table-wrapper">
                    <table className="hrm-table">
                        <thead>
                            <tr>
                                <th style={{ width: 60 }}>Sr. No</th>
                                <th style={{ width: 40 }}><input type="checkbox" checked={paginated.length > 0 && selectedIds.length === paginated.length} onChange={e => setSelectedIds(e.target.checked ? paginated.map(g => g._id) : [])} /></th>
                                <th style={{ width: 100 }}>Action</th>
                                <th>Leave Group Name</th>
                                <th>Balance Visibility</th>
                                <th>Paid Leave</th>
                                <th>Allocation Type</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
                            ) : paginated.length > 0 ? paginated.map((item, i) => (
                                <tr key={item._id}>
                                    <td>{(currentPage - 1) * entriesPerPage + i + 1}</td>
                                    <td><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => setSelectedIds(prev => prev.includes(item._id) ? prev.filter(x => x !== item._id) : [...prev, item._id])} /></td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button className="btn-action-edit" onClick={() => navigate(`/admin/leave/group/edit/${item._id}`)}><Edit2 size={14} /></button>
                                            <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }} onClick={() => toggleStatus(item._id, item.status)}>
                                                {item.status === 'Active' ? <ToggleRight size={24} color="#22C55E" /> : <ToggleLeft size={24} color="var(--text-muted)" />}
                                            </button>
                                            <button className="btn-action-delete" onClick={() => handleDelete(item._id)}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.leaveGroupName}</td>
                                    <td>{item.leaveBalanceVisibility}</td>
                                    <td><span style={{ background: item.isPaidLeave ? '#F0FDF4' : '#F8FAFC', color: item.isPaidLeave ? '#16A34A' : '#64748B', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{item.isPaidLeave ? 'Yes' : 'No'}</span></td>
                                    <td>{item.isPaidLeave ? item.leaveAllocationType : '--'}</td>
                                    <td><span style={{ background: item.status === 'Active' ? '#F0FDF4' : '#FEF2F2', color: item.status === 'Active' ? '#16A34A' : '#EF4444', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{item.status}</span></td>
                                </tr>
                            )) : (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 40 }}>No records found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Showing {(currentPage - 1) * entriesPerPage + 1} to {Math.min(currentPage * entriesPerPage, filtered.length)} of {filtered.length} entries</div>
                        <div className="pagination">
                            <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={16} /></button>
                            {[...Array(totalPages)].map((_, i) => <button key={i} className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>)}
                            <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeaveGroup;
