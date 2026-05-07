import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Clock, Search, RefreshCw, LogIn, LogOut, Users, CheckCircle, XCircle, Coffee, Plus, Save, MapPin, X } from 'lucide-react';
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
  const [searchParams] = useSearchParams();
  const today = new Date();
  const [date, setDate] = useState(today.toISOString().split('T')[0]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All');
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
      if (json.success) {
        fetchRecords();
        if (selectedRecord && (selectedRecord._id === attendanceId)) {
          setSelectedRecord(prev => ({ ...prev, approvalStatus: status }));
        }
      }
    } catch (e) { console.error(e); }
  };

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchesSearch = (
      r.employee?.name?.toLowerCase().includes(q) ||
      r.employee?.employeeId?.toLowerCase().includes(q) ||
      r.employee?.department?.toLowerCase().includes(q)
    );
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
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
    <div className="hrm-container">
      {/* Header */}
      <div className="hrm-header">
        <div>
          <h1 className="hrm-title">Attendance Monitoring</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '14px' }}>Real-time employee punch logs and approval workflow</p>
        </div>
        <div className="hrm-header-actions" style={{ gap: '12px' }}>
          <div style={{ display: 'flex', background: 'var(--bg-main)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border)' }}>
            {['day', 'month'].map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                background: viewMode === v ? '#fff' : 'transparent',
                color: viewMode === v ? 'var(--primary-blue)' : 'var(--text-muted)',
                boxShadow: viewMode === v ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}>
                {v === 'day' ? 'Daily' : 'Monthly'}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            {viewMode === 'day' ? (
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="hrm-input" style={{ width: '160px', height: '40px' }} />
            ) : (
              <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="hrm-input" style={{ width: '160px', height: '40px' }} />
            )}
          </div>

          <button className="btn-hrm btn-hrm-success" onClick={() => setManualModal(true)} style={{ height: '40px' }}>
            <Plus size={18} /> MANUAL ENTRY
          </button>
          
          {/* <button className="btn-hrm btn-hrm-primary" onClick={fetchRecords} style={{ height: '40px' }}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> REFRESH
          </button> */}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {[
          { label: 'Total Logs', count: records.length, color: 'var(--primary-blue)', bg: 'var(--primary-light)', icon: <Users size={24} /> },
          { label: 'Present Today', count: counts['Present'] || 0, color: 'var(--success)', bg: 'var(--success-light)', icon: <CheckCircle size={24} /> },
          { label: 'Absent Today', count: counts['Absent'] || 0, color: 'var(--danger)', bg: 'var(--danger-light)', icon: <XCircle size={24} /> },
          { label: 'Half Day', count: counts['Half Day'] || 0, color: 'var(--warning)', bg: 'var(--warning-light)', icon: <Clock size={24} /> },
          { label: 'Pending Approvals', count: counts.pending, color: '#6366F1', bg: '#EEF2FF', icon: <Clock size={24} /> },
        ].map((s, i) => (
          <div key={i} className="hrm-card" style={{ 
            padding: '24px', display: 'flex', alignItems: 'center', gap: '20px', 
            borderLeft: `5px solid ${s.color}`, transition: 'transform 0.2s ease'
          }}>
            <div style={{ 
              background: s.bg, color: s.color, width: '56px', height: '56px', 
              borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-dark)', lineHeight: 1.1 }}>{s.count}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Card */}
      <div className="hrm-card">
        <div className="hrm-card-header" style={{ justifyContent: 'space-between', padding: '24px' }}>
          <div style={{ position: 'relative', width: '400px' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text" className="hrm-input" placeholder="Search employee name, ID or department..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '48px', background: 'var(--bg-main)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>FILTER BY:</label>
            <select 
              className="hrm-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ width: '180px', margin: 0, height: '44px' }}
            >
              <option value="All">All Attendance Status</option>
              <option value="Present">Present Only</option>
              <option value="Absent">Absent Only</option>
              <option value="Half Day">Half Day Only</option>
              <option value="On Leave">On Leave Only</option>
            </select>
          </div>
        </div>

        <div className="hrm-table-wrapper" style={{ border: 'none' }}>
          <table className="hrm-table">
            <thead>
              <tr>
                <th style={{ width: '220px' }}>Employee</th>
                <th style={{ width: '120px' }}>Date</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '140px' }}>Approval</th>
                <th>Punch In</th>
                <th>Punch Out</th>
                <th>Working Hours</th>
                <th>Breaks</th>
                <th style={{ minWidth: '200px' }}>Punch Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '80px' }}>
                  <RefreshCw className="animate-spin" size={32} color="var(--primary-blue)" style={{ marginBottom: '16px' }} />
                  <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Loading records...</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '80px' }}>
                  <Calendar size={48} color="var(--text-muted)" style={{ marginBottom: '16px', opacity: 0.3 }} />
                  <p style={{ color: 'var(--text-dark)', fontWeight: '800', fontSize: '16px', margin: 0 }}>No records found</p>
                  <p style={{ color: 'var(--text-muted)', margin: '8px 0 0' }}>Try adjusting your filters or date selection</p>
                </td></tr>
              ) : (
                filtered.map((r, i) => {
                  return (
                    <tr key={r._id || i} onClick={() => { setSelectedRecord(r); setDrawerOpen(true); }} style={{ cursor: 'pointer' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px' }}>
                            {r.employee?.name?.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-dark)', fontSize: '14px' }}>{r.employee?.name || '—'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{r.employee?.employeeId} · {r.employee?.department || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', fontWeight: '600' }}>
                        {r.date ? new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className={`hrm-badge ${r.status === 'Present' ? 'hrm-badge-success' : r.status === 'Absent' ? 'hrm-badge-danger' : r.status === 'Half Day' ? 'hrm-badge-warning' : 'hrm-badge-primary'}`} style={{ fontSize: '10px' }}>
                            {r.status || '—'}
                          </span>
                          {r.isExtraDay && (
                            <span className="hrm-badge" style={{ fontSize: '9px', background: '#F5F3FF', color: '#8B5CF6', border: '1px solid #DDD6FE' }}>EXTRA DAY</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="hrm-badge" style={{ 
                          fontSize: '10px', 
                          background: r.approvalStatus === 'Approved' ? 'var(--success-light)' : r.approvalStatus === 'Rejected' ? 'var(--danger-light)' : 'var(--warning-light)',
                          color: r.approvalStatus === 'Approved' ? 'var(--success)' : r.approvalStatus === 'Rejected' ? 'var(--danger)' : 'var(--warning)',
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          {r.approvalStatus === 'Approved' ? <CheckCircle size={12} /> : r.approvalStatus === 'Rejected' ? <XCircle size={12} /> : <Clock size={12} />}
                          {r.approvalStatus || 'Pending'}
                        </span>
                      </td>
                      <td>
                        {r.punchIn ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--success)' }}>
                            <LogIn size={13} /> {r.punchIn}
                            {r.punches?.find(p => p.type === 'IN')?.latitude && (
                                <button onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps?q=${r.punches.find(p => p.type === 'IN').latitude},${r.punches.find(p => p.type === 'IN').longitude}`, '_blank'); }} 
                                  style={{ padding: '4px', borderRadius: '6px', border: 'none', background: 'var(--bg-main)', color: 'var(--primary-blue)', cursor: 'pointer' }}><MapPin size={12} /></button>
                            )}
                          </div>
                        ) : <span style={{ color: 'var(--border)' }}>—</span>}
                      </td>
                      <td>
                        {r.punchOut ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--danger)' }}>
                            <LogOut size={13} /> {r.punchOut}
                            {[...(r.punches || [])].reverse().find(p => p.type === 'OUT')?.latitude && (
                                <button onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps?q=${[...r.punches].reverse().find(p => p.type === 'OUT').latitude},${[...r.punches].reverse().find(p => p.type === 'OUT').longitude}`, '_blank'); }} 
                                  style={{ padding: '4px', borderRadius: '6px', border: 'none', background: 'var(--bg-main)', color: 'var(--primary-blue)', cursor: 'pointer' }}><MapPin size={12} /></button>
                            )}
                          </div>
                        ) : <span style={{ color: 'var(--border)' }}>—</span>}
                      </td>
                      <td style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary-blue)' }}>{r.workingFormatted || '—'}</td>
                      <td>{r.breakCount > 0 ? <span className="hrm-badge" style={{ fontSize: '10px', background: '#F5F3FF', color: '#8B5CF6' }}><Coffee size={12} /> {r.breakCount} Breaks</span> : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '240px' }}>
                          {r.punches?.slice(0, 2).map((p, idx) => {
                            const notes = [p.workSummary, p.earlyReason, p.geofenceReason].filter(Boolean).join(' | ');
                            if (!notes) return null;
                            return (
                              <div key={idx} style={{ 
                                padding: '4px 8px', borderRadius: '6px', background: 'var(--bg-main)', 
                                border: '1px solid var(--border)', fontSize: '10px', color: 'var(--text-secondary)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                              }}>
                                <span style={{ fontWeight: '800', color: p.type === 'IN' ? 'var(--success)' : 'var(--danger)' }}>{p.type}: </span>{notes}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {drawerOpen && selectedRecord && (
        <div className="hrm-modal-overlay" style={{ justifyContent: 'flex-end', padding: 0 }}>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0 }} />
          <div className="hrm-modal-content" style={{ 
            width: '500px', height: '100%', borderRadius: 0, margin: 0,
            display: 'flex', flexDirection: 'column', animation: 'slideIn 0.3s ease-out'
          }}>
            <div className="hrm-modal-header" style={{ padding: '24px', background: 'var(--bg-main)' }}>
              <h2 style={{ margin: 0 }}>Attendance Log Details</h2>
              <button className="icon-btn" onClick={() => setDrawerOpen(false)}><XCircle size={24} /></button>
            </div>

            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
              <div className="hrm-card" style={{ padding: '20px', marginBottom: '24px', background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--primary-blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '20px' }}>
                    {selectedRecord.employee?.name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-dark)' }}>{selectedRecord.employee?.name}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>{selectedRecord.employee?.employeeId} · {selectedRecord.employee?.department}</p>
                  </div>
                  <span className="hrm-badge" style={{ 
                    padding: '6px 16px', background: selectedRecord.approvalStatus === 'Approved' ? 'var(--success-light)' : 'var(--warning-light)',
                    color: selectedRecord.approvalStatus === 'Approved' ? 'var(--success)' : 'var(--warning)', fontWeight: '800'
                  }}>
                    {selectedRecord.approvalStatus || 'Pending'}
                  </span>
                </div>
              </div>

              <h4 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Punch Timeline</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selectedRecord.punches?.map((p, idx) => (
                  <div key={idx} className="hrm-card" style={{ 
                    padding: '20px', borderLeft: `5px solid ${p.type === 'IN' ? 'var(--success)' : 'var(--danger)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: '900', fontSize: '14px', color: p.type === 'IN' ? 'var(--success)' : 'var(--danger)' }}>{p.type === 'IN' ? 'PUNCH IN' : 'PUNCH OUT'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-dark)' }}>{new Date(p.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        {p.latitude && (
                          <button onClick={() => window.open(`https://www.google.com/maps?q=${p.latitude},${p.longitude}`, '_blank')}
                            style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'var(--bg-main)', color: 'var(--primary-blue)', cursor: 'pointer' }}><MapPin size={14} /></button>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {p.workSummary && <div style={{ fontSize: '13px' }}><b style={{ color: 'var(--text-muted)' }}>Work Summary:</b> <span style={{ color: 'var(--text-dark)' }}>{p.workSummary}</span></div>}
                      {p.geofenceReason && <div style={{ fontSize: '13px', background: 'var(--warning-light)', padding: '8px', borderRadius: '8px' }}><b style={{ color: 'var(--warning)' }}>Out of Range:</b> <span style={{ color: 'var(--text-dark)' }}>{p.geofenceReason}</span></div>}
                      {p.locationAddress && <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '4px' }}><MapPin size={12} /> {p.locationAddress}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {selectedRecord.approvalStatus === 'Pending' && (
                <div style={{ marginTop: '32px', padding: '24px', borderRadius: '20px', background: 'var(--bg-main)', border: '2px dashed var(--border)' }}>
                  <p style={{ fontWeight: '800', fontSize: '15px', textAlign: 'center', margin: '0 0 20px' }}>Final Review & Approval</p>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button className="btn-hrm btn-hrm-success" onClick={() => handleApproval(selectedRecord._id, 'Approved')} style={{ flex: 1, height: '48px' }}>APPROVE</button>
                    <button className="btn-hrm btn-hrm-danger" onClick={() => handleApproval(selectedRecord._id, 'Rejected')} style={{ flex: 1, height: '48px' }}>REJECT</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {manualModal && (
        <div className="hrm-modal-overlay">
          <div className="hrm-modal-content" style={{ maxWidth: '540px' }}>
            <div className="hrm-modal-header">
              <h2>Add Manual Attendance</h2>
              <button className="icon-btn" onClick={() => setManualModal(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleManualSubmit}>
              <div className="hrm-modal-body">
                <div className="hrm-form-group">
                  <SearchableSelect
                    label="Select Employee" required placeholder="Search an employee by name or ID..."
                    options={employees.map(emp => ({ label: `${emp.name} (${emp.employeeId})`, value: emp._id }))}
                    value={manualData.employeeId}
                    onChange={(val) => setManualData({ ...manualData, employeeId: val })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="hrm-form-group">
                    <label className="hrm-label">Date <span className="req">*</span></label>
                    <input type="date" required className="hrm-input" value={manualData.date} onChange={e => setManualData({...manualData, date: e.target.value})} />
                  </div>
                  <div className="hrm-form-group">
                    <label className="hrm-label">Status <span className="req">*</span></label>
                    <select className="hrm-select" value={manualData.status} onChange={e => setManualData({ ...manualData, status: e.target.value })}>
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Half Day">Half Day</option>
                      <option value="On Leave">On Leave</option>
                    </select>
                  </div>
                </div>

                {manualData.status !== 'Absent' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="hrm-form-group">
                      <label className="hrm-label">Punch In Time</label>
                      <input type="time" className="hrm-input" value={manualData.inTime} onChange={e => setManualData({...manualData, inTime: e.target.value})} />
                    </div>
                    <div className="hrm-form-group">
                      <label className="hrm-label">Punch Out Time</label>
                      <input type="time" className="hrm-input" value={manualData.outTime} onChange={e => setManualData({...manualData, outTime: e.target.value})} />
                    </div>
                  </div>
                )}

                <div className="hrm-form-group">
                  <label className="hrm-label">Administrator Remarks</label>
                  <textarea className="hrm-textarea" value={manualData.remark} onChange={e => setManualData({...manualData, remark: e.target.value})} placeholder="Reason for manual entry..." style={{ height: '80px' }} />
                </div>
              </div>
              <div className="hrm-modal-footer">
                <button type="button" className="btn-hrm btn-hrm-secondary" onClick={() => setManualModal(false)}>CANCEL</button>
                <button type="submit" className="btn-hrm btn-hrm-primary" disabled={formLoading} style={{ minWidth: '160px' }}>
                  {formLoading ? <RefreshCw className="animate-spin" size={18} /> : 'SAVE ATTENDANCE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminAttendance;
