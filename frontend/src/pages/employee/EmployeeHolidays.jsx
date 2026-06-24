import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Flag, MapPin, Star, RefreshCw, Gift } from 'lucide-react';
import authenticatedFetch from '../../utils/apiHandler';
import API_URL from '../../config/api';
import '../../styles/EmployeePanel.css';

const TYPE_CONFIG = {
    National: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)',  icon: <Flag   size={14} />, label: 'National'  },
    Regional: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', icon: <MapPin size={14} />, label: 'Regional' },
    Optional: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)', icon: <Star   size={14} />, label: 'Optional' },
};

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const DAY_LABELS  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const EmployeeHolidays = () => {
    const [holidays,   setHolidays]   = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [year,       setYear]       = useState(new Date().getFullYear());
    const [activeTab,  setActiveTab]  = useState('upcoming'); // 'upcoming' | 'past' | 'calendar'
    const [calMonth,   setCalMonth]   = useState(new Date().getMonth());

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const fetchHolidays = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await authenticatedFetch(`${API_URL}/api/holidays/my?year=${year}`);
            const data = await res.json();
            if (data.success) setHolidays(data.holidays || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [year]);

    useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

    // ── Derived ──────────────────────────────────────────────────────────────
    const upcoming = useMemo(() => holidays.filter(h => h.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)), [holidays, todayStr]);
    const past     = useMemo(() => holidays.filter(h => h.date <  todayStr).sort((a, b) => b.date.localeCompare(a.date)), [holidays, todayStr]);

    // Days until next holiday
    const nextHoliday   = upcoming[0] || null;
    const daysUntilNext = nextHoliday
        ? Math.ceil((new Date(nextHoliday.date) - today) / (1000 * 60 * 60 * 24))
        : null;

    const formatDate = (dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    const getDayName = (dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'long' });
    };

    // ── Mini calendar data ────────────────────────────────────────────────────
    const buildCalCells = () => {
        const firstDay  = new Date(year, calMonth, 1).getDay();
        const daysInMon = new Date(year, calMonth + 1, 0).getDate();
        const hMap      = {};
        holidays.forEach(h => {
            const [y, m, d] = h.date.split('-').map(Number);
            if (y === year && m - 1 === calMonth) hMap[d] = h;
        });
        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMon; d++) cells.push({ day: d, holiday: hMap[d] || null });
        return cells;
    };

    const shiftCalMonth = (dir) => {
        const next = calMonth + dir;
        if (next < 0)  { setCalMonth(11); setYear(y => y - 1); }
        else if (next > 11) { setCalMonth(0);  setYear(y => y + 1); }
        else setCalMonth(next);
    };

    // ── Holiday card ─────────────────────────────────────────────────────────
    const HolidayCard = ({ h, showCountdown }) => {
        const tc      = TYPE_CONFIG[h.type] || TYPE_CONFIG.National;
        const isToday = h.date === todayStr;
        return (
            <div style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px',
                borderRadius: '16px', border: `1.5px solid ${isToday ? tc.color : 'var(--ep-border)'}`,
                background: isToday ? tc.bg : 'var(--ep-bg-card)',
                marginBottom: '10px', transition: 'all 0.2s',
            }}>
                {/* Date badge */}
                <div style={{ minWidth: '52px', textAlign: 'center', padding: '8px 6px', borderRadius: '12px', background: tc.bg, border: `1.5px solid ${tc.border}` }}>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: tc.color, lineHeight: 1 }}>
                        {h.date.split('-')[2]}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: tc.color, textTransform: 'uppercase' }}>
                        {MONTH_NAMES[parseInt(h.date.split('-')[1]) - 1].slice(0, 3)}
                    </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ep-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isToday && <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px', background: tc.color, color: 'white' }}>TODAY</span>}
                        {h.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ep-text-secondary)', fontWeight: 600, marginTop: '2px' }}>
                        {getDayName(h.date)}
                        {h.description && <span style={{ marginLeft: '8px', opacity: 0.7 }}>· {h.description}</span>}
                    </div>
                </div>

                {/* Type badge + countdown */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
                        {tc.icon} {h.type}
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '20px',
                        background: h.isPaid !== false ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color:      h.isPaid !== false ? '#10B981' : '#F59E0B',
                        border:     `1px solid ${h.isPaid !== false ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
                        {h.isPaid !== false ? '✓ Paid' : '✗ Unpaid'}
                    </span>
                    {showCountdown && !isToday && (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ep-text-muted)' }}>
                            in {Math.ceil((new Date(h.date) - today) / (1000 * 60 * 60 * 24))} day{Math.ceil((new Date(h.date) - today) / (1000 * 60 * 60 * 24)) !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="ep-page">
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="ep-page-header">
                <div>
                    <h2>Holiday Calendar</h2>
                    <p>{holidays.length} holidays in {year}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {/* Year picker */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--ep-bg-card)', border: '1.5px solid var(--ep-border)', borderRadius: '12px', padding: '6px 10px' }}>
                        <button onClick={() => setYear(y => y - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ep-text-secondary)', display: 'flex' }}>
                            <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ep-text-main)', minWidth: '44px', textAlign: 'center' }}>{year}</span>
                        <button onClick={() => setYear(y => y + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ep-text-secondary)', display: 'flex' }}>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    <button className="ep-btn-outline" onClick={fetchHolidays} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* ── Next holiday banner ───────────────────────────────────────── */}
            {!loading && nextHoliday && (
                <div style={{
                    padding: '16px 20px', borderRadius: '16px', marginBottom: '24px',
                    background: 'var(--ep-accent-blue)', color: 'white',
                    display: 'flex', alignItems: 'center', gap: '16px'
                }}>
                    <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Gift size={22} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: '15px' }}>
                            {daysUntilNext === 0 ? '🎉 Holiday Today!' : `Next Holiday in ${daysUntilNext} day${daysUntilNext !== 1 ? 's' : ''}`}
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.85, fontWeight: 600, marginTop: '2px' }}>
                            {nextHoliday.name} · {formatDate(nextHoliday.date)} · {getDayName(nextHoliday.date)}
                        </div>
                    </div>
                    <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(255,255,255,0.2)', fontSize: '12px', fontWeight: 800 }}>
                        {nextHoliday.type}
                    </span>
                </div>
            )}

            {/* ── Stat pills ────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                    const count = holidays.filter(h => h.type === type).length;
                    return (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '14px', background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
                            <span style={{ color: cfg.color }}>{cfg.icon}</span>
                            <span style={{ fontWeight: 800, fontSize: '13px', color: cfg.color }}>{count} {type}</span>
                        </div>
                    );
                })}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '14px', background: 'var(--ep-bg-card)', border: '1.5px solid var(--ep-border)' }}>
                    <Calendar size={14} color="var(--ep-accent-blue)" />
                    <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ep-text-main)' }}>{holidays.length} Total</span>
                </div>
            </div>

            {/* ── Tabs ─────────────────────────────────────────────────────── */}
            <div className="ep-tabs">
                <button className={`ep-tab ${activeTab === 'upcoming'  ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}>
                    Upcoming ({upcoming.length})
                </button>
                <button className={`ep-tab ${activeTab === 'past'      ? 'active' : ''}`} onClick={() => setActiveTab('past')}>
                    Past ({past.length})
                </button>
                <button className={`ep-tab ${activeTab === 'calendar'  ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
                    Calendar View
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '80px', textAlign: 'center' }}>
                    <RefreshCw className="animate-spin" size={28} color="var(--ep-accent-blue)" />
                </div>
            ) : (
                <>
                    {/* ── Upcoming ─────────────────────────────────────────── */}
                    {activeTab === 'upcoming' && (
                        <div className="ep-card" style={{ padding: '20px' }}>
                            {upcoming.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ep-text-muted)', fontWeight: 600 }}>
                                    <Calendar size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                                    <p>No upcoming holidays for {year}</p>
                                </div>
                            ) : upcoming.map(h => <HolidayCard key={h._id} h={h} showCountdown />)}
                        </div>
                    )}

                    {/* ── Past ─────────────────────────────────────────────── */}
                    {activeTab === 'past' && (
                        <div className="ep-card" style={{ padding: '20px' }}>
                            {past.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ep-text-muted)', fontWeight: 600 }}>
                                    <p>No past holidays found</p>
                                </div>
                            ) : past.map(h => <HolidayCard key={h._id} h={h} showCountdown={false} />)}
                        </div>
                    )}

                    {/* ── Calendar ─────────────────────────────────────────── */}
                    {activeTab === 'calendar' && (
                        <div className="ep-card" style={{ padding: '24px' }}>
                            {/* Month navigator */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <button onClick={() => shiftCalMonth(-1)} style={{ background: 'var(--ep-bg-main)', border: '1.5px solid var(--ep-border)', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', color: 'var(--ep-text-secondary)', display: 'flex' }}>
                                    <ChevronLeft size={18} />
                                </button>
                                <h3 style={{ fontWeight: 900, color: 'var(--ep-text-main)', margin: 0 }}>
                                    {MONTH_NAMES[calMonth]} {year}
                                </h3>
                                <button onClick={() => shiftCalMonth(1)} style={{ background: 'var(--ep-bg-main)', border: '1.5px solid var(--ep-border)', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', color: 'var(--ep-text-secondary)', display: 'flex' }}>
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            {/* Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                                {DAY_LABELS.map(d => (
                                    <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--ep-text-muted)', paddingBottom: '10px' }}>{d}</div>
                                ))}
                                {buildCalCells().map((cell, i) => {
                                    if (!cell) return <div key={`e-${i}`} />;
                                    const h   = cell.holiday;
                                    const tc  = h ? TYPE_CONFIG[h.type] : null;
                                    const isT = cell.day === today.getDate() && calMonth === today.getMonth() && year === today.getFullYear();
                                    return (
                                        <div key={i} style={{
                                            height: '52px', borderRadius: '12px', display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center', gap: '2px',
                                            background: h ? tc.bg : isT ? 'var(--ep-accent-blue)' : 'var(--ep-bg-main)',
                                            border: h ? `1.5px solid ${tc.border}` : isT ? '2px solid var(--ep-accent-blue)' : '1.5px solid var(--ep-border)',
                                            cursor: h ? 'default' : 'default',
                                        }}>
                                            <span style={{ fontSize: '14px', fontWeight: 800, color: h ? tc.color : isT ? 'white' : 'var(--ep-text-main)' }}>
                                                {cell.day}
                                            </span>
                                            {h && <span style={{ fontSize: '8px', fontWeight: 800, color: tc.color, maxWidth: '46px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                {h.name}
                                            </span>}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* This month's holidays list */}
                            {(() => {
                                const monthHolidays = holidays.filter(h => {
                                    const [y, m] = h.date.split('-').map(Number);
                                    return y === year && m - 1 === calMonth;
                                });
                                return monthHolidays.length > 0 ? (
                                    <div style={{ marginTop: '24px', borderTop: '1.5px solid var(--ep-border)', paddingTop: '20px' }}>
                                        <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ep-text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Holidays this month</p>
                                        {monthHolidays.map(h => <HolidayCard key={h._id} h={h} showCountdown={h.date >= todayStr} />)}
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '24px', textAlign: 'center', padding: '20px', color: 'var(--ep-text-muted)', fontWeight: 600, fontSize: '13px' }}>
                                        No holidays in {MONTH_NAMES[calMonth]}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </>
            )}

            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default EmployeeHolidays;
