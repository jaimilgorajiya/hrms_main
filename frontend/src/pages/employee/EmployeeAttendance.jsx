import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, Coffee, LogIn, LogOut } from 'lucide-react';
import authenticatedFetch from '../../utils/apiHandler';
import API_URL from '../../config/api';
import '../../styles/EmployeePanel.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const statusConfig = {
  Present: { label: 'Present', color: '#10B981', bg: '#ECFDF5' },
  'Half Day': { label: 'Half Day', color: '#F59E0B', bg: '#FFFBEB' },
  Absent: { label: 'Absent', color: '#EF4444', bg: '#FEF2F2' },
  'On Leave': { label: 'On Leave', color: '#8B5CF6', bg: '#F5F3FF' },
  Incomplete: { label: 'Incomplete', color: '#F97316', bg: '#FFF7ED' },
  'Clocked In': { label: 'Clocked In', color: '#F97316', bg: '#FFF7ED' },
  weekend: { label: 'Weekend', color: '#94A3B8', bg: '#F8FAFC' },
};

const EmployeeAttendance = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [historyMap, setHistoryMap] = useState({});

  const fetchHistory = useCallback(async (y, m) => {
    const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
    try {
      const res = await authenticatedFetch(`${API_URL}/api/attendance/history?month=${monthStr}`);
      const json = await res.json();
      if (json.success) {
        const map = {};
        json.records.forEach(r => {
          const day = parseInt(r.date.split('-')[2]);
          map[day] = r;
        });
        setHistoryMap(map);
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchHistory(year, month); }, [year, month, fetchHistory]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const isWeekend = (y, m, d) => {
    const day = new Date(y, m, d).getDay();
    return day === 0 || day === 6;
  };

  const counts = Object.values(historyMap).reduce((acc, r) => {
    const key = r.status || 'Present';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const selected = selectedDay ? historyMap[selectedDay] : null;

  return (
    <div className="ep-page">
      <div className="ep-page-header">
        <h2>My Attendance</h2>
        <p>View your monthly attendance history</p>
      </div>

      {/* Summary */}
      <div className="ep-att-summary">
        {[
          { label: 'Present',  count: counts['Present']  || 0, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Incomplete', count: counts['Incomplete'] || 0, color: '#F97316', bg: '#FFF7ED' },
          { label: 'Absent',   count: counts['Absent']   || 0, color: '#EF4444', bg: '#FEF2F2' },
          { label: 'Half Day', count: counts['Half Day'] || 0, color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'On Leave', count: counts['On Leave'] || 0, color: '#8B5CF6', bg: '#F5F3FF' },
        ].map((s, i) => (
          <div key={i} className="ep-att-summary-card" style={{ borderLeft: `4px solid ${s.color}` }}>
            <span className="ep-att-summary-count" style={{ color: s.color }}>{s.count}</span>
            <span className="ep-att-summary-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="ep-att-layout">
        {/* Calendar */}
        <div className="ep-card ep-att-calendar-card">
          <div className="ep-att-cal-header">
            <button className="ep-icon-btn" onClick={prevMonth}><ChevronLeft size={18} /></button>
            <span className="ep-att-month-label">{MONTHS[month]} {year}</span>
            <button className="ep-icon-btn" onClick={nextMonth}><ChevronRight size={18} /></button>
          </div>

          <div className="ep-att-cal-grid">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="ep-att-cal-day-label">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const rec = historyMap[day];
              const weekend = isWeekend(year, month, day);
              const cfg = rec ? statusConfig[rec.status] : weekend ? statusConfig.weekend : null;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSel = selectedDay === day;
              const isFuture = new Date(year, month, day) > today;

              return (
                <div
                  key={day}
                  className={`ep-att-cal-day ${rec ? rec.status.replace(' ', '-').toLowerCase() : weekend ? 'weekend' : isFuture ? 'future' : ''} ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''}`}
                  style={cfg ? { background: isSel ? cfg.color : cfg.bg, color: isSel ? '#fff' : cfg.color } : {}}
                  onClick={() => (rec && !weekend) && setSelectedDay(isSel ? null : day)}
                >
                  <span className="ep-cal-day-num">{day}</span>
                </div>
              );
            })}
          </div>

          <div className="ep-att-legend">
            {Object.entries(statusConfig).filter(([k]) => k !== 'weekend').map(([k, v]) => (
              <div key={k} className="ep-att-legend-item">
                <span className="ep-att-legend-dot" style={{ background: v.color }}></span>
                <span>{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="ep-card ep-att-detail-card">
          {selected && selectedDay ? (
            <>
              <div className="ep-att-detail-header">
                <h4>{selectedDay} {MONTHS[month]} {year}</h4>
                <span className="ep-att-status-chip" style={{ background: statusConfig[selected.status]?.bg, color: statusConfig[selected.status]?.color }}>
                  {statusConfig[selected.status]?.label || selected.status}
                </span>
              </div>
              <div className="ep-att-detail-rows">
                {selected.punchIn && (
                  <div className="ep-att-detail-row">
                    <LogIn size={16} color="#10B981" />
                    <div><label>Punch In</label><span>{selected.punchIn}</span></div>
                  </div>
                )}
                {selected.punchOut && (
                  <div className="ep-att-detail-row">
                    <LogOut size={16} color="#EF4444" />
                    <div><label>Punch Out</label><span>{selected.punchOut}</span></div>
                  </div>
                )}
                {selected.workingFormatted && (
                  <div className="ep-att-detail-row">
                    <Clock size={16} color="#2563EB" />
                    <div><label>Working Hours</label><span>{selected.workingFormatted}</span></div>
                  </div>
                )}
                {selected.breaks?.length > 0 && (
                  <div className="ep-att-detail-row ep-att-break-section">
                    <Coffee size={16} color="#F59E0B" />
                    <div style={{ flex: 1 }}>
                      <label>Breaks ({selected.breaks.length})</label>
                      <div className="ep-att-break-list">
                        {selected.breaks.map((b, i) => {
                          const start = new Date(b.start);
                          const end = b.end ? new Date(b.end) : null;
                          const durMs = end ? end - start : null;
                          const durMins = durMs ? Math.round(durMs / 60000) : null;
                          const durStr = durMins != null
                            ? durMins < 60
                              ? `${durMins}m`
                              : `${Math.floor(durMins / 60)}h ${durMins % 60}m`
                            : 'ongoing';
                          return (
                            <div key={i} className="ep-att-break-item">
                              <span className="ep-att-break-num">#{i + 1}</span>
                              <span className="ep-att-break-time">
                                {start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                {end && ` → ${end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                              </span>
                              <span className="ep-att-break-dur">{durStr}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="ep-att-detail-empty">
              <Calendar size={40} />
              <p>Click on a day to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendance;
