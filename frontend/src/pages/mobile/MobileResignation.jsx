import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, X, Calendar, Info } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useMobileAuth } from './context/MobileAuthContext';

export default function MobileResignation() {
  const { apiFetch } = useMobileAuth();
  const navigate = useNavigate();

  const [resignation, setResignation] = useState(null);
  const [noticePeriodDays, setNoticePeriodDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Form state
  const [reason, setReason] = useState('');
  const [lwd, setLwd] = useState('');
  const [lwdMin, setLwdMin] = useState('');

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null), 3000); };

  const fetchStatus = async () => {
    try {
      const res = await apiFetch('/api/resignation/my');
      const json = await res.json();
      if (json.success) {
        setResignation(json.resignation);
        const days = json.noticePeriodDays || 30;
        setNoticePeriodDays(days);
        const minDate = format(addDays(new Date(), days), 'yyyy-MM-dd');
        setLwdMin(minDate);
        if (!lwd) setLwd(minDate);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleSubmit = async () => {
    if (!reason.trim()) return showToast('Please provide a reason', 'error');
    if (!lwd) return showToast('Please select your last working day', 'error');
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/resignation/submit', {
        method: 'POST',
        body: JSON.stringify({ reason, lastWorkingDay: lwd }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Resignation submitted successfully');
        setShowConfirm(false);
        fetchStatus();
      } else {
        showToast(json.message || 'Failed to submit', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setSubmitting(false); }
  };

  const statusColors = { Pending: 'warning', Approved: 'success', Rejected: 'danger' };
  const expectedLwd = format(addDays(new Date(), noticePeriodDays), 'dd MMM yyyy');

  return (
    <div style={{ minHeight: '100%' }}>
      {toast && <div className="m-toast" style={{ background: toast.type==='error' ? 'var(--m-danger)' : 'var(--m-success)' }}>{toast.msg}</div>}

      <div className="mobile-page-header">
        <button className="mobile-header-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <span className="mobile-header-title">Resignation</span>
        <div />
      </div>

      {loading ? (
        <div className="m-loader"><div className="m-spinner" /></div>
      ) : (
        <div style={{ padding:'16px' }}>
          {resignation ? (
            /* Status card */
            <div className="m-card">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <span style={{ fontSize:16, fontWeight:900, color:'var(--m-text)' }}>Current Status</span>
                <span className={`m-badge ${statusColors[resignation.status] || 'warning'}`}>{resignation.status}</span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                <div style={{ background:'var(--m-elevated)', borderRadius:14, padding:'12px 14px' }}>
                  <div style={{ fontSize:10, fontWeight:800, color:'var(--m-muted)', textTransform:'uppercase', marginBottom:4 }}>Applied On</div>
                  <div style={{ fontSize:14, fontWeight:800, color:'var(--m-text)' }}>
                    {new Date(resignation.createdAt).toLocaleDateString('en-GB')}
                  </div>
                </div>
                <div style={{ background:'var(--m-elevated)', borderRadius:14, padding:'12px 14px' }}>
                  <div style={{ fontSize:10, fontWeight:800, color:'var(--m-muted)', textTransform:'uppercase', marginBottom:4 }}>
                    {resignation.status === 'Approved' ? 'Official LWD' : 'Requested LWD'}
                  </div>
                  <div style={{ fontSize:14, fontWeight:800, color:'var(--m-text)' }}>
                    {new Date(resignation.lastWorkingDay).toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>

              {resignation.status === 'Pending' && (
                <div className="m-info-banner warning" style={{ marginBottom:14 }}>
                  <Info size={14} style={{flexShrink:0}} />
                  <span>Policy-based LWD ({noticePeriodDays} days notice): <strong>{format(addDays(new Date(resignation.noticeDate || resignation.createdAt), noticePeriodDays), 'dd MMM yyyy')}</strong></span>
                </div>
              )}

              <div style={{ background:'var(--m-elevated)', borderRadius:14, padding:'12px 14px', marginBottom: resignation.comments ? 14 : 0 }}>
                <div style={{ fontSize:10, fontWeight:800, color:'var(--m-muted)', textTransform:'uppercase', marginBottom:6 }}>Reason</div>
                <div style={{ fontSize:14, color:'var(--m-text)', lineHeight:1.5 }}>{resignation.reason}</div>
              </div>

              {resignation.comments && (
                <div style={{ background:'var(--m-primary-light)', borderRadius:14, padding:'12px 14px', marginTop:14, border:'1px solid rgba(99,102,241,0.2)' }}>
                  <div style={{ fontSize:10, fontWeight:800, color:'var(--m-primary)', textTransform:'uppercase', marginBottom:6 }}>Admin Comments</div>
                  <div style={{ fontSize:14, color:'var(--m-primary)', lineHeight:1.5 }}>{resignation.comments}</div>
                </div>
              )}
            </div>
          ) : (
            /* Submit form */
            <div className="m-card">
              <div style={{ fontSize:16, fontWeight:900, color:'var(--m-text)', marginBottom:16 }}>Submit Resignation</div>

              <div className="m-input-group">
                <label className="m-input-label">Last Working Day</label>
                <div className="m-input-wrap">
                  <Calendar size={16} color="var(--m-primary)" />
                  <input type="date" value={lwd} min={lwdMin} onChange={e => setLwd(e.target.value)} />
                </div>
                <div style={{ fontSize:11, color:'var(--m-muted)', marginTop:6, fontWeight:600 }}>
                  <Info size={12} style={{verticalAlign:'middle'}} /> Policy-based minimum LWD: <strong style={{color:'var(--m-warning)'}}>{expectedLwd}</strong>
                </div>
              </div>

              <div className="m-input-group">
                <label className="m-input-label">Reason for Resignation</label>
                <div className="m-input-wrap m-textarea-wrap">
                  <textarea placeholder="Share your thoughts..." value={reason} onChange={e => setReason(e.target.value)} rows={5} />
                </div>
              </div>

              <div className="m-info-banner danger" style={{ marginBottom:20 }}>
                <Info size={14} style={{flexShrink:0}} />
                This action cannot be undone. Once submitted, it will be sent for HR approval.
              </div>

              <button className="m-btn m-btn-danger m-btn-full" onClick={() => setShowConfirm(true)}>
                <Send size={18} /> Submit Resignation
              </button>
            </div>
          )}

          <div className="m-info-banner info" style={{ marginTop:16 }}>
            <Info size={14} style={{flexShrink:0}} />
            Resignations are subject to approval. Notice period guidelines apply.
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="m-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="m-bottom-sheet" style={{ maxHeight:'auto' }} onClick={e => e.stopPropagation()}>
            <div className="m-bottom-sheet-handle" />
            <div style={{ padding:'24px 24px 32px', textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
              <div style={{ fontSize:18, fontWeight:900, color:'var(--m-text)', marginBottom:8 }}>Confirm Resignation</div>
              <div style={{ fontSize:14, color:'var(--m-muted)', marginBottom:24, lineHeight:1.6 }}>
                Are you sure you want to submit your resignation? This action cannot be undone.
              </div>
              <div style={{ display:'flex', gap:12 }}>
                <button className="m-btn m-btn-ghost m-btn-full" onClick={() => setShowConfirm(false)}>Cancel</button>
                <button className="m-btn m-btn-danger m-btn-full" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <div className="m-spinner" style={{width:18,height:18,borderWidth:2}} /> : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
