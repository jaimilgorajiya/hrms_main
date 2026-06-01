import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Send, Calendar, ChevronLeft, ChevronRight, Info, CreditCard, AlertCircle } from 'lucide-react';
import { useMobileAuth } from './context/MobileAuthContext';
import { format, addDays } from 'date-fns';

function LeaveCard({ request }) {
  const isPending  = request.status === 'Pending';
  const isApproved = request.status === 'Approved';
  const isRejected = request.status === 'Rejected';
  const statusClass = isApproved ? 'success' : isRejected ? 'danger' : 'warning';

  return (
    <div className="m-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div>
          <div className="m-list-title">{request.leaveType?.name || 'Leave Request'}</div>
          <div className="m-list-sub" style={{ marginTop: 2 }}>{request.reason}</div>
        </div>
        <span className={`m-badge ${statusClass}`}>{request.status}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 8, borderTop: '1px solid var(--m-border)', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Calendar size={12} color="var(--m-muted)" />
          <span style={{ fontSize: 11, color: 'var(--m-muted)', fontWeight: 700 }}>
            {request.fromDate === request.toDate ? request.fromDate : `${request.fromDate} → ${request.toDate}`}
          </span>
        </div>
        {request.leaveDuration && (
          <span style={{ fontSize: 11, color: 'var(--m-muted)', fontWeight: 700 }}>{request.leaveDuration}</span>
        )}
        <span className={`m-badge ${request.leaveCategory === 'Paid' ? 'success' : 'warning'}`} style={{ padding: '2px 8px', fontSize: 10 }}>
          {request.leaveCategory || 'Paid'}
        </span>
      </div>
      {request.adminRemark && (
        <div style={{ fontSize: 12, color: 'var(--m-muted)', background: 'var(--m-elevated)', borderRadius: 8, padding: '6px 10px', width: '100%' }}>
          Admin: {request.adminRemark}
        </div>
      )}
    </div>
  );
}

