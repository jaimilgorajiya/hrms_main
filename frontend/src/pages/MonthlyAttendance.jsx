import React, { useState, useEffect } from 'react';
import { 
    Users, ChevronLeft, ChevronRight, Clock, LogIn, LogOut, 
    Coffee, X, Calendar, Activity, TrendingUp, AlertCircle, 
    CheckCircle2, MinusCircle, User, Briefcase
} from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';

const STATUS_STYLE = {
    'Present':    { color: '#10B981', bg: '#DCFCE7', dot: '#10B981', icon: <CheckCircle2 size={14} /> },
    'Absent':     { color: '#EF4444', bg: '#FEE2E2', dot: '#EF4444', icon: <X size={14} /> },
    'Half Day':   { color: '#F59E0B', bg: '#FEF3C7', dot: '#F59E0B', icon: <Activity size={14} /> },
    'On Leave':   { color: '#8B5CF6', bg: '#EDE9FE', dot: '#8B5CF6', icon: <Calendar size={14} /> },
    'Week Off':   { color: '#64748B', bg: '#F1F5F9', dot: '#94A3B8', icon: <MinusCircle size={14} /> },
    'Extra Day':  { color: '#0EA5E9', bg: '#E0F2FE', dot: '#0EA5E9', icon: <TrendingUp size={14} /> },
    'Missing':    { color: '#F97316', bg: '#FFF7ED', dot: '#F97316', icon: <AlertCircle size={14} /> },
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const StatCard = ({ label, value, color, icon, subValue }) => (
    <div className="hrm-card" style={{ 
        flex: '1 1 140px', padding: '16px 20px', 
        display: 'flex', flexDirection: 'column', 
        justifyContent: 'space-between', minWidth: '140px',
        border: '1px solid #E2E8F0', background: 'white',
        boxShadow: '0 4px 12px -2px rgba(0,0,0,0.03)'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
            <div style={{ 
                color: color || 'var(--primary-blue)', 
                background: (color || 'var(--primary-blue)') + '15', 
                padding: '8px', borderRadius: '10px' 
            }}>{icon}</div>
            {subValue && <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: '20px' }}>{subValue}</span>}
        </div>
        <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#1E293B', lineHeight: 1.2 }}>{value}</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>{label}</div>
        </div>
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
    const [selectedDay, setSelectedDay] = useState(null);

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

    const buildCells = () => {
        const [y, m] = month.split('-').map(Number);
        const firstDay = new Date(y, m - 1, 1).getDay();
        const daysInMonth = new Date(y, m, 0).getDate();
        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${month}-${String(d).padStart(2, '0')}`;
            const dayName = DAY_NAMES[new Date(y, m - 1, d).getDay()];
            const isWeekOff = (data?.weekOffDays || []).includes(dayName);
            const rec = data?.records?.find(r => r.date === dateStr) || null;
            const isExtraDay = isWeekOff && rec && rec.punchIn;
            cells.push({ date: dateStr, day: d, dayName, isWeekOff, isExtraDay, rec });
        }
        return cells;
    };

    const s = data?.stats;
    const cells = data ? buildCells() : [];
    const currentEmp = employees.find(e => e._id === selectedEmp);

    return (
        <div className="hrm-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div className="hrm-header" style={{ marginBottom: '32px' }}>
                <div>
                    <h1 className="hrm-title" style={{ fontSize: '28px', marginBottom: '4px' }}>Monthly Attendance</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Track and analyze individual attendance performance</p>
                </div>
            </div>

            {/* Filter Section */}
            <div className="hrm-card" style={{ marginBottom: '24px', overflow: 'visible', padding: '24px' }}>
                <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <SearchableSelect
                            label="Select Employee"
                            options={employees.map(e => ({ label: `${e.name} (${e.employeeId || 'N/A'})`, value: e._id }))}
                            value={selectedEmp}
                            onChange={setSelectedEmp}
                            placeholder="Search by name or ID..."
                            searchable
                        />
                    </div>
                    
                    <div style={{ minWidth: '240px' }}>
                        <label className="hrm-label" style={{ marginBottom: '8px', display: 'block' }}>Reporting Month</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '6px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                            <button className="icon-btn" style={{ width: '36px', height: '36px', borderRadius: '10px' }} onClick={() => shiftMonth(-1)}>
                                <ChevronLeft size={18} />
                            </button>
                            <div style={{ flex: 1, textAlign: 'center', fontWeight: 800, color: '#1E293B', fontSize: '14px', letterSpacing: '0.5px' }}>
                                {monthLabel()}
                            </div>
                            <button className="icon-btn" style={{ width: '36px', height: '36px', borderRadius: '10px' }} onClick={() => shiftMonth(1)}>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {!selectedEmp ? (
                <div className="hrm-card" style={{ textAlign: 'center', padding: '100px 40px', border: '2px dashed #E2E8F0', background: 'transparent' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#CBD5E1', boxShadow: '0 8px 16px -4px rgba(0,0,0,0.05)' }}>
                        <Users size={40} />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', margin: '0 0 8px' }}>No Employee Selected</h3>
                    <p style={{ color: '#64748B', maxWidth: '300px', margin: '0 auto', fontSize: '14px', lineHeight: 1.5 }}>Please select an employee from the dropdown above to view their monthly attendance insights.</p>
                </div>
            ) : loading ? (
                <div className="hrm-card" style={{ textAlign: 'center', padding: '100px 40px' }}>
                    <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                    <p style={{ color: '#64748B', fontWeight: 600 }}>Analyzing attendance data...</p>
                </div>
            ) : data ? (
                <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                    {/* Insights Grid */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
                        <StatCard icon={<CheckCircle2 size={18} />} label="Days Present" value={s.presentDays} color="#10B981" subValue={`${Math.round((s.presentDays/s.workingDays)*100)}%`} />
                        <StatCard icon={<X size={18} />} label="Days Absent" value={s.absentDays} color="#EF4444" />
                        <StatCard icon={<Calendar size={18} />} label="Approved Leaves" value={s.leaves} color="#8B5CF6" />
                        <StatCard icon={<Clock size={18} />} label="Total Hours" value={`${s.totalWorkedHours}h`} color="#3B82F6" subValue={`${s.totalWorkedMins}m`} />
                        <StatCard icon={<Activity size={18} />} label="Efficiency Score" value={`${s.efficiency}%`} color={s.efficiency >= 80 ? '#10B981' : s.efficiency >= 50 ? '#F59E0B' : '#EF4444'} />
                        <StatCard icon={<AlertCircle size={18} />} label="Late / Missing" value={s.lateIn + s.missingPunch} color="#F59E0B" subValue={`${s.lateIn} Late`} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
                        {/* Calendar Card */}
                        <div className="hrm-card" style={{ padding: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Calendar size={20} />
                                    </div>
                                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', margin: 0 }}>Attendance Calendar</h2>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    {['Present', 'Absent', 'Half Day', 'On Leave'].map(l => (
                                        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_STYLE[l].dot }}></div>
                                            {l.toUpperCase()}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
                                {DAY_LABELS.map(d => (
                                    <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 800, color: '#94A3B8', paddingBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{d}</div>
                                ))}
                                {cells.map((cell, i) => {
                                    if (!cell) return <div key={`empty-${i}`} style={{ height: '90px' }} />;
                                    
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
                                                height: '90px',
                                                borderRadius: '20px',
                                                padding: '12px',
                                                cursor: 'pointer',
                                                background: isSelected ? st.dot : (isToday ? '#F8FAFC' : 'white'),
                                                border: isToday ? `2px solid ${st.dot}` : (isSelected ? `2px solid ${st.dot}` : '1.5px solid #F1F5F9'),
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                                boxShadow: isSelected ? `0 12px 24px -8px ${st.dot}50` : 'none',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <div style={{ 
                                                fontSize: '16px', fontWeight: 800, 
                                                color: isSelected ? 'white' : '#1E293B',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'start'
                                            }}>
                                                {cell.day}
                                                {!isSelected && <div style={{ color: st.dot }}>{st.icon}</div>}
                                            </div>
                                            
                                            {cell.rec?.punchIn && !isSelected && (
                                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Clock size={10} /> {cell.rec.punchIn}
                                                </div>
                                            )}
                                            
                                            {isSelected && (
                                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>
                                                    {status}
                                                </div>
                                            )}

                                            {!isSelected && (
                                                <div style={{ 
                                                    height: '4px', width: '100%', borderRadius: '2px', 
                                                    background: st.dot, opacity: status === 'Absent' ? 0.2 : 1
                                                }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Detail Side Panel */}
                        <div style={{ position: 'sticky', top: '24px' }}>
                            {selectedDay ? (
                                <div className="hrm-card" style={{ padding: '24px', animation: 'slideInRight 0.3s ease-out', border: '1px solid #E2E8F0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
                                        <div>
                                            <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary-blue)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px' }}>
                                                {selectedDay.dayName}
                                            </p>
                                            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                                                {new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                                            </h3>
                                        </div>
                                        <button className="icon-btn" onClick={() => setSelectedDay(null)} style={{ background: '#F1F5F9' }}>
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {(() => {
                                        const { rec, isWeekOff, isExtraDay } = selectedDay;
                                        const isMissingPunch = rec && rec.punchIn && !rec.punchOut;
                                        const status = isExtraDay ? 'Extra Day' : isMissingPunch ? 'Missing' : isWeekOff ? 'Week Off' : (rec?.status || 'Absent');
                                        const st = STATUS_STYLE[status] || STATUS_STYLE['Absent'];
                                        
                                        return (
                                            <>
                                                <div style={{ 
                                                    background: st.bg, padding: '16px', borderRadius: '16px', 
                                                    display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' 
                                                }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'white', color: st.dot, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                                        {st.icon}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '11px', fontWeight: 800, color: st.color, opacity: 0.8, textTransform: 'uppercase' }}>Current Status</div>
                                                        <div style={{ fontSize: '16px', fontWeight: 800, color: st.color }}>{status}</div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    <div style={{ padding: '16px', borderRadius: '16px', border: '1.5px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <LogIn size={18} color="#10B981" />
                                                        <div>
                                                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Punch In</div>
                                                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>{rec?.punchIn || '--:--'}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ padding: '16px', borderRadius: '16px', border: '1.5px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <LogOut size={18} color="#EF4444" />
                                                        <div>
                                                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Punch Out</div>
                                                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>{rec?.punchOut || '--:--'}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ padding: '16px', borderRadius: '16px', border: '1.5px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <Clock size={18} color="#3B82F6" />
                                                        <div>
                                                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Duration</div>
                                                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>{rec?.workingFormatted || '0h 0m'}</div>
                                                        </div>
                                                    </div>
                                                    {rec?.approvalStatus && (
                                                        <div style={{ padding: '16px', borderRadius: '16px', background: '#FFFBEB', border: '1.5px solid #FEF3C7', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <Coffee size={18} color="#D97706" />
                                                            <div>
                                                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#B45309' }}>Approval Status</div>
                                                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#92400E' }}>{rec.approvalStatus}</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="hrm-card" style={{ padding: '40px 24px', textAlign: 'center', border: '2px dashed #E2E8F0', background: 'transparent' }}>
                                    <div style={{ color: '#CBD5E1', marginBottom: '16px' }}>
                                        <Activity size={40} />
                                    </div>
                                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B', margin: '0 0 8px' }}>Day Insights</h4>
                                    <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>Select any date from the calendar to view detailed punch logs and shift info.</p>
                                </div>
                            )}

                            {/* Mini Employee Summary */}
                            {currentEmp && (
                                <div className="hrm-card" style={{ marginTop: '24px', padding: '20px', background: 'var(--primary-blue)', color: 'white', border: 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '15px', fontWeight: 800 }}>{currentEmp.name}</div>
                                            <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8 }}>{currentEmp.designation}</div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px' }}>
                                            <div style={{ fontSize: '10px', fontWeight: 700, opacity: 0.8 }}>Emp ID</div>
                                            <div style={{ fontSize: '13px', fontWeight: 800 }}>{currentEmp.employeeId || 'N/A'}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px' }}>
                                            <div style={{ fontSize: '10px', fontWeight: 700, opacity: 0.8 }}>Dept.</div>
                                            <div style={{ fontSize: '13px', fontWeight: 800 }}>{currentEmp.department || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default MonthlyAttendance;
