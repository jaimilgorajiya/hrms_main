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
      <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', marginBottom: '12px', textAlign: 'center' }}>
        {monthNames[month]} {year}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textAlign: 'center', padding: '4px' }}>{d}</div>
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
      <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
         Duration: {Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1} Day(s) Selected
      </div>
    </div>
  );
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
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {r.requestType === 'Leave' && r.fromDate && r.toDate && r.fromDate !== r.toDate 
                          ? `${r.fromDate} to ${r.toDate}` 
                          : (r.date || r.fromDate)}
                      </div>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '32px', width: '100%', maxWidth: '750px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            
            <div style={{ padding: '32px', borderBottom: '1.5px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0F172A' }}>Review Request</h3>
              <button 
                onClick={() => setModalOpen(false)} 
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '8px', borderRadius: '12px', cursor: 'pointer', color: '#64748B' }}
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <div style={{ padding: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
                
                {/* Left Column: Information */}
                <div>
                  <div style={{ marginBottom: '24px', padding: '20px', background: '#F8FAFC', borderRadius: '20px', border: '1.5px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                      Core Details
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase' }}>Employee</div>
                      <div style={{ fontWeight: '800', fontSize: '16px', color: '#0F172A' }}>{selectedRequest.employee?.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>{selectedRequest.employee?.employeeId}</div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase' }}>Period</div>
                      <div style={{ fontWeight: '800', fontSize: '14px', color: '#312E81' }}>
                        {selectedRequest.requestType === 'Leave' && selectedRequest.fromDate && selectedRequest.toDate && selectedRequest.fromDate !== selectedRequest.toDate 
                          ? `${selectedRequest.fromDate} — ${selectedRequest.toDate}` 
                          : (selectedRequest.date || selectedRequest.fromDate)}
                      </div>
                    </div>

                    {selectedRequest.requestType === 'Leave' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase' }}>Leave Type</div>
                          <div style={{ marginTop: '4px', padding: '6px 12px', background: '#F5F3FF', color: '#7C3AED', borderRadius: '10px', fontWeight: '800', fontSize: '12px', display: 'inline-block' }}>
                            {selectedRequest.leaveType?.name || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase' }}>Category</div>
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

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#1E293B', marginBottom: '10px' }}>Admin Remark</label>
                    <textarea 
                      value={adminRemark} 
                      onChange={e => setAdminRemark(e.target.value)}
                      placeholder="Share your thoughts with the employee..."
                      style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1.5px solid #E2E8F0', outline: 'none', minHeight: '120px', fontSize: '14px', color: '#334155', background: '#fff', transition: 'border-color 0.2s', resize: 'none' }}
                    />
                  </div>
                </div>

                {/* Right Column: Visual Auditing */}
                <div>
                   {selectedRequest.requestType === 'Leave' ? (
                     <div style={{ height: '100%' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#1E293B', marginBottom: '12px' }}>Visual Audit</div>
                        <MiniCalendar fromDate={selectedRequest.fromDate} toDate={selectedRequest.toDate} />
                        
                        <div style={{ marginTop: '20px', padding: '16px', background: '#F0F9FF', borderRadius: '16px', border: '1px solid #BAE6FD' }}>
                           <div style={{ fontSize: '11px', fontWeight: '800', color: '#0369A1', textTransform: 'uppercase', marginBottom: '4px' }}>Reason</div>
                           <p style={{ margin: 0, fontSize: '13px', color: '#0C4A6E', fontWeight: '600', lineHeight: '1.5' }}>{selectedRequest.reason}</p>
                        </div>
                     </div>
                   ) : (
                     <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '20px', border: '1.5px solid #E2E8F0', height: '100%' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#1E293B', marginBottom: '16px' }}>Correction Details</div>
                        <div style={{ display: 'grid', gap: '16px' }}>
                          <div style={{ padding: '16px', background: '#fff', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                             <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase' }}>Requested In</div>
                             <div style={{ fontWeight: '800', fontSize: '18px', color: '#2563EB' }}>{selectedRequest.manualIn ? new Date(selectedRequest.manualIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                          </div>
                          <div style={{ padding: '16px', background: '#fff', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                             <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase' }}>Requested Out</div>
                             <div style={{ fontWeight: '800', fontSize: '18px', color: '#2563EB' }}>{selectedRequest.manualOut ? new Date(selectedRequest.manualOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                          </div>
                          <div style={{ marginTop: '10px' }}>
                             <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Reason</div>
                             <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#334155', fontWeight: '600' }}>{selectedRequest.reason}</p>
                          </div>
                        </div>
                     </div>
                   )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
                <button 
                  disabled={actionLoading}
                  onClick={() => handleAction(selectedRequest._id, 'Approved')}
                  style={{ flex: 1.2, padding: '16px', borderRadius: '18px', border: 'none', background: '#10B981', color: '#fff', fontWeight: '800', fontSize: '16px', cursor: 'pointer', transition: 'transform 0.1s, opacity 0.2s', opacity: actionLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                >
                  Confirm Approval
                </button>
                <button 
                  disabled={actionLoading}
                  onClick={() => handleAction(selectedRequest._id, 'Rejected')}
                  style={{ flex: 1, padding: '16px', borderRadius: '18px', border: '1.5px solid #F1F5F9', background: '#fff', color: '#EF4444', fontWeight: '800', fontSize: '16px', cursor: 'pointer', transition: 'background 0.2s', opacity: actionLoading ? 0.7 : 1 }}
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

const thStyle = { padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '16px', fontSize: '14px', color: '#334155' };

export default AdminRequests;
