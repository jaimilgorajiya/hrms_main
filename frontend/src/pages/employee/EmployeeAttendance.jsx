import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Clock, ChevronLeft, ChevronRight, Coffee, LogIn, LogOut, 
  AlertCircle, CheckCircle, XCircle, Send, FileText, X, AlertTriangle, 
  Sparkles, ShieldCheck, Sun, Info
} from 'lucide-react';
import Swal from 'sweetalert2';
import authenticatedFetch from '../../utils/apiHandler';
import API_URL from '../../config/api';
import '../../styles/EmployeePanel.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const statusConfig = {
  Present: { label: 'Present', color: '#10B981', bg: 'rgba(16, 185, 129, 0.14)', dot: '#10B981' },
  'Half Day': { label: 'Half Day', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.14)', dot: '#F59E0B' },
  Absent: { label: 'Absent', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.14)', dot: '#EF4444' },
  'Paid Leave': { label: 'Paid Leave', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.14)', dot: '#06B6D4' },
  'Unpaid Leave': { label: 'Unpaid Leave', color: '#64748B', bg: 'rgba(100, 116, 139, 0.14)', dot: '#64748B' },
  'On Leave': { label: 'Paid Leave', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.14)', dot: '#06B6D4' },
  Incomplete: { label: 'Missing Out', color: '#F97316', bg: 'rgba(249, 115, 22, 0.14)', dot: '#F97316' },
  'Clocked In': { label: 'Clocked In', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.14)', dot: '#3B82F6' },
  Holiday: { label: 'Holiday', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.14)', dot: '#EC4899' },
  'Week Off': { label: 'Week Off', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.10)', dot: '#94A3B8' },
  Pending: { label: 'Pending Req', color: '#EAB308', bg: 'rgba(234, 179, 8, 0.14)', dot: '#EAB308' },
};

