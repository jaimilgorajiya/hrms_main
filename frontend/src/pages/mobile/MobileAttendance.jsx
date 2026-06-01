import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertTriangle, Clock, X, Send, LogIn, LogOut, CalendarDays } from 'lucide-react';
import { useMobileAuth } from './context/MobileAuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO } from 'date-fns';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDayClass(dateStr, markedDates, selectedDate) {
  if (dateStr === selectedDate) return 'selected';
  const m = markedDates[dateStr];
  if (!m) return '';
  if (m.type === 'weekend') return 'weekend';
  if (m.type === 'present') return 'present';
  if (m.type === 'absent') return 'absent';
  if (m.type === 'leave') return 'leave';
  if (m.type === 'missing') return 'missing';
  return '';
}

export default function MobileAttendance() {
  const { apiFetch } = useMobileAuth();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [requests, setRequests] = useState({});
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [stats, setStats] = useState({ present: 0, absent: 0, missing: 0, leaves: 0 });
  const [weekOffDays, setWeekOffDays] = useState([]);
  const [joiningDate, setJoiningDate] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Form state
  const [reqType, setReqType] = useState('Leave');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [reason, setReason] = useState('');
  const [workSummary, setWorkSummary] = useState('');
  const [manualIn, setManualIn] = useState('09:00');
  const [manualOut, setManualOut] = useState('18:00');
  const [leaveDuration, setLeaveDuration] = useState('Full Day');
  const [leaveCategory, setLeaveCategory] = useState('Paid');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const month = format(currentDate, 'yyyy-MM');

  const processRecords = useCallback((recs, reqs, jDate, woDays, targetMonth) => {
    const lookup = {};
    recs.forEach(r => { lookup[r.date] = r; });
    const start = startOfMonth(new Date(`${targetMonth}-01`));
    const end = endOfMonth(new Date(`${targetMonth}-01`));
    const today = format(new Date(), 'yyyy-MM-dd');
    const marked = {};
    let sPresent = 0, sAbsent = 0, sMissing = 0, sLeaves = 0;

    eachDayOfInterval({ start, end }).forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayName = format(day, 'EEEE');
      const isWeekend = woDays.includes(dayName);
      const r = lookup[dateStr];
      const req = reqs[dateStr];

      if (r) {
        const isMissing = r.punchIn && !r.punchOut && dateStr < today;
        if (isMissing) {
          marked[dateStr] = { type: 'missing' };
          if (!req || (req.status !== 'Pending' && req.status !== 'Approved')) sMissing++;
        } else if (r.status === 'Present') { marked[dateStr] = { type: 'present' }; sPresent++; }
        else if (r.status === 'Absent') { marked[dateStr] = { type: 'absent' }; sAbsent++; }
        else if (r.status === 'Leave' || r.status === 'On Leave') { marked[dateStr] = { type: 'leave' }; sLeaves++; }
        else { marked[dateStr] = { type: 'missing' }; }
      } else if (req) {
        if (req.status === 'Approved') marked[dateStr] = { type: req.type === 'Leave' ? 'leave' : 'present' };
        else if (req.status === 'Pending') marked[dateStr] = { type: 'missing' };
      } else if (isWeekend) {
        marked[dateStr] = { type: 'weekend' };
      } else if (dateStr < today && (!jDate || dateStr >= jDate)) {
        marked[dateStr] = { type: 'absent' }; sAbsent++;
      }
    });

    setMarkedDates(marked);
    setStats({ present: sPresent, absent: sAbsent, missing: sMissing, leaves: sLeaves });
  }, []);

  const loadData = useCallback(async (m) => {
    setLoading(true);
    try {
      const [histRes, statsRes, ltRes] = await Promise.all([
        apiFetch(`/api/attendance/history?month=${m}`),
        apiFetch('/api/employee-dashboard/stats'),
        apiFetch('/api/leave-types'),
      ]);
      const [histJson, statsJson, ltJson] = await Promise.all([
        histRes.json(), statsRes.json(), ltRes.json(),
      ]);
      if (histJson.success) {
        setRecords(histJson.records || []);
        setRequests(histJson.requests || {});
        setJoiningDate(histJson.joiningDate);
        setWeekOffDays(histJson.weekOffDays || []);
        processRecords(histJson.records || [], histJson.requests || {}, histJson.joiningDate, histJson.weekOffDays || [], m);
      }
      if (statsJson.success) setUserProfile(statsJson.employee);
      if (ltJson.success) setLeaveTypes(ltJson.leaveTypes || ltJson.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiFetch, processRecords]);

  useEffect(() => { loadData(month); }, [month]);

  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    if (next <= new Date()) setCurrentDate(next);
  };

  const calDays = (() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = [];
    for (let i = 0; i < getDay(start); i++) days.push(null);
    eachDayOfInterval({ start, end }).forEach(d => days.push(d));
    return days;
  })();

  const today = format(new Date(), 'yyyy-MM-dd');
  const selectedRecord = records.find(r => r.date === selectedDate);
  const currentRequest = requests[selectedDate];
  const isMissingPunchOut = selectedRecord && selectedRecord.punchIn && !selectedRecord.punchOut && selectedDate < today;
  const isAbsent = !selectedRecord && selectedDate < today && (!joiningDate || selectedDate >= joiningDate) && !weekOffDays.includes(format(new Date(selectedDate + 'T00:00:00'), 'EEEE'));
  const canRequest = selectedDate && !currentRequest && (isAbsent || isMissingPunchOut || selectedDate >= today);

  const handleSubmit = async () => {
    if (reqType === 'Leave' && !selectedLeaveType) return showToast('Select a leave type', 'error');
    if (reqType === 'Attendance Correction' && !workSummary.trim()) return showToast('Work report is required', 'error');
    if (!reason.trim()) return showToast('Reason is required', 'error');
    setSubmitting(true);
    try {
      const payload = {
        requestType: reqType,
        date: selectedDate,
        reason,
        ...(reqType === 'Leave' && { leaveType: selectedLeaveType, leaveDuration, leaveCategory }),
        ...(reqType === 'Attendance Correction' && {
          workSummary,
          manualIn: new Date(`${selectedDate}T${manualIn}:00`),
          manualOut: new Date(`${selectedDate}T${manualOut}:00`),
        }),
      };
      const res = await apiFetch('/api/requests/submit', { method: 'POST', body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) {
        showToast('Request submitted!');
        setShowModal(false);
        setReason(''); setWorkSummary(''); setSelectedLeaveType('');
        loadData(month);
      } else {
        showToast(json.message || 'Failed', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ minHeight: '100%', paddingBottom: 20 }}>
      {toast && (
        <div className="m-toast" style={{ background: toast.type === 'error' ? 'var(--m-danger)' : 'var(--m-success)' }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ padding: '20px 20px 0', background: 'var(--m-surface)', borderBottom: '1px solid var(--m-border)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--m-text)', margin: '0 0 4px' }}>Attendance</h1>
        <p style={{ fontSize: 13, color: 'var(--m-muted)', margin: '0 0 16px', fontWeight: 500 }}>Your logs and records</p>

        {/* Stats row */}
        <div className="m-cal-stats" style={{ marginBottom: 16 }}>
          {[
            { val: stats.present, label: 'Present', color: 'var(--m-success)' },
            { val: stats.absent, label: 'Absent', color: 'var(--m-danger)' },
            { val: stats.missing, label: 'Missing Punch', color: 'var(--m-warning)' },
          ].map(({ val, label, color }) => (
            <div key={label} className="m-cal-stat">
              <div className="m-cal-stat-val" style={{ color }}>{val}</div>
              <div className="m-cal-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Calendar */}
        <div className="m-calendar">
          <div className="m-cal-header">
            <button className="m-cal-nav" onClick={prevMonth}><ChevronLeft size={16} /></button>
            <span className="m-cal-month">{format(currentDate, 'MMMM yyyy')}</span>
            <button className="m-cal-nav" onClick={nextMonth} disabled={format(new Date(), 'yyyy-MM') === month}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="m-cal-grid">
            {WEEKDAYS.map(d => <div key={d} className="m-cal-weekday">{d}</div>)}
            {calDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const dateStr = format(day, 'yyyy-MM-dd');
              const isToday = dateStr === today;
              const dayClass = getDayClass(dateStr, markedDates, selectedDate);
              return (
                <div
                  key={dateStr}
                  className={`m-cal-day ${dayClass} ${isToday && dayClass !== 'selected' ? 'today' : ''}`}
                  onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                >
                  {day.getDate()}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--m-border)' }}>
            {[
              { color: 'var(--m-success)', label: 'Present' },
              { color: 'var(--m-danger)', label: 'Absent' },
              { color: 'var(--m-warning)', label: 'Missing/Late' },
              { color: 'var(--m-purple)', label: 'Week Off' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--m-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Day Detail */}
        {selectedDate && (
          <div className="m-card" style={{ marginTop: 12, animation: 'slideUp 0.25s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--m-text)' }}>
                {format(new Date(selectedDate + 'T00:00:00'), 'dd MMMM yyyy')}
              </span>
              <button onClick={() => setSelectedDate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {selectedRecord ? (
              <div>
                <div className="m-detail-row">
                  <span className="m-detail-label"><LogIn size={14} color="var(--m-success)" />Punch In</span>
                  <span className="m-detail-value">{selectedRecord.punchIn || '—'}</span>
                </div>
                <div className="m-detail-row">
                  <span className="m-detail-label"><LogOut size={14} color="var(--m-danger)" />Punch Out</span>
                  <span className="m-detail-value">{selectedRecord.punchOut || '—'}</span>
                </div>
                {selectedRecord.workSummary && (
                  <div style={{ background: 'var(--m-elevated)', borderRadius: 12, padding: '10px 12px', marginTop: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--m-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Work Report</div>
                    <div style={{ fontSize: 13, color: 'var(--m-text)', lineHeight: 1.5 }}>{selectedRecord.workSummary}</div>
                  </div>
                )}
              </div>
            ) : currentRequest ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span className={`m-badge ${currentRequest.status === 'Approved' ? 'success' : currentRequest.status === 'Rejected' ? 'danger' : 'warning'}`}>
                    {currentRequest.status}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-text)' }}>{currentRequest.type}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--m-muted)' }}>{currentRequest.reason}</div>
              </div>
            ) : (
              <div style={{ color: 'var(--m-muted)', fontSize: 13, textAlign: 'center', padding: '10px 0' }}>
                {isAbsent ? 'Marked as Absent' : weekOffDays.includes(format(new Date(selectedDate + 'T00:00:00'), 'EEEE')) ? '🌴 Week Off' : 'No records for this day'}
              </div>
            )}

            {canRequest && (
              <button
                className="m-btn m-btn-primary m-btn-full m-btn-sm"
                style={{ marginTop: 14 }}
                onClick={() => {
                  setReqType(isMissingPunchOut ? 'Attendance Correction' : 'Leave');
                  if (isMissingPunchOut && selectedRecord?.punchIn) {
                    const match = selectedRecord.punchIn.match(/(\d{1,2}):(\d{2})/);
                    if (match) setManualIn(`${match[1].padStart(2, '0')}:${match[2]}`);
                  }
                  setShowModal(true);
                }}
              >
                <Send size={16} />
                {isMissingPunchOut ? 'Request Punch Correction' : 'Request Leave / Correction'}
              </button>
            )}

            {currentRequest && currentRequest.status === 'Rejected' && (
              <button className="m-btn m-btn-primary m-btn-full m-btn-sm" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
                <Send size={16} /> Resubmit Request
              </button>
            )}
          </div>
        )}
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="m-modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="m-bottom-sheet">
            <div className="m-bottom-sheet-handle" />
            <div className="m-bottom-sheet-header">
              <span className="m-bottom-sheet-title">New Request</span>
              <button className="m-bottom-sheet-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="m-bottom-sheet-body">
              <p style={{ fontSize: 12, color: 'var(--m-muted)', fontWeight: 700, marginBottom: 12 }}>
                📅 {selectedDate && format(new Date(selectedDate + 'T00:00:00'), 'dd MMMM yyyy')}
              </p>

              {!isMissingPunchOut && (
                <div className="m-input-group">
                  <label className="m-input-label">Request Type</label>
                  <div className="m-segment">
                    <button className={`m-segment-btn ${reqType === 'Leave' ? 'active' : ''}`} onClick={() => setReqType('Leave')}>Leave</button>
                    <button className={`m-segment-btn ${reqType === 'Attendance Correction' ? 'active' : ''}`} onClick={() => setReqType('Attendance Correction')}>Correction</button>
                  </div>
                </div>
              )}

              {reqType === 'Leave' && leaveTypes.length > 0 && (
                <div className="m-input-group">
                  <label className="m-input-label">Leave Type</label>
                  <div className="m-chips">
                    {leaveTypes.map(lt => (
                      <button key={lt._id} className={`m-chip ${selectedLeaveType === lt._id ? 'active' : ''}`} onClick={() => setSelectedLeaveType(lt._id)}>
                        {lt.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {reqType === 'Attendance Correction' && (
                <div className="m-input-group">
                  <label className="m-input-label">Time</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div className="m-input-wrap" style={{ flex: 1 }}>
                      <LogIn size={16} color="var(--m-success)" />
                      <input type="time" value={manualIn} onChange={e => setManualIn(e.target.value)} disabled={isMissingPunchOut} />
                    </div>
                    <div className="m-input-wrap" style={{ flex: 1 }}>
                      <LogOut size={16} color="var(--m-danger)" />
                      <input type="time" value={manualOut} onChange={e => setManualOut(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {reqType === 'Attendance Correction' && (
                <div className="m-input-group">
                  <label className="m-input-label">Work Report *</label>
                  <div className="m-input-wrap m-textarea-wrap">
                    <textarea placeholder="Describe your work for this day..." value={workSummary} onChange={e => setWorkSummary(e.target.value)} rows={3} />
                  </div>
                </div>
              )}

              <div className="m-input-group">
                <label className="m-input-label">Reason *</label>
                <div className="m-input-wrap m-textarea-wrap">
                  <textarea placeholder="Provide a reason..." value={reason} onChange={e => setReason(e.target.value)} rows={3} />
                </div>
              </div>

              <button className="m-btn m-btn-primary m-btn-full" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <><div className="m-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />Submitting...</> : <><Send size={18} />Submit Request</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
