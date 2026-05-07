import { useState, useEffect } from 'react';
import { Clock, Calendar, Coffee, AlertCircle, CheckCircle, XCircle, Sun, Sunset } from 'lucide-react';
import authenticatedFetch from '../../utils/apiHandler';
import API_URL from '../../config/api';
import '../../styles/EmployeePanel.css';

// Display order for the weekly grid (Mon first)
const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// getDay() returns 0=Sun,1=Mon,...,6=Sat
const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

const fmt = (t) => {
  if (!t) return null;
  const m = t.match(/(\d{1,2}):(\d{2})/);
  if (!m) return t;
  const h = parseInt(m[1]), min = parseInt(m[2]);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2,'0')}:${String(min).padStart(2,'0')} ${ampm}`;
};

const durMins = (start, end) => {
  if (!start || !end) return null;
  const toM = (t) => { const m = t.match(/(\d{1,2}):(\d{2})/); return m ? parseInt(m[1])*60+parseInt(m[2]) : null; };
  const s = toM(start), e = toM(end);
  if (s === null || e === null) return null;
  return e > s ? e - s : e + 1440 - s;
};

const fmtDur = (mins) => {
  if (!mins) return null;
  return `${Math.floor(mins/60)}h ${mins%60 > 0 ? mins%60+'m' : ''}`.trim();
};

const EmployeeShift = () => {
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authenticatedFetch(`${API_URL}/api/employee-dashboard/stats`);
        const json = await res.json();
        if (json.success) setShift(json.employee?.workSetup?.shift || null);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="dashboard-loading"><div className="loader" /><span>Loading shift...</span></div>;

  if (!shift) return (
    <div className="ep-page">
      <div className="ep-page-header"><h2>My Shift</h2></div>
      <div className="ep-card ep-empty-docs">
        <AlertCircle size={48} /><h3>No Shift Assigned</h3>
        <p>Contact your HR or manager to get a shift assigned.</p>
      </div>
    </div>
  );

  const schedule = shift.schedule || {};
  const weekOffDays = (shift.weekOffDays || []).map(d => d.toLowerCase());
  const todayName = DAY_NAMES[new Date().getDay()];
  const todaySchedule = schedule[todayName] || {};
  const todayIsOff = weekOffDays.includes(todayName);
  const todayDur = durMins(todaySchedule.shiftStart, todaySchedule.shiftEnd);

  return (
    <div className="ep-page">
      <div className="ep-page-header">
        <div>
          <h2>My Shift</h2>
          <p>Your assigned shift schedule and working hours</p>
        </div>
        <div className="ep-shift-name-badge"><Clock size={15} />{shift.shiftName}</div>
      </div>

      {/* Today's card */}
      <div className="ep-shift-today-card">
        <div className="ep-shift-today-left">
          <div className="ep-shift-today-label">Today's Schedule</div>
          <div className="ep-shift-today-day">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          {todayIsOff ? (
            <span className="ep-shift-status-chip off" style={{ marginTop: 8 }}>Week Off</span>
          ) : (
            <div className="ep-shift-today-times">
              <div className="ep-shift-today-time-block">
                <Sun size={14} color="#F59E0B" />
                <div><label>Start</label><span>{fmt(todaySchedule.shiftStart) || '—'}</span></div>
              </div>
              <div className="ep-shift-today-arrow">→</div>
              <div className="ep-shift-today-time-block">
                <Sunset size={14} color="#EF4444" />
                <div><label>End</label><span>{fmt(todaySchedule.shiftEnd) || '—'}</span></div>
              </div>
              {todayDur && (
                <div className="ep-shift-today-dur">
                  <Clock size={13} color="#2563EB" />
                  {fmtDur(todayDur)}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="ep-shift-today-right">
          {[
            { label: 'Lunch', start: todaySchedule.lunchStart, end: todaySchedule.lunchEnd, color: '#10B981' },
            { label: 'Tea Break', start: todaySchedule.teaStart, end: todaySchedule.teaEnd, color: '#F59E0B' },
          ].filter(b => b.start).map((b, i) => (
            <div key={i} className="ep-shift-break-chip" style={{ borderColor: b.color, color: b.color }}>
              <Coffee size={12} />
              <span>{b.label}: {fmt(b.start)} – {fmt(b.end)}</span>
            </div>
          ))}
          {todaySchedule.maxPersonalBreak > 0 && (
            <div className="ep-shift-break-chip" style={{ borderColor: '#8B5CF6', color: '#8B5CF6' }}>
              <Coffee size={12} />
              <span>Personal Break: {todaySchedule.maxPersonalBreak} min max</span>
            </div>
          )}
        </div>
      </div>

      {/* Weekly schedule */}
      <div className="ep-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="ep-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
          <Calendar size={17} /><h3>Weekly Schedule</h3>
        </div>
        <div className="ep-shift-week-grid">
          {DAYS.map((day, i) => {
            const isOff = weekOffDays.includes(day);
            const s = schedule[day] || {};
            const dur = durMins(s.shiftStart, s.shiftEnd);
            const isToday = day === todayName;
            return (
              <div key={day} className={`ep-shift-week-col ${isOff ? 'off' : ''} ${isToday ? 'today' : ''}`}>
                <div className="ep-shift-week-day">{DAY_SHORT[i]}</div>
                {isOff ? (
                  <div className="ep-shift-week-off">Off</div>
                ) : (
                  <>
                    <div className="ep-shift-week-time">{fmt(s.shiftStart) || '—'}</div>
                    <div className="ep-shift-week-sep">to</div>
                    <div className="ep-shift-week-time">{fmt(s.shiftEnd) || '—'}</div>
                    {dur && <div className="ep-shift-week-dur">{fmtDur(dur)}</div>}
                    {s.lunchStart && <div className="ep-shift-week-lunch"><Coffee size={10} /> {fmt(s.lunchStart)}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Working hours thresholds + policies */}
      <div className="ep-shift-policy-grid">
        {/* Attendance thresholds */}
        <div className="ep-card ep-shift-policy-card">
          <div className="ep-card-header"><Clock size={16} /><h4>Working Hours Thresholds</h4></div>
          <div className="ep-policy-rows">
            {[
              { label: 'Full Day', key: 'minFullDayHours', suffix: 'h' },
              { label: 'Three Quarter Day', key: 'minThreeQuarterHours', suffix: 'h' },
              { label: 'Half Day', key: 'minHalfHours', suffix: 'h' },
              { label: 'Quarter Day', key: 'minQuarterHours', suffix: 'h' },
            ].map(({ label, key, suffix }) => {
              const val = todaySchedule[key];
              return val > 0 ? (
                <div key={key} className="ep-policy-row">
                  <label>{label}</label><span>{val}{suffix}</span>
                </div>
              ) : null;
            })}
            {todaySchedule.lateCountAfter > 0 && (
              <div className="ep-policy-row"><label>Late After</label><span>{todaySchedule.lateCountAfter} min</span></div>
            )}
            {todaySchedule.earlyCountBefore > 0 && (
              <div className="ep-policy-row"><label>Early Out Before</label><span>{todaySchedule.earlyCountBefore} min</span></div>
            )}
          </div>
        </div>

        {/* Late/Early policy */}
        <div className="ep-card ep-shift-policy-card">
          <div className="ep-card-header"><Clock size={16} /><h4>Late In / Early Out Policy</h4></div>
          <div className="ep-policy-rows">
            <div className="ep-policy-row"><label>Max Late In</label><span>{shift.maxLateInMinutes ?? 0} min</span></div>
            <div className="ep-policy-row"><label>Max Early Out</label><span>{shift.maxEarlyOutMinutes ?? 0} min</span></div>
            <div className="ep-policy-row"><label>Type</label><span>{shift.lateEarlyType || '—'}</span></div>
            <div className="ep-policy-row">
              <label>Apply Leave if Exceeded</label>
              <span>{shift.applyLeaveIfLimitExceeded ? <CheckCircle size={14} color="#10B981" /> : <XCircle size={14} color="var(--text-muted)" />}</span>
            </div>
            {shift.applyLeaveIfLimitExceeded && (
              <div className="ep-policy-row"><label>Leave Type</label><span>{shift.leaveTypeIfExceeded}</span></div>
            )}
          </div>
        </div>

        {/* Break policy */}
        <div className="ep-card ep-shift-policy-card">
          <div className="ep-card-header"><Coffee size={16} /><h4>Break Policy</h4></div>
          <div className="ep-policy-rows">
            <div className="ep-policy-row"><label>Break Mode</label><span>{shift.breakMode || '—'}</span></div>
            <div className="ep-policy-row">
              <label>Short Leave Allowed</label>
              <span>{shift.allowShortLeave ? <CheckCircle size={14} color="#10B981" /> : <XCircle size={14} color="var(--text-muted)" />}</span>
            </div>
            {shift.allowShortLeave && <>
              <div className="ep-policy-row"><label>Monthly Short Leaves</label><span>{shift.monthlyShortLeaves}</span></div>
              <div className="ep-policy-row"><label>Short Leave Duration</label><span>{shift.shortLeaveMinutes} min</span></div>
            </>}
            {todaySchedule.maxPersonalBreak > 0 && (
              <div className="ep-policy-row"><label>Max Personal Break</label><span>{todaySchedule.maxPersonalBreak} min</span></div>
            )}
          </div>
        </div>

        {/* General info */}
        <div className="ep-card ep-shift-policy-card">
          <div className="ep-card-header"><Calendar size={16} /><h4>General Info</h4></div>
          <div className="ep-policy-rows">
            <div className="ep-policy-row"><label>Shift Code</label><span>{shift.shiftCode || '—'}</span></div>
            <div className="ep-policy-row"><label>Hours Type</label><span>{shift.hoursType || '—'}</span></div>
            <div className="ep-policy-row"><label>Week Off Type</label><span>{shift.weekOffType || '—'}</span></div>
            <div className="ep-policy-row"><label>Week Off Days</label><span>{shift.weekOffDays?.join(', ') || '—'}</span></div>
            <div className="ep-policy-row">
              <label>Multiple Punch</label>
              <span>{shift.multiplePunchAllowed ? <CheckCircle size={14} color="#10B981" /> : <XCircle size={14} color="var(--text-muted)" />}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeShift;
