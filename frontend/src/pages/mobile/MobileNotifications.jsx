import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCheck } from 'lucide-react';
import { useMobileAuth } from './context/MobileAuthContext';
import { format } from 'date-fns';

export default function MobileNotifications() {
  const { apiFetch } = useMobileAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch('/api/notifications/my');
      const json = await res.json();
      if (json.success) {
        setNotifications(json.notifications || []);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const markAllRead = async () => {
    try {
      const res = await apiFetch('/api/notifications/read-all', { method: 'PUT' });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch {}
  };

  useEffect(() => { fetchNotifications(); }, []);

  const getTypeColor = (type) => {
    if (type === 'Attendance') return 'var(--m-primary)';
    if (type === 'Leave') return 'var(--m-purple)';
    return 'var(--m-warning)';
  };

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Header */}
      <div className="mobile-page-header">
        <button className="mobile-header-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <span className="mobile-header-title">Notifications</span>
        {unreadCount > 0 && (
          <button className="mobile-header-action" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark Read
          </button>
        )}
      </div>

      {loading ? (
        <div className="m-loader"><div className="m-spinner" /></div>
      ) : (
        <div style={{ padding: '12px 16px' }}>
          {notifications.length === 0 ? (
            <div className="m-empty">
              <div className="m-empty-icon"><Bell size={36} /></div>
              <div className="m-empty-title">No Notifications</div>
              <div className="m-empty-sub">You're all caught up! Updates and approvals will appear here.</div>
            </div>
          ) : (
            notifications.map((n, i) => {
              const color = getTypeColor(n.type);
              return (
                <div key={i} style={{
                  padding: 16, borderRadius: 'var(--m-radius)', marginBottom: 10,
                  background: n.isRead ? 'var(--m-card)' : 'var(--m-elevated)',
                  border: `1px solid ${n.isRead ? 'var(--m-border)' : color + '40'}`,
                  boxShadow: 'var(--m-shadow-sm)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {!n.isRead && (
                    <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:color, borderRadius:'3px 0 0 3px' }} />
                  )}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:10, background:color+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Bell size={16} color={color} />
                      </div>
                      <span style={{ fontSize:14, fontWeight:800, color:'var(--m-text)' }}>{n.title}</span>
                    </div>
                    <span style={{ fontSize:11, color:'var(--m-muted)', fontWeight:600 }}>
                      {n.createdAt ? format(new Date(n.createdAt), 'dd MMM, HH:mm') : ''}
                    </span>
                  </div>
                  <p style={{ fontSize:13, color:'var(--m-muted)', margin:0, paddingLeft:42, lineHeight:1.5 }}>{n.message}</p>
                  {!n.isRead && <div style={{ position:'absolute', top:12, right:12, width:7, height:7, borderRadius:'50%', background:color }} />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
