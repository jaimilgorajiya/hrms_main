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
      cancelButtonColor: '#64748B',
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
      } catch (e) {
        Swal.fire('Error', 'Network error', 'error');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const statusColors = {
    Pending: { color: '#F59E0B', bg: '#FFF7ED', icon: <Clock size={20} /> },
    Approved: { color: '#10B981', bg: '#F0FDF4', icon: <CheckCircle size={20} /> },
    Rejected: { color: '#EF4444', bg: '#FEF2F2', icon: <XCircle size={20} /> },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px' }}>Resignation</h2>
        <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>Initiate your resignation process or track your request status</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: resignation ? '1fr' : '1fr 350px', gap: '32px' }}>
        
        {/* Left Column: Form or Current Status */}
        <div>
          {resignation ? (
            <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #E2E8F0', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Request Details</h3>
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '12px',
                  backgroundColor: statusColors[resignation.status].bg, color: statusColors[resignation.status].color,
                  fontWeight: '700', fontSize: '13px'
                }}>
                  {statusColors[resignation.status].icon}
                  {resignation.status}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #F1F5F9' }}>
                   <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Applied On</div>
                   <div style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B' }}>{new Date(resignation.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #F1F5F9' }}>
                   <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Requested LWD</div>
                   <div style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B' }}>{new Date(resignation.lastWorkingDay).toLocaleDateString()}</div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                 <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Reason for Resignation</div>
                 <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #F1F5F9', color: '#475569', lineHeight: '1.6', fontSize: '14px' }}>
                   {resignation.reason}
                 </div>
              </div>

              {resignation.comments && (
                <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#EFF6FF', borderRadius: '16px', border: '1px solid #DBEAFE' }}>
                   <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Admin Comments</div>
                   <p style={{ margin: 0, fontSize: '14px', color: '#1E40AF', fontWeight: '500' }}>{resignation.comments}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #E2E8F0', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#1E293B', marginBottom: '10px' }}>Notice Details</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input 
                      type="date"
                      value={lastWorkingDay}
                      onChange={e => setLastWorkingDay(e.target.value)}
                      style={{ width: '100%', padding: '14px 14px 14px 48px', border: '1.5px solid #E2E8F0', borderRadius: '14px', outline: 'none', fontSize: '14px' }}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748B', marginTop: '8px' }}>Please select your preferred last working day based on your notice period.</p>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: '#1E293B', marginBottom: '10px' }}>Reason for Resignation</label>
                  <textarea 
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Share your thoughts or future plans..."
                    style={{ width: '100%', padding: '16px', border: '1.5px solid #E2E8F0', borderRadius: '16px', outline: 'none', minHeight: '180px', fontSize: '14px', resize: 'none' }}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{ 
                    width: '100%', padding: '16px', borderRadius: '16px', border: 'none', 
                    background: '#EF4444', color: '#fff', fontWeight: '800', fontSize: '16px', 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    transition: 'all 0.2s', opacity: submitting ? 0.7 : 1
                  }}
                >
                  <Send size={20} /> {submitting ? 'Submitting...' : 'Submit Resignation Request'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Information/Guide (Only show if not submitted) */}
        {!resignation && (
          <div>
            <div style={{ background: '#FFFBEB', borderRadius: '24px', border: '1px solid #FEF3C7', padding: '24px', marginBottom: '24px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <AlertTriangle color="#D97706" size={24} />
                  <h4 style={{ margin: 0, color: '#92400E', fontWeight: '800' }}>Important Notice</h4>
               </div>
               <ul style={{ margin: 0, padding: '0 0 0 20px', color: '#B45309', fontSize: '13px', lineHeight: '1.6' }}>
                  <li style={{ marginBottom: '8px' }}>Resignations are subject to approval by the management.</li>
                  <li style={{ marginBottom: '8px' }}>Standard notice period of 30 days is applicable unless stated otherwise.</li>
                  <li style={{ marginBottom: '0' }}>You can only have one pending resignation request at a time.</li>
               </ul>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: '24px', border: '1px solid #E2E8F0', padding: '24px' }}>
               <h4 style={{ margin: '0 0 16px', color: '#1E293B', fontWeight: '800' }}>Next Steps</h4>
               <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>1</div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>Submit your request through this panel.</p>
               </div>
               <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#E2E8F0', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>2</div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>Management will review and approve/reject your request.</p>
               </div>
               <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#E2E8F0', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', flexShrink: 0 }}>3</div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>Once approved, your LWD will be finalized and offboarding initiated.</p>
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EmployeeResignation;
