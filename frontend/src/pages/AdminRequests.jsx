import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Search, RefreshCw, CheckCircle, XCircle, FileText, User, MessageSquare } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';

const statusColors = {
  Approved: { color: '#10B981', bg: '#ECFDF5', icon: <CheckCircle size={14} /> },
  Rejected: { color: '#EF4444', bg: '#FEF2F2', icon: <XCircle size={14} /> },
  Pending: { color: '#F59E0B', bg: '#FFFBEB', icon: <Clock size={14} /> },
};

const typeColors = {
  'Leave': { color: '#8B5CF6', bg: '#F5F3FF' },
  'Attendance Correction': { color: '#2563EB', bg: '#EFF6FF' },
};

const AdminRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Pending');
  const [filterType, setFilterType] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminRemark, setAdminRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/requests/admin/all`;
      const params = [];
      if (filterStatus !== 'All') params.push(`status=${filterStatus}`);
      if (filterType !== 'All') params.push(`requestType=${filterType}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await authenticatedFetch(url);
      const json = await res.json();
      if (json.success) setRequests(json.requests);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterStatus, filterType]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async (requestId, status) => {
    setActionLoading(requestId);
    try {
      const res = await authenticatedFetch(`${API_URL}/api/requests/admin/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status, adminRemark })
      });
      const json = await res.json();
      if (json.success) {
        setModalOpen(false);
        setAdminRemark('');
        fetchRequests();
      }
    } catch (e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    return (
      r.employee?.name?.toLowerCase().includes(q) ||
      r.employee?.employeeId?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Employee Requests</h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Review and approve leave or attendance correction requests</p>
        </div>
        <button onClick={fetchRequests} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px',
          fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: '#64748b'
        }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text" placeholder="Search by employee name or ID..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '12px 12px 12px 42px', border: '1.5px solid #E2E8F0',
              borderRadius: '12px', fontSize: '14px', outline: 'none', color: '#334155'
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

        <select 
          value={filterType} 
          onChange={e => setFilterType(e.target.value)}
          style={{ padding: '12px 16px', border: '1.5px solid #E2E8F0', borderRadius: '12px', outline: 'none', background: '#fff' }}
        >
          <option value="All">All Types</option>
          <option value="Leave">Leave</option>
          <option value="Attendance Correction">Attendance Correction</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center' }}><RefreshCw className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center', color: '#94A3B8' }}>
            <FileText size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p style={{ fontWeight: '600' }}>No requests found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={thStyle}>Employee</th>
                  <th style={thStyle}>Request Type</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Details</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Applied On</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {r.employee?.profilePhoto ? (
                                <img src={`${API_URL}/uploads/${r.employee.profilePhoto}`} alt="" style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }} />
                            ) : <User size={18} color="#64748b" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{r.employee?.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{r.employee?.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                        ...typeColors[r.requestType]
                      }}>
                        {r.requestType}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{r.date}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ maxWidth: '250px' }}>
                        <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>{r.reason}</div>
                        {r.requestType === 'Attendance Correction' && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                            Correction: {r.manualIn ? new Date(r.manualIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} 
                            {' to '} 
                            {r.manualOut ? new Date(r.manualOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </div>
                        )}
                        {r.leaveType && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                            Type: {r.leaveType.name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700',
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        backgroundColor: statusColors[r.status].bg, color: statusColors[r.status].color
                      }}>
                        {statusColors[r.status].icon} {r.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{new Date(r.appliedAt).toLocaleDateString()}</div>
                    </td>
                    <td style={tdStyle}>
                      {r.status === 'Pending' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => { setSelectedRequest(r); setModalOpen(true); }}
                            style={{ 
                              padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#2563EB', 
                              color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' 
                            }}
                          >
                            Review
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>Processed</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {modalOpen && selectedRequest && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: '#fff', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: '800' }}>Review Request</h3>
            
            <div style={{ marginBottom: '20px', padding: '16px', background: '#F8FAFC', borderRadius: '16px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>Request Details</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>Employee</div>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>{selectedRequest.employee?.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>Date</div>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>{selectedRequest.date}</div>
                </div>
              </div>

              {selectedRequest.requestType === 'Attendance Correction' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', padding: '10px', background: '#fff', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>Requested In</div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#2563EB' }}>{selectedRequest.manualIn ? new Date(selectedRequest.manualIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>Requested Out</div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#2563EB' }}>{selectedRequest.manualOut ? new Date(selectedRequest.manualOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                  </div>
                </div>
              )}

              {selectedRequest.leaveType && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>Leave Type</div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: '#8B5CF6' }}>{selectedRequest.leaveType.name}</div>
                </div>
              )}

              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>Employee Reason</div>
                <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500', marginTop: '4px' }}>{selectedRequest.reason}</div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>Admin Remark</label>
              <textarea 
                value={adminRemark} 
                onChange={e => setAdminRemark(e.target.value)}
                placeholder="Add a remark for the employee..."
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #E2E8F0', outline: 'none', minHeight: '100px', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                disabled={actionLoading}
                onClick={() => handleAction(selectedRequest._id, 'Approved')}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#10B981', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
              >
                Approve
              </button>
              <button 
                disabled={actionLoading}
                onClick={() => handleAction(selectedRequest._id, 'Rejected')}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#EF4444', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const thStyle = { padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '16px', fontSize: '14px', color: '#334155' };

export default AdminRequests;
