import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { 
  Users, Building2, Briefcase, UserPlus, UserMinus, ArrowUpRight, ArrowDownRight,
  ChevronRight, MoreVertical, Search, LayoutDashboard, Check, X, Clock, RefreshCw,
  Calendar, AlertCircle, XCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todayActivities, setTodayActivities] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchTodayActivities(); 
    fetchPendingRequests();
  }, []);

  const fetchTodayActivities = async () => {
    try {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' }).split(' ')[0];
      const response = await authenticatedFetch(`${API_URL}/api/attendance/admin/all?date=${today}`);
      const result = await response.json();
      if (result.success) {
        setTodayActivities(result.records?.slice(0, 5) || []);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const [reqRes, resRes] = await Promise.all([
        authenticatedFetch(`${API_URL}/api/requests/admin/all?status=Pending`),
        authenticatedFetch(`${API_URL}/api/resignation/admin/all?status=Pending`)
      ]);
      const reqJson = await reqRes.json();
      const resJson = await resRes.json();
      let combined = [];
      if (reqJson.success) combined = [...reqJson.requests.filter(r => r.status === 'Pending')];
      if (resJson.success) {
        const resignations = resJson.resignations.filter(r => r.status === 'Pending').map(r => ({
          ...r, requestType: 'Resignation', date: r.lastWorkingDay, employee: r.employeeId
        }));
        combined = [...combined, ...resignations];
      }
      combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPendingRequests(combined.slice(0, 5));
    } catch (e) { console.error(e); }
  };

  const handleRequestAction = async (requestId, status, requestType) => {
    try {
      let noticePeriodDays = 0;
      if (requestType === 'Resignation' && status === 'Approved') {
        const { value: days } = await Swal.fire({ title: 'Notice Period', input: 'number', inputLabel: 'Days', showCancelButton: true });
        if (days) noticePeriodDays = days; else return;
      }
      const endpoint = requestType === 'Resignation' ? `${API_URL}/api/resignation/admin/action` : `${API_URL}/api/requests/admin/action`;
      const res = await authenticatedFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, resignationId: requestId, status, adminRemark: `Dashboard Action: ${status}`, noticePeriodDays })
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({ title: 'Updated!', icon: 'success', timer: 1500, showConfirmButton: false });
        fetchPendingRequests();
      }
    } catch (e) { Swal.fire('Error', 'Action failed', 'error'); }
  };

  const fetchStats = async () => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/dashboard/admin/stats`);
      const result = await response.json();
      if (result.success) setData(result);
    } catch (error) { console.error("Error stats:", error); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="loading-container">Loading Dashboard...</div>;

  const stats = data?.stats || {};
  const DEPT_COLORS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#F97316'];
  const attendanceDonutData = [
    { name: 'Present',  value: stats.presentToday || 0, color: '#10B981' },
    { name: 'Absent',   value: stats.absentToday || 0, color: '#EF4444' },
    { name: 'Half Day', value: stats.halfDayToday || 0, color: '#F59E0B' },
    { name: 'On Leave', value: stats.onLeaveToday || 0, color: '#8B5CF6' },
  ].filter(d => d.value > 0);

  const deptBarData = (data?.departmentStats || []).slice(0, 7).map(d => ({ name: d.name, Employees: d.count }));

  const statCards = [
    { title: 'Total Employees', value: stats.totalUsers || 0, icon: <Users size={24} />, color: 'blue', link: '/admin/employees/list' },
    { title: 'Present Today', value: stats.presentToday || 0, icon: <UserPlus size={24} />, color: 'emerald', link: '/admin/attendance/records?status=Present' },
    { title: 'Absent Today', value: stats.absentToday || 0, icon: <UserMinus size={24} />, color: 'red', link: '/admin/attendance/absent' },
    { title: 'On Leave Today', value: stats.onLeaveToday || 0, icon: <Calendar size={24} />, color: 'purple', link: '/admin/attendance/records?status=On Leave' },
  ];

  const secondaryStats = [
    { label: 'Active Onboarding', value: stats.activeOnboarding || 0, icon: <RefreshCw size={14} />, color: '#3B82F6' },
    { label: 'Active Offboarding', value: stats.activeOffboarding || 0, icon: <XCircle size={14} />, color: '#EF4444' },
    { label: 'Leave Requests', value: stats.pendingLeaveRequests || 0, icon: <Clock size={14} />, color: '#F59E0B' },
    { label: 'Attendance Requests', value: stats.pendingAttendanceRequests || 0, icon: <AlertCircle size={14} />, color: '#8B5CF6' },
  ];

  return (
    <div className="hrm-container" style={{ paddingBottom: '60px' }}>
      <div className="hrm-header">
        <div>
          <h1 className="hrm-title">Admin Command Center</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Unified workforce intelligence and operational overview</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
           <button className="btn-hrm btn-hrm-secondary" onClick={() => navigate('/admin/attendance/report')}>
             <ArrowDownRight size={16} /> EXPORT ANALYTICS
           </button>
           <button className="btn-hrm btn-hrm-primary" onClick={() => navigate('/admin/employees/list')}>
             <UserPlus size={16} /> NEW EMPLOYEE
           </button>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="hrm-stats-grid">
        {statCards.map((card, idx) => (
          <div key={idx} className="hrm-stat-card" onClick={() => navigate(card.link)}>
             <div className="hrm-stat-icon-wrapper">
                {card.icon}
             </div>
             <div className="hrm-stat-details">
                <span className="hrm-stat-label">{card.title}</span>
                <h3 className="hrm-stat-value">{card.value}</h3>
             </div>
          </div>
        ))}
      </div>

      {/* Secondary Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
         {secondaryStats.map((s, i) => (
           <div key={i} className="hrm-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: `${s.color}10`, color: s.color }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: '16px', fontWeight: '800' }}>{s.value}</div>
              </div>
           </div>
         ))}
      </div>

      <div className="hrm-dashboard-grid">
        
        {/* Attendance Breakdown */}
        <div className="hrm-card hrm-dashboard-main">
           <div className="hrm-card-header">
              <div className="hrm-card-header-left">
                <Calendar size={18} className="hrm-card-icon" />
                <h3 className="hrm-card-title">Real-time Presence</h3>
              </div>
           </div>
           <div className="hrm-card-body">
              <div className="hrm-chart-container" style={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={attendanceDonutData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                        {attendanceDonutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                   <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-dark)' }}>{stats.presentToday || 0}</div>
                   <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Present</div>
                </div>
              </div>
              <div className="hrm-donut-legend">
                 {attendanceDonutData.map((d, i) => (
                   <div key={i} className="hrm-legend-item">
                     <div className="hrm-legend-dot" style={{ background: d.color }} />
                     <span className="hrm-legend-label">{d.name}</span>
                     <span className="hrm-legend-value">{d.value}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Dept Distribution */}
        <div className="hrm-card hrm-dashboard-side">
           <div className="hrm-card-header">
              <div className="hrm-card-header-left">
                <Building2 size={18} className="hrm-card-icon" />
                <h3 className="hrm-card-title">Workforce Allocation</h3>
              </div>
           </div>
           <div className="hrm-card-body">
             <ResponsiveContainer width="100%" height={340}>
                <BarChart data={deptBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} />
                   <Tooltip cursor={{ fill: 'var(--bg-main)', radius: 8 }} />
                   <Bar dataKey="Employees" radius={[8, 8, 0, 0]} barSize={40}>
                      {deptBarData.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Pending Requests */}
        <div className="hrm-card hrm-dashboard-actions">
           <div className="hrm-card-header">
              <div className="hrm-card-header-left">
                <AlertCircle size={18} className="hrm-card-icon" />
                <h3 className="hrm-card-title">Priority Approvals</h3>
              </div>
              <button className="btn-hrm btn-hrm-secondary btn-sm" onClick={() => navigate('/admin/requests/all')}>MANAGE ALL</button>
           </div>
           <div className="hrm-list-content">
              {pendingRequests.map(req => (
                <div key={req._id} className="hrm-list-item">
                   <div className={`hrm-list-icon ${req.requestType === 'Leave' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}`}>
                      {req.requestType === 'Leave' ? <Calendar size={18} /> : <XCircle size={18} />}
                   </div>
                   <div className="hrm-list-info">
                      <div className="hrm-list-name">{req.employee?.name}</div>
                      <div className="hrm-list-subtext">{req.requestType} • {req.date || req.fromDate}</div>
                   </div>
                   <div className="hrm-list-actions">
                      <button className="hrm-action-btn hrm-approve" onClick={() => handleRequestAction(req._id, 'Approved', req.requestType)}><Check size={16} /></button>
                      <button className="hrm-action-btn hrm-reject" onClick={() => handleRequestAction(req._id, 'Rejected', req.requestType)}><X size={16} /></button>
                   </div>
                </div>
              ))}
              {pendingRequests.length === 0 && <div className="hrm-empty-state">System clean. No pending tasks.</div>}
           </div>
        </div>

        {/* Today's Punch Ins */}
        <div className="hrm-card hrm-dashboard-activity">
           <div className="hrm-card-header">
              <div className="hrm-card-header-left">
                <Clock size={18} className="hrm-card-icon" />
                <h3 className="hrm-card-title">Today's Punch Ins</h3>
              </div>
              <div className="hrm-card-header-right">
                <RefreshCw size={16} className="hrm-refresh-icon" onClick={fetchTodayActivities} style={{ cursor: 'pointer' }} />
              </div>
           </div>
           <div className="hrm-list-content">
              {todayActivities.map(rec => (
                <div key={rec.employeeId} className="hrm-list-item">
                   <div className="hrm-list-avatar">
                      {rec.profilePhoto ? (
                        <img src={`${API_URL}/uploads/${rec.profilePhoto}`} alt="" />
                      ) : (
                        rec.name?.charAt(0)
                      )}
                   </div>
                   <div className="hrm-list-info">
                      <div className="hrm-list-name">{rec.name}</div>
                      <div className="hrm-list-subtext">
                        {rec.department || 'Unassigned'} • {rec.branch || 'Head Office'}
                      </div>
                   </div>
                   <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div className={`hrm-badge ${rec.status === 'Present' || rec.status === 'Clocked In' ? 'hrm-badge-success' : 'hrm-badge-danger'}`} style={{ fontSize: '10px', padding: '4px 8px' }}>
                        {rec.status === 'Present' || rec.status === 'Clocked In' ? 'PUNCHED IN' : 'NOT PUNCHED'}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-dark)' }}>
                        {rec.punchIn || '---'}
                      </div>
                   </div>
                </div>
              ))}
              {todayActivities.length === 0 && (
                <div className="hrm-empty-state">
                  <div style={{ marginBottom: '8px' }}>No activity recorded today</div>
                  <button className="btn-hrm btn-hrm-secondary btn-sm" onClick={fetchTodayActivities}>REFRESH</button>
                </div>
              )}
           </div>
           {todayActivities.length > 0 && (
             <div className="hrm-card-footer" style={{ padding: '12px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                <button className="btn-hrm btn-hrm-secondary btn-sm" style={{ width: '100%' }} onClick={() => navigate('/admin/attendance/records')}>
                  VIEW FULL ATTENDANCE LOG
                </button>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
