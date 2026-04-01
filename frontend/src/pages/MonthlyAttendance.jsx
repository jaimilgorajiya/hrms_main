import React, { useState, useEffect } from 'react';
import { Users, ChevronLeft, ChevronRight, Clock, LogIn, LogOut, Coffee, X } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';

const STATUS_STYLE = {
    'Present':    { color: '#10B981', bg: '#DCFCE7', dot: '#10B981' },
    'Absent':     { color: '#EF4444', bg: '#FEE2E2', dot: '#EF4444' },
    'Half Day':   { color: '#F59E0B', bg: '#FEF3C7', dot: '#F59E0B' },
    'On Leave':   { color: '#8B5CF6', bg: '#EDE9FE', dot: '#8B5CF6' },
    'Week Off':   { color: '#94A3B8', bg: '#F1F5F9', dot: '#CBD5E1' },
    'Extra Day':  { color: '#0EA5E9', bg: '#E0F2FE', dot: '#0EA5E9' },
    'Missing':    { color: '#F97316', bg: '#FFF7ED', dot: '#F97316' }, // Orange for missing punch out
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const StatCard = ({ label, value, color }) => (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '14px 18px', flex: 1, minWidth: 110, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: color || '#1e293b' }}>{value}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{label}</div>
    </div>
);

