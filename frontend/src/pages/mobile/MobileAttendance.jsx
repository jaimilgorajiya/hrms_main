import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertTriangle, Clock, X, Send, LogIn, LogOut, CalendarDays, CreditCard, AlertCircle } from 'lucide-react';
import { useMobileAuth } from './context/MobileAuthContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO } from 'date-fns';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDayClass(dateStr, markedDates, selectedDate) {
  const m = markedDates[dateStr];
  let typeClass = '';
  if (m) {
    if (m.type === 'holiday') typeClass = 'holiday';
    else if (m.type === 'weekend') typeClass = 'weekend';
    else if (m.type === 'present') typeClass = 'present';
    else if (m.type === 'absent') typeClass = 'absent';
    else if (m.type === 'paid-leave') typeClass = 'paid-leave';
    else if (m.type === 'unpaid-leave') typeClass = 'unpaid-leave';
    else if (m.type === 'leave') typeClass = 'paid-leave';
    else if (m.type === 'missing') typeClass = 'missing';
  }
  if (dateStr === selectedDate) {
    return `selected ${typeClass}`.trim();
  }
  return typeClass;
}

export default function MobileAttendance() {
  const { apiFetch } = useMobileAuth();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [requests, setRequests] = useState({});
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [stats, setStats] = useState({ present: 0, absent: 0, missing: 0, paidLeaves: 0, unpaidLeaves: 0 });
  const [empStats, setEmpStats] = useState(null);
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
    let sPresent = 0, sAbsent = 0, sMissing = 0, sPaidLeaves = 0, sUnpaidLeaves = 0;

    eachDayOfInterval({ start, end }).forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayName = format(day, 'EEEE');
      const isWeekend = woDays.includes(dayName);
      const r = lookup[dateStr];
      const req = reqs[dateStr];

      if (r) {
        const isMissing = r.punchIn && !r.punchOut && dateStr < today && r.status !== 'On Leave' && r.status !== 'Leave';
        if (isMissing) {
          marked[dateStr] = { type: 'missing' };
          if (!req || (req.status !== 'Pending' && req.status !== 'Approved')) sMissing++;
        } else if (r.status === 'Present' || r.status === 'Clocked In' || (r.punchIn && dateStr === today)) {
          marked[dateStr] = { type: 'present' };
          sPresent++;
        } else if (r.status === 'Absent') {
          marked[dateStr] = { type: 'absent' };
          sAbsent++;
        } else if (r.status === 'Leave' || r.status === 'On Leave' || r.leaveCategory) {
          const cat = r.leaveCategory || req?.leaveCategory || 'Paid';
          const isPaid = String(cat).toLowerCase() === 'paid';
          marked[dateStr] = {
            type: isPaid ? 'paid-leave' : 'unpaid-leave',
            leaveCategory: cat,
            leaveTypeName: r.leaveTypeName || req?.leaveType || 'Leave',
            leaveDuration: r.leaveDuration || req?.leaveDuration || 'Full Day',
          };
          if (isPaid) sPaidLeaves++; else sUnpaidLeaves++;
        } else if (r.status === 'Holiday') {
          marked[dateStr] = { type: 'holiday' };
        } else {
          marked[dateStr] = { type: 'missing' };
        }
      } else if (req) {
        if (req.status === 'Approved') {
          if (req.type === 'Leave') {
            const cat = req.leaveCategory || 'Paid';
            const isPaid = String(cat).toLowerCase() === 'paid';
            marked[dateStr] = {
              type: isPaid ? 'paid-leave' : 'unpaid-leave',
              leaveCategory: cat,
              leaveTypeName: req.leaveType || 'Leave',
              leaveDuration: req.leaveDuration || 'Full Day',
            };
            if (isPaid) sPaidLeaves++; else sUnpaidLeaves++;
          } else {
            marked[dateStr] = { type: 'present' };
            sPresent++;
          }
        } else if (req.status === 'Pending') {
          marked[dateStr] = { type: 'missing' };
        }
      } else if (isWeekend) {
        marked[dateStr] = { type: 'weekend' };
      } else if (dateStr < today && (!jDate || dateStr >= jDate)) {
        marked[dateStr] = { type: 'absent' };
        sAbsent++;
      }
    });

    setMarkedDates(marked);
    setStats({ present: sPresent, absent: sAbsent, missing: sMissing, paidLeaves: sPaidLeaves, unpaidLeaves: sUnpaidLeaves });
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
      if (statsJson.success) {
        setUserProfile(statsJson.employee);
        setEmpStats(statsJson.stats);
      }
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

  const isLeaveDay = 
    selectedRecord?.status === 'On Leave' || 
    selectedRecord?.status === 'Leave' || 
    Boolean(selectedRecord?.leaveCategory) ||
    (currentRequest?.type === 'Leave' && currentRequest?.status === 'Approved') ||
    markedDates[selectedDate]?.type === 'paid-leave' ||
    markedDates[selectedDate]?.type === 'unpaid-leave';

  const leaveCategoryVal = 
    selectedRecord?.leaveCategory || 
    currentRequest?.leaveCategory || 
    markedDates[selectedDate]?.leaveCategory || 
    'Paid';
  const isPaidLeave = isLeaveDay && String(leaveCategoryVal).toLowerCase() === 'paid';
  const isUnpaidLeave = isLeaveDay && String(leaveCategoryVal).toLowerCase() === 'unpaid';

  const leaveTypeName = selectedRecord?.leaveTypeName || currentRequest?.leaveType || markedDates[selectedDate]?.leaveTypeName || 'Leave';
  const leaveDurationVal = selectedRecord?.leaveDuration || currentRequest?.leaveDuration || markedDates[selectedDate]?.leaveDuration || 'Full Day';
  const leaveReason = currentRequest?.reason || selectedRecord?.workSummary || '';

  const hasPunches = Boolean(selectedRecord?.punchIn || selectedRecord?.punchOut);
  const isPunchComplete = Boolean(selectedRecord?.punchIn && selectedRecord?.punchOut);
  const isMissingPunchOut = Boolean(selectedRecord?.punchIn && !selectedRecord?.punchOut && selectedDate < today && !isLeaveDay);
  const isHoliday = selectedRecord?.status === 'Holiday' || markedDates[selectedDate]?.type === 'holiday';

  const isPastWorkingDay = selectedDate < today && (!joiningDate || selectedDate >= joiningDate) && !weekOffDays.includes(format(new Date(selectedDate + 'T00:00:00'), 'EEEE'));

  const isAbsent = !isLeaveDay && !isHoliday && isPastWorkingDay && (
    !selectedRecord || 
    selectedRecord.status === 'Absent' || 
    (!selectedRecord.punchIn && !selectedRecord.punchOut)
  );

  const canRequestAttendance = Boolean(
    selectedDate && 
    !isLeaveDay && 
    !isHoliday && 
    selectedDate <= today && 
    (!currentRequest || currentRequest.status === 'Rejected') && 
    (!isPunchComplete || isAbsent || isMissingPunchOut)
  );

  const canRequestLeave = Boolean(
    selectedDate && 
    !isLeaveDay && 
    !isHoliday && 
    (!currentRequest || currentRequest.status === 'Rejected') && 
    (!isPunchComplete || isAbsent)
  );

  const canRequest = canRequestAttendance || canRequestLeave;

  const handleSubmit = async () => {
    if (reqType === 'Leave') {
      if (!selectedLeaveType) return showToast('Select a leave type', 'error');
      const maxLimit = empStats?.maxUsagePerMonth || empStats?.totalLeaves || 0;
      if (leaveCategory === 'Paid' && maxLimit > 0 && (empStats?.usedLeaves || 0) >= maxLimit) {
        return showToast(`Monthly paid leave limit reached (${maxLimit})`, 'error');
      }
    }
    if (reqType === 'Attendance Correction' && !workSummary.trim()) return showToast('Work report is required', 'error');
    if (!reason.trim()) return showToast('Reason is required', 'error');
    setSubmitting(true);
    try {
      const payload = {
        requestType: reqType,
        date: selectedDate,
        reason,
        ...(reqType === 'Leave' && { 
          leaveType: selectedLeaveType, 
          leaveDuration, 
          leaveCategory,
          fromDate: selectedDate,
          toDate: selectedDate 
        }),
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
            ...(stats.missing > 0 ? [{ val: stats.missing, label: 'Missing', color: 'var(--m-warning)' }] : []),
            { val: stats.paidLeaves, label: 'Paid Leave', color: '#0891B2' },
            { val: stats.unpaidLeaves, label: 'Unpaid Leave', color: '#64748B' },
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
              const mark = markedDates[dateStr];
              return (
                <div
                  key={dateStr}
                  className={`m-cal-day ${dayClass} ${isToday && !dayClass.includes('selected') ? 'today' : ''}`}
                  onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                >
                  <span className="m-cal-day-num">{day.getDate()}</span>
                  {mark?.type && (
                    <span className={`day-dot ${mark.type}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--m-border)' }}>
            {[
              { color: 'var(--m-success)', label: 'Present' },
              { color: 'var(--m-danger)', label: 'Absent' },
              { color: '#0891B2', label: 'Paid Leave' },
              { color: '#64748B', label: 'Unpaid Leave' },
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isLeaveDay ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 20,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: isPaidLeave ? 'rgba(6, 182, 212, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                      color: isPaidLeave ? '#0891B2' : '#64748B',
                      border: `1px solid ${isPaidLeave ? 'rgba(6, 182, 212, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`
                    }}
                  >
                    {isPaidLeave ? <CheckCircle size={12} color="#0891B2" /> : <AlertCircle size={12} color="#64748B" />}
                    {isPaidLeave ? 'Paid Leave' : 'Unpaid Leave'}
                  </span>
                ) : isAbsent ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 20,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: 'var(--m-danger)',
                      border: '1px solid rgba(239, 68, 68, 0.25)'
                    }}
                  >
                    <XCircle size={12} color="var(--m-danger)" /> Absent
                  </span>
                ) : isMissingPunchOut ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 20,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: 'var(--m-warning)',
                      border: '1px solid rgba(245, 158, 11, 0.25)'
                    }}
                  >
                    <AlertTriangle size={12} color="var(--m-warning)" /> Missing Punch
                  </span>
                ) : null}
                <button onClick={() => setSelectedDate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m-muted)', padding: 2 }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {isLeaveDay ? (
              <div>
                <div style={{
                  background: isPaidLeave ? 'rgba(6, 182, 212, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  border: `1px solid ${isPaidLeave ? 'rgba(6, 182, 212, 0.2)' : 'rgba(100, 116, 139, 0.2)'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CalendarDays size={16} color={isPaidLeave ? '#0891B2' : '#64748B'} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-text)' }}>
                        {leaveTypeName}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: isPaidLeave ? 'rgba(6, 182, 212, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                      color: isPaidLeave ? '#0891B2' : '#64748B'
                    }}>
                      {leaveDurationVal}
                    </span>
                  </div>
                  {leaveReason ? (
                    <div style={{ fontSize: 12, color: 'var(--m-muted)', marginTop: 6, lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: 'var(--m-text)' }}>Reason: </span>
                      {leaveReason}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--m-muted)', marginTop: 4 }}>
                      Approved leave recorded for this day
                    </div>
                  )}
                </div>

                {/* If punch records exist (e.g. for half-day leave), show them */}
                {hasPunches && (
                  <div style={{ marginTop: 12 }}>
                    <div className="m-detail-row">
                      <span className="m-detail-label"><LogIn size={14} color="var(--m-success)" />Punch In</span>
                      <span className="m-detail-value">{selectedRecord.punchIn || '—'}</span>
                    </div>
                    <div className="m-detail-row">
                      <span className="m-detail-label"><LogOut size={14} color="var(--m-danger)" />Punch Out</span>
                      <span className="m-detail-value">{selectedRecord.punchOut || '—'}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : isAbsent ? (
              <div>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 14,
                  padding: '14px 16px',
                  marginBottom: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    <XCircle size={16} color="var(--m-danger)" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--m-danger)' }}>
                      No Punches Recorded
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--m-muted)', lineHeight: 1.5 }}>
                    You forgot to punch on this day. You can apply for attendance correction or apply for leave below.
                  </p>
                </div>
              </div>
            ) : isMissingPunchOut ? (
              <div>
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  marginBottom: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    <AlertTriangle size={15} color="var(--m-warning)" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--m-warning)' }}>
                      Missing Punch Out
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--m-muted)' }}>
                    Punched in at <b>{selectedRecord.punchIn}</b>, but punch out was missed.
                  </div>
                </div>
                <div className="m-detail-row">
                  <span className="m-detail-label"><LogIn size={14} color="var(--m-success)" />Punch In</span>
                  <span className="m-detail-value">{selectedRecord.punchIn}</span>
                </div>
                <div className="m-detail-row">
                  <span className="m-detail-label"><LogOut size={14} color="var(--m-warning)" />Punch Out</span>
                  <span className="m-detail-value" style={{ color: 'var(--m-warning)', fontWeight: 700 }}>Missing</span>
                </div>
              </div>
            ) : selectedRecord && hasPunches ? (
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
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-text)' }}>
                    {currentRequest.type === 'Leave' ? `${currentRequest.leaveCategory || 'Paid'} Leave` : currentRequest.type}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--m-muted)' }}>{currentRequest.reason}</div>
              </div>
            ) : (
              <div style={{ color: 'var(--m-muted)', fontSize: 13, textAlign: 'center', padding: '10px 0' }}>
                {weekOffDays.includes(format(new Date(selectedDate + 'T00:00:00'), 'EEEE')) ? '🌴 Week Off' : 'No records for this day'}
              </div>
            )}

            {canRequest && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
                {canRequestAttendance && (
                  <button
                    className="m-btn m-btn-primary m-btn-full"
                    style={{
                      justifyContent: 'center',
                      gap: 8,
                      padding: '11px 16px',
                      fontSize: 13,
                      fontWeight: 700,
                      borderRadius: 14
                    }}
                    onClick={() => {
                      setReqType('Attendance Correction');
                      if (selectedRecord?.punchIn) {
                        const match = selectedRecord.punchIn.match(/(\d{1,2}):(\d{2})/);
                        if (match) setManualIn(`${match[1].padStart(2, '0')}:${match[2]}`);
                      } else {
                        setManualIn('09:30');
                      }
                      setManualOut('18:30');
                      setShowModal(true);
                    }}
                  >
                    <Clock size={16} /> Apply for Attendance Correction
                  </button>
                )}

                {canRequestLeave && (
                  <button
                    className="m-btn m-btn-full"
                    style={{
                      justifyContent: 'center',
                      gap: 8,
                      padding: '11px 16px',
                      fontSize: 13,
                      fontWeight: 700,
                      borderRadius: 14,
                      background: 'rgba(79, 70, 229, 0.08)',
                      border: '1.5px solid var(--m-primary)',
                      color: 'var(--m-primary)'
                    }}
                    onClick={() => {
                      setReqType('Leave');
                      setShowModal(true);
                    }}
                  >
                    <CalendarDays size={16} /> Apply for Leave
                  </button>
                )}
              </div>
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

              <div className="m-input-group">
                <label className="m-input-label">Request Type</label>
                <div className="m-segment">
                  <button 
                    className={`m-segment-btn ${reqType === 'Attendance Correction' ? 'active' : ''}`} 
                    onClick={() => setReqType('Attendance Correction')}
                    disabled={selectedDate > today}
                    style={selectedDate > today ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    Attendance Correction
                  </button>
                  <button className={`m-segment-btn ${reqType === 'Leave' ? 'active' : ''}`} onClick={() => setReqType('Leave')}>
                    Leave
                  </button>
                </div>
              </div>

              {reqType === 'Leave' && leaveTypes.length > 0 && (
                <div className="m-input-group">
                  <label className="m-input-label">Leave Type</label>
                  <div className="m-chips">
                    {leaveTypes.filter(lt => {
                      if (userProfile?.gender) {
                        if (lt.applicableFor === 'Male Only' && userProfile.gender !== 'Male') return false;
                        if (lt.applicableFor === 'Female Only' && userProfile.gender !== 'Female') return false;
                      }
                      return true;
                    }).map(lt => (
                      <button key={lt._id} className={`m-chip ${selectedLeaveType === lt._id ? 'active' : ''}`} onClick={() => setSelectedLeaveType(lt._id)}>
                        {lt.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {reqType === 'Leave' && empStats?.leavePolicy !== 'Multiple of 1' && (
                <div className="m-input-group">
                  <label className="m-input-label">Duration</label>
                  <div className="m-segment">
                    {['Full Day', 'First Half', 'Second Half'].map(d => (
                      <button key={d} className={`m-segment-btn ${leaveDuration === d ? 'active' : ''}`} onClick={() => { setLeaveDuration(d); }}>
                        {d === 'Full Day' ? 'Full' : d === 'First Half' ? '1st Half' : '2nd Half'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {reqType === 'Leave' && (
                <div className="m-input-group">
                  <label className="m-input-label">Category</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className={`m-chip ${leaveCategory === 'Paid' ? 'active' : ''}`} onClick={() => setLeaveCategory('Paid')}>
                      <CreditCard size={12} /> Paid
                    </button>
                    {empStats?.canApplyUnpaidLeave && (
                      <button className={`m-chip ${leaveCategory === 'Unpaid' ? 'active' : ''}`} onClick={() => setLeaveCategory('Unpaid')}>
                        <AlertCircle size={12} /> Unpaid
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--m-muted)', marginTop: 4, fontWeight: 600 }}>
                    {leaveCategory === 'Paid' ? '* Deducted from paid leave balance' : '* Not deducted from paid leave balance'}
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
                  <textarea placeholder={reqType === 'Leave' ? "Explain the reason for your leave..." : "Provide a reason..."} value={reason} onChange={e => setReason(e.target.value)} rows={3} />
                </div>
              </div>

              <button className="m-btn m-btn-primary m-btn-full" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <><div className="m-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />Submitting...</> : <><Send size={18} />{reqType === 'Leave' ? 'Submit Application' : 'Submit Request'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
