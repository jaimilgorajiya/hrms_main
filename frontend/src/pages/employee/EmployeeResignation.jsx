import React, { useState, useEffect } from 'react';
import { Calendar, FileText, Send, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import authenticatedFetch from '../../utils/apiHandler';
import API_URL from '../../config/api';
import Swal from 'sweetalert2';

const EmployeeResignation = () => {
  const [reason, setReason] = useState('');
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [resignation, setResignation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchResignationStatus();
  }, []);

  const fetchResignationStatus = async () => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/resignation/my`);
      const json = await res.json();
      if (json.success) setResignation(json.resignation);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason || !lastWorkingDay) {
      return Swal.fire('Error', 'Please fill all required fields', 'error');
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtoncolor: 'var(--text-secondary)',
      confirmButtonText: 'Yes, Submit Resignation'
    });

    if (result.isConfirmed) {
      setSubmitting(true);
      try {
        const res = await authenticatedFetch(`${API_URL}/api/resignation/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, lastWorkingDay })
        });
        const json = await res.json();
        if (json.success) {
          Swal.fire('Submitted!', 'Your resignation request has been sent for approval.', 'success');
          fetchResignationStatus();
        } else {
          Swal.fire('Error', json.message || 'Submission failed', 'error');
        }
      } catch {
        Swal.fire('Error', 'Network error', 'error');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const statusColors = {
    Pending: { color: 'var(--ep-accent-orange)', bg: 'rgba(245, 158, 11, 0.15)', icon: <Clock size={16} /> },
    Approved: { color: 'var(--ep-accent-green)', bg: 'rgba(16, 185, 129, 0.15)', icon: <CheckCircle size={16} /> },
    Rejected: { color: 'var(--ep-accent-red)', bg: 'rgba(239, 68, 68, 0.15)', icon: <XCircle size={16} /> },
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader"></div>
        <span>Loading resignation details...</span>
      </div>
    );
  }

  return (
    <div className="ep-page">
      <div className="ep-page-header">
        <div>
          <h2>Resignation</h2>
          <p>Initiate your resignation process or track your request status</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: resignation ? '1fr' : '1fr 350px', gap: '32px' }}>
        
        {/* Left Column: Form or Current Status */}
        <div>
          {resignation ? (
            <div className="ep-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--ep-text-main)' }}>Request Details</h3>
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '12px',
                  backgroundColor: statusColors[resignation.status]?.bg, color: statusColors[resignation.status]?.color,
                  fontWeight: '700', fontSize: '13px'
                }}>
                  {statusColors[resignation.status]?.icon}
                  {resignation.status}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div style={{ padding: '20px', background: 'var(--ep-surface-elevated)', borderRadius: '16px', border: '1px solid var(--ep-border)' }}>
                   <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '11px', color: 'var(--ep-text-muted)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>Applied On</div>
                   <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--ep-text-main)' }}>{new Date(resignation.createdAt).toLocaleDateString('en-IN')}</div>
                </div>
                <div style={{ padding: '20px', background: 'var(--ep-surface-elevated)', borderRadius: '16px', border: '1px solid var(--ep-border)' }}>
                   <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '11px', color: 'var(--ep-text-muted)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>Requested LWD</div>
                   <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--ep-text-main)' }}>{new Date(resignation.lastWorkingDay).toLocaleDateString('en-IN')}</div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                 <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '11px', color: 'var(--ep-text-muted)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Reason for Resignation</div>
                 <div style={{ padding: '20px', background: 'var(--ep-surface-elevated)', borderRadius: '16px', border: '1px solid var(--ep-border)', color: 'var(--ep-text-secondary)', lineHeight: '1.6', fontSize: '14px' }}>
                   {resignation.reason}
                 </div>
              </div>

              {resignation.comments && (
                <div style={{ marginTop: '24px', padding: '20px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                   <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '11px', color: 'var(--ep-accent-primary-hover)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Admin Comments</div>
                   <p style={{ margin: 0, fontSize: '14px', color: 'var(--ep-text-main)', fontWeight: '600' }}>{resignation.comments}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="ep-card">
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: '700', color: 'var(--ep-text-secondary)', marginBottom: '10px' }}>Notice Details</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ep-text-muted)' }} />
                    <input 
                      type="date"
                      value={lastWorkingDay}
                      onChange={e => setLastWorkingDay(e.target.value)}
                      style={{ width: '100%', padding: '14px 14px 14px 48px', background: 'var(--ep-surface-elevated)', border: '1px solid var(--ep-border)', color: 'var(--ep-text-main)', borderRadius: '14px', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--ep-text-muted)', marginTop: '8px' }}>Please select your preferred last working day based on your notice period.</p>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: '700', color: 'var(--ep-text-secondary)', marginBottom: '10px' }}>Reason for Resignation</label>
                  <textarea 
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Share your thoughts or future plans..."
                    style={{ width: '100%', padding: '16px', background: 'var(--ep-surface-elevated)', border: '1px solid var(--ep-border)', color: 'var(--ep-text-main)', borderRadius: '16px', outline: 'none', minHeight: '180px', fontSize: '14px', resize: 'none', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="ep-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '15px' }}
                >
                  <Send size={18} /> {submitting ? 'Submitting...' : 'Submit Resignation Request'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Information/Guide (Only show if not submitted) */}
        {!resignation && (
          <div>
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: '24px', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '24px', marginBottom: '24px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <AlertTriangle color="var(--ep-accent-orange)" size={22} />
                  <h4 style={{ margin: 0, fontFamily: 'Sora, sans-serif', color: 'var(--ep-accent-orange)', fontWeight: '800', fontSize: '15px' }}>Important Notice</h4>
               </div>
               <ul style={{ margin: 0, padding: '0 0 0 20px', color: 'var(--ep-text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                  <li style={{ marginBottom: '8px' }}>Resignations are subject to approval by the management.</li>
                  <li style={{ marginBottom: '8px' }}>Standard notice period of 30 days is applicable unless stated otherwise.</li>
                  <li style={{ marginBottom: '0' }}>You can only have one pending resignation request at a time.</li>
               </ul>
            </div>

            <div className="ep-card" style={{ padding: '24px' }}>
               <h4 style={{ margin: '0 0 16px', fontFamily: 'Sora, sans-serif', color: 'var(--ep-text-main)', fontWeight: '800', fontSize: '15px' }}>Next Steps</h4>
               <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--ep-accent-primary-hover)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>1</div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--ep-text-secondary)' }}>Submit your request through this panel.</p>
               </div>
               <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--ep-surface-elevated)', color: 'var(--ep-text-muted)', border: '1px solid var(--ep-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>2</div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--ep-text-secondary)' }}>Management will review and approve/reject your request.</p>
               </div>
               <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--ep-surface-elevated)', color: 'var(--ep-text-muted)', border: '1px solid var(--ep-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>3</div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--ep-text-secondary)' }}>Once approved, your LWD will be finalized and offboarding initiated.</p>
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EmployeeResignation;
