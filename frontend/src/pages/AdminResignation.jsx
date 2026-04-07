import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, CheckCircle, XCircle, Clock, FileText, User, MessageSquare } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';

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
          title: 'Approve Resignation',
          html:
            '<div style="text-align: left; margin-bottom: 10px; font-weight: 700; font-size: 14px;">Notice Period Days</div>' +
            '<input id="notice-days" class="swal2-input" type="number" placeholder="e.g. 30" style="margin-top: 0;">' +
            '<div style="text-align: left; margin-top: 20px; margin-bottom: 10px; font-weight: 700; font-size: 14px;">Admin Comments</div>' +
            '<textarea id="admin-comments" class="swal2-textarea" placeholder="Type comments..." style="margin-top: 0;"></textarea>',
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonColor: '#10B981',
          preConfirm: () => {
            return {
              days: document.getElementById('notice-days').value,
              comment: document.getElementById('admin-comments').value
            }
          }
        });
        if (formValues) {
            noticePeriodDays = formValues.days;
            comments = formValues.comment;
        } else return;
    } else {
        const { value: remark } = await Swal.fire({
          title: `Reject Resignation`,
          input: 'textarea',
          inputLabel: 'Reason for rejection',
          inputPlaceholder: 'Type your comments here...',
          showCancelButton: true,
          confirmButtonColor: '#EF4444'
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
          Swal.fire('Success!', `Resignation ${status.toLowerCase()} successfully.`, 'success');
          fetchResignations();
        }
    } catch (e) {
        Swal.fire('Error', 'Action failed', 'error');
    }
};

  const statusColors = {
    Approved: { color: '#10B981', bg: '#ECFDF5' },
    Rejected: { color: '#EF4444', bg: '#FEF2F2' },
    Pending: { color: '#F59E0B', bg: '#FFFBEB' },
  };

  const filtered = resignations.filter(r => {
    const q = search.toLowerCase();
    const matchesSearch = r.employeeId?.name?.toLowerCase().includes(q) || r.employeeId?.employeeId?.toLowerCase().includes(q);
    const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1E293B', margin: '0 0 4px' }}>Resignation Requests</h2>
          <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>Review and manage employee resignation requests</p>
        </div>
        <button onClick={fetchResignations} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px',
          fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: '#64748B'
        }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text" placeholder="Search by name or ID..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '12px 12px 12px 42px', border: '1.5px solid #E2E8F0',
              borderRadius: '12px', fontSize: '14px', outline: 'none'
            }}
          />
        </div>
        <select 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '12px 16px', border: '1.5px solid #E2E8F0', borderRadius: '12px', outline: 'none', background: '#fff' }}
        >
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center' }}><RefreshCw className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center', color: '#94A3B8' }}>
            <FileText size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p>No requests found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={thStyle}>Employee</th>
                <th style={thStyle}>LWD Requested</th>
                <th style={thStyle}>Reason</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F1F5F9', overflow: 'hidden' }}>
                        {r.employeeId?.profilePhoto ? (
                          <img src={`${API_URL}/uploads/${r.employeeId.profilePhoto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : <User size={18} style={{ margin: '9px', color: '#64748B' }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px' }}>{r.employeeId?.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>{r.employeeId?.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>{new Date(r.lastWorkingDay).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <div style={{ maxWidth: '300px', fontSize: '13px', color: '#475569' }}>{r.reason}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                      backgroundColor: statusColors[r.status].bg, color: statusColors[r.status].color
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {r.status === 'Pending' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleAction(r._id, 'Approved')}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#10B981', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleAction(r._id, 'Rejected')}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#EF4444', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '12px' }}>
                        <CheckCircle size={14} /> Processed
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const thStyle = { padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' };
const tdStyle = { padding: '16px' };

export default AdminResignation;
