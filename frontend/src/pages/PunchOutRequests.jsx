import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Search, RefreshCw, CheckCircle, XCircle, FileText, User, AlertTriangle } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';

const statusColors = {
  Approved: { color: '#10B981', bg: '#ECFDF5', icon: <CheckCircle size={14} /> },
  Rejected: { color: '#EF4444', bg: '#FEF2F2', icon: <XCircle size={14} /> },
  Pending: { color: '#F59E0B', bg: '#FFFBEB', icon: <Clock size={14} /> },
};

const PunchOutRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminRemark, setAdminRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      // Fetching all 'Attendance Correction' requests
      let url = `${API_URL}/api/requests/admin/all?requestType=Attendance Correction`;
      if (filterStatus !== 'All') url += `&status=${filterStatus}`;

      const res = await authenticatedFetch(url);
      const json = await res.json();
      if (json.success) {
          // Optional: Filter only those that are corrective for missing punches
          // For now, in this module, we show all Attendance Corrections as requested
          setRequests(json.requests);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterStatus]);

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
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Punch Out Request</h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px', fontWeight: '500' }}>Review and approve missing punch out or attendance adjustment requests</p>
        </div>
        <button onClick={fetchRequests} style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px',
          fontSize: '14px', fontWeight: '700', cursor: 'pointer', color: '#475569',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text" placeholder="Search employee..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '12px 12px 12px 42px', border: '1.5px solid #E2E8F0',
              borderRadius: '12px', fontSize: '14px', outline: 'none', color: '#334155', background: '#fff'
            }}
          />
        </div>

        <select 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '12px 16px', border: '1.5px solid #E2E8F0', borderRadius: '12px', outline: 'none', background: '#fff', fontWeight: '600', color: '#475569' }}
        >
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center' }}><RefreshCw size={32} color="#2563EB" className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '100px 20px', textAlign: 'center', color: '#94A3B8' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '30px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <AlertTriangle size={40} color="#CBD5E1" />
            </div>
            <p style={{ fontWeight: '700', fontSize: '18px', color: '#475569' }}>No Correction Requests</p>
            <p style={{ fontSize: '14px', marginTop: '4px' }}>There are currently no missing punch-out requests matching your filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={thStyle}>Employee</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Reason & Details</th>
                  <th style={thStyle}>Requested Time</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {r.employee?.profilePhoto ? (
                                <img src={`${API_URL}/uploads/${r.employee.profilePhoto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : <User size={20} color="#94A3B8" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: '#1E293B' }}>{r.employee?.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>#{r.employee?.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#334155' }}>
                        {new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ maxWidth: '300px' }}>
                        <div style={{ fontSize: '14px', color: '#334155', fontWeight: '600', lineHeight: '1.4' }}>{r.reason}</div>
                        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontWeight: '500' }}>Applied on {new Date(r.appliedAt).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                         <div style={{ padding: '6px 12px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #DCFCE7' }}>
                            <div style={{ fontSize: '10px', color: '#15803D', fontWeight: '800', textTransform: 'uppercase' }}>In</div>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: '#166534' }}>{r.manualIn ? new Date(r.manualIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                         </div>
                         <div style={{ padding: '6px 12px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FEE2E2' }}>
                            <div style={{ fontSize: '10px', color: '#B91C1C', fontWeight: '800', textTransform: 'uppercase' }}>Out</div>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: '#991B1B' }}>{r.manualOut ? new Date(r.manualOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                         </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ 
                        padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '800',
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        backgroundColor: statusColors[r.status].bg, color: statusColors[r.status].color
                      }}>
                        {statusColors[r.status].icon} {r.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {r.status === 'Pending' ? (
                        <button 
                          onClick={() => { setSelectedRequest(r); setModalOpen(true); }}
                          style={{ 
                            padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#2563EB', 
                            color: '#fff', fontWeight: '800', fontSize: '13px', cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                          }}
                        >
                          Review Correction
                        </button>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '700', padding: '10px' }}>Processed</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && selectedRequest && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '40px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            
            <div style={{ padding: '32px 32px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.02em' }}>Correction Audit</h3>
              <button 
                onClick={() => setModalOpen(false)} 
                style={{ background: '#F1F5F9', border: 'none', padding: '10px', borderRadius: '14px', cursor: 'pointer', color: '#64748B' }}
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <div style={{ padding: '0 32px 32px' }}>
                <div style={{ background: '#F8FAFC', borderRadius: '24px', padding: '24px', border: '1.5px solid #E2E8F0', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                         <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fff', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {selectedRequest.employee?.profilePhoto ? (
                                <img src={`${API_URL}/uploads/${selectedRequest.employee.profilePhoto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : <User size={24} color="#94A3B8" />}
                         </div>
                         <div>
                            <div style={{ fontWeight: '900', fontSize: '18px', color: '#0F172A' }}>{selectedRequest.employee?.name}</div>
                            <div style={{ fontSize: '13px', color: '#64748B', fontWeight: '700' }}>{selectedRequest.employee?.employeeId}</div>
                         </div>
                    </div>

                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>Correction for {selectedRequest.date}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ padding: '14px', background: '#fff', borderRadius: '18px', border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: '10px', color: '#10B981', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>Requested In</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#1E293B' }}>{selectedRequest.manualIn ? new Date(selectedRequest.manualIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                        </div>
                        <div style={{ padding: '14px', background: '#fff', borderRadius: '18px', border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: '10px', color: '#EF4444', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>Requested Out</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#1E293B' }}>{selectedRequest.manualOut ? new Date(selectedRequest.manualOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                        </div>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: '4px' }}>Employee Reason</div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#334155', lineHeight: '1.5' }}>{selectedRequest.reason}</p>
                    </div>

                    {selectedRequest.workSummary && (
                      <div style={{ marginTop: '20px', padding: '16px', background: '#FFF7ED', borderRadius: '18px', border: '1px solid #FFEDD5' }}>
                          <div style={{ fontSize: '11px', fontWeight: '900', color: '#C2410C', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FileText size={12} /> Work Report
                          </div>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#9A3412', lineHeight: '1.5' }}>{selectedRequest.workSummary}</p>
                      </div>
                    )}
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#1E293B', marginBottom: '10px' }}>Admin Remark (Optional)</label>
                    <textarea 
                      value={adminRemark} 
                      onChange={e => setAdminRemark(e.target.value)}
                      placeholder="Add a remark for the employee..."
                      style={{ width: '100%', padding: '16px', borderRadius: '20px', border: '1.5px solid #E2E8F0', outline: 'none', minHeight: '100px', fontSize: '14px', color: '#334155', background: '#F8FAFC', transition: 'border-color 0.2s', resize: 'none' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        disabled={actionLoading}
                        onClick={() => handleAction(selectedRequest._id, 'Approved')}
                        style={{ flex: 1.5, padding: '16px', borderRadius: '20px', border: 'none', background: '#10B981', color: '#fff', fontWeight: '900', fontSize: '15px', cursor: 'pointer', transition: 'opacity 0.2s', opacity: actionLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                        Approve Correction
                    </button>
                    <button 
                        disabled={actionLoading}
                        onClick={() => handleAction(selectedRequest._id, 'Rejected')}
                        style={{ flex: 1, padding: '16px', borderRadius: '20px', border: '1.5px solid #F1F5F9', background: '#fff', color: '#EF4444', fontWeight: '900', fontSize: '15px', cursor: 'pointer', opacity: actionLoading ? 0.7 : 1 }}
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

const thStyle = { padding: '16px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '16px 20px', fontSize: '14px' };

export default PunchOutRequests;
