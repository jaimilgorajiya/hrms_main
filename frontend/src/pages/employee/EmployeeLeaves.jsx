import React, { useState } from 'react';
import { Calendar, Plus, CheckCircle, XCircle, Clock, ChevronDown } from 'lucide-react';
import Swal from 'sweetalert2';
import '../../styles/EmployeePanel.css';

const mockLeaveBalance = [
  { type: 'Casual Leave', total: 12, used: 4, color: '#2563EB' },
  { type: 'Sick Leave', total: 8, used: 2, color: '#10B981' },
  { type: 'Earned Leave', total: 15, used: 6, color: '#8B5CF6' },
  { type: 'Compensatory Off', total: 3, used: 1, color: '#F59E0B' },
];

const mockHistory = [
  { id: 1, type: 'Casual Leave', from: '2026-03-10', to: '2026-03-11', days: 2, reason: 'Personal work', status: 'Approved', appliedOn: '2026-03-08' },
  { id: 2, type: 'Sick Leave', from: '2026-02-20', to: '2026-02-20', days: 1, reason: 'Fever', status: 'Approved', appliedOn: '2026-02-20' },
  { id: 3, type: 'Earned Leave', from: '2026-01-15', to: '2026-01-17', days: 3, reason: 'Family function', status: 'Rejected', appliedOn: '2026-01-10' },
  { id: 4, type: 'Casual Leave', from: '2026-03-25', to: '2026-03-26', days: 2, reason: 'Travel', status: 'Pending', appliedOn: '2026-03-18' },
];

const statusStyle = {
  Approved: { color: '#10B981', bg: '#ECFDF5' },
  Rejected: { color: '#EF4444', bg: '#FEF2F2' },
  Pending: { color: '#F59E0B', bg: '#FFFBEB' },
};

const EmployeeLeaves = () => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: '', from: '', to: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('balance');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.type || !form.from || !form.to || !form.reason) {
      return Swal.fire({ title: 'Error', text: 'Please fill all fields.', icon: 'error', confirmButtonColor: '#2563EB' });
    }
    if (new Date(form.to) < new Date(form.from)) {
      return Swal.fire({ title: 'Error', text: 'End date cannot be before start date.', icon: 'error', confirmButtonColor: '#2563EB' });
    }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    setShowForm(false);
    setForm({ type: '', from: '', to: '', reason: '' });
    Swal.fire({ title: 'Applied!', text: 'Your leave request has been submitted.', icon: 'success', timer: 2000, showConfirmButton: false });
  };

  const calcDays = () => {
    if (!form.from || !form.to) return 0;
    const diff = (new Date(form.to) - new Date(form.from)) / (1000 * 60 * 60 * 24);
    return diff < 0 ? 0 : diff + 1;
  };

  return (
    <div className="ep-page">
      <div className="ep-page-header">
        <div>
          <h2>My Leaves</h2>
          <p>Manage your leave balance and applications</p>
        </div>
        <button className="ep-btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Apply Leave
        </button>
      </div>

      {/* Apply Leave Modal */}
      {showForm && (
        <div className="ep-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ep-modal" onClick={e => e.stopPropagation()}>
            <div className="ep-modal-header">
              <h3>Apply for Leave</h3>
              <button className="ep-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="ep-leave-form">
              <div className="ep-form-group">
                <label>Leave Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} required>
                  <option value="">Select leave type</option>
                  {mockLeaveBalance.map(l => <option key={l.type} value={l.type}>{l.type}</option>)}
                </select>
              </div>
              <div className="ep-form-row">
                <div className="ep-form-group">
                  <label>From Date</label>
                  <input type="date" value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} required />
                </div>
                <div className="ep-form-group">
                  <label>To Date</label>
                  <input type="date" value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} required />
                </div>
              </div>
              {form.from && form.to && calcDays() > 0 && (
                <div className="ep-leave-days-preview">
                  <Calendar size={14} /> {calcDays()} day{calcDays() > 1 ? 's' : ''} selected
                </div>
              )}
              <div className="ep-form-group">
                <label>Reason</label>
                <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} placeholder="Reason for leave..." required />
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

      {/* Tabs */}
      <div className="ep-tabs">
        <button className={`ep-tab ${activeTab === 'balance' ? 'active' : ''}`} onClick={() => setActiveTab('balance')}>Leave Balance</button>
        <button className={`ep-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Leave History</button>
      </div>

      {activeTab === 'balance' && (
        <div className="ep-leave-balance-grid">
          {mockLeaveBalance.map((lb, i) => {
            const remaining = lb.total - lb.used;
            const pct = (lb.used / lb.total) * 100;
            return (
              <div key={i} className="ep-leave-balance-card" style={{ borderTop: `4px solid ${lb.color}` }}>
                <div className="ep-lb-header">
                  <span className="ep-lb-type">{lb.type}</span>
                  <span className="ep-lb-remaining" style={{ color: lb.color }}>{remaining} left</span>
                </div>
                <div className="ep-lb-bar">
                  <div className="ep-lb-fill" style={{ width: `${pct}%`, background: lb.color }}></div>
                </div>
                <div className="ep-lb-meta">
                  <span>Used: {lb.used}</span>
                  <span>Total: {lb.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="ep-card">
          <div className="ep-table-wrap">
            <table className="ep-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Applied On</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mockHistory.map(row => (
                  <tr key={row.id}>
                    <td>{row.type}</td>
                    <td>{new Date(row.from).toLocaleDateString('en-IN')}</td>
                    <td>{new Date(row.to).toLocaleDateString('en-IN')}</td>
                    <td>{row.days}</td>
                    <td>{row.reason}</td>
                    <td>{new Date(row.appliedOn).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className="ep-status-chip" style={{ background: statusStyle[row.status]?.bg, color: statusStyle[row.status]?.color }}>
                        {row.status === 'Approved' && <CheckCircle size={12} />}
                        {row.status === 'Rejected' && <XCircle size={12} />}
                        {row.status === 'Pending' && <Clock size={12} />}
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLeaves;