const EmployeeAttendance = () => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  
  const [records, setRecords] = useState([]);
  const [requests, setRequests] = useState({});
  const [weekOffDays, setWeekOffDays] = useState(['Sunday']);
  const [joiningDate, setJoiningDate] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Correction / Leave Request Modal state
  const [showModal, setShowModal] = useState(false);
  const [reqType, setReqType] = useState('Attendance Correction'); // 'Attendance Correction' | 'Leave'
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [workSummary, setWorkSummary] = useState('');
  const [manualIn, setManualIn] = useState('09:30');
  const [manualOut, setManualOut] = useState('18:30');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [leaveDuration, setLeaveDuration] = useState('Full Day');
  const [leaveCategory, setLeaveCategory] = useState('Paid');

  // Fetch leave types once
  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        const res = await authenticatedFetch(`${API_URL}/api/leave-types`);
        const json = await res.json();
        if (json.success) {
          const types = json.leaveTypes || json.data || [];
          setLeaveTypes(types);
          if (types.length > 0) setSelectedLeaveType(types[0]._id);
        }
      } catch (e) {
        console.error('Failed to fetch leave types:', e);
      }
    };
    fetchLeaveTypes();
  }, []);

  const fetchHistory = useCallback(async (y, m) => {
    setLoading(true);
    const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
    try {
      const res = await authenticatedFetch(`${API_URL}/api/attendance/history?month=${monthStr}`);
      const json = await res.json();
      if (json.success) {
        setRecords(json.records || []);
        setRequests(json.requests || {});
        setWeekOffDays(json.weekOffDays || ['Sunday']);
        setJoiningDate(json.joiningDate || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(year, month);
  }, [year, month, fetchHistory]);

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
  const firstDayOffset = new Date(year, month, 1).getDay();

  // ── Compute full month map (every day 1 to daysInMonth) ──
  const { dayMap, summaryCounts } = useMemo(() => {
    const map = {};
    const counts = {
      Present: 0,
      Absent: 0,
      Incomplete: 0,
      'Half Day': 0,
      'Paid Leave': 0,
      'Unpaid Leave': 0,
      Holiday: 0,
      'Week Off': 0,
    };

    const recordLookup = {};
    records.forEach(r => {
      if (r.date) recordLookup[r.date] = r;
    });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(year, month, d);
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
      const isWeekOff = weekOffDays.includes(dayName);
      const isPast = dateStr < todayStr;
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;
      const isJoined = !joiningDate || dateStr >= joiningDate;

      const rec = recordLookup[dateStr];
      const req = requests[dateStr];

      let status = 'Future';
      let holidayName = null;

      if (rec) {
        if (rec.status === 'Holiday') {
          status = 'Holiday';
          holidayName = rec.holidayName || 'Official Holiday';
        } else if (rec.punchIn && !rec.punchOut && isPast && rec.status !== 'On Leave' && rec.status !== 'Leave') {
          status = 'Incomplete';
        } else if (rec.status === 'Clocked In') {
          status = 'Clocked In';
        } else if (rec.status === 'On Leave' || rec.status === 'Leave' || rec.leaveCategory) {
          const cat = rec.leaveCategory || req?.leaveCategory || 'Paid';
          status = String(cat).toLowerCase() === 'unpaid' ? 'Unpaid Leave' : 'Paid Leave';
        } else {
          status = rec.status || 'Present';
        }
      } else if (req) {
        if (req.status === 'Approved') {
          if (req.type === 'Leave') {
            const cat = req.leaveCategory || 'Paid';
            status = String(cat).toLowerCase() === 'unpaid' ? 'Unpaid Leave' : 'Paid Leave';
          } else {
            status = 'Present';
          }
        } else if (req.status === 'Pending') {
          status = 'Pending';
        } else if (req.status === 'Rejected') {
          status = isPast && isJoined && !isWeekOff ? 'Absent' : isWeekOff ? 'Week Off' : 'Future';
        }
      } else if (isWeekOff) {
        status = 'Week Off';
      } else if (isPast && isJoined) {
        status = 'Absent';
      } else if (isFuture) {
        status = 'Future';
      } else if (isToday) {
        status = 'Not Started';
      }

      // Add to summary counts
      if (status === 'Present' || status === 'Clocked In') counts.Present++;
      else if (status === 'Absent') counts.Absent++;
      else if (status === 'Incomplete') counts.Incomplete++;
      else if (status === 'Half Day') counts['Half Day']++;
      else if (status === 'Paid Leave') counts['Paid Leave']++;
      else if (status === 'Unpaid Leave') counts['Unpaid Leave']++;
      else if (status === 'On Leave') counts['Paid Leave']++;
      else if (status === 'Holiday') counts.Holiday++;
      else if (status === 'Week Off') counts['Week Off']++;

      map[d] = {
        day: d,
        dateStr,
        dayName,
        status,
        rec,
        req,
        isWeekOff,
        isPast,
        isToday,
        isFuture,
        holidayName
      };
    }

    return { dayMap: map, summaryCounts: counts };
  }, [year, month, daysInMonth, records, requests, weekOffDays, joiningDate, todayStr]);

  const selectedInfo = selectedDay ? dayMap[selectedDay] : null;

  const handleOpenCorrection = (dayObj, type = 'Attendance Correction') => {
    if (!dayObj) return;
    setReqType(type);
    setReason('');
    setWorkSummary('');
    if (dayObj.rec?.punchIn) {
      setManualIn(dayObj.rec.punchIn.slice(0, 5) || '09:30');
    } else {
      setManualIn('09:30');
    }
    setManualOut('18:30');
    setShowModal(true);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!selectedInfo) return;

    if (reqType === 'Attendance Correction' && !workSummary.trim()) {
      Swal.fire({ title: 'Work Report Required', text: 'Please provide a daily work report / accomplishments.', icon: 'warning' });
      return;
    }
    if (!reason.trim()) {
      Swal.fire({ title: 'Reason Required', text: 'Please provide a reason for this request.', icon: 'warning' });
      return;
    }
    if (reqType === 'Leave' && !selectedLeaveType) {
      Swal.fire({ title: 'Leave Type Required', text: 'Please select a valid leave type.', icon: 'warning' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        requestType: reqType,
        date: selectedInfo.dateStr,
        reason: reason.trim(),
        ...(reqType === 'Leave' && {
          leaveType: selectedLeaveType,
          leaveDuration,
          leaveCategory,
          fromDate: selectedInfo.dateStr,
          toDate: selectedInfo.dateStr,
        }),
        ...(reqType === 'Attendance Correction' && {
          workSummary: workSummary.trim(),
          manualIn: new Date(`${selectedInfo.dateStr}T${manualIn}:00`),
          manualOut: new Date(`${selectedInfo.dateStr}T${manualOut}:00`),
        }),
      };

      const res = await authenticatedFetch(`${API_URL}/api/requests/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.success) {
        setShowModal(false);
        Swal.fire({
          title: 'Request Submitted!',
          text: reqType === 'Attendance Correction' ? 'Your attendance correction request was sent to HR/Admin.' : 'Your leave request was submitted successfully.',
          icon: 'success',
          timer: 1800,
          showConfirmButton: false
        });
        await fetchHistory(year, month);
      } else {
        Swal.fire({ title: 'Unable to Submit', text: json.message || 'Request failed', icon: 'error' });
      }
    } catch {
      Swal.fire({ title: 'Error', text: 'Server communication error', icon: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ep-page">
      <div className="ep-page-header">
        <div>
          <h2>My Attendance</h2>
          <p>View your monthly attendance logs, shift history, and submit corrections</p>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="ep-att-summary">
        {[
          { label: 'Present Days', count: summaryCounts.Present, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Absent', count: summaryCounts.Absent, color: '#EF4444', bg: '#FEF2F2' },
          { label: 'Paid Leave', count: summaryCounts['Paid Leave'] || 0, color: '#06B6D4', bg: '#ECFEFF' },
          { label: 'Unpaid Leave', count: summaryCounts['Unpaid Leave'] || 0, color: '#64748B', bg: '#F1F5F9' },
          { label: 'Missing Punch', count: summaryCounts.Incomplete, color: '#F97316', bg: '#FFF7ED' },
          { label: 'Half Day', count: summaryCounts['Half Day'], color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Holidays', count: summaryCounts.Holiday, color: '#EC4899', bg: '#FDF2F8' },
        ].map((s, i) => (
          <div key={i} className="ep-att-summary-card" style={{ borderLeft: `4px solid ${s.color}` }}>
            <span className="ep-att-summary-count" style={{ color: s.color }}>{s.count}</span>
            <span className="ep-att-summary-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="ep-att-layout">
        {/* Calendar Card */}
        <div className="ep-card ep-att-calendar-card">
          <div className="ep-att-cal-header">
            <button className="ep-icon-btn" onClick={prevMonth} title="Previous Month">
              <ChevronLeft size={18} />
            </button>
            <span className="ep-att-month-label">{MONTHS[month]} {year}</span>
            <button className="ep-icon-btn" onClick={nextMonth} title="Next Month">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="ep-att-cal-grid">
            {WEEKDAYS.map(d => (
              <div key={d} className="ep-att-cal-day-label">{d}</div>
            ))}
            {/* Empty padding offsets for first day */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`offset-${i}`} style={{ opacity: 0 }} />
            ))}
            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const info = dayMap[dayNum];
              if (!info) return null;

              const isSel = selectedDay === dayNum;
              const cfg = statusConfig[info.status] || (info.isWeekOff ? statusConfig['Week Off'] : null);

              let cellBg = 'var(--ep-surface-elevated)';
              let cellColor = 'var(--ep-text-main)';
              let borderStyle = '1px solid transparent';

              if (isSel) {
                cellBg = cfg ? cfg.color : 'var(--ep-accent-primary)';
                cellColor = '#ffffff';
                borderStyle = `2px solid ${cfg ? cfg.color : 'var(--ep-accent-primary)'}`;
              } else if (cfg) {
                cellBg = cfg.bg;
                cellColor = cfg.color;
              } else if (info.isFuture) {
                cellBg = 'transparent';
                cellColor = 'var(--ep-text-muted)';
              }

              return (
                <div
                  key={dayNum}
                  className={`ep-att-cal-day ${info.status.toLowerCase().replace(/\s+/g, '-')} ${info.isToday ? 'today' : ''} ${isSel ? 'selected' : ''}`}
                  style={{
                    background: cellBg,
                    color: cellColor,
                    border: borderStyle,
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => setSelectedDay(dayNum)}
                >
                  <span className="ep-cal-day-num">{dayNum}</span>
                  {cfg && (
                    <span 
                      style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: isSel ? '#ffffff' : cfg.dot,
                        marginTop: '2px' 
                      }} 
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Status Legend */}
          <div className="ep-att-legend" style={{ flexWrap: 'wrap', gap: '12px 18px', marginTop: '24px' }}>
            {Object.entries(statusConfig).map(([k, v]) => (
              <div key={k} className="ep-att-legend-item">
                <span className="ep-att-legend-dot" style={{ background: v.color }}></span>
                <span>{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="ep-card ep-att-detail-card">
          {selectedInfo ? (
            <>
              <div className="ep-att-detail-header">
                <div>
                  <h4>
                    {new Date(year, month, selectedDay).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </h4>
                  {selectedInfo.holidayName && (
                    <span style={{ fontSize: '12px', color: '#EC4899', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <Sparkles size={13} /> {selectedInfo.holidayName}
                    </span>
                  )}
                </div>
                <span
                  className="ep-att-status-chip"
                  style={{
                    background: statusConfig[selectedInfo.status]?.bg || 'rgba(148, 163, 184, 0.15)',
                    color: statusConfig[selectedInfo.status]?.color || 'var(--ep-text-muted)'
                  }}
                >
                  {statusConfig[selectedInfo.status]?.label || selectedInfo.status}
                </span>
              </div>

              <div className="ep-att-detail-rows">
                {/* Leave Details if day is on leave */}
                {(selectedInfo.status === 'Paid Leave' || selectedInfo.status === 'Unpaid Leave' || selectedInfo.status === 'On Leave') && (
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: selectedInfo.status === 'Unpaid Leave' ? 'rgba(100, 116, 139, 0.08)' : 'rgba(6, 182, 212, 0.08)',
                    border: `1px solid ${selectedInfo.status === 'Unpaid Leave' ? 'rgba(100, 116, 139, 0.2)' : 'rgba(6, 182, 212, 0.2)'}`,
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ep-text-main)' }}>
                        {selectedInfo.rec?.leaveTypeName || selectedInfo.req?.leaveType || 'Leave'}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: selectedInfo.status === 'Unpaid Leave' ? 'rgba(100, 116, 139, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                        color: selectedInfo.status === 'Unpaid Leave' ? '#64748B' : '#0891B2'
                      }}>
                        {selectedInfo.rec?.leaveDuration || selectedInfo.req?.leaveDuration || 'Full Day'}
                      </span>
                    </div>
                    {(selectedInfo.req?.reason || selectedInfo.rec?.workSummary) && (
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--ep-text-secondary)', lineHeight: 1.4 }}>
                        <b>Reason:</b> {selectedInfo.req?.reason || selectedInfo.rec?.workSummary}
                      </p>
                    )}
                  </div>
                )}
                {/* Punch Details if available */}
                {selectedInfo.rec?.punchIn && (
                  <div className="ep-att-detail-row">
                    <LogIn size={16} color="#10B981" />
                    <div>
                      <label>Punch In</label>
                      <span>{selectedInfo.rec.punchIn}</span>
                    </div>
                  </div>
                )}

                {selectedInfo.rec?.punchOut ? (
                  <div className="ep-att-detail-row">
                    <LogOut size={16} color="#EF4444" />
                    <div>
                      <label>Punch Out</label>
                      <span>{selectedInfo.rec.punchOut}</span>
                    </div>
                  </div>
                ) : selectedInfo.status === 'Incomplete' ? (
                  <div className="ep-att-detail-row" style={{ background: 'rgba(249, 115, 22, 0.08)', padding: '10px 14px', borderRadius: '10px' }}>
                    <AlertTriangle size={16} color="#F97316" />
                    <div>
                      <label style={{ color: '#F97316' }}>Missing Punch Out</label>
                      <span style={{ fontSize: '13px', color: '#F97316', fontWeight: 600 }}>Correction needed</span>
                    </div>
                  </div>
                ) : null}

                {selectedInfo.rec?.workingFormatted && (
                  <div className="ep-att-detail-row">
                    <Clock size={16} color="#3B82F6" />
                    <div>
                      <label>Working Hours</label>
                      <span>{selectedInfo.rec.workingFormatted}</span>
                    </div>
                  </div>
                )}

                {/* Work Summary from punch out */}
                {selectedInfo.rec?.workSummary && (
                  <div className="ep-att-detail-row" style={{ alignItems: 'flex-start' }}>
                    <FileText size={16} color="#6366F1" />
                    <div>
                      <label>Daily Work Summary</label>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ep-text-secondary)', lineHeight: 1.4 }}>
                        {selectedInfo.rec.workSummary}
                      </span>
                    </div>
                  </div>
                )}

                {/* Penalty Section */}
                {(selectedInfo.rec?.lateInPenalty?.amount > 0 || selectedInfo.rec?.earlyOutPenalty?.amount > 0) && (
                  <div style={{ marginTop: '4px', padding: '12px 14px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '12px', borderLeft: '4px solid #EF4444' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontWeight: 700, marginBottom: '6px', fontSize: '13px' }}>
                      <AlertCircle size={15} /> Attendance Penalties
                    </div>
                    {selectedInfo.rec?.lateInPenalty?.amount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ep-text-secondary)' }}>
                        <span>Late In Penalty:</span>
                        <span style={{ fontWeight: 700, color: '#EF4444' }}>₹{selectedInfo.rec.lateInPenalty.amount}</span>
                      </div>
                    )}
                    {selectedInfo.rec?.earlyOutPenalty?.amount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ep-text-secondary)', marginTop: '4px' }}>
                        <span>Early Out Penalty:</span>
                        <span style={{ fontWeight: 700, color: '#EF4444' }}>₹{selectedInfo.rec.earlyOutPenalty.amount}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Breaks list */}
                {selectedInfo.rec?.breaks?.length > 0 && (
                  <div className="ep-att-detail-row ep-att-break-section">
                    <Coffee size={16} color="#F59E0B" />
                    <div style={{ flex: 1 }}>
                      <label>Breaks ({selectedInfo.rec.breaks.length})</label>
                      <div className="ep-att-break-list">
                        {selectedInfo.rec.breaks.map((b, i) => {
                          const start = new Date(b.start);
                          const end = b.end ? new Date(b.end) : null;
                          const durMs = end ? end - start : null;
                          const durMins = durMs ? Math.round(durMs / 60000) : null;
                          const durStr = durMins != null
                            ? durMins < 60 ? `${durMins}m` : `${Math.floor(durMins / 60)}h ${durMins % 60}m`
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

                {/* Attached Request (Correction / Leave) */}
                {selectedInfo.req && (
                  <div style={{ marginTop: '10px', padding: '14px', borderRadius: '12px', background: 'var(--ep-surface-elevated)', border: '1px solid var(--ep-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ep-text-main)' }}>
                        {selectedInfo.req.type}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: selectedInfo.req.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : selectedInfo.req.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: selectedInfo.req.status === 'Approved' ? '#10B981' : selectedInfo.req.status === 'Rejected' ? '#EF4444' : '#F59E0B'
                      }}>
                        {selectedInfo.req.status}
                      </span>
                    </div>
                    {selectedInfo.req.reason && (
                      <p style={{ margin: '4px 0', fontSize: '12px', color: 'var(--ep-text-secondary)' }}>
                        <b>Reason:</b> {selectedInfo.req.reason}
                      </p>
                    )}
                    {selectedInfo.req.workSummary && (
                      <p style={{ margin: '4px 0', fontSize: '12px', color: 'var(--ep-text-secondary)' }}>
                        <b>Report:</b> {selectedInfo.req.workSummary}
                      </p>
                    )}
                    {selectedInfo.req.adminRemark && (
                      <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--ep-accent-primary)', fontWeight: 600 }}>
                        <b>HR Remark:</b> {selectedInfo.req.adminRemark}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions: Request Attendance Correction or Apply Leave */}
                {(!selectedInfo.req || selectedInfo.req.status === 'Rejected') && (
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(selectedInfo.status === 'Incomplete' || selectedInfo.status === 'Absent' || (selectedInfo.isPast && !selectedInfo.isWeekOff && selectedInfo.status !== 'Holiday')) && (
                      <button
                        className="ep-btn-primary"
                        style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '10px 14px', fontSize: '13px' }}
                        onClick={() => handleOpenCorrection(selectedInfo, 'Attendance Correction')}
                      >
                        <Send size={15} /> Request Attendance Correction
                      </button>
                    )}
                    {(selectedInfo.status === 'Absent' || selectedInfo.isPast || selectedInfo.isToday || selectedInfo.isFuture) && selectedInfo.status !== 'Holiday' && !selectedInfo.isWeekOff && (
                      <button
                        className="ep-btn-outline"
                        style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '10px 14px', fontSize: '13px' }}
                        onClick={() => handleOpenCorrection(selectedInfo, 'Leave')}
                      >
                        <FileText size={15} /> Apply Leave for this Date
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="ep-att-detail-empty">
              <Calendar size={40} />
              <p>Click on any date to inspect details or request corrections</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Attendance Correction & Leave Request Modal ── */}
      {showModal && selectedInfo && (
        <div className="ep-modal-overlay">
          <div className="ep-modal" style={{ maxWidth: 520 }}>
            <div className="ep-modal-header">
              <h3>{reqType === 'Attendance Correction' ? 'Attendance Correction' : 'Apply Leave'}</h3>
              <button className="ep-modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--ep-border)', padding: '0 24px', background: 'var(--ep-surface-elevated)' }}>
              <button
                type="button"
                onClick={() => setReqType('Attendance Correction')}
                style={{
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: reqType === 'Attendance Correction' ? '2px solid var(--ep-accent-primary)' : '2px solid transparent',
                  color: reqType === 'Attendance Correction' ? 'var(--ep-accent-primary)' : 'var(--ep-text-muted)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Attendance Regularization
              </button>
              <button
                type="button"
                onClick={() => setReqType('Leave')}
                style={{
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: reqType === 'Leave' ? '2px solid var(--ep-accent-primary)' : '2px solid transparent',
                  color: reqType === 'Leave' ? 'var(--ep-accent-primary)' : 'var(--ep-text-muted)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Leave Request
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="ep-leave-form" style={{ padding: '24px' }}>
              <div style={{ padding: '10px 14px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--ep-text-muted)', fontWeight: 600 }}>Target Date:</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ep-accent-primary)' }}>
                  {new Date(selectedInfo.dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {reqType === 'Attendance Correction' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="ep-form-group">
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ep-text-muted)', textTransform: 'uppercase' }}>Punch In Time</label>
                      <input
                        type="time"
                        className="ep-input"
                        value={manualIn}
                        onChange={(e) => setManualIn(e.target.value)}
                        required
                      />
                    </div>
                    <div className="ep-form-group">
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ep-text-muted)', textTransform: 'uppercase' }}>Punch Out Time</label>
                      <input
                        type="time"
                        className="ep-input"
                        value={manualOut}
                        onChange={(e) => setManualOut(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="ep-form-group">
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ep-text-muted)', textTransform: 'uppercase' }}>Daily Work Report / Summary *</label>
                    <textarea
                      className="ep-input"
                      rows={3}
                      placeholder="Detail the work and accomplishments on this day..."
                      value={workSummary}
                      onChange={(e) => setWorkSummary(e.target.value)}
                      required
                    />
                  </div>

                  <div className="ep-form-group">
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ep-text-muted)', textTransform: 'uppercase' }}>Reason for Correction *</label>
                    <textarea
                      className="ep-input"
                      rows={2}
                      placeholder="e.g. Forgot card, biometric scanner issue, worked on site..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="ep-form-group">
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ep-text-muted)', textTransform: 'uppercase' }}>Leave Type *</label>
                    <select
                      className="ep-input"
                      value={selectedLeaveType}
                      onChange={(e) => setSelectedLeaveType(e.target.value)}
                      required
                    >
                      {leaveTypes.map((t) => (
                        <option key={t._id} value={t._id}>{t.name} ({t.type || 'Leave'})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="ep-form-group">
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ep-text-muted)', textTransform: 'uppercase' }}>Duration</label>
                      <select
                        className="ep-input"
                        value={leaveDuration}
                        onChange={(e) => setLeaveDuration(e.target.value)}
                      >
                        <option value="Full Day">Full Day</option>
                        <option value="First Half">First Half</option>
                        <option value="Second Half">Second Half</option>
                      </select>
                    </div>
                    <div className="ep-form-group">
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ep-text-muted)', textTransform: 'uppercase' }}>Category</label>
                      <select
                        className="ep-input"
                        value={leaveCategory}
                        onChange={(e) => setLeaveCategory(e.target.value)}
                      >
                        <option value="Paid">Paid</option>
                        <option value="Unpaid">Unpaid</option>
                      </select>
                    </div>
                  </div>

                  <div className="ep-form-group">
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ep-text-muted)', textTransform: 'uppercase' }}>Reason *</label>
                    <textarea
                      className="ep-input"
                      rows={3}
                      placeholder="Reason for requesting leave..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div className="ep-modal-actions">
                <button type="button" className="ep-btn-outline" onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="ep-btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAttendance;
