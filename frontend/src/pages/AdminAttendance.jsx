import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Search, RefreshCw, LogIn, LogOut, Users, CheckCircle, XCircle, Coffee, Plus, Save, MapPin, X, ArrowRight, Map } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const AdminAttendance = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
        Swal.fire({
          title: 'Success!',
          text: 'Attendance log added successfully.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Error', json.message, 'error');
      }
    } catch (e) { console.error(e); }
    finally { setFormLoading(false); }
  };

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

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { if (manualModal) fetchEmployees(); }, [manualModal]);

  const [liveNow, setLiveNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchesSearch = (
      r.employee?.name?.toLowerCase().includes(q) ||
      r.employee?.employeeId?.toLowerCase().includes(q) ||
      r.employee?.department?.toLowerCase().includes(q)
    );
    const matchesStatus = statusFilter === 'All' || 
      (statusFilter === 'Present' ? ['Present', 'Clocked In', 'Half Day', 'HALF DAY'].includes(r.status) : 
       statusFilter === 'Half Day' ? ['Half Day', 'HALF DAY'].includes(r.status) : 
       r.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const counts = records.reduce((acc, r) => {
    const s = (r.status === 'Clocked In') ? 'Present' : r.status;
    acc[s] = (acc[s] || 0) + 1;
    acc.pending = (acc.pending || 0) + (r.approvalStatus === 'Pending' ? 1 : 0);
    return acc;
  }, { pending: 0 });

  return (
    <div className="hrm-container">
      <div className="hrm-header">
        <div>
          <h1 className="hrm-title">Attendance Monitoring</h1>
          </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-main)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border)', height: '44px' }}>
            {['day', 'month'].map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding: '0 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '800',
                background: viewMode === v ? 'var(--bg-base)' : 'transparent',
                color: viewMode === v ? 'var(--primary-blue)' : 'var(--text-muted)',
                boxShadow: viewMode === v ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center'
              }}>
                {v === 'day' ? 'DAILY' : 'MONTHLY'}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
            {viewMode === 'day' ? (
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="hrm-input" style={{ width: '180px', height: '44px', paddingLeft: '40px' }} />
            ) : (
              <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="hrm-input" style={{ width: '180px', height: '44px', paddingLeft: '40px' }} />
            )}
          </div>

          <button className="btn-hrm btn-hrm-success" onClick={() => navigate('/admin/attendance/add', { state: { openModal: true } })} style={{ height: '44px', padding: '0 24px', background: 'var(--success)', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)' }}>
            <Plus size={18} /> MANUAL ENTRY
          </button>
          
          <button className="btn-hrm btn-hrm-secondary" onClick={fetchRecords} style={{ height: '44px', background: 'var(--bg-base)', border: '1.5px solid var(--border)' }}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {[
          { label: 'Total Logs', count: records.length, color: 'var(--primary-blue)', icon: <Users size={24} /> },
          { label: 'Present Today', count: (counts['Present'] || 0) + (counts['Half Day'] || 0) + (counts['HALF DAY'] || 0), color: 'var(--success)', icon: <CheckCircle size={24} /> },
          { label: 'Absent Today', count: counts['Absent'] || 0, color: 'var(--danger)', icon: <XCircle size={24} /> },
          { label: 'Pending Approval', count: counts.pending, color: '#6366F1', icon: <Clock size={24} /> },
        ].map((s, i) => (
          <div key={i} className="hrm-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05, color: s.color }}>{React.cloneElement(s.icon, { size: 100 })}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${s.color}10`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-dark)' }}>{s.count}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hrm-card">
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative', width: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text" className="hrm-input" placeholder="Search employee name, ID or department..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '48px', background: 'var(--bg-main)' }}
            />
          </div>
          <div style={{ width: '220px' }}>
            <SearchableSelect 
              options={[
                { value: 'All', label: 'All Status' },
                { value: 'Present', label: 'Present' },
                { value: 'Absent', label: 'Absent' },
                { value: 'Half Day', label: 'Half Day' },
                { value: 'On Leave', label: 'On Leave' },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </div>

        <div className="hrm-table-container">
          <table className="hrm-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: '24px' }}>Employee</th>
                <th>Status</th>
                <th>Punch In</th>
                <th>Punch Out</th>
                <th>Working Hours</th>
                <th>Approval</th>
                <th style={{ textAlign: 'center', paddingRight: '24px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '80px' }}>
                  <RefreshCw className="animate-spin" size={32} color="var(--primary-blue)" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '80px' }}>
                  <Users size={48} color="var(--text-muted)" style={{ opacity: 0.2, marginBottom: '16px' }} />
                  <p style={{ fontWeight: '800', color: 'var(--text-dark)' }}>No Records Found</p>
                </td></tr>
              ) : (
                filtered.map(r => {
                  let displayHours = r.workingFormatted || '00:00';
                  if (r.status === 'Clocked In' && r.punches?.length > 0) {
                    const firstIn = r.punches.find(p => p.type === 'IN');
                    if (firstIn) {
                      const start = new Date(firstIn.time);
                      if (liveNow - start < 20 * 3600 * 1000) {
                        const diffMins = Math.max(0, Math.round((liveNow - start) / 60000));
                        const h = Math.floor(diffMins / 60);
                        const m = diffMins % 60;
                        displayHours = `${h}h ${m}m`;
                      }
                    }
                  }

                  return (
                    <tr key={r._id} 
                      onClick={() => { setSelectedRecord(r); setDrawerOpen(true); }}
                      style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                      className="hrm-table-row-hover"
                    >
                      <td style={{ paddingLeft: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--bg-main)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: 'var(--primary-blue)' }}>
                            {r.employee?.name?.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-dark)' }}>{r.employee?.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{r.employee?.employeeId} · {r.employee?.department}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`hrm-badge ${['Present', 'Clocked In'].includes(r.status) ? 'hrm-badge-success' : r.status === 'Absent' ? 'hrm-badge-danger' : 'hrm-badge-warning'}`} style={{ fontSize: '10px' }}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        {r.punchIn ? <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}><LogIn size={13} color="var(--success)" /> {r.punchIn}</div> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        {r.punchOut ? <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}><LogOut size={13} color="var(--danger)" /> {r.punchOut}</div> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary-blue)' }}>{displayHours}</div>
                      </td>
                      <td>
                        {r.status === 'Absent' ? (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        ) : (
                          <span className={`hrm-badge ${r.approvalStatus === 'Approved' ? 'hrm-badge-success' : r.approvalStatus === 'Rejected' ? 'hrm-badge-danger' : 'hrm-badge-warning'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                             {r.approvalStatus || 'Pending'}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', paddingRight: '24px' }}>
                        <button className="icon-btn" style={{ margin: '0 auto' }}>
                          <ArrowRight size={20} />
                        </button>
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
            width: '480px', height: '100%', borderRadius: 0, margin: 0,
            display: 'flex', flexDirection: 'column', animation: 'drawerSlideIn 0.3s ease-out'
          }}>
            <div className="hrm-modal-header" style={{ padding: '32px', background: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900 }}>Punch Timeline</h2>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Detailed activity log for {selectedRecord.employee?.name}</p>
              </div>
              <button className="icon-btn" onClick={() => setDrawerOpen(false)}><X size={20} /></button>
            </div>

            <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
              <div style={{ position: 'relative', paddingLeft: '40px' }}>
                {/* Vertical Line */}
                <div style={{ 
                  position: 'absolute', left: '11px', top: '8px', bottom: '8px', width: '2px', 
                  background: 'repeating-linear-gradient(to bottom, transparent, transparent 4px, var(--border) 4px, var(--border) 8px)' 
                }} />
                
                {/* Combined & Sorted Timeline items */}
                {[
                  ...(selectedRecord.punches || []).map(p => ({ ...p, timelineType: 'punch' })),
                  ...(selectedRecord.breaks || []).flatMap(b => [
                    { time: b.start, type: b.type, timelineType: 'break-start' },
                    ...(b.end ? [{ time: b.end, type: b.type, timelineType: 'break-end' }] : [])
                  ])
                ].sort((a, b) => new Date(a.time) - new Date(b.time)).map((item, idx) => {
                  const isPunch = item.timelineType === 'punch';
                  const isIN = item.type === 'IN';
                  const isBreakStart = item.timelineType === 'break-start';
                  const color = isPunch ? (isIN ? 'var(--success)' : 'var(--danger)') : '#6366F1';
                  const Icon = isPunch ? (isIN ? LogIn : LogOut) : Coffee;

                  return (
                    <div key={idx} style={{ position: 'relative', marginBottom: '32px' }}>
                      {/* Dot */}
                       <div style={{ 
                        position: 'absolute', left: '-40px', top: '4px', width: '24px', height: '24px', 
                        borderRadius: '8px', background: 'var(--bg-elevated)', border: `2px solid ${color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                        boxShadow: `0 4px 10px ${color}20`
                      }}>
                        <Icon size={12} color={color} />
                      </div>
 
                      <div className="hrm-card" style={{ padding: '20px', border: '1px solid var(--border)', background: 'var(--bg-base)', boxShadow: '0 2px 12px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div>
                            <span style={{ fontSize: '10px', fontWeight: '900', color: color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                              {isPunch ? `Punch ${item.type}` : `${item.type} Break ${isBreakStart ? 'Started' : 'Ended'}`}
                            </span>
                            <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-dark)', marginTop: '2px' }}>
                              {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </div>
                          </div>
                          {isPunch && item.latitude && (
                            <button className="btn-hrm btn-hrm-secondary" onClick={() => window.open(`https://www.google.com/maps?q=${item.latitude},${item.longitude}`)} 
                              style={{ padding: '8px 14px', fontSize: '11px', height: 'auto', borderRadius: '10px', background: 'var(--bg-main)', border: 'none', fontWeight: 800 }}>
                              <MapPin size={12} style={{ marginRight: '6px' }} /> VIEW ON MAP
                            </button>
                          )}
                        </div>

                        {(item.workSummary || item.lateReason || item.earlyReason || item.geofenceReason) && (
                          <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-main)', borderRadius: '12px', fontSize: '12px', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                            {item.workSummary && <div style={{ marginBottom: item.lateReason || item.earlyReason || item.geofenceReason ? '8px' : 0 }}><strong>Summary:</strong> {item.workSummary}</div>}
                            {item.lateReason && <div style={{ color: 'var(--danger)' }}><strong>Late Reason:</strong> {item.lateReason}</div>}
                            {item.earlyReason && <div style={{ color: 'var(--danger)' }}><strong>Early Reason:</strong> {item.earlyReason}</div>}
                            {item.geofenceReason && <div style={{ color: 'var(--warning)' }}><strong>Out of Range:</strong> {item.geofenceReason}</div>}
                          </div>
                        )}
                        
                        {isPunch && item.locationAddress && (
                          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                            <MapPin size={10} /> {item.locationAddress}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedRecord.approvalStatus === 'Pending' && (
              <div style={{ padding: '32px', background: 'var(--bg-main)', borderTop: '1px solid var(--border)', display: 'flex', gap: '16px' }}>
                <button className="btn-hrm btn-hrm-success" style={{ flex: 1, height: '52px', fontSize: '14px' }} onClick={() => handleApproval(selectedRecord._id, 'Approved')}>APPROVE</button>
                <button className="btn-hrm btn-hrm-secondary" style={{ flex: 1, height: '52px', fontSize: '14px', color: 'var(--danger)' }} onClick={() => handleApproval(selectedRecord._id, 'Rejected')}>REJECT</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {manualModal && (
        <div className="hrm-modal-overlay" onClick={() => setManualModal(false)}>
          <div className="hrm-modal-content" style={{ maxWidth: '540px', animation: 'modalSlideUp 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            <div className="hrm-modal-header" style={{ padding: '24px 32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900 }}>Add Manual Attendance</h2>
              <button className="icon-btn" onClick={() => setManualModal(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleManualSubmit}>
              <div className="hrm-modal-body" style={{ padding: '32px' }}>
                <div className="hrm-form-group">
                  <SearchableSelect
                    label="Select Employee" required
                    options={employees.map(emp => ({ label: `${emp.name} (${emp.employeeId})`, value: emp._id }))}
                    value={manualData.employeeId}
                    onChange={(val) => setManualData({ ...manualData, employeeId: val })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
                  <label className="hrm-label">Admin Remarks</label>
                  <textarea className="hrm-textarea" value={manualData.remark} onChange={e => setManualData({...manualData, remark: e.target.value})} placeholder="Reason for manual entry..." style={{ height: '100px', resize: 'none' }} />
                </div>
              </div>
              <div className="hrm-modal-footer" style={{ padding: '24px 32px' }}>
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
        @keyframes drawerSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes modalSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default AdminAttendance;
