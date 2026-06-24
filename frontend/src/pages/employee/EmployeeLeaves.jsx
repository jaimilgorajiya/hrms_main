import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';
import authenticatedFetch from '../../utils/apiHandler';
import API_URL from '../../config/api';
import '../../styles/EmployeePanel.css';

const statusStyle = {
  Approved: { color: 'var(--ep-accent-green)', bg: 'rgba(16, 185, 129, 0.15)' },
  Rejected: { color: 'var(--ep-accent-red)',   bg: 'rgba(239, 68, 68, 0.15)' },
  Pending:  { color: 'var(--ep-accent-orange)', bg: 'rgba(245, 158, 11, 0.15)' },
};

const categoryStyle = {
  Paid:   { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  Unpaid: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
};

const durationLabel = {
  'Full Day':    'Full Day',
  'First Half':  '½ First Half',
  'Second Half': '½ Second Half',
};

const EmployeeLeaves = () => {
  const [showForm, setShowForm]       = useState(false);
  const [activeTab, setActiveTab]     = useState('balance');
  const [submitting, setSubmitting]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [leaveTypes, setLeaveTypes]   = useState([]);
  const [history, setHistory]         = useState([]);
  const [stats, setStats]             = useState(null);   // from employee-dashboard/stats

  const [form, setForm] = useState({
    leaveType: '',
    leaveCategory: 'Paid',
    leaveDuration: 'Full Day',
    fromDate: '',
    toDate: '',
    reason: '',
  });

  // ─── Fetch everything ────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, requestsRes, statsRes] = await Promise.all([
        authenticatedFetch(`${API_URL}/api/leave-types`),
        authenticatedFetch(`${API_URL}/api/requests/my-requests`),
        authenticatedFetch(`${API_URL}/api/employee-dashboard/stats`),
      ]);

      const [typesData, requestsData, statsData] = await Promise.all([
        typesRes.json(),
        requestsRes.json(),
        statsRes.json(),
      ]);

      if (typesData.success)    setLeaveTypes(typesData.leaveTypes || []);
      if (requestsData.success) setHistory((requestsData.requests || []).filter(r => r.requestType === 'Leave'));
      if (statsData.success)    setStats(statsData.stats || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Derived leave balance numbers ──────────────────────────────────────────
  const totalLeaves  = stats?.totalLeaves  ?? 0;
  const usedLeaves   = stats?.usedLeaves   ?? 0;    // approved + pending paid
  const remaining    = Math.max(0, totalLeaves - usedLeaves);
  const hasLeaveGroup = stats?.hasLeaveGroup ?? false;

  // ─── Half-day: force same from/to date ───────────────────────────────────────
  const isHalfDay = form.leaveDuration !== 'Full Day';

  const handleDurationChange = (val) => {
    setForm(f => ({
      ...f,
      leaveDuration: val,
      // When switching to half-day keep only fromDate and sync toDate
      toDate: val !== 'Full Day' ? f.fromDate : f.toDate,
    }));
  };

  const handleFromDateChange = (val) => {
    setForm(f => ({
      ...f,
      fromDate: val,
      toDate: isHalfDay ? val : f.toDate,   // lock toDate for half-day
    }));
  };

  // ─── Day count preview ────────────────────────────────────────────────────────
  const calcDays = () => {
    if (!form.fromDate || !form.toDate) return 0;
    if (isHalfDay) return 0.5;
    const diff = (new Date(form.toDate) - new Date(form.fromDate)) / (1000 * 60 * 60 * 24);
    return diff < 0 ? 0 : diff + 1;
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.leaveType || !form.fromDate || !form.toDate || !form.reason) {
      return Swal.fire({ title: 'Error', text: 'Please fill all required fields.', icon: 'error', confirmButtonColor: '#3b82f6' });
    }
    if (new Date(form.toDate) < new Date(form.fromDate)) {
      return Swal.fire({ title: 'Error', text: 'End date cannot be before start date.', icon: 'error', confirmButtonColor: '#3b82f6' });
    }

    setSubmitting(true);
    try {
      const res = await authenticatedFetch(`${API_URL}/api/requests/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'Leave',
          leaveType: form.leaveType,
          leaveCategory: form.leaveCategory,
          leaveDuration: form.leaveDuration,
          fromDate: form.fromDate,
          toDate: form.toDate,
          reason: form.reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ title: 'Applied!', text: 'Your leave request has been submitted.', icon: 'success', timer: 2000, showConfirmButton: false });
        setShowForm(false);
        setForm({ leaveType: '', leaveCategory: 'Paid', leaveDuration: 'Full Day', fromDate: '', toDate: '', reason: '' });
        fetchAll();
      } else {
        Swal.fire({ title: 'Error', text: data.message || 'Failed to submit request.', icon: 'error', confirmButtonColor: '#3b82f6' });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({ title: 'Error', text: 'Network error. Please try again.', icon: 'error', confirmButtonColor: '#3b82f6' });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="ep-page">
      <div className="ep-page-header">
        <div>
          <h2>My Leaves</h2>
          <p>Manage your leave balance and applications</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="ep-btn-outline" onClick={fetchAll} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className="ep-btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Apply Leave
          </button>
        </div>
      </div>

      {/* ── Apply Leave Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="ep-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ep-modal" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="ep-modal-header">
              <h3>Apply for Leave</h3>
              <button className="ep-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="ep-leave-form">

              {/* Leave Type */}
              <div className="ep-form-group">
                <label>Leave Type *</label>
                <select value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))} required>
                  <option value="">Select leave type</option>
                  {leaveTypes.map(lt => <option key={lt._id} value={lt._id}>{lt.name}</option>)}
                </select>
              </div>

              {/* Category + Duration */}
              <div className="ep-form-row">
                <div className="ep-form-group">
                  <label>Category</label>
                  <select value={form.leaveCategory} onChange={e => setForm(f => ({ ...f, leaveCategory: e.target.value }))}>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>
                <div className="ep-form-group">
                  <label>Duration</label>
                  <select value={form.leaveDuration} onChange={e => handleDurationChange(e.target.value)}>
                    <option value="Full Day">Full Day</option>
                    <option value="First Half">First Half</option>
                    <option value="Second Half">Second Half</option>
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="ep-form-row">
                <div className="ep-form-group">
                  <label>From Date *</label>
                  <input type="date" value={form.fromDate} onChange={e => handleFromDateChange(e.target.value)} required />
                </div>
                <div className="ep-form-group">
                  <label>To Date *</label>
                  <input
                    type="date"
                    value={form.toDate}
                    onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))}
                    min={form.fromDate}
                    disabled={isHalfDay}   // half-day is always a single date
                    required
                  />
                </div>
              </div>

              {/* Day count preview */}
              {form.fromDate && form.toDate && calcDays() > 0 && (
                <div className="ep-leave-days-preview">
                  <Calendar size={14} /> {calcDays()} day{calcDays() !== 1 ? 's' : ''} selected
                  {isHalfDay && <span style={{ marginLeft: '6px', opacity: 0.7 }}>({form.leaveDuration})</span>}
                </div>
              )}

              {/* Reason */}
              <div className="ep-form-group">
                <label>Reason *</label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  rows={3}
                  placeholder="Reason for leave..."
                  required
                />
              </div>

              <div className="ep-modal-actions">
                <button type="button" className="ep-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="ep-btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="ep-tabs">
        <button className={`ep-tab ${activeTab === 'balance' ? 'active' : ''}`} onClick={() => setActiveTab('balance')}>Leave Balance</button>
        <button className={`ep-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Leave History</button>
      </div>

      {/* ── Balance Tab ───────────────────────────────────────────────────── */}
      {activeTab === 'balance' && (
        loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <RefreshCw className="animate-spin" size={28} color="var(--ep-accent-blue)" />
          </div>
        ) : !hasLeaveGroup ? (
          <div className="ep-card" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={36} color="var(--ep-accent-orange)" style={{ marginBottom: '12px' }} />
            <p style={{ fontWeight: 700, color: 'var(--ep-text-secondary)' }}>No leave group assigned to your account yet. Please contact your admin.</p>
          </div>
        ) : (
          <div className="ep-leave-balance-grid">
            {/* Paid Leave summary card */}
            <div className="ep-leave-balance-card" style={{ borderTop: '4px solid #3b82f6' }}>
              <div className="ep-lb-header">
                <span className="ep-lb-type">Paid Leave</span>
                <span className="ep-lb-remaining" style={{ color: '#3b82f6' }}>{remaining} left</span>
              </div>
              <div className="ep-lb-bar">
                <div className="ep-lb-fill" style={{ width: totalLeaves > 0 ? `${Math.min(100, (usedLeaves / totalLeaves) * 100)}%` : '0%', background: '#3b82f6' }} />
              </div>
              <div className="ep-lb-meta">
                <span>Used: {usedLeaves}</span>
                <span>Total: {totalLeaves}</span>
              </div>
            </div>

            {/* Unpaid leaves used */}
            <div className="ep-leave-balance-card" style={{ borderTop: '4px solid #F59E0B' }}>
              <div className="ep-lb-header">
                <span className="ep-lb-type">Unpaid Leave</span>
                <span className="ep-lb-remaining" style={{ color: '#F59E0B' }}>Used: {stats?.usedUnpaidLeaves ?? 0}</span>
              </div>
              <div className="ep-lb-bar">
                <div className="ep-lb-fill" style={{ width: '0%', background: '#F59E0B' }} />
              </div>
              <div className="ep-lb-meta">
                <span>This cycle</span>
                <span>{stats?.usedUnpaidLeaves ?? 0} days</span>
              </div>
            </div>
          </div>
        )
      )}

      {/* ── History Tab ───────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <RefreshCw className="animate-spin" size={28} color="var(--ep-accent-blue)" />
          </div>
        ) : (
          <div className="ep-card">
            <div className="ep-table-wrap">
              {history.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--ep-text-muted)', fontWeight: 600 }}>
                  No leave requests found.
                </div>
              ) : (
                <table className="ep-table">
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Period</th>
                      <th>Duration</th>
                      <th>Days</th>
                      <th>Category</th>
                      <th>Reason</th>
                      <th>Applied On</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(row => {
                      const start  = new Date(row.fromDate);
                      const end    = new Date(row.toDate);
                      const diff   = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
                      const days   = row.leaveDuration === 'Full Day' ? diff : 0.5;
                      const sStyle = statusStyle[row.status] || statusStyle.Pending;
                      const cStyle = categoryStyle[row.leaveCategory] || categoryStyle.Paid;

                      return (
                        <tr key={row._id}>
                          <td style={{ fontWeight: 700 }}>{row.leaveType?.name || '—'}</td>
                          <td>
                            {row.fromDate === row.toDate
                              ? new Date(row.fromDate).toLocaleDateString('en-IN')
                              : `${new Date(row.fromDate).toLocaleDateString('en-IN')} – ${new Date(row.toDate).toLocaleDateString('en-IN')}`}
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'var(--ep-bg-card)', color: 'var(--ep-text-secondary)' }}>
                              {durationLabel[row.leaveDuration] || row.leaveDuration}
                            </span>
                          </td>
                          <td style={{ fontWeight: 800, textAlign: 'center' }}>{days}</td>
                          <td>
                            <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: cStyle.bg, color: cStyle.color }}>
                              {row.leaveCategory || 'Paid'}
                            </span>
                          </td>
                          <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.reason}</td>
                          <td>{new Date(row.appliedAt || row.createdAt).toLocaleDateString('en-IN')}</td>
                          <td>
                            <span className="ep-status-chip" style={{ background: sStyle.bg, color: sStyle.color }}>
                              {row.status === 'Approved' && <CheckCircle size={12} />}
                              {row.status === 'Rejected' && <XCircle size={12} />}
                              {row.status === 'Pending'  && <Clock size={12} />}
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )
      )}

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default EmployeeLeaves;
