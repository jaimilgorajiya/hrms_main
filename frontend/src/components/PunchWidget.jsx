import { useState, useEffect, useCallback, useRef } from 'react';
import { LogIn, LogOut, Coffee, Zap } from 'lucide-react';
import Swal from 'sweetalert2';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';

const fmt = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 80;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * R;

const SmoothRing = ({ progress, color }) => {
  const filled = Math.min(progress, 1) * CIRCUMFERENCE;
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke="#EEF2FF"
        strokeWidth={STROKE}
      />
      {/* Progress arc */}
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
        strokeDashoffset={0}
        transform={`rotate(-90 ${CX} ${CY})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      {/* Tip dot */}
      {progress > 0.01 && (
        <circle
          cx={CX + R * Math.cos((progress * 360 - 90) * (Math.PI / 180))}
          cy={CY + R * Math.sin((progress * 360 - 90) * (Math.PI / 180))}
          r={STROKE / 2}
          fill={color}
        />
      )}
    </svg>
  );
};

const PunchWidget = () => {
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date());
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (todayData?.isPunchedIn) {
      if (todayData?.isOnBreak) {
        const punches = todayData.punches || [];
        const breaks = todayData.breaks || [];
        let workedMs = 0;
        const sorted = [...punches].sort((a, b) => new Date(a.time) - new Date(b.time));
        for (let i = 0; i < sorted.length - 1; i += 2) {
          if (sorted[i].type === 'IN' && sorted[i+1]?.type === 'OUT')
            workedMs += new Date(sorted[i+1].time) - new Date(sorted[i].time);
        }
        const lastIn = [...sorted].reverse().find(p => p.type === 'IN');
        const currentBreak = [...breaks].reverse().find(b => !b.end);
        if (lastIn && currentBreak) workedMs += new Date(currentBreak.start) - new Date(lastIn.time);
        breaks.forEach(b => { if (b.end) workedMs -= new Date(b.end) - new Date(b.start); });
        setElapsed(Math.max(0, Math.floor(workedMs / 1000)));
      } else {
        const punches = todayData.punches || [];
        const breaks = todayData.breaks || [];
        let workedMs = 0;
        const sorted = [...punches].sort((a, b) => new Date(a.time) - new Date(b.time));
        for (let i = 0; i < sorted.length - 1; i += 2) {
          if (sorted[i].type === 'IN' && sorted[i+1]?.type === 'OUT')
            workedMs += new Date(sorted[i+1].time) - new Date(sorted[i].time);
        }
        const lastIn = [...sorted].reverse().find(p => p.type === 'IN');
        if (lastIn) workedMs += Date.now() - new Date(lastIn.time);
        breaks.forEach(b => {
          const start = new Date(b.start);
          const end = b.end ? new Date(b.end) : new Date();
          workedMs -= end - start;
        });
        const base = Math.max(0, Math.floor(workedMs / 1000));
        setElapsed(base);
        timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      }
    } else {
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [todayData]);

  const fetchToday = useCallback(async () => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/attendance/today`);
      const json = await res.json();
      if (json.success) setTodayData(json);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handlePunch = async () => {
    const action = todayData?.isPunchedIn ? 'OUT' : 'IN';
    const { isConfirmed } = await Swal.fire({
      title: `Punch ${action}?`,
      text: liveTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      icon: 'question', showCancelButton: true,
      confirmButtonColor: action === 'IN' ? '#10B981' : '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: `Punch ${action}`,
    });
    if (!isConfirmed) return;

    setActionLoading(true);
    try {
      // First attempt — no reason
      const res = await authenticatedFetch(`${API_URL}/api/attendance/toggle-punch`, { method: 'POST' });
      const json = await res.json();

      if (json.success) {
        await fetchToday();
        Swal.fire({ title: json.message, icon: 'success', timer: 1200, showConfirmButton: false });
        return;
      }

      // Early-out blocked — needs reason or is hard-blocked
      if (json.earlyOut) {
        if (json.requireReason) {
          const { value: reason, isConfirmed: reasonConfirmed } = await Swal.fire({
            title: 'Early Punch Out',
            html: `<p style="color:#64748B;margin-bottom:12px">You are punching out <b>${json.earlyByMins} min</b> early. Please provide a reason.</p>`,
            input: 'textarea',
            inputPlaceholder: 'Enter reason for early punch out...',
            inputAttributes: { rows: 3 },
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            confirmButtonText: 'Submit & Punch Out',
            inputValidator: (v) => !v?.trim() && 'Reason is required',
          });
          if (!reasonConfirmed || !reason?.trim()) return;

          // Retry with reason
          const res2 = await authenticatedFetch(`${API_URL}/api/attendance/toggle-punch`, {
            method: 'POST',
            body: JSON.stringify({ reason: reason.trim() }),
          });
          const json2 = await res2.json();
          if (json2.success) {
            await fetchToday();
            Swal.fire({ title: json2.message, icon: 'success', timer: 1200, showConfirmButton: false });
          } else {
            Swal.fire({ title: 'Blocked', text: json2.message, icon: 'error', confirmButtonColor: '#2563EB' });
          }
        } else {
          // Hard blocked — too early, no reason option
          Swal.fire({
            title: 'Early Punch Out Not Allowed',
            html: `You are <b>${json.earlyByMins} min</b> early.<br>Maximum allowed early out is <b>${json.maxAllowedMins} min</b>.`,
            icon: 'warning',
            confirmButtonColor: '#2563EB',
          });
        }
        return;
      }

      Swal.fire({ title: 'Error', text: json.message, icon: 'error', confirmButtonColor: '#2563EB' });
    } catch { Swal.fire({ title: 'Error', text: 'Server error', icon: 'error' }); }
    finally { setActionLoading(false); }
  };

  const handleBreak = async () => {
    setActionLoading(true);
    try {
      const res = await authenticatedFetch(`${API_URL}/api/attendance/toggle-break`, {
        method: 'POST', body: JSON.stringify({ breakType: 'General' }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchToday();
        Swal.fire({ title: todayData?.isOnBreak ? 'Break Ended' : 'Break Started', icon: 'success', timer: 1000, showConfirmButton: false });
      }
    } catch { /* silent */ }
    finally { setActionLoading(false); }
  };

  const isPunchedIn = todayData?.isPunchedIn;
  const isOnBreak = todayData?.isOnBreak;
  const firstIn = todayData?.punches?.find(p => p.type === 'IN');
  const punchInTime = firstIn
    ? new Date(firstIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : null;
  const breakCount = todayData?.breaks?.filter(b => b.end).length || 0;
  const shiftSecs = (todayData?.shiftDurationMinutes || 480) * 60;
  const progress = Math.min(elapsed / shiftSecs, 1);
  const shiftHours = Math.round((todayData?.shiftDurationMinutes || 480) / 60);

  const theme = isOnBreak
    ? { ring: '#F59E0B', glow: '#F59E0B', label: 'On Break',       labelBg: '#FFFBEB', labelColor: '#D97706' }
    : isPunchedIn
    ? { ring: '#10B981', glow: '#10B981', label: 'Working',         labelBg: '#ECFDF5', labelColor: '#059669' }
    : { ring: '#2563EB', glow: '#2563EB', label: 'Not Punched In',  labelBg: '#EFF6FF', labelColor: '#2563EB' };

  return (
    <div className="pw-card-v2">
      {/* Header */}
      <div className="pw-v2-header">
        <div className="pw-v2-time-block">
          <span className="pw-v2-time">
            {liveTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </span>
          <span className="pw-v2-date">
            {liveTime.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="pw-v2-badge" style={{ background: theme.labelBg, color: theme.labelColor }}>
          <span className="pw-v2-badge-dot" style={{ background: theme.labelColor }} />
          {loading ? '—' : theme.label}
        </div>
      </div>

      {/* Ring */}
      <div className="pw-v2-ring-area">
        <div className="pw-v2-ring-wrap">
          <SmoothRing progress={progress} color={theme.ring} />
          <div className="pw-v2-ring-center">
            <span className="pw-v2-elapsed" style={{ color: theme.ring }}>{fmt(elapsed)}</span>
          </div>
        </div>
        {punchInTime
          ? <span className="pw-v2-in-label">Punch In Time : {punchInTime}</span>
          : <span className="pw-v2-in-label">not started</span>
        }

        {/* Stats row below ring */}
        <div className="pw-v2-stats">
          <div className="pw-v2-stat">
            <span className="pw-v2-stat-val">{Math.floor(elapsed / 3600)}h {Math.floor((elapsed % 3600) / 60)}m</span>
            <span className="pw-v2-stat-lbl">Worked</span>
          </div>
          <div className="pw-v2-stat-divider" />
          <div className="pw-v2-stat">
            <span className="pw-v2-stat-val">{breakCount}</span>
            <span className="pw-v2-stat-lbl">Breaks</span>
          </div>
          <div className="pw-v2-stat-divider" />
          <div className="pw-v2-stat">
            {(() => {
              const remainSecs = Math.max(shiftSecs - elapsed, 0);
              const rh = Math.floor(remainSecs / 3600);
              const rm = Math.floor((remainSecs % 3600) / 60);
              return <>
                <span className="pw-v2-stat-val">{Math.floor(elapsed/3600)}h {Math.floor((elapsed%3600)/60)}m / {shiftHours}h</span>
                <span className="pw-v2-stat-lbl">{remainSecs > 0 ? `${rh}h ${rm}m left` : 'Shift complete'}</span>
              </>;
            })()}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="pw-v2-actions">
        <button
          className={`pw-v2-btn primary ${isPunchedIn ? 'out' : 'in'}`}
          onClick={handlePunch}
          disabled={actionLoading || loading}
        >
          {isPunchedIn ? <LogOut size={15} /> : <LogIn size={15} />}
          {actionLoading ? 'Processing...' : isPunchedIn ? 'Punch Out' : 'Punch In'}
        </button>
        {isPunchedIn && (
          <button
            className={`pw-v2-btn secondary ${isOnBreak ? 'end' : 'start'}`}
            onClick={handleBreak}
            disabled={actionLoading}
          >
            <Coffee size={14} />
            {isOnBreak ? 'End Break' : 'Take Break'}
          </button>
        )}
      </div>

      {/* Decorative orb */}
      <div className="pw-v2-orb" style={{ background: theme.ring }} />
    </div>
  );
};

export default PunchWidget;
