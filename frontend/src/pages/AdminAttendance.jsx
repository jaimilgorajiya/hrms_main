import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Search, RefreshCw, LogIn, LogOut, Users, CheckCircle, XCircle, Coffee, Plus, Save } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const statusColors = {
  Present: { color: '#10B981', bg: '#ECFDF5' },
  Absent: { color: '#EF4444', bg: '#FEF2F2' },
  'Half Day': { color: '#F59E0B', bg: '#FFFBEB' },
  'On Leave': { color: '#8B5CF6', bg: '#F5F3FF' },
};

const approvalColors = {
  Approved: { color: '#10B981', bg: '#ECFDF5', icon: <CheckCircle size={14} /> },
  Rejected: { color: '#EF4444', bg: '#FEF2F2', icon: <XCircle size={14} /> },
  Pending: { color: '#F59E0B', bg: '#FFFBEB', icon: <Clock size={14} /> },
};

const AdminAttendance = () => {
  const today = new Date();
  const [date, setDate] = useState(today.toISOString().split('T')[0]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'month'
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [manualModal, setManualModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [manualData, setManualData] = useState({
    employeeId: '',
    date: today.toISOString().split('T')[0],
    status: 'Present',
    inTime: '09:00',
    outTime: '18:00',
    remark: ''
  });

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

  const fetchEmployees = async () => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/users`);
      const json = await res.json();
      if (json.success) setEmployees(json.users);
    } catch (e) { console.error(e); }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await authenticatedFetch(`${API_URL}/api/attendance/admin/add-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualData)
      });
      const json = await res.json();
      if (json.success) {
        setManualModal(false);
        setManualData({ ...manualData, employeeId: '', remark: '' });
        fetchRecords();
      } else {
        alert(json.message);
      }
    } catch (e) { console.error(e); }
    finally { setFormLoading(false); }
  };

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { if (manualModal) fetchEmployees(); }, [manualModal]);

  const handleApproval = async (attendanceId, status) => {
    try {
      const res = await authenticatedFetch(`${API_URL}/api/attendance/admin/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceId, status })
      });
      const json = await res.json();
      if (json.success) fetchRecords();
    } catch (e) { console.error(e); }
  };

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
    acc.pending = (acc.pending || 0) + (r.approvalStatus === 'Pending' ? 1 : 0);
    return acc;
  }, { pending: 0 });

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

          <button onClick={() => setManualModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            background: '#10B981', color: 'white', border: 'none', borderRadius: '10px',
            fontSize: '14px', fontWeight: '600', cursor: 'pointer'
          }}>
            <Plus size={15} /> Add Attendance
          </button>

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
          { label: 'Pending', count: counts.pending, color: '#F59E0B', bg: '#FFFBEB', icon: <Clock size={18} /> },
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
                  {['Employee', 'Date', 'Status', 'Approval', 'Punch In', 'Punch Out', 'Working Hours', 'Breaks', 'Remarks/Logs'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
                  <tbody>
                    {filtered.map((r, i) => {
                      const cfg = statusColors[r.status] || { color: '#64748b', bg: '#F8FAFC' };
                      const photo = getPhotoUrl(r.employee?.profilePhoto);
                      return (
                        <tr key={r._id || i} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s', cursor: 'pointer' }}
                          onClick={() => { setSelectedRecord(r); setDrawerOpen(true); }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={e => e.stopPropagation()}>
                          {r.approvalStatus === 'Pending' && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => handleApproval(r._id, 'Approved')} title="Approve" style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: '#ECFDF5', color: '#10B981', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
                                    <CheckCircle size={16} />
                                </button>
                                <button onClick={() => handleApproval(r._id, 'Rejected')} title="Reject" style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: '#FEF2F2', color: '#EF4444', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
                                    <XCircle size={16} />
                                </button>
                            </div>
                          )}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>{r.employee?.name || '—'}</div>
                            </div>
                            <div style={{ fontSize: '12px', color: '#94A3B8' }}>{r.employee?.employeeId} · {r.employee?.department || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155', whiteSpace: 'nowrap' }}>
                        {r.date ? new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span style={{
                            background: cfg.bg, color: cfg.color, padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap'
                          }}>
                            {r.status || '—'}
                          </span>
                          {r.isExtraDay && (
                            <span style={{
                              background: '#F5F3FF', color: '#8B5CF6', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.02em', border: '1px solid #DDD6FE'
                            }}>
                              Extra Day
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          background: approvalColors[r.approvalStatus]?.bg || '#F8FAFC', 
                          color: approvalColors[r.approvalStatus]?.color || '#64748b', 
                          padding: '4px 12px', borderRadius: '999px', fontSize: '12px', 
                          fontWeight: '700', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}>
                          {approvalColors[r.approvalStatus]?.icon}
                          {r.approvalStatus || 'Pending'}
                        </span>
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
                            const notes = [p.workSummary, p.earlyReason, p.geofenceReason, p.locationAddress].filter(Boolean).join(' | ');
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

      {/* Detail Drawer */}
      {drawerOpen && selectedRecord && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }} />
          <div style={{ 
            position: 'relative', width: '500px', height: '100%', background: '#fff', 
            boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: '800', fontSize: '18px' }}>Attendance Details</h3>
              <button onClick={() => setDrawerOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                <XCircle size={24} />
              </button>
            </div>

            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
              {/* Employee Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '16px', background: '#F8FAFC', borderRadius: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800' }}>
                  {selectedRecord.employee?.name?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '16px' }}>{selectedRecord.employee?.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedRecord.employee?.employeeId} · {selectedRecord.employee?.department}</div>
                </div>
              </div>

              {/* Logs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontWeight: '700', fontSize: '14px', textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.05em' }}>Punch Timeline</div>
                {selectedRecord.punches?.map((p, idx) => (
                  <div key={idx} style={{ 
                    padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0',
                    borderLeft: `4px solid ${p.type === 'IN' ? '#10B981' : '#EF4444'}`,
                    background: p.type === 'IN' ? '#F0FDF4' : '#FEF2F2'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '800', fontSize: '14px', color: p.type === 'IN' ? '#10B981' : '#EF4444' }}>{p.type === 'IN' ? 'Punch In' : 'Punch Out'}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>{new Date(p.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {p.workSummary && (
                        <div style={{ fontSize: '12px' }}>
                          <span style={{ fontWeight: '700', color: '#64748B' }}>Work Report: </span>
                          <span style={{ color: '#334155' }}>{p.workSummary}</span>
                        </div>
                      )}
                      {p.lateReason && (
                        <div style={{ fontSize: '12px' }}>
                          <span style={{ fontWeight: '700', color: '#64748B' }}>Late Reason: </span>
                          <span style={{ color: '#334155' }}>{p.lateReason}</span>
                        </div>
                      )}
                      {p.earlyReason && (
                        <div style={{ fontSize: '12px' }}>
                          <span style={{ fontWeight: '700', color: '#64748B' }}>Early Out Reason: </span>
                          <span style={{ color: '#334155' }}>{p.earlyReason}</span>
                        </div>
                      )}
                      {p.geofenceReason && (
                        <div style={{ fontSize: '12px' }}>
                          <span style={{ fontWeight: '700', color: '#64748B' }}>Out of Range Reason: </span>
                          <span style={{ color: '#334155', fontWeight: '600' }}>{p.geofenceReason}</span>
                        </div>
                      )}
                      {p.locationAddress && (
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <Search size={12} /> {p.locationAddress}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {/* Breaks */}
                {selectedRecord.breaks?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '0.05em' }}>Breaks Taken</div>
                    {selectedRecord.breaks.map((b, idx) => (
                      <div key={idx} style={{ 
                        padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #F1F5F9',
                        background: '#FAF5FF', borderLeft: '4px solid #8B5CF6'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '800', fontSize: '13px', color: '#8B5CF6' }}>{b.type || 'General'} Break</span>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
                            {new Date(b.start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            {' - '}
                            {b.end ? new Date(b.end).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Ongoing'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Approval Actions */}
              {selectedRecord.approvalStatus === 'Pending' && (
                <div style={{ marginTop: '32px', padding: '20px', borderRadius: '16px', background: '#F1F5F9', border: '1px dashed #CBD5E1' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '12px', textAlign: 'center' }}>Review this record</div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => handleApproval(selectedRecord._id, 'Approved')} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#10B981', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Approve</button>
                    <button onClick={() => handleApproval(selectedRecord._id, 'Rejected')} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#EF4444', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>Reject</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {manualModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={() => setManualModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Add Attendance</h3>
                <button onClick={() => setManualModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><XCircle size={20} /></button>
              </div>
            </div>
            
            <form onSubmit={handleManualSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <SearchableSelect
                    label="Select Employee"
                    required
                    placeholder="Search an employee..."
                    searchable={true}
                    options={employees.map(emp => ({ label: `${emp.name} (${emp.employeeId})`, value: emp._id }))}
                    value={manualData.employeeId}
                    onChange={(val) => setManualData({ ...manualData, employeeId: val })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
                  <div>
                    <label className="hrm-label">Date</label>
                    <input type="date" required className="hrm-input"
                      value={manualData.date}
                      onChange={e => setManualData({...manualData, date: e.target.value})}
                      style={{ height: '48px' }}
                    />
                  </div>
                  <div>
                    <SearchableSelect
                      label="Status"
                      required
                      options={[
                        { label: 'Present', value: 'Present' },
                        { label: 'Absent', value: 'Absent' },
                        { label: 'Half Day', value: 'Half Day' },
                        { label: 'On Leave', value: 'On Leave' },
                      ]}
                      value={manualData.status}
                      onChange={(val) => setManualData({ ...manualData, status: val })}
                    />
                  </div>
                </div>

                {manualData.status !== 'Absent' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>In Time</label>
                      <input type="time"
                        value={manualData.inTime}
                        onChange={e => setManualData({...manualData, inTime: e.target.value})}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #E2E8F0', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>Out Time</label>
                      <input type="time"
                        value={manualData.outTime}
                        onChange={e => setManualData({...manualData, outTime: e.target.value})}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #E2E8F0', outline: 'none' }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>Remark</label>
                  <textarea
                    value={manualData.remark}
                    onChange={e => setManualData({...manualData, remark: e.target.value})}
                    placeholder="E.g. Technical issue, Manual entry..."
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #E2E8F0', outline: 'none', resize: 'none', height: '60px' }}
                  />
                </div>

                <button type="submit" disabled={formLoading} style={{
                  marginTop: '10px', width: '100%', padding: '12px', borderRadius: '12px',
                  background: '#2563EB', color: '#fff', border: 'none', fontWeight: '700',
                  cursor: 'pointer', transition: 'all 0.2s', opacity: formLoading ? 0.7 : 1
                }}>
                  {formLoading ? <RefreshCw className="animate-spin" size={18} /> : 'Save Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
};

export default AdminAttendance;
