import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, TrendingDown, Clock } from 'lucide-react';
import { useMobileAuth } from './context/MobileAuthContext';

export default function MobilePenalties() {
  const { apiFetch } = useMobileAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/penalty-logs/my')
      .then(r => r.json())
      .then(json => { if (json.success) setLogs(json.logs || json.penalties || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getTypeLabel = (type) => {
    const map = { Late: '⏰ Late Arrival', EarlyDeparture: '🚪 Early Departure', Geofence: '📍 Geofence Breach' };
    return map[type] || type;
  };

  const getTypeColor = (type) => {
    if (type === 'Late') return 'var(--m-warning)';
    if (type === 'EarlyDeparture') return 'var(--m-danger)';
    return 'var(--m-purple)';
  };

  return (
    <div style={{ minHeight: '100%' }}>
      <div className="mobile-page-header">
        <button className="mobile-header-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <span className="mobile-header-title">Penalties & Deductions</span>
        <div />
      </div>

      {loading ? (
        <div className="m-loader"><div className="m-spinner" /></div>
      ) : (
        <div style={{ padding: '16px' }}>
          {logs.length === 0 ? (
            <div className="m-empty">
              <div className="m-empty-icon" style={{ background:'var(--m-success-light)' }}>
                <TrendingDown size={36} color="var(--m-success)" />
              </div>
              <div className="m-empty-title">Clean Record! 🎉</div>
              <div className="m-empty-sub">No penalties recorded. Keep up the great work!</div>
            </div>
          ) : (
            <>
              <div className="m-info-banner warning" style={{ marginBottom:16 }}>
                <AlertTriangle size={14} style={{flexShrink:0}} />
                {logs.length} penalty record{logs.length>1?'s':''} found
              </div>
              {logs.map((log, i) => {
                const color = getTypeColor(log.type);
                return (
                  <div key={i} className="m-list-item" style={{ flexDirection:'column', alignItems:'flex-start', gap:8, marginBottom:10, borderLeft:`3px solid ${color}` }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%' }}>
                      <span style={{ fontSize:13, fontWeight:800, color }}>{getTypeLabel(log.type)}</span>
                      <span style={{ fontSize:11, color:'var(--m-muted)', fontWeight:600 }}>
                        {log.date ? new Date(log.date+'T00:00:00').toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) : ''}
                      </span>
                    </div>
                    {log.minutesLate != null && (
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <Clock size={12} color="var(--m-muted)" />
                        <span style={{ fontSize:12, color:'var(--m-muted)', fontWeight:600 }}>Late by {log.minutesLate} min</span>
                      </div>
                    )}
                    {log.deduction != null && log.deduction > 0 && (
                      <span className="m-badge danger">₹{log.deduction.toFixed(2)} deducted</span>
                    )}
                    {log.penaltyType && (
                      <span style={{ fontSize:11, color:'var(--m-muted)', fontWeight:600 }}>{log.penaltyType}</span>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