export default function MobileLeaves() {
  const { apiFetch } = useMobileAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Calendar state for date range
  const [calMonth, setCalMonth] = useState(new Date());
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  // Form state
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [reason, setReason] = useState('');
  const [leaveDuration, setLeaveDuration] = useState('Full Day');
  const [leaveCategory, setLeaveCategory] = useState('Paid');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [statsRes, reqRes, ltRes] = await Promise.all([
        apiFetch('/api/employee-dashboard/stats'),
        apiFetch('/api/requests/my-requests'),
        apiFetch('/api/leave-types'),
      ]);
      const [statsJson, reqJson, ltJson] = await Promise.all([statsRes.json(), reqRes.json(), ltRes.json()]);
      if (statsJson.success) { setStats(statsJson.stats); setUserProfile(statsJson.employee); }
      if (reqJson.success) setRequests(reqJson.requests.filter(r => r.requestType === 'Leave'));
      if (ltJson.success) setLeaveTypes(ltJson.leaveTypes || ltJson.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiFetch]);

  useEffect(() => { loadData(); }, []);

  const handleDaySelect = (dateStr) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const selected = new Date(dateStr); selected.setHours(0,0,0,0);
    if (selected < today) return; // block past dates

    if (leaveDuration !== 'Full Day') {
      setFromDate(dateStr); setToDate(dateStr); return;
    }
    if (!fromDate || (fromDate && toDate)) {
      setFromDate(dateStr); setToDate(null);
    } else if (fromDate && !toDate) {
      if (dateStr < fromDate) { setFromDate(dateStr); setToDate(null); }
      else { setToDate(dateStr); }
    }
  };

  const { calDays, calMonthStr } = (() => {
    const start = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const end   = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
    const days = [];
    const startDay = start.getDay();
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
    const monStr = start.toLocaleString('default', { month: 'long', year: 'numeric' });
    return { calDays: days, calMonthStr: monStr };
  })();

  const isInRange = (dateStr) => {
    if (!fromDate || !toDate) return false;
    return dateStr > fromDate && dateStr < toDate;
  };

  const handleSubmit = async () => {
    if (!selectedLeaveType) return showToast('Select a leave type', 'error');
    if (!fromDate) return showToast('Select a date', 'error');
    if (!reason.trim()) return showToast('Reason is required', 'error');
    const maxLimit = stats?.maxUsagePerMonth || stats?.totalLeaves || 0;
    if (leaveCategory === 'Paid' && maxLimit > 0 && (stats?.usedLeaves || 0) >= maxLimit) {
      return showToast(`Monthly paid leave limit reached (${maxLimit})`, 'error');
    }
    setSubmitting(true);
    try {
      const payload = {
        requestType: 'Leave',
        fromDate,
        toDate: toDate || fromDate,
        reason,
        leaveType: selectedLeaveType,
        leaveDuration,
        leaveCategory,
      };
      const res = await apiFetch('/api/requests/submit', { method: 'POST', body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) {
        showToast('Leave application submitted!');
        setShowModal(false);
        setReason(''); setSelectedLeaveType(''); setFromDate(null); setToDate(null);
        loadData();
      } else {
        showToast(json.message || 'Failed', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setSubmitting(false); }
  };

  const total = stats?.totalLeaves || 0;
  const used  = stats?.usedLeaves  || 0;
  const balance = Math.max(0, total - used);

  if (loading) return <div className="m-loader" style={{ height: '60vh' }}><div className="m-spinner" /></div>;

  return (
    <div style={{ minHeight: '100%', paddingBottom: 20 }}>
      {toast && (
        <div className="m-toast" style={{ background: toast.type === 'error' ? 'var(--m-danger)' : 'var(--m-success)' }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ padding: '20px 20px 16px', background: 'var(--m-surface)', borderBottom: '1px solid var(--m-border)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--m-text)', margin: '0 0 4px' }}>Leave Management</h1>
        <p style={{ fontSize: 13, color: 'var(--m-muted)', margin: 0, fontWeight: 500 }}>Check balance and apply for leave</p>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Balance Cards */}
        {stats?.hasLeaveGroup ? (
          <div>
            <div className="m-stat-grid" style={{ marginBottom: 12 }}>
              <div className="m-stat-card" style={{ background: 'var(--m-primary-light)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div className="m-stat-value" style={{ color: 'var(--m-primary)' }}>{total}</div>
                <div className="m-stat-label">Entitlement</div>
              </div>
              <div className="m-stat-card" style={{ background: 'var(--m-success-light)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="m-stat-value" style={{ color: 'var(--m-success)' }}>{balance}</div>
                <div className="m-stat-label">Available</div>
              </div>
              <div className="m-stat-card" style={{ background: 'var(--m-danger-light)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="m-stat-value" style={{ color: 'var(--m-danger)' }}>{used}</div>
                <div className="m-stat-label">Paid Used</div>
              </div>
              <div className="m-stat-card" style={{ background: 'var(--m-warning-light)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="m-stat-value" style={{ color: 'var(--m-warning)' }}>{stats?.usedUnpaidLeaves || 0}</div>
                <div className="m-stat-label">Unpaid Taken</div>
              </div>
            </div>

            {/* Policy info */}
            <div className="m-info-banner info" style={{ marginBottom: 16 }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                {stats?.leavePolicy === 'Multiple of 1'
                  ? 'Only full-day leaves allowed per policy.'
                  : 'Full Day & Half Day leaves allowed.'}
                {stats?.maxUsagePerMonth ? ` Max ${stats.maxUsagePerMonth} paid leaves/month.` : ''}
              </span>
            </div>

            {/* Apply FAB */}
            <button
              className="m-btn m-btn-primary m-btn-full"
              style={{ marginBottom: 20 }}
              onClick={() => setShowModal(true)}
            >
              <Plus size={18} /> Apply for Leave
            </button>
          </div>
        ) : (
          <div className="m-info-banner warning" style={{ marginBottom: 16 }}>
            <AlertCircle size={14} />
            No leave group assigned. Contact HR.
          </div>
        )}

        {/* Request History */}
        <p className="m-section-header">Request History</p>
        {requests.length === 0 ? (
          <div className="m-empty">
            <div className="m-empty-icon"><Calendar size={36} /></div>
            <div className="m-empty-title">No Leave Requests</div>
            <div className="m-empty-sub">Your leave history will appear here.</div>
          </div>
        ) : (
          requests.map(r => <LeaveCard key={r._id} request={r} />)
        )}
      </div>

      {/* Apply Leave Modal */}
      {showModal && (
        <div className="m-modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="m-bottom-sheet">
            <div className="m-bottom-sheet-handle" />
            <div className="m-bottom-sheet-header">
              <span className="m-bottom-sheet-title">Apply for Leave</span>
              <button className="m-bottom-sheet-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="m-bottom-sheet-body">
              {/* Mini calendar */}
              <div className="m-input-group">
                <label className="m-input-label">Select Period</label>
                <div className="m-calendar" style={{ padding: 12 }}>
                  <div className="m-cal-header">
                    <button className="m-cal-nav" onClick={() => setCalMonth(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}><ChevronLeft size={14} /></button>
                    <span className="m-cal-month" style={{ fontSize: 14 }}>{calMonthStr}</span>
                    <button className="m-cal-nav" onClick={() => setCalMonth(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}><ChevronRight size={14} /></button>
                  </div>
                  <div className="m-cal-grid">
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="m-cal-weekday">{d}</div>)}
                    {calDays.map((day, i) => {
                      if (!day) return <div key={`e-${i}`} />;
                      const ds = format(day, 'yyyy-MM-dd');
                      const isFrom = ds === fromDate;
                      const isTo = ds === toDate;
                      const inRange = isInRange(ds);
                      const isPast = ds < format(new Date(), 'yyyy-MM-dd');
                      return (
                        <div
                          key={ds}
                          className={`m-cal-day ${isPast ? 'other-month' : ''}`}
                          style={{
                            background: (isFrom || isTo) ? 'var(--m-primary)' : inRange ? 'var(--m-primary-light)' : undefined,
                            color: (isFrom || isTo) ? 'white' : undefined,
                            cursor: isPast ? 'default' : 'pointer',
                          }}
                          onClick={() => !isPast && handleDaySelect(ds)}
                        >
                          {day.getDate()}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <div style={{ flex: 1, padding: '8px 12px', background: 'var(--m-elevated)', borderRadius: 10, fontSize: 12, fontWeight: 700, color: 'var(--m-text)' }}>
                    From: {fromDate || 'Not selected'}
                  </div>
                  <div style={{ flex: 1, padding: '8px 12px', background: 'var(--m-elevated)', borderRadius: 10, fontSize: 12, fontWeight: 700, color: 'var(--m-text)' }}>
                    To: {toDate || fromDate || 'Not selected'}
                  </div>
                </div>
              </div>

              {/* Leave type chips */}
              {leaveTypes.length > 0 && (
                <div className="m-input-group">
                  <label className="m-input-label">Leave Type</label>
                  <div className="m-chips">
                    {leaveTypes.filter(lt => {
                      if (userProfile?.gender) {
                        if (lt.applicableFor === 'Male Only' && userProfile.gender !== 'Male') return false;
                        if (lt.applicableFor === 'Female Only' && userProfile.gender !== 'Female') return false;
                      }
                      return true;
                    }).map(lt => (
                      <button key={lt._id} className={`m-chip ${selectedLeaveType === lt._id ? 'active' : ''}`} onClick={() => setSelectedLeaveType(lt._id)}>
                        {lt.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Duration */}
              {stats?.leavePolicy !== 'Multiple of 1' && (
                <div className="m-input-group">
                  <label className="m-input-label">Duration</label>
                  <div className="m-segment">
                    {['Full Day', 'First Half', 'Second Half'].map(d => (
                      <button key={d} className={`m-segment-btn ${leaveDuration === d ? 'active' : ''}`} onClick={() => { setLeaveDuration(d); if (d !== 'Full Day') { setToDate(null); } }}>
                        {d === 'Full Day' ? 'Full' : d === 'First Half' ? '1st Half' : '2nd Half'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category */}
              <div className="m-input-group">
                <label className="m-input-label">Category</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className={`m-chip ${leaveCategory === 'Paid' ? 'active' : ''}`} onClick={() => setLeaveCategory('Paid')}>
                    <CreditCard size={12} /> Paid
                  </button>
                  {stats?.canApplyUnpaidLeave && (
                    <button className={`m-chip ${leaveCategory === 'Unpaid' ? 'active' : ''}`} onClick={() => setLeaveCategory('Unpaid')}>
                      <AlertCircle size={12} /> Unpaid
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--m-muted)', marginTop: 4, fontWeight: 600 }}>
                  {leaveCategory === 'Paid' ? '* Deducted from paid leave balance' : '* Not deducted from paid leave balance'}
                </div>
              </div>

              {/* Reason */}
              <div className="m-input-group">
                <label className="m-input-label">Reason</label>
                <div className="m-input-wrap m-textarea-wrap">
                  <textarea placeholder="Explain the reason for your leave..." value={reason} onChange={e => setReason(e.target.value)} rows={3} />
                </div>
              </div>

              <button className="m-btn m-btn-primary m-btn-full" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <><div className="m-spinner" style={{width:18,height:18,borderWidth:2}} />Submitting...</> : <><Send size={18} />Submit Application</>}
              </button>
              <div style={{ height: 20 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
