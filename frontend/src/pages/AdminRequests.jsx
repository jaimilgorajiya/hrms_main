import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Search, RefreshCw, CheckCircle, XCircle, FileText, User, MessageSquare } from 'lucide-react';
import { useLocation } from 'react-router-dom';
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

const MiniCalendar = ({ fromDate, toDate }) => {
  const start = new Date(fromDate);
  const end = new Date(toDate || fromDate);
  const month = start.getMonth();
  const year = start.getFullYear();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const isInRange = (day) => {
    if (!day) return false;
    const current = new Date(year, month, day);
    return current >= start && current <= end;
  };

  const isStart = (day) => {
    if (!day) return false;
    const current = new Date(year, month, day);
    return current.getTime() === start.getTime();
  };

  const isEnd = (day) => {
    if (!day) return false;
    const current = new Date(year, month, day);
    return current.getTime() === end.getTime();
  };

  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '16px', border: '1px solid #E2E8F0', marginTop: '12px' }}>
      <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px', textAlign: 'center' }}>
        {monthNames[month]} {year}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textAlign: 'center', padding: '4px' }}>{d}</div>
        ))}
        {days.map((d, i) => {
          const active = isInRange(d);
          const startDay = isStart(d);
          const endDay = isEnd(d);
          
          return (
            <div 
              key={i} 
              style={{
                fontSize: '12px',
                fontWeight: active ? '800' : '600',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                color: active ? 'white' : d ? '#475569' : 'transparent',
                background: active ? '#8B5CF6' : 'transparent',
                opacity: d ? 1 : 0,
                border: startDay || endDay ? '2px solid rgba(255,255,255,0.5)' : 'none'
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>
         Duration: {Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1} Day(s) Selected
      </div>
    </div>
  );
};

const AdminRequests = () => {
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Pending');
  const [filterType, setFilterType] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminRemark, setAdminRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (location.pathname.includes('/leave')) setFilterType('Leave');
    else if (location.pathname.includes('/attendance')) setFilterType('Attendance Correction');
  }, [location.pathname]);

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
    <div className="hrm-container">
      <div className="hrm-header">
        <div>
          <h1 className="hrm-title">Employee Requests</h1>
          <p className="hrm-subtitle">Review and approve leave or attendance correction requests</p>
        </div>
        <button className="btn-hrm btn-hrm-secondary" onClick={fetchRequests}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="hrm-card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div className="hrm-search-wrapper" style={{ flex: 1, minWidth: '300px' }}>
            <Search size={18} className="hrm-search-icon" />
            <input
              type="text" 
              className="hrm-input hrm-search-input"
              placeholder="Search by employee name or ID..."
              value={search} 
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <select 
              className="hrm-input"
              style={{ width: '160px' }}
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select 
              className="hrm-input"
              style={{ width: '200px' }}
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Leave">Leave</option>
              <option value="Attendance Correction">Attendance Correction</option>
            </select>
          </div>
        </div>
      </div>

      <div className="hrm-card">
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center' }}><RefreshCw className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={48} style={{ marginBottom: '16px', opacity: 0.3, margin: '0 auto' }} />
            <p style={{ fontWeight: '600' }}>No requests found</p>
          </div>
        ) : (
          <div className="hrm-table-container">
            <table className="hrm-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Request Type</th>
                  <th>Date</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Applied On</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {r.employee?.profilePhoto ? (
                                <img src={`${API_URL}/uploads/${r.employee.profilePhoto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : <User size={18} color="var(--text-secondary)" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-dark)' }}>{r.employee?.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.employee?.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="hrm-badge" style={{ ...(typeColors[r.requestType] || typeColors['Leave']) }}>
                        {r.requestType}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-dark)' }}>
                        {r.requestType === 'Leave' && r.fromDate && r.toDate && r.fromDate !== r.toDate 
                          ? `${r.fromDate} to ${r.toDate}` 
                          : (r.date || r.fromDate)}
                      </div>
                    </td>
                    <td>
                      <div style={{ maxWidth: '250px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>{r.reason}</div>
                        {r.requestType === 'Attendance Correction' && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Correction: {r.manualIn ? new Date(r.manualIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} 
                            {' to '} 
                            {r.manualOut ? new Date(r.manualOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </div>
                        )}
                        {r.leaveType && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Type: {r.leaveType.name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`hrm-badge ${r.status === 'Approved' ? 'hrm-badge-success' : r.status === 'Rejected' ? 'hrm-badge-danger' : 'hrm-badge-warning'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {statusColors[r.status]?.icon || <Clock size={14} />} {r.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{new Date(r.appliedAt).toLocaleDateString()}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {r.status === 'Pending' ? (
                          <button 
                            className="btn-hrm btn-hrm-primary"
                            style={{ padding: '6px 16px', fontSize: '12px' }}
                            onClick={() => { setSelectedRequest(r); setModalOpen(true); }}
                          >
                            Review
                          </button>
                        ) : (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Processed</div>
                        )}
                      </div>
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
        <div className="hrm-modal-overlay">
          <div className="hrm-modal-content" style={{ maxWidth: '750px' }}>
            <div className="hrm-modal-header">
              <h3 className="hrm-modal-title">Review Request</h3>
              <button className="icon-btn" onClick={() => setModalOpen(false)}>
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="hrm-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
                
                {/* Left Column: Information */}
                <div>
                  <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-main)', borderRadius: '20px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                      Core Details
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Employee</div>
                      <div style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-dark)' }}>{selectedRequest.employee?.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>{selectedRequest.employee?.employeeId}</div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Period</div>
                      <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--primary-blue)' }}>
                        {selectedRequest.requestType === 'Leave' && selectedRequest.fromDate && selectedRequest.toDate && selectedRequest.fromDate !== selectedRequest.toDate 
                          ? `${selectedRequest.fromDate} — ${selectedRequest.toDate}` 
                          : (selectedRequest.date || selectedRequest.fromDate)}
                      </div>
                    </div>

                    {selectedRequest.requestType === 'Leave' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Leave Type</div>
                          <div style={{ marginTop: '4px', padding: '6px 12px', background: '#F5F3FF', color: '#7C3AED', borderRadius: '10px', fontWeight: '800', fontSize: '12px', display: 'inline-block' }}>
                            {selectedRequest.leaveType?.name || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Category</div>
                          <div style={{ 
                            marginTop: '4px', padding: '6px 12px', 
                            background: selectedRequest.leaveCategory === 'Paid' ? '#ECFDF5' : '#FFFBEB', 
                            color: selectedRequest.leaveCategory === 'Paid' ? '#059669' : '#D97706', 
                            borderRadius: '10px', fontWeight: '800', fontSize: '12px', display: 'inline-block',
                            border: `0.5px solid ${selectedRequest.leaveCategory === 'Paid' ? '#10B981' : '#F59E0B'}30`
                          }}>
                            {selectedRequest.leaveCategory || 'Paid'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="hrm-form-group">
                    <label className="hrm-label">Admin Remark</label>
                    <textarea 
                      className="hrm-input"
                      value={adminRemark} 
                      onChange={e => setAdminRemark(e.target.value)}
                      placeholder="Share your thoughts with the employee..."
                      style={{ minHeight: '120px', resize: 'none' }}
                    />
                  </div>
                </div>

                {/* Right Column: Visual Auditing */}
                <div>
                   {selectedRequest.requestType === 'Leave' ? (
                     <div style={{ height: '100%' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '12px' }}>Visual Audit</div>
                        <MiniCalendar fromDate={selectedRequest.fromDate} toDate={selectedRequest.toDate} />
                        
                        <div style={{ marginTop: '20px', padding: '16px', background: 'var(--primary-light)', borderRadius: '16px', border: '1px solid var(--primary-blue)', opacity: 0.8 }}>
                           <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', marginBottom: '4px' }}>Reason</div>
                           <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-dark)', fontWeight: '600', lineHeight: '1.5' }}>{selectedRequest.reason}</p>
                        </div>
                     </div>
                   ) : (
                     <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '20px', border: '1px solid var(--border)', height: '100%' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px' }}>Correction Details</div>
                        <div style={{ display: 'grid', gap: '16px' }}>
                          <div style={{ padding: '16px', background: '#fff', borderRadius: '14px', border: '1px solid var(--border)' }}>
                             <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Requested In</div>
                             <div style={{ fontWeight: '800', fontSize: '18px', color: 'var(--primary-blue)' }}>{selectedRequest.manualIn ? new Date(selectedRequest.manualIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                          </div>
                          <div style={{ padding: '16px', background: '#fff', borderRadius: '14px', border: '1px solid var(--border)' }}>
                             <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Requested Out</div>
                             <div style={{ fontWeight: '800', fontSize: '18px', color: 'var(--primary-blue)' }}>{selectedRequest.manualOut ? new Date(selectedRequest.manualOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                          </div>
                          <div style={{ marginTop: '10px' }}>
                             <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Reason</div>
                             <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-dark)', fontWeight: '600' }}>{selectedRequest.reason}</p>
                          </div>
                        </div>
                     </div>
                   )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
                <button 
                  className="btn-hrm btn-hrm-success"
                  style={{ flex: 1.2, height: '56px', fontSize: '16px' }}
                  disabled={actionLoading}
                  onClick={() => handleAction(selectedRequest._id, 'Approved')}
                >
                  Confirm Approval
                </button>
                <button 
                  className="btn-hrm btn-hrm-secondary"
                  style={{ flex: 1, height: '56px', fontSize: '16px', color: 'var(--danger)' }}
                  disabled={actionLoading}
                  onClick={() => handleAction(selectedRequest._id, 'Rejected')}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const thStyle = { padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '16px', fontSize: '14px', color: 'var(--text-primary)' };

export default AdminRequests;
