import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Sun, Moon, Hourglass, AlertCircle, LogOut, Utensils, Coffee } from 'lucide-react';
import { useMobileAuth } from './context/MobileAuthContext';
import { useMobileTheme } from './context/MobileThemeContext';

function PolicyCard({ icon: Icon, title, value, color, bg }) {
  return (
    <div style={{
      width: 'calc(50% - 6px)',
      boxSizing: 'border-box',
      background: 'var(--m-card)',
      border: '1px solid var(--m-border)',
      borderRadius: 16,
      padding: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12, backgroundColor: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: '600', color: 'var(--m-muted)' }}>{title}</div>
        <div style={{ fontSize: 13, fontWeight: '800', color: 'var(--m-text)', marginTop: 2 }}>{value || '—'}</div>
      </div>
    </div>
  );
}

function DaySchedule({ day, start, end, isOff, isToday }) {
  return (
    <div style={{
      width: 100,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      flexShrink: 0,
      background: isToday ? 'var(--m-primary)' : 'var(--m-card)',
      border: isToday ? 'none' : '1px solid var(--m-border)',
      boxShadow: 'var(--m-shadow-sm)',
      boxSizing: 'border-box'
    }}>
      <span style={{
        fontSize: 10,
        fontWeight: '800',
        color: isToday ? 'white' : 'var(--m-muted)',
        textTransform: 'uppercase'
      }}>
        {day.substring(0, 3).toUpperCase()}
      </span>
      {isOff ? (
        <div style={{
          padding: '4px 8px',
          borderRadius: 8,
          background: isToday ? 'rgba(255,255,255,0.15)' : 'var(--m-elevated)',
          fontSize: 10,
          fontWeight: '800',
          color: isToday ? 'white' : 'var(--m-muted)'
        }}>
          OFF
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: '800', color: isToday ? 'white' : 'var(--m-text)' }}>{start || '—'}</span>
          <div style={{
            width: 4, height: 4, borderRadius: '50%',
            background: isToday ? 'rgba(255,255,255,0.4)' : 'var(--m-border-strong)'
          }} />
          <span style={{ fontSize: 13, fontWeight: '800', color: isToday ? 'white' : 'var(--m-text)' }}>{end || '—'}</span>
        </div>
      )}
    </div>
  );
}

export default function MobileShift() {
  const { apiFetch } = useMobileAuth();
  const { isDark } = useMobileTheme();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/employee-dashboard/stats')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setData(json.employee?.workSetup?.shift || null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const todayName = days[(new Date().getDay() + 6) % 7];

  return (
    <div className="m-animate-in" style={{ minHeight: '100%', paddingBottom: 40 }}>
      <div className="mobile-page-header">
        <button className="mobile-header-back" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <span className="mobile-header-title">My Shift & Schedule</span>
        <div style={{ width: 40 }} />
      </div>

      {loading ? (
        <div className="m-loader"><div className="m-spinner" /></div>
      ) : data ? (
        <div style={{ padding: '20px 16px' }}>
          {/* Main Shift Card with Gradient */}
          <div className="m-shift-card" style={{
            marginBottom: 24,
            padding: 24,
            borderRadius: 24,
            background: isDark ? 'linear-gradient(135deg, #4f46e5 0%, #2d2a6e 100%)' : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', opacity: 0.8, letterSpacing: 0.5 }}>Active Shift</div>
                <div style={{ fontSize: 24, fontWeight: '900', marginTop: 4 }}>{data.name || 'Standard Shift'}</div>
              </div>
              <div style={{
                width: 56, height: 56, borderRadius: 18,
                background: 'rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Clock size={28} color="white" />
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', margin: '20px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sun size={16} color="rgba(255,255,255,0.7)" />
                <span style={{ fontSize: 13, fontWeight: '600' }}>Start: {data.schedule?.[todayName]?.shiftStart || '—'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Moon size={16} color="rgba(255,255,255,0.7)" />
                <span style={{ fontSize: 13, fontWeight: '600' }}>End: {data.schedule?.[todayName]?.shiftEnd || '—'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Hourglass size={16} color="rgba(255,255,255,0.7)" />
                <span style={{ fontSize: 13, fontWeight: '600' }}>Duration: 9h (Avg)</span>
              </div>
            </div>
          </div>

          {/* Weekly Schedule */}
          <h3 style={{ fontSize: 16, fontWeight: '800', color: 'var(--m-text)', margin: '0 0 14px' }}>Weekly Schedule</h3>
          <div className="m-scroll-row" style={{ gap: 12, paddingBottom: 16, marginBottom: 20 }}>
            {days.map(d => (
              <DaySchedule
                key={d}
                day={d}
                start={data.schedule?.[d]?.shiftStart}
                end={data.schedule?.[d]?.shiftEnd}
                isOff={data.schedule?.[d]?.isOff}
                isToday={d === todayName}
              />
            ))}
          </div>

          {/* Rules & Policies */}
          <h3 style={{ fontSize: 16, fontWeight: '800', color: 'var(--m-text)', margin: '0 0 14px' }}>Rules & Policies</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            <PolicyCard
              icon={AlertCircle}
              title="Late Threshold"
              value={`${data.maxLateMinutes || 0} Minutes`}
              color="var(--m-danger)"
              bg="var(--m-danger-light)"
            />
            <PolicyCard
              icon={LogOut}
              title="Max Early Out"
              value={`${data.maxEarlyOutMinutes || 0} Minutes`}
              color="var(--m-warning)"
              bg="var(--m-warning-light)"
            />
            <PolicyCard
              icon={Utensils}
              title="Lunch Break"
              value={`${data.schedule?.[todayName]?.lunchDuration || 0} Mins`}
              color="var(--m-success)"
              bg="var(--m-success-light)"
            />
            <PolicyCard
              icon={Coffee}
              title="Tea Breaks"
              value="2 x 15 Mins"
              color="var(--m-purple)"
              bg="var(--m-purple-light)"
            />
          </div>

          {/* Attendance Criteria */}
          <div className="m-card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: '800', color: 'var(--m-text)', margin: '0 0 14px' }}>Attendance Criteria</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--m-success)' }} />
                <span style={{ fontSize: 13, color: 'var(--m-text-secondary)', fontWeight: '600' }}>
                  Full Day: Min <strong style={{ color: 'var(--m-text)' }}>{data.minFullDayHours || 8} hours</strong> of work
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--m-warning)' }} />
                <span style={{ fontSize: 13, color: 'var(--m-text-secondary)', fontWeight: '600' }}>
                  Half Day: Min <strong style={{ color: 'var(--m-text)' }}>{data.minHalfDayHours || 4} hours</strong> of work
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="m-empty">
          <div className="m-empty-icon"><Clock size={36} /></div>
          <div className="m-empty-title">No Shift Assigned</div>
          <div className="m-empty-sub">Contact HR to get a shift assigned to you.</div>
        </div>
      )}
    </div>
  );
}
