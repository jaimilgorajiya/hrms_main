import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Search, RefreshCw, LogIn, LogOut, Users, CheckCircle, XCircle, Coffee } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const statusColors = {
  Present: { color: '#10B981', bg: '#ECFDF5' },
  Absent: { color: '#EF4444', bg: '#FEF2F2' },
  'Half Day': { color: '#F59E0B', bg: '#FFFBEB' },
  'On Leave': { color: '#8B5CF6', bg: '#F5F3FF' },
};

const AdminAttendance = () => {
  const today = new Date();
  const [date, setDate] = useState(today.toISOString().split('T')[0]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'month'
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const query = viewMode === 'day' ? `date=${date}` : `month=${month}`;
      const res = await authenticatedFetch(`${API_URL}/api/attendance/admin/all?${query}`);
      const json = await res.json();
      if (json.success) setRecords(json.records);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [date, month, viewMode]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return (
      r.employee?.name?.toLowerCase().includes(q) ||
      r.employee?.employeeId?.toLowerCase().includes(q) ||
      r.employee?.department?.toLowerCase().includes(q)
    );
  });

  const counts = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const getPhotoUrl = (photo) => {
    if (!photo) return null;
    return photo.startsWith('http') ? photo : `${API_URL}/uploads/${photo}`;
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Attendance</h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Monitor employee punch in/out records</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '10px', padding: '3px' }}>
            {['day', 'month'].map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                background: viewMode === v ? '#fff' : 'transparent',
                color: viewMode === v ? '#2563EB' : '#64748b',
                boxShadow: viewMode === v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}>
                {v === 'day' ? 'Daily' : 'Monthly'}
              </button>
            ))}
          </div>

          {viewMode === 'day' ? (
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '14px', color: '#334155', outline: 'none' }} />
          ) : (
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: '10px', fontSize: '14px', color: '#334155', outline: 'none' }} />
          )}

          <button onClick={fetchRecords} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            background: '#2563EB', color: 'white', border: 'none', borderRadius: '10px',
            fontSize: '14px', fontWeight: '600', cursor: 'pointer'
          }}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total', count: records.length, color: '#2563EB', bg: '#EFF6FF', icon: <Users size={18} /> },
          { label: 'Present', count: counts['Present'] || 0, color: '#10B981', bg: '#ECFDF5', icon: <CheckCircle size={18} /> },
          { label: 'Absent', count: counts['Absent'] || 0, color: '#EF4444', bg: '#FEF2F2', icon: <XCircle size={18} /> },
          { label: 'Half Day', count: counts['Half Day'] || 0, color: '#F59E0B', bg: '#FFFBEB', icon: <Clock size={18} /> },
          { label: 'On Leave', count: counts['On Leave'] || 0, color: '#8B5CF6', bg: '#F5F3FF', icon: <Calendar size={18} /> },
        ].map((s, i) => (
          <div key={i} style={{
            background: s.bg, borderRadius: '14px', padding: '18px 20px',
            borderLeft: `4px solid ${s.color}`, display: 'flex', alignItems: 'center', gap: '14px'
          }}>
            <div style={{ color: s.color }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '360px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
        <input
          type="text" placeholder="Search by name, ID, department..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px 10px 38px', border: '1.5px solid #E2E8F0',
            borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
            color: '#334155'
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
            <p>Loading attendance...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94A3B8' }}>
            <Calendar size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
            <p style={{ margin: 0, fontWeight: '600' }}>No records found</p>
            <p style={{ margin: '4px 0 0', fontSize: '13px' }}>No attendance data for the selected {viewMode === 'day' ? 'date' : 'month'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Employee', 'Date', 'Status', 'Punch In', 'Punch Out', 'Working Hours', 'Breaks', 'Remarks/Logs'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const cfg = statusColors[r.status] || { color: '#64748b', bg: '#F8FAFC' };
                  const photo = getPhotoUrl(r.employee?.profilePhoto);
                  return (
                    <tr key={r._id || i} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {photo ? (
                            <img src={photo} alt="" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover' }} />
                          ) : (
                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(r.employee?.name || 'E')}&background=2563EB&color=fff&size=36`}
                              alt="" style={{ width: '36px', height: '36px', borderRadius: '10px' }} />
                          )}
                          <div>
                            <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{r.employee?.name || '—'}</div>
                            <div style={{ fontSize: '12px', color: '#94A3B8' }}>{r.employee?.employeeId} · {r.employee?.department || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155', whiteSpace: 'nowrap' }}>
                        {r.date ? new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          background: cfg.bg, color: cfg.color, padding: '4px 12px',
                          borderRadius: '999px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap'
                        }}>{r.status}</span>
                        {r.isPunchedIn && (
                          <span style={{ marginLeft: '6px', background: '#ECFDF5', color: '#10B981', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '600' }}>● Live</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155', whiteSpace: 'nowrap' }}>
                        {r.punchIn ? <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><LogIn size={13} color="#10B981" />{r.punchIn}</span> : <span style={{ color: '#CBD5E1' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155', whiteSpace: 'nowrap' }}>
                        {r.punchOut ? <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><LogOut size={13} color="#EF4444" />{r.punchOut}</span> : <span style={{ color: '#CBD5E1' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#2563EB', whiteSpace: 'nowrap' }}>
                        {r.workingFormatted || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {r.breakCount > 0 ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Coffee size={13} /> {r.breakCount}</span> : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748b' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '200px' }}>
                          {r.punches?.map((p, idx) => {
                            const notes = [p.workSummary, p.earlyReason, p.geofenceReason].filter(Boolean).join(' | ');
                            if (!notes) return null;
                            return (
                              <div key={idx} style={{ 
                                padding: '4px 8px', borderRadius: '6px', background: '#F8FAFC', 
                                border: '1px solid #E2E8F0', fontSize: '11px', lineHeight: 1.3 
                              }}>
                                <span style={{ fontWeight: '700', color: p.type === 'IN' ? '#10B981' : '#EF4444' }}>{p.type}: </span>
                                {notes}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminAttendance;