const MonthlyAttendance = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null); // { date, rec, isWeekOff }

    useEffect(() => {
        authenticatedFetch(`${API_URL}/api/users`)
            .then(r => r.json())
            .then(j => { if (j.success) setEmployees(j.users); })
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (!selectedEmp || !month) { setData(null); return; }
        setLoading(true);
        setSelectedDay(null);
        authenticatedFetch(`${API_URL}/api/attendance/admin/monthly-stats?month=${month}&employeeId=${selectedEmp}`)
            .then(r => r.json())
            .then(j => { if (j.success) setData(j); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [selectedEmp, month]);

    const shiftMonth = (dir) => {
        const [y, m] = month.split('-').map(Number);
        const d = new Date(y, m - 1 + dir, 1);
        setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    };

    const monthLabel = () => {
        const [y, m] = month.split('-').map(Number);
        return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    // Build calendar cells: leading blanks + day cells
    const buildCells = () => {
        const [y, m] = month.split('-').map(Number);
        const firstDay = new Date(y, m - 1, 1).getDay(); // 0=Sun
        const daysInMonth = new Date(y, m, 0).getDate();
        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(null); // blanks
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${month}-${String(d).padStart(2, '0')}`;
            const dayName = DAY_NAMES[new Date(y, m - 1, d).getDay()];
            const isWeekOff = (data?.weekOffDays || []).includes(dayName);
            const rec = data?.records?.find(r => r.date === dateStr) || null;
            // Extra Day: week-off but employee actually punched in
            const isExtraDay = isWeekOff && rec && rec.punchIn;
            cells.push({ date: dateStr, day: d, dayName, isWeekOff, isExtraDay, rec });
        }
        return cells;
    };

    const s = data?.stats;
    const cells = data ? buildCells() : [];

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <h1 className="hrm-title">Monthly Attendance</h1>
            </div>

            {/* Filters */}
            <div className="hrm-card" style={{ marginBottom: 20, overflow: 'visible' }}>
                <div className="hrm-card-body">
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, minWidth: 260 }}>
                            <SearchableSelect
                                label="Employee"
                                options={employees.map(e => ({ label: `${e.name} (${e.employeeId || ''})`, value: e._id }))}
                                value={selectedEmp}
                                onChange={setSelectedEmp}
                                placeholder="-- Select Employee --"
                                searchable
                            />
                        </div>
                        <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                            <label className="hrm-label">Month</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button className="btn-hrm btn-hrm-secondary" style={{ padding: '10px 12px' }} onClick={() => shiftMonth(-1)}>
                                    <ChevronLeft size={16} />
                                </button>
                                <span style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', minWidth: 150, textAlign: 'center' }}>{monthLabel()}</span>
                                <button className="btn-hrm btn-hrm-secondary" style={{ padding: '10px 12px' }} onClick={() => shiftMonth(1)}>
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Empty / loading states */}
            {!selectedEmp && (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
                    <Users size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
                    <p style={{ fontSize: 15 }}>Select an employee to view monthly attendance.</p>
                </div>
            )}
            {selectedEmp && loading && (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8', fontSize: 15 }}>Loading...</div>
            )}

            {selectedEmp && !loading && data && (
                <>
                    {/* Stat strip */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                        <StatCard label="Working Days"  value={s.workingDays}  color="#1e293b" />
                        <StatCard label="Present"       value={s.presentDays}  color="#10B981" />
                        <StatCard label="Absent"        value={s.absentDays}   color="#EF4444" />
                        <StatCard label="Leaves"        value={s.leaves}       color="#8B5CF6" />
                        <StatCard label="Week Off"      value={s.weekOff}      color="#94A3B8" />
                        <StatCard label="Extra Days"    value={cells.filter(c => c?.isExtraDay).length} color="#0EA5E9" />
                        <StatCard label="Late In"       value={s.lateIn}       color="#F59E0B" />
                        <StatCard label="Early Out"     value={s.earlyOut}     color="#F97316" />
                        <StatCard label="Missing Out"   value={s.missingPunch} color="#F43F5E" />
                        <StatCard label="Efficiency"    value={`${s.efficiency}%`} color={s.efficiency >= 80 ? '#10B981' : s.efficiency >= 50 ? '#F59E0B' : '#EF4444'} />
                        <StatCard label="Worked"        value={`${s.totalWorkedHours}h ${s.totalWorkedMins}m`} color="#3B82F6" />
                    </div>

                    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                        {/* Calendar */}
                        <div className="hrm-card" style={{ flex: 1, overflow: 'visible' }}>
                            <div className="hrm-card-body">
                                {/* Day headers */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
                                    {DAY_LABELS.map(d => (
                                        <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: d === 'Sun' || d === 'Sat' ? '#94a3b8' : '#64748b', padding: '4px 0' }}>{d}</div>
                                    ))}
                                </div>
                                {/* Day cells */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                                    {cells.map((cell, i) => {
                                        if (!cell) return <div key={`blank-${i}`} />;
                                        
                                        // Detect missing punch out (Ghost Punch)
                                        const isMissingPunch = cell.rec && cell.rec.punchIn && !cell.rec.punchOut;

                                        const status = cell.isExtraDay ? 'Extra Day' : 
                                                      isMissingPunch ? 'Missing' :
                                                      cell.isWeekOff ? 'Week Off' : 
                                                      (cell.rec?.status || 'Absent');

                                        const st = STATUS_STYLE[status] || STATUS_STYLE['Absent'];
                                        const isToday = cell.date === todayStr;
                                        const isSelected = selectedDay?.date === cell.date;
                                        return (
                                            <div
                                                key={cell.date}
                                                onClick={() => setSelectedDay(isSelected ? null : cell)}
                                                style={{
                                                    borderRadius: 10,
                                                    padding: '8px 6px',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    background: isSelected ? st.dot : st.bg,
                                                    border: isToday ? `2px solid ${st.dot}` : `1px solid ${isSelected ? st.dot : '#e2e8f0'}`,
                                                    transition: 'all 0.15s',
                                                    userSelect: 'none',
                                                }}
                                            >
                                                <div style={{ fontSize: 14, fontWeight: isToday ? 700 : 500, color: isSelected ? '#fff' : '#1e293b', marginBottom: 4 }}>{cell.day}</div>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.8)' : st.dot, margin: '0 auto' }} />
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Legend */}
                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                                    {Object.entries(STATUS_STYLE).map(([label, st]) => (
                                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: st.dot }} />
                                            {label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Day detail panel */}
                        {selectedDay ? (() => {
                            const { date, rec, isWeekOff, isExtraDay } = selectedDay;
                            const isMissingPunch = rec && rec.punchIn && !rec.punchOut;
                            const status = isExtraDay ? 'Extra Day' : 
                                          isMissingPunch ? 'Missing' :
                                          isWeekOff ? 'Week Off' : 
                                          (rec?.status || 'Absent');
                            const st = STATUS_STYLE[status] || STATUS_STYLE['Absent'];
                            return (
                                <div className="hrm-card" style={{ width: 300, flexShrink: 0 }}>
                                    <div className="hrm-card-body">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <div>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                                                    {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                                                    {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' })}
                                                </div>
                                            </div>
                                            <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
                                                <X size={18} />
                                            </button>
                                        </div>

                                        {/* Status badge */}
                                        <div style={{ background: st.bg, borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
                                            <span style={{ fontWeight: 600, color: st.color, fontSize: 14 }}>{status}</span>
                                        </div>

                                        {rec ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {/* Punch In */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                                                    <LogIn size={16} color="#10B981" />
                                                    <div>
                                                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Punch In</div>
                                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{rec.punchIn || '—'}</div>
                                                    </div>
                                                </div>
                                                {/* Punch Out */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                                                    <LogOut size={16} color="#EF4444" />
                                                    <div>
                                                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Punch Out</div>
                                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{rec.punchOut || '—'}</div>
                                                    </div>
                                                </div>
                                                {/* Work Hours */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                                                    <Clock size={16} color="#3B82F6" />
                                                    <div>
                                                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Work Hours</div>
                                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{rec.workingFormatted || '—'}</div>
                                                    </div>
                                                </div>
                                                {/* Approval */}
                                                {rec.approvalStatus && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                                                        <Coffee size={16} color="#F59E0B" />
                                                        <div>
                                                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Approval</div>
                                                            <div style={{ fontSize: 14, fontWeight: 600, color: rec.approvalStatus === 'Approved' ? '#10B981' : rec.approvalStatus === 'Rejected' ? '#EF4444' : '#F59E0B' }}>
                                                                {rec.approvalStatus}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
                                                No attendance record for this day.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })() : (
                            <div style={{ width: 280, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: 13, textAlign: 'center', padding: 20 }}>
                                Click on a date to view attendance details
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default MonthlyAttendance;
