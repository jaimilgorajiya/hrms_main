import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn, LogOut, Coffee, Clock, CheckCircle, XCircle,
  Bell, AlertTriangle, Zap, ChevronRight, RefreshCw,
  CalendarCheck, Umbrella, FileText, Sparkles, Moon,
  X, Utensils
} from 'lucide-react';
import { useMobileAuth } from './context/MobileAuthContext';
import { useMobileTheme } from './context/MobileThemeContext';

const ENDPOINTS = {
  stats: '/api/employee-dashboard/stats',
  today: '/api/attendance/today',
  togglePunch: '/api/attendance/toggle-punch',
  toggleBreak: '/api/attendance/toggle-break',
  notifications: '/api/notifications/my',
  historyBase: '/api/attendance/history',
};

const formatMs = (ms) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

/* ── Punch Ring SVG ── */
function PunchRing({ percent, elapsed, status, statusColor, onClick }) {
  const size = 200, stroke = 12, center = size / 2, radius = (size - stroke) / 2;
  const circum = 2 * Math.PI * radius;
  const offset = circum * (1 - Math.min(1, percent));

  return (
    <div onClick={onClick} className="m-ring-wrapper" style={{ cursor: 'pointer', position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
          <linearGradient id="ringGradBreak" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={radius} stroke="var(--m-border)" strokeWidth={stroke} fill="none" />
        <circle
          cx={center} cy={center} r={radius}
          stroke={status === 'BREAK' ? 'url(#ringGradBreak)' : 'url(#ringGrad)'}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circum}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.35s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontSize: 26, fontWeight: '800', color: 'var(--m-text)', fontFamily: 'monospace' }}>{elapsed}</span>
        <span style={{ fontSize: 11, fontWeight: '800', color: statusColor, marginTop: 4, letterSpacing: 0.5 }}>{status}</span>
      </div>
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ icon, label, value, sub, color, bg, onClick }) {
  return (
    <div className="m-stat-card" onClick={onClick} style={{
      background: 'var(--m-elevated)',
      borderRadius: 'var(--m-radius)',
      padding: '16px',
      border: '1px solid var(--m-border)',
      cursor: onClick ? 'pointer' : 'default',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      height: '100%',
      minHeight: 92,
      minWidth: 0,
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        {React.cloneElement(icon, { size: 20, color })}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: '800', color: 'var(--m-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value ?? '—'}
        </div>
        <div style={{ fontSize: 11, fontWeight: '600', color: 'var(--m-muted)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: 'var(--m-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function MobileDashboard() {
  const { apiFetch } = useMobileAuth();
  const { isDark } = useMobileTheme();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [punch, setPunch] = useState({ punchedIn: false, isOnBreak: false, isDone: false, startTime: null, breaks: [], punches: [] });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [missingPunches, setMissingPunches] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [percent, setPercent] = useState(0);
  const [breakElapsed, setBreakElapsed] = useState('00:00:00');
  const [productiveTime, setProductiveTime] = useState('00:00:00');
  const [showLocModal, setShowLocModal] = useState(false);
  const [pendingPunchType, setPendingPunchType] = useState(null);
  const [geofenceReason, setGeofenceReason] = useState('');
  const [reasonType, setReasonType] = useState(null);
  const [serverMessage, setServerMessage] = useState('');
  const [showShiftModal, setShowShiftModal] = useState(false);

  const timerRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getWorkMs = useCallback(() => {
    if (!data?.stats?.shiftStart || !data?.stats?.shiftEnd) return 9 * 3600000;
    const [sh, sm] = data.stats.shiftStart.split(':').map(Number);
    const [eh, em] = data.stats.shiftEnd.split(':').map(Number);
    let diff = (eh * 3600000 + em * 60000) - (sh * 3600000 + sm * 60000);
    if (diff < 0) diff += 86400000;
    return diff;
  }, [data]);

  /* Live timer */
  useEffect(() => {
    clearInterval(timerRef.current);
    const WORK = getWorkMs();
    if (punch.punchedIn && punch.startTime) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const start = new Date(punch.startTime).getTime();
        let totalBreakMs = 0;
        (punch.breaks || []).forEach(b => {
          if (b.start && b.end) totalBreakMs += new Date(b.end) - new Date(b.start);
          else if (b.start) totalBreakMs += now - new Date(b.start);
        });
        if (punch.isOnBreak) {
          const lb = punch.breaks[punch.breaks.length - 1];
          if (lb?.start) setBreakElapsed(formatMs(now - new Date(lb.start)));
        } else {
          const diff = Math.max(0, now - start);
          setElapsed(formatMs(diff));
          setPercent(diff / WORK);
          setProductiveTime(formatMs(Math.max(0, diff - totalBreakMs)));
        }
      }, 1000);
    } else if (punch.startTime && punch.isDone) {
      const start = new Date(punch.startTime).getTime();
      const lastOut = punch.punches?.filter(p => p.type === 'OUT').pop();
      const end = lastOut ? new Date(lastOut.time).getTime() : start;
      const diff = Math.max(0, end - start);
      let totalBreakMs = 0;
      (punch.breaks || []).forEach(b => {
        if (b.start && b.end) totalBreakMs += new Date(b.end) - new Date(b.start);
      });
      setElapsed(formatMs(diff));
      setPercent(diff / WORK);
      setProductiveTime(formatMs(Math.max(0, diff - totalBreakMs)));
    } else {
      setElapsed('00:00:00');
      setPercent(0);
      setProductiveTime('00:00:00');
    }
    return () => clearInterval(timerRef.current);
  }, [punch, getWorkMs]);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, todayRes, notifRes] = await Promise.all([
        apiFetch(ENDPOINTS.stats),
        apiFetch(ENDPOINTS.today),
        apiFetch(ENDPOINTS.notifications),
      ]);
      const [statsJson, todayJson, notifJson] = await Promise.all([
        statsRes.json(), todayRes.json(), notifRes.json(),
      ]);

      if (statsJson.success) setData(statsJson);

      if (todayJson.success) {
        const firstIn = todayJson.punches?.find(p => p.type === 'IN');
        const lastPunch = todayJson.punches?.[todayJson.punches.length - 1];
        let totalBreakMs = 0;
        (todayJson.breaks || []).forEach(b => {
          if (b.start && b.end) totalBreakMs += new Date(b.end) - new Date(b.start);
          else if (b.start) totalBreakMs += Date.now() - new Date(b.start);
        });
        const bh = Math.floor(totalBreakMs / 3600000);
        const bm = Math.floor((totalBreakMs % 3600000) / 60000);
        const bs = Math.floor((totalBreakMs % 60000) / 1000);
        setPunch({
          punchedIn: todayJson.isPunchedIn,
          isOnBreak: todayJson.isOnBreak,
          currentBreakType: todayJson.breaks?.find(b => !b.end)?.type || null,
          isDone: lastPunch?.type === 'OUT',
          startTime: firstIn?.time,
          breaks: todayJson.breaks || [],
          punches: todayJson.punches || [],
          breakDuration: `${String(bh).padStart(2,'0')}:${String(bm).padStart(2,'0')}:${String(bs).padStart(2,'0')}`,
          shiftStart: statsJson.stats?.shiftStart,
          shiftEnd: statsJson.stats?.shiftEnd,
        });
      }

      if (notifJson.success) {
        setNotifications(notifJson.notifications || []);
        setUnreadCount(notifJson.unreadCount || 0);
      }

      // Count missing punches this month
      const month = new Date().toISOString().slice(0, 7);
      const histRes = await apiFetch(`${ENDPOINTS.historyBase}?month=${month}`);
      const histJson = await histRes.json();
      if (histJson.success) {
        const today = new Date().toISOString().slice(0, 10);
        let missing = 0;
        (histJson.records || []).forEach(r => {
          if (r.date < today && r.punchIn && !r.punchOut) {
            const req = (histJson.requests || {})[r.date];
            if (!req || (req.status !== 'Pending' && req.status !== 'Approved')) missing++;
          }
        });
        setMissingPunches(missing);
      }
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFetch]);

  useEffect(() => { loadData(); }, []);

  const handlePunch = async (overrideReason = null) => {
    if (punch.isDone) return;
    setPunchLoading(true);
    try {
      // Get location
      let lat = null;
      let lng = null;
      try {
        if (navigator.geolocation) {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } else {
          console.warn('Geolocation is not supported or not available in this context (insecure origin)');
        }
      } catch (err) {
        console.warn('Location retrieval failed or timed out:', err);
      }

      const payload = {
        latitude: lat,
        longitude: lng,
        clientTime: new Date().toISOString(),
      };

      const actualReason = typeof overrideReason === 'string' ? overrideReason : null;
      if (actualReason) {
        if (reasonType === 'early') {
          payload.earlyReason = actualReason;
          payload.reason = actualReason;
        } else if (reasonType === 'late') {
          payload.lateReason = actualReason;
        } else {
          payload.geofenceReason = actualReason;
        }
      }

      const res = await apiFetch(ENDPOINTS.togglePunch, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        showToast(punch.punchedIn ? 'Punched Out successfully!' : 'Punched In successfully!');
        setShowLocModal(false);
        setGeofenceReason('');
        setReasonType(null);
        setServerMessage('');
        loadData();
      } else if (json.requireOutOfRangeReason) {
        setReasonType('geofence');
        setServerMessage(json.message);
        setShowLocModal(true);
        setPendingPunchType(punch.punchedIn ? 'OUT' : 'IN');
      } else if (json.requireLateReason) {
        setReasonType('late');
        setServerMessage(json.message);
        setShowLocModal(true);
        setPendingPunchType('IN');
      } else if (json.earlyOut && json.requireReason) {
        setReasonType('early');
        setServerMessage(json.message);
        setShowLocModal(true);
        setPendingPunchType('OUT');
      } else {
        showToast(json.message || 'Failed to punch', 'error');
      }
    } catch (e) {
      console.error('Punch Error:', e);
      showToast(e.message || 'Network error', 'error');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleGeofenceSubmit = (e) => {
    e.preventDefault();
    if (!geofenceReason.trim()) {
      showToast('Please enter a valid reason', 'error');
      return;
    }
    handlePunch(geofenceReason);
  };

  const handleBreak = async () => {
    if (!punch.punchedIn || punch.isDone) return;
    setBreakLoading(true);
    try {
      const res = await apiFetch(ENDPOINTS.toggleBreak, { method: 'POST', body: JSON.stringify({}) });
      const json = await res.json();
      if (json.success) {
        showToast(punch.isOnBreak ? 'Break ended!' : 'Break started!');
        loadData();
      } else {
        showToast(json.message || 'Failed', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setBreakLoading(false); }
  };

  const emp = data?.employee || {};
  const stats = data?.stats || {};

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const todayName = days[(new Date().getDay() + 6) % 7];
  const shift = emp.workSetup?.shift || null;
  const todaySchedule = shift?.schedule?.[todayName] || {};
  const shiftStart = todaySchedule?.shiftStart || stats.shiftStart || '09:30';
  const shiftEnd = todaySchedule?.shiftEnd || stats.shiftEnd || '18:30';
  const lunchStart = todaySchedule?.lunchStart || '13:00';
  const lunchEnd = todaySchedule?.lunchEnd || '14:00';
  const weekOffType = shift?.weekOffType || 'Selected Weekdays';
  const weekOffDays = shift?.weekOffDays || ['Sunday'];

  const ringStatus = punch.isDone
    ? 'DONE'
    : punch.isOnBreak
    ? (punch.currentBreakType?.toUpperCase() || 'ON BREAK')
    : punch.punchedIn
    ? 'WORKING'
    : 'NOT PUNCHED';

  const ringColor = punch.isDone
    ? 'var(--m-success)'
    : punch.isOnBreak
    ? 'var(--m-warning)'
    : punch.punchedIn
    ? 'var(--m-success)'
    : 'var(--m-muted)';

  if (loading) return (
    <div className="m-loader" style={{ height: '100vh' }}>
      <div className="m-spinner" />
      <span>Loading dashboard...</span>
    </div>
  );

  // Time-based Greeting Helper
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Toast */}
      {toast && (
        <div className="m-toast" style={{
          background: toast.type === 'error' ? 'var(--m-danger)' : 'var(--m-success)',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1b1c3a 0%, #111226 100%)',
        padding: '22px 20px 24px',
        margin: '12px 16px 20px',
        borderRadius: 24,
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative' }}>
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, color:'white', margin:0, letterSpacing:-0.5 }}>
              {getGreeting()}, {emp.firstName || emp.name?.split(' ')[0] || 'Employee'}
            </h2>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', margin:'4px 0 0', fontWeight: 500 }}>
              Let's have a productive day
            </p>
          </div>
          <div style={{ display:'flex', gap:10, alignItems: 'center' }}>
            <button
              onClick={() => navigate('/mobile/notifications')}
              style={{
                width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.08)',
                border:'1px solid rgba(255,255,255,0.12)', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
              }}
            >
              <Bell size={20} color="white" />
              {unreadCount > 0 && (
                <span style={{
                  position:'absolute', top:12, right:12,
                  width:8, height:8, borderRadius:'50%',
                  background:'var(--m-danger)',
                }} />
              )}
            </button>
            <div 
              onClick={() => navigate('/mobile/profile')}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.08)',
                color: 'white', fontWeight: 800, fontSize: 18,
                cursor: 'pointer'
              }}
            >
              {(emp.name || 'E')[0].toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Ring wrapper */}
      <div style={{ textAlign:'center', padding:'10px 20px 20px' }}>
        <div className="m-punch-ring-container" style={{ marginBottom: 30 }}>
          <PunchRing
            percent={percent}
            elapsed={punch.isOnBreak ? breakElapsed : elapsed}
            status={ringStatus}
            statusColor={ringColor}
            onClick={() => setShowDetails(p => !p)}
          />
        </div>

        {/* Details panel */}
        {showDetails && (
          <div style={{
            background:'var(--m-elevated)', borderRadius:'var(--m-radius)',
            padding:'14px 16px', marginBottom:16, textAlign:'left',
            animation:'slideUp 0.25s ease',
            border: '1px solid var(--m-border)',
            width: '90%', margin: '0 auto 20px'
          }}>
            <div className="m-detail-row">
              <span className="m-detail-label"><LogIn size={14} color="var(--m-success)" />Punch In</span>
              <span className="m-detail-value">
                {punch.startTime ? new Date(punch.startTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'}
              </span>
            </div>
            {punch.isDone && (
              <div className="m-detail-row">
                <span className="m-detail-label"><LogOut size={14} color="var(--m-danger)" />Punch Out</span>
                <span className="m-detail-value">
                  {punch.punches?.filter(p=>p.type==='OUT').pop()
                    ? new Date(punch.punches.filter(p=>p.type==='OUT').pop().time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
                    : '—'}
                </span>
              </div>
            )}
            <div className="m-detail-row">
              <span className="m-detail-label"><Sparkles size={14} color="var(--m-primary)" />Productive</span>
              <span className="m-detail-value" style={{ color:'var(--m-primary)', fontWeight:800 }}>{productiveTime}</span>
            </div>
            <div className="m-detail-row">
              <span className="m-detail-label"><Coffee size={14} color="var(--m-warning)" />Break</span>
              <span className="m-detail-value">{punch.breakDuration || '00:00:00'}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, padding: '0 16px', marginBottom: 20 }}>
          <button
            className="m-btn m-btn-full"
            onClick={handlePunch}
            disabled={punchLoading || punch.isDone}
            style={{
              flex: 1,
              borderRadius: 100,
              background: punch.isDone ? 'var(--m-elevated)' : punch.punchedIn ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'linear-gradient(135deg, #10B981, #059669)',
              color: 'white',
              boxShadow: punch.punchedIn ? '0 4px 14px rgba(239, 68, 68, 0.3)' : '0 4px 14px rgba(16, 185, 129, 0.3)'
            }}
          >
            {punchLoading ? <div className="m-spinner" style={{width:18,height:18,borderWidth:2}} /> :
              punch.isDone ? 'Done' :
              punch.punchedIn ? <><LogOut size={18} />Punch Out</> :
              <><LogIn size={18} />Punch In</>}
          </button>
          <button
            className="m-btn m-btn-full"
            onClick={handleBreak}
            disabled={breakLoading || !punch.punchedIn || punch.isDone}
            style={{
              flex: 1,
              borderRadius: 100,
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: 'white',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)'
            }}
          >
            {breakLoading ? <div className="m-spinner" style={{width:18,height:18,borderWidth:2}} /> :
              punch.isOnBreak ? 'End Break' :
              <><Coffee size={18} />Take Break</>}
          </button>
        </div>

        {/* View history */}
        <div style={{ padding: '0 16px', marginBottom: 20 }}>
          <button
            className="m-btn m-btn-full"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
              color: 'white',
              borderRadius: 100,
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)'
            }}
            onClick={() => navigate('/mobile/attendance')}
          >
            <Clock size={16} />
            View History
          </button>
        </div>

        {/* Clocked In Banner */}
        <div style={{
          margin: '0 16px',
          background: 'var(--m-elevated)',
          border: '1px solid var(--m-border)',
          borderRadius: 20,
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textAlign: 'left'
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'rgba(79, 70, 229, 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Sparkles size={16} color="var(--m-primary)" />
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--m-text)', fontWeight: 600, lineHeight: 1.5 }}>
            {punch.punchedIn 
              ? 'You are currently clocked in. Have a productive day!'
              : 'Remember to log your attendance when you arrive.'}
          </p>
        </div>
      </div>

      {/* Monthly Overview Section */}
      <div style={{ padding: '20px 16px 0' }}>
        <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--m-text)', marginBottom: 16, textAlign: 'left' }}>
          Monthly Overview
        </p>
        <div className="m-stat-grid">
          <StatCard
            icon={<CheckCircle />} label="Days Present" value={`${stats.presentDays ?? '0'}d`}
            sub="Attendance"
            color="var(--m-success)" bg="var(--m-success-light)"
            onClick={() => navigate('/mobile/attendance')}
          />
          <StatCard
            icon={<AlertTriangle />} label="Missing Out" value={missingPunches ?? '0'}
            sub="Punch Fix"
            color="var(--m-warning)" bg="var(--m-warning-light)"
            onClick={() => navigate('/mobile/attendance')}
          />
          <StatCard
            icon={<FileText />} label="This Month" value={`₹${stats.totalPenalty ?? '0'}`}
            sub="Total Penalty"
            color="var(--m-danger)" bg="var(--m-danger-light)"
            onClick={() => navigate('/mobile/penalties')}
          />
          <StatCard
            icon={<AlertTriangle />} label="Late In" value={`₹${punch.lateInPenalty ?? '0'}`}
            sub="Today's Penalty"
            color="var(--m-warning)" bg="var(--m-warning-light)"
            onClick={() => navigate('/mobile/penalties')}
          />
          <StatCard
            icon={<Moon />} label={shiftStart}
            value={stats.shiftName || 'General Shift'}
            sub="Today's Shift"
            color="var(--m-primary)" bg="var(--m-primary-light)"
            onClick={() => setShowShiftModal(true)}
          />
          <StatCard
            icon={<Sparkles />} label="Leaves Quota" value={stats.totalLeaves ?? '—'}
            sub="Annual"
            color="var(--m-success)" bg="var(--m-success-light)"
            onClick={() => navigate('/mobile/leaves')}
          />
          <StatCard
            icon={<LogOut />} label="Apply/Track" value="Process"
            sub="Resignation"
            color="var(--m-danger)" bg="var(--m-danger-light)"
            onClick={() => navigate('/mobile/resignation')}
          />
        </div>
      </div>

      {/* Today's Activity Section */}
      {punch.startTime && (
        <div style={{ padding: '20px 16px' }}>
          <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--m-text)', marginBottom: 16, textAlign: 'left' }}>
            Today's Activity
          </p>
          <div style={{
            background: 'var(--m-elevated)',
            border: '1px solid var(--m-border)',
            borderRadius: 24,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            {punch.punches.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: p.type === 'IN' ? 'var(--m-success)' : 'var(--m-danger)'
                }} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: '700', color: 'var(--m-text)' }}>
                    Punched {p.type === 'IN' ? 'In' : 'Out'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--m-muted)', marginTop: 2 }}>
                    {new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Geofence Reason Modal */}
      {showLocModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div className="m-card" style={{
            width: '100%',
            maxWidth: 380,
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            animation: 'scaleUp 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--m-warning-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={20} color="var(--m-warning)" />
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--m-text)' }}>
                {reasonType === 'early' ? 'Early Punch Out' : reasonType === 'late' ? 'Late Punch In' : 'Out of Office Range'}
              </h3>
            </div>
            
            <p style={{ fontSize: 14, color: 'var(--m-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
              {serverMessage || (reasonType === 'geofence' 
                ? `You are currently outside the designated branch geofence area. Please provide a reason to complete your punch ${pendingPunchType?.toLowerCase()}.`
                : `Please provide a reason to complete your punch ${pendingPunchType?.toLowerCase()}.`
              )}
            </p>

            <form onSubmit={handleGeofenceSubmit}>
              <textarea
                className="m-input"
                placeholder={reasonType === 'early' 
                  ? 'e.g. Completed work early, personal emergency, permission taken...'
                  : reasonType === 'late'
                  ? 'e.g. Traffic delays, personal emergency, client meeting...'
                  : 'e.g. Client visit, outdoor duty, working from home...'
                }
                value={geofenceReason}
                onChange={(e) => setGeofenceReason(e.target.value)}
                style={{
                  width: '100%',
                  height: 90,
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid var(--m-border)',
                  background: 'var(--m-elevated)',
                  color: 'var(--m-text)',
                  fontSize: 14,
                  resize: 'none',
                  outline: 'none',
                  marginBottom: 16,
                  boxSizing: 'border-box'
                }}
                required
              />

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="m-btn m-btn-ghost"
                  onClick={() => {
                    setShowLocModal(false);
                    setGeofenceReason('');
                    setReasonType(null);
                    setServerMessage('');
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="m-btn m-btn-primary"
                  style={{ flex: 1 }}
                >
                  Submit Punch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Detail Modal */}
      {showShiftModal && (
        <div 
          className="m-modal-overlay" 
          onClick={() => setShowShiftModal(false)}
          style={{ zIndex: 1000 }}
        >
          <div 
            className="m-bottom-sheet m-shift-sheet" 
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="m-bottom-sheet-handle m-shift-sheet-handle" />
            
            <div className="m-bottom-sheet-header m-shift-sheet-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Clock size={20} color="#ffffff" />
                </div>
                <div>
                  <div className="m-bottom-sheet-title m-shift-sheet-title">{stats.shiftName || 'General Shift'}</div>
                  <div className="m-shift-sheet-subtitle">Allocated timings and weekly rules</div>
                </div>
              </div>
              <button 
                className="m-shift-sheet-close"
                onClick={() => setShowShiftModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="m-bottom-sheet-body m-shift-sheet-body">
              {/* Card 1: Shift Start */}
              <div className="m-shift-detail-card">
                <div className="m-shift-card-left">
                  <div className="m-shift-card-icon-wrap">
                    <LogIn size={20} />
                  </div>
                  <div className="m-shift-card-info">
                    <span className="m-shift-card-label">Shift Start</span>
                    <span className="m-shift-card-value">{shiftStart}</span>
                  </div>
                </div>
                <span className="m-shift-badge inbound">Inbound</span>
              </div>

              {/* Card 2: Shift End */}
              <div className="m-shift-detail-card">
                <div className="m-shift-card-left">
                  <div className="m-shift-card-icon-wrap">
                    <LogOut size={20} />
                  </div>
                  <div className="m-shift-card-info">
                    <span className="m-shift-card-label">Shift End</span>
                    <span className="m-shift-card-value">{shiftEnd}</span>
                  </div>
                </div>
                <span className="m-shift-badge outbound">Outbound</span>
              </div>

              {/* Card 3: Lunch Break */}
              <div className="m-shift-detail-card">
                <div className="m-shift-card-left">
                  <div className="m-shift-card-icon-wrap">
                    <Utensils size={20} />
                  </div>
                  <div className="m-shift-card-info">
                    <span className="m-shift-card-label">Lunch Break</span>
                    <span className="m-shift-card-value">{lunchStart} - {lunchEnd}</span>
                  </div>
                </div>
                <span className="m-shift-badge lunch">Lunch</span>
              </div>

              {/* Card 4: Weekly Off Policy */}
              <div className="m-shift-detail-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="m-shift-card-info">
                    <span className="m-shift-card-label">Weekly Off Policy</span>
                  </div>
                  <span className="m-shift-badge off-policy">{weekOffType}</span>
                </div>
                <div className="m-shift-week-off-row">
                  {weekOffDays.map((day, idx) => (
                    <span key={idx} className="m-shift-week-off-pill">{day}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
