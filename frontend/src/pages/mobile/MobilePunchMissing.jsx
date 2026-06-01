import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, X, LogIn, LogOut, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useMobileAuth } from './context/MobileAuthContext';

export default function MobilePunchMissing() {
  const { apiFetch } = useMobileAuth();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [requests, setRequests] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState(null);
  const [manualOut, setManualOut] = useState('18:00');
  const [workSummary, setWorkSummary] = useState('');
  const [reason, setReason] = useState('');

  const showToast = (msg, type='success') => { setToast({msg, type}); setTimeout(()=>setToast(null), 3000); };

  useEffect(() => {
    const month = format(new Date(), 'yyyy-MM');
    apiFetch(`/api/attendance/history?month=${month}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const today = format(new Date(), 'yyyy-MM-dd');
          const missing = (json.records || []).filter(r => r.punchIn && !r.punchOut && r.date < today);
          setRecords(missing);
          setRequests(json.requests || {});
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!selected) return;
    if (!workSummary.trim()) return showToast('Work report required', 'error');
    if (!reason.trim()) return showToast('Reason required', 'error');

    setSubmitting(true);
    try {
      const payload = {
        requestType: 'Attendance Correction',
        date: selected.date,
        reason,
        workSummary,
        manualIn: new Date(`${selected.date}T${selected.punchIn || '09:00'}:00`),
        manualOut: new Date(`${selected.date}T${manualOut}:00`),
      };
      const res = await apiFetch('/api/requests/submit', { method:'POST', body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) {
        showToast('Correction request submitted!');
        setSelected(null); setReason(''); setWorkSummary('');
        setRecords(prev => prev.filter(r => r.date !== selected.date));
      } else {
        showToast(json.message || 'Failed', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ minHeight: '100%' }}>
      {toast && <div className="m-toast" style={{ background: toast.type==='error' ? 'var(--m-danger)' : 'var(--m-success)' }}>{toast.msg}</div>}

      <div className="mobile-page-header">
        <button className="mobile-header-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <span className="mobile-header-title">Missing Punch Fix</span>
        <div />
      </div>

      {loading ? (
        <div className="m-loader"><div className="m-spinner" /></div>
      ) : records.length === 0 ? (
        <div className="m-empty">
          <div className="m-empty-icon" style={{ background:'var(--m-success-light)' }}>
            <AlertTriangle size={36} color="var(--m-success)" />
          </div>
          <div className="m-empty-title">All Clear! 🎉</div>
          <div className="m-empty-sub">No missing punch-outs found for this month.</div>
        </div>
      ) : (
        <div style={{ padding:'16px' }}>
          <div className="m-info-banner warning" style={{ marginBottom:16 }}>
            <AlertTriangle size={14} style={{flexShrink:0}} />
            {records.length} day{records.length>1?'s':''} with missing punch-out found
          </div>

          {records.map(r => {
            const req = requests[r.date];
            const hasPendingReq = req && (req.status === 'Pending' || req.status === 'Approved');
            return (
              <div
                key={r.date}
                className="m-list-item"
                style={{
                  flexDirection:'column', alignItems:'flex-start', gap:10, marginBottom:10,
                  border: selected?.date === r.date ? '2px solid var(--m-primary)' : '1px solid var(--m-border)',
                  cursor:'pointer',
                }}
                onClick={() => !hasPendingReq && setSelected(r)}
              >
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%' }}>
                  <span style={{ fontSize:14, fontWeight:800, color:'var(--m-text)' }}>
                    {format(new Date(r.date+'T00:00:00'), 'dd MMM yyyy')} ({format(new Date(r.date+'T00:00:00'), 'EEEE')})
                  </span>
                  {hasPendingReq
                    ? <span className={`m-badge ${req.status==='Approved'?'success':'warning'}`}>{req.status}</span>
                    : <span className="m-badge danger">Missing</span>
                  }
                </div>
                <div style={{ display:'flex', gap:16 }}>
                  <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--m-success)', fontWeight:700 }}>
                    <LogIn size={13} /> In: {r.punchIn || '—'}
                  </span>
                  <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--m-danger)', fontWeight:700 }}>
                    <LogOut size={13} /> Out: —
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Request Modal */}
      {selected && (
        <div className="m-modal-overlay" onClick={e => e.target===e.currentTarget && setSelected(null)}>
          <div className="m-bottom-sheet">
            <div className="m-bottom-sheet-handle" />
            <div className="m-bottom-sheet-header">
              <span className="m-bottom-sheet-title">Punch Correction</span>
              <button className="m-bottom-sheet-close" onClick={() => setSelected(null)}><X size={16} /></button>
            </div>
            <div className="m-bottom-sheet-body">
              <div className="m-info-banner info" style={{ marginBottom:14 }}>
                📅 {format(new Date(selected.date+'T00:00:00'), 'dd MMMM yyyy (EEEE)')}
              </div>
              <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                <div style={{ flex:1, padding:'10px 14px', background:'var(--m-success-light)', borderRadius:12, border:'1px solid rgba(16,185,129,0.2)' }}>
                  <div style={{ fontSize:10, fontWeight:800, color:'var(--m-success)', textTransform:'uppercase', marginBottom:2 }}>Punch In</div>
                  <div style={{ fontSize:16, fontWeight:900, color:'var(--m-success)' }}>{selected.punchIn || '—'}</div>
                </div>
                <div style={{ flex:1 }}>
                  <label className="m-input-label">Punch Out</label>
                  <div className="m-input-wrap">
                    <LogOut size={16} color="var(--m-danger)" />
                    <input type="time" value={manualOut} onChange={e => setManualOut(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="m-input-group">
                <label className="m-input-label">Work Report *</label>
                <div className="m-input-wrap m-textarea-wrap">
                  <textarea placeholder="Describe what you worked on..." value={workSummary} onChange={e => setWorkSummary(e.target.value)} rows={3} />
                </div>
              </div>
              <div className="m-input-group">
                <label className="m-input-label">Reason *</label>
                <div className="m-input-wrap m-textarea-wrap">
                  <textarea placeholder="Why did you miss punch out?" value={reason} onChange={e => setReason(e.target.value)} rows={2} />
                </div>
              </div>
              <button className="m-btn m-btn-primary m-btn-full" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <><div className="m-spinner" style={{width:18,height:18,borderWidth:2}} />Submitting...</> : <><Send size={18} />Submit Request</>}
              </button>
              <div style={{height:20}} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
