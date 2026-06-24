import React, { useState, useEffect, useCallback } from 'react';
import { 
    Calendar, Clock, Search, RefreshCw, CheckCircle, XCircle, 
    FileText, User, MessageSquare, Filter, ChevronRight, 
    Inbox, AlertCircle, ArrowRight, Check, X, LogIn, LogOut,
    CheckSquare, Square
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import SearchableSelect from '../components/SearchableSelect';
import Swal from 'sweetalert2';

const statusColors = {
  Approved: { color: '#10B981', bg: '#ECFDF5', icon: <CheckCircle size={14} /> },
  Rejected: { color: '#EF4444', bg: '#FEF2F2', icon: <XCircle size={14} /> },
  Pending: { color: '#F59E0B', bg: '#FFFBEB', icon: <Clock size={14} /> },
};

const typeColors = {
  'Leave': { color: '#8B5CF6', backgroundColor: 'rgba(139, 92, 246, 0.15)' },
  'Attendance Correction': { color: '#0052ff', backgroundColor: 'rgba(37, 99, 235, 0.15)' },
};

const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
};

const durationBadgeStyle = {
  'Full Day':    { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  'First Half':  { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  'Second Half': { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
};

const MiniCalendar = ({ fromDate, toDate, leaveDuration }) => {
  const start = parseLocalDate(fromDate);
  const end = parseLocalDate(toDate || fromDate);
  
  if (!start || !end) return null;

  const isHalfDay = leaveDuration === 'First Half' || leaveDuration === 'Second Half';
  // For half-day: always a single day, count as 0.5
  // For full day: count calendar days in range
  const dayCount = isHalfDay
    ? 0.5
    : Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

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
    return new Date(year, month, day).getTime() === start.getTime();
  };

  const isEnd = (day) => {
    if (!day) return false;
    return new Date(year, month, day).getTime() === end.getTime();
  };

  const dStyle = durationBadgeStyle[leaveDuration] || durationBadgeStyle['Full Day'];

  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)', marginTop: '12px' }}>
      <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '12px', textAlign: 'center' }}>
        {monthNames[month]} {year}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textAlign: 'center', padding: '4px' }}>{d}</div>
        ))}
        {days.map((d, i) => {
          const active   = isInRange(d);
          const startDay = isStart(d);
          const endDay   = isEnd(d);
          
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
                color: active ? 'white' : d ? 'var(--text-secondary)' : 'transparent',
                background: active ? 'var(--primary-blue)' : 'transparent',
                opacity: d ? 1 : 0,
                border: startDay || endDay ? '2px solid rgba(255,255,255,0.5)' : 'none',
                // Half-day: show a diagonal split visual on the active day
                backgroundImage: (isHalfDay && active)
                  ? leaveDuration === 'First Half'
                    ? 'linear-gradient(135deg, var(--primary-blue) 50%, rgba(139,92,246,0.4) 50%)'
                    : 'linear-gradient(135deg, rgba(139,92,246,0.4) 50%, var(--primary-blue) 50%)'
                  : 'none',
              }}
            >
              {d}
            </div>
          );
        })}
      </div>

      {/* Duration summary row */}
      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>
          Duration: <strong style={{ color: 'var(--text-primary)' }}>{dayCount} Day{dayCount !== 1 ? 's' : ''}</strong>
        </div>
        {leaveDuration && (
          <span style={{
            fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '20px',
            background: dStyle.bg, color: dStyle.color, letterSpacing: '0.3px'
          }}>
            {leaveDuration.toUpperCase()}
          </span>
        )}
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
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (location.pathname.includes('/leave')) setFilterType('Leave');
    else if (location.pathname.includes('/attendance')) setFilterType('Attendance Correction');
  }, [location.pathname]);

  useEffect(() => {
    setSelectedIds([]);
  }, [filterStatus, filterType, search]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(r => r._id));
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(i => i !== id));
    else setSelectedIds(prev => [...prev, id]);
  };

  const handleBulkAction = async (ids, status) => {
    if (!ids.length) return;
    
    let confirmHtml = '';
    if (ids.length === 1) {
      const request = requests.find(r => r._id === ids[0]);
      confirmHtml = `
        <div style="text-align: left; background: var(--bg-main); padding: 20px; border-radius: 12px; border: 1px solid var(--border); font-family: 'Inter', sans-serif;">
          <div style="margin-bottom: 12px;">
            <p style="font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin: 0 0 2px 0;">Employee</p>
            <p style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0;">${request?.employee?.name || 'Unknown'}</p>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin: 0 0 2px 0;">Request Type & Reason</p>
            <p style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin: 0;">${request?.requestType} · "${request?.reason || 'No reason'}"</p>
          </div>
          <p style="font-size: 13px; color: var(--text-secondary); margin-top: 10px; text-align: center; font-weight: 600;">
            Are you sure you want to <b>${status.toLowerCase()}</b> this request?
          </p>
        </div>
      `;
    } else {
      confirmHtml = `<p style="font-size: 15px; font-weight: 600; color: var(--text-secondary);">Are you sure you want to <b>${status.toLowerCase()}</b> ${ids.length} selected requests?</p>`;
    }
    
    const result = await Swal.fire({
      title: status === 'Approved' ? 'Approve Request?' : 'Reject Request?',
      html: confirmHtml,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: status === 'Approved' ? '#10B981' : '#EF4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Yes, ${status}`,
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    setActionLoading(true);
    try {
      const promises = ids.map(id => 
        authenticatedFetch(`${API_URL}/api/requests/admin/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: id, status, adminRemark })
        })
      );
      
      const responses = await Promise.all(promises);
      let successCount = 0;
      for (const res of responses) {
        const d = await res.json();
        if (d.success) successCount++;
      }

      if (successCount > 0) {
        Swal.fire({
          title: 'Success!',
          text: `${successCount} request(s) have been ${status.toLowerCase()}.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        setSelectedIds([]);
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Action failed for one or more requests', 'error');
    } finally {
      setActionLoading(false);
    }
  };

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
    const request = requests.find(r => r._id === requestId);
    if (!request) return;

    const result = await Swal.fire({
      title: status === 'Approved' ? 'Approve Request?' : 'Reject Request?',
      html: `
        <div style="text-align: left; background: var(--bg-main); padding: 20px; border-radius: 12px; border: 1px solid var(--border); font-family: 'Inter', sans-serif;">
          <div style="margin-bottom: 15px;">
            <p style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; margin: 0 0 4px 0;">Employee</p>
            <p style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0;">${request.employee?.name || 'Unknown'}</p>
          </div>
          <div style="margin-bottom: 15px;">
            <p style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; margin: 0 0 4px 0;">Reason for Request</p>
            <p style="font-size: 14px; font-weight: 500; color: var(--text-primary); line-height: 1.5; margin: 0; font-style: italic;">"${request.reason || 'No reason provided'}"</p>
          </div>
          ${request.requestType === 'Attendance Correction' && request.workSummary ? `
          <div style="margin-bottom: 15px;">
            <p style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; margin: 0 0 4px 0;">Work Report / Remarks</p>
            <p style="font-size: 14px; font-weight: 500; color: var(--text-primary); line-height: 1.5; margin: 0;">${request.workSummary}</p>
          </div>
          ` : ''}
          <div>
            <p style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; margin: 0 0 4px 0;">Admin Remarks (Optional)</p>
            <p style="font-size: 14px; color: var(--text-secondary); margin: 0;">${adminRemark || '<span style="opacity: 0.5;">No remarks added</span>'}</p>
          </div>
        </div>
      `,
      icon: status === 'Approved' ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: status === 'Approved' ? '#10B981' : '#EF4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: status === 'Approved' ? 'Yes, Approve' : 'Yes, Reject',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    setActionLoading(requestId);
    try {
      const res = await authenticatedFetch(`${API_URL}/api/requests/admin/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status, adminRemark })
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({
          title: 'Processed!',
          text: `Request has been ${status.toLowerCase()} successfully.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        setModalOpen(false);
        setAdminRemark('');
        fetchRequests();
      }
    } catch (e) { 
      console.error(e);
      Swal.fire('Error', 'Failed to process request', 'error');
    }
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
        </div>
        {selectedIds.length > 0 ? (
          <div style={{ display: 'flex', gap: '12px', animation: 'fadeIn 0.2s ease-out' }}>
            <button 
              onClick={() => handleBulkAction(selectedIds, 'Approved')}
              disabled={actionLoading}
              style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', background: '#10B981', color: '#fff', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)' }}
            >
              <CheckCircle size={18} /> Approve ({selectedIds.length})
            </button>
            <button 
              onClick={() => handleBulkAction(selectedIds, 'Rejected')}
              disabled={actionLoading}
              style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', background: '#EF4444', color: '#fff', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)' }}
            >
              <XCircle size={18} /> Reject
            </button>
          </div>
        ) : (
          <button className="btn-hrm btn-hrm-secondary" onClick={fetchRequests} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> REFRESH
          </button>
        )}
      </div>

      <div className="hrm-card" style={{ marginBottom: '32px', overflow: 'visible' }}>
        <div style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <label className="hrm-label">Search Request</label>
            <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    type="text" 
                    className="hrm-input"
                    placeholder="Search by name, ID or reason..."
                    value={search} 
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: '48px' }}
                />
            </div>
          </div>

          <div style={{ width: '180px' }}>
            <SearchableSelect 
                label="Status"
                options={[
                    { value: 'All', label: 'All Status' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Approved', label: 'Approved' },
                    { value: 'Rejected', label: 'Rejected' },
                ]}
                value={filterStatus}
                onChange={setFilterStatus}
            />
          </div>

          <div style={{ width: '220px' }}>
            <SearchableSelect 
                label="Request Type"
                options={[
                    { value: 'All', label: 'All Types' },
                    { value: 'Leave', label: 'Leave Requests' },
                    { value: 'Attendance Correction', label: 'Correction Requests' },
                ]}
                value={filterType}
                onChange={setFilterType}
            />
          </div>
        </div>
      </div>

      <div className="hrm-card">
        {loading ? (
          <div style={{ padding: '100px', textAlign: 'center' }}>
            <RefreshCw className="animate-spin" size={32} color="var(--primary-blue)" />
            <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontWeight: 600 }}>Loading requests...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '100px', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Inbox size={40} style={{ opacity: 0.2 }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-dark)', margin: '0 0 8px' }}>No Requests Found</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto' }}>There are no employee requests matching your current filters.</p>
          </div>
        ) : (
          <div className="hrm-table-container">
            <table className="hrm-table">
              <thead>
                <tr>
                  {filterStatus === 'Pending' && (
                    <th style={{ paddingLeft: '24px', width: '40px' }}>
                      <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedIds.length === filtered.length ? 'var(--primary-blue)' : 'var(--border)' }}>
                        {selectedIds.length === filtered.length ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                    </th>
                  )}
                  <th style={{ paddingLeft: filterStatus === 'Pending' ? '12px' : '24px' }}>Employee</th>
                  <th>Request Details</th>
                  <th>Period / Date</th>
                  <th>Applied On</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center', paddingRight: '24px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r._id} style={{ background: selectedIds.includes(r._id) ? 'var(--primary-light)' : 'transparent', transition: 'background 0.2s' }}>
                    {filterStatus === 'Pending' && (
                      <td style={{ paddingLeft: '24px', textAlign: 'center' }}>
                         <button onClick={() => toggleSelect(r._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedIds.includes(r._id) ? 'var(--primary-blue)' : 'var(--border)' }}>
                            {selectedIds.includes(r._id) ? <CheckSquare size={18} /> : <Square size={18} />}
                         </button>
                      </td>
                    )}
                    <td style={{ paddingLeft: filterStatus === 'Pending' ? '12px' : '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: 'var(--primary-blue)', border: '1.5px solid var(--border)' }}>
                            {r.employee?.name?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-dark)' }}>{r.employee?.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{r.employee?.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span className="hrm-badge" style={{ alignSelf: 'flex-start', ...(typeColors[r.requestType] || typeColors['Leave']) }}>
                            {r.requestType}
                        </span>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingLeft: '14px' }}>
                            {r.reason}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '13px', color: 'var(--text-dark)' }}>
                        <Calendar size={14} color="var(--primary-blue)" />
                        {r.requestType === 'Leave' && r.fromDate && r.toDate && r.fromDate !== r.toDate 
                          ? `${r.fromDate} to ${r.toDate}` 
                          : (r.date || r.fromDate)}
                      </div>
                      {r.requestType === 'Leave' && r.leaveDuration && r.leaveDuration !== 'Full Day' && (
                        <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>
                          ½ {r.leaveDuration}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{new Date(r.appliedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </td>
                    <td>
                      <span className={`hrm-badge ${r.status === 'Approved' ? 'hrm-badge-success' : r.status === 'Rejected' ? 'hrm-badge-danger' : 'hrm-badge-warning'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {statusColors[r.status]?.icon || <Clock size={12} />} {r.status}
                      </span>
                    </td>
                    <td style={{ paddingRight: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {r.status === 'Pending' ? (
                          <button 
                            className="btn-hrm btn-hrm-primary"
                            style={{ padding: '6px 20px', fontSize: '12px' }}
                            onClick={() => { setSelectedRequest(r); setModalOpen(true); }}
                          >
                            REVIEW
                          </button>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '0.05em' }}>PROCESSED</div>
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
        <div className="hrm-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="hrm-modal-content" style={{ maxWidth: '800px', width: '90%', animation: 'modalFadeIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            <div className="hrm-modal-header" style={{ background: 'var(--primary-gradient)', color: 'white', padding: '24px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.3)' }}>
                    <FileText size={24} color="white" />
                </div>
                <div>
                    <h3 style={{ color: 'white', fontSize: '20px', fontWeight: 900, margin: 0 }}>Review Request</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Decision-making for {selectedRequest.requestType}</p>
                </div>
              </div>
              <button className="icon-btn" style={{ color: 'white', background: 'rgba(255,255,255,0.1)', border: 'none' }} onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="hrm-modal-body" style={{ padding: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                
                {/* Left Column: Information */}
                <div>
                  <div style={{ marginBottom: '32px', padding: '24px', background: 'var(--bg-main)', borderRadius: '24px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--primary-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900' }}>
                            {selectedRequest.employee?.name?.charAt(0)}
                        </div>
                        <div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-dark)' }}>{selectedRequest.employee?.name}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>ID: {selectedRequest.employee?.employeeId}</div>
                        </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Date / Period</p>
                            <p style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-dark)', margin: 0 }}>
                                {selectedRequest.requestType === 'Leave' && selectedRequest.fromDate && selectedRequest.toDate && selectedRequest.fromDate !== selectedRequest.toDate 
                                ? `${selectedRequest.fromDate} — ${selectedRequest.toDate}` 
                                : (selectedRequest.date || selectedRequest.fromDate)}
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Request Type</p>
                            <span className="hrm-badge" style={{ ...(typeColors[selectedRequest.requestType] || typeColors['Leave']), fontSize: '10px' }}>
                                {selectedRequest.requestType}
                            </span>
                        </div>
                    </div>

                    {selectedRequest.leaveType && (
                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Leave Details</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {/* Leave type name */}
                                <span style={{ padding: '6px 12px', background: 'rgba(124, 92, 246, 0.15)', color: '#8B5CF6', borderRadius: '10px', fontWeight: '800', fontSize: '12px' }}>
                                    {selectedRequest.leaveType.name}
                                </span>
                                {/* Paid / Unpaid */}
                                <span style={{ padding: '6px 12px', background: selectedRequest.leaveCategory === 'Paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: selectedRequest.leaveCategory === 'Paid' ? '#10B981' : '#F59E0B', borderRadius: '10px', fontWeight: '800', fontSize: '12px' }}>
                                    {selectedRequest.leaveCategory || 'Paid'}
                                </span>
                                {/* Duration — Full Day / First Half / Second Half */}
                                {selectedRequest.leaveDuration && (
                                    <span style={{
                                        padding: '6px 12px',
                                        background: selectedRequest.leaveDuration === 'Full Day'
                                            ? 'rgba(59,130,246,0.12)' : 'rgba(139,92,246,0.12)',
                                        color: selectedRequest.leaveDuration === 'Full Day'
                                            ? '#3B82F6' : '#8B5CF6',
                                        borderRadius: '10px', fontWeight: '800', fontSize: '12px',
                                        display: 'inline-flex', alignItems: 'center', gap: '4px'
                                    }}>
                                        {selectedRequest.leaveDuration !== 'Full Day' && '½ '}
                                        {selectedRequest.leaveDuration}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                  </div>

                  <div className="hrm-form-group">
                    <label className="hrm-label">ADMINISTRATOR REMARK</label>
                    <div style={{ position: 'relative' }}>
                        <MessageSquare size={16} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-muted)' }} />
                        <textarea 
                            className="hrm-input"
                            value={adminRemark} 
                            onChange={e => setAdminRemark(e.target.value)}
                            placeholder="Enter notes or reason for decision..."
                            style={{ minHeight: '140px', paddingLeft: '44px', paddingTop: '12px', resize: 'none' }}
                        />
                    </div>
                  </div>
                </div>

                {/* Right Column: Visual Auditing */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                   <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <AlertCircle size={16} color="var(--primary-blue)" />
                            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-dark)' }}>Audit & Context</span>
                        </div>
                        
                        {selectedRequest.requestType === 'Leave' ? (
                            <MiniCalendar fromDate={selectedRequest.fromDate} toDate={selectedRequest.toDate} leaveDuration={selectedRequest.leaveDuration} />
                        ) : (
                            <div style={{ padding: '24px', background: 'var(--bg-main)', borderRadius: '24px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'grid', gap: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                            <LogIn size={20} color="var(--success)" />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', margin: 0 }}>REQUESTED IN</p>
                                            <p style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-dark)', margin: 0 }}>
                                                {selectedRequest.manualIn ? new Date(selectedRequest.manualIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                            <LogOut size={20} color="var(--danger)" />
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', margin: 0 }}>REQUESTED OUT</p>
                                            <p style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-dark)', margin: 0 }}>
                                                {selectedRequest.manualOut ? new Date(selectedRequest.manualOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '20px', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
                           <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', marginBottom: '8px' }}>Reason for Request</p>
                           <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-dark)', fontWeight: '600', lineHeight: '1.6' }}>"{selectedRequest.reason}"</p>
                        </div>

                        {selectedRequest.workSummary && (
                           <div style={{ marginTop: '16px', padding: '20px', background: 'var(--bg-main)', borderRadius: '20px', border: '1px solid var(--border)' }}>
                              <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Work Report / Summary</p>
                              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{selectedRequest.workSummary}</p>
                           </div>
                        )}
                   </div>

                   <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                        <button 
                            className="btn-hrm btn-hrm-success"
                            style={{ flex: 1.5, height: '56px', fontSize: '16px', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)' }}
                            disabled={actionLoading}
                            onClick={() => handleAction(selectedRequest._id, 'Approved')}
                        >
                            <Check size={20} /> APPROVE
                        </button>
                        <button 
                            className="btn-hrm btn-hrm-secondary"
                            style={{ flex: 1, height: '56px', fontSize: '16px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                            disabled={actionLoading}
                            onClick={() => handleAction(selectedRequest._id, 'Rejected')}
                        >
                            <X size={20} /> REJECT
                        </button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .spinner { border: 3px solid rgba(0,0,0,0.1); border-top: 3px solid var(--primary-blue); border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminRequests;
