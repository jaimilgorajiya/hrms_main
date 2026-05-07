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
    { title: 'Total Employees', value: stats.totalUsers || 0, icon: <Users size={20} />, color: 'blue', link: '/admin/employees/list' },
    { title: 'Present Today', value: stats.presentToday || 0, icon: <Check size={20} />, color: 'emerald', link: '/admin/attendance/records?status=Present' },
    { title: 'Absent Today', value: stats.absentToday || 0, icon: <AlertCircle size={20} />, color: 'red', link: '/admin/attendance/absent' },
    { title: 'On Leave Today', value: stats.onLeaveToday || 0, icon: <Calendar size={20} />, color: 'purple', link: '/admin/attendance/records?status=On Leave' },
  ];

  return (
    <div className="hrm-container" style={{ paddingBottom: '40px' }}>
      <div className="hrm-header">
        <div>
          <h1 className="hrm-title">Dashboard Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Real-time workforce analytics and activities</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
           <button className="btn-hrm btn-hrm-secondary" onClick={() => navigate('/admin/attendance/report')}>
             <ArrowDownRight size={16} /> EXPORT REPORT
           </button>
           <button className="btn-hrm btn-hrm-primary" onClick={() => navigate('/admin/employees/list')}>
             <Search size={16} /> FIND EMPLOYEE
           </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
        
        {/* Attendance Breakdown */}
        <div className="hrm-card" style={{ gridColumn: 'span 4' }}>
           <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Attendance Status</h3>
              <Calendar size={18} className="text-muted" />
           </div>
           <div style={{ padding: '24px' }}>
             <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={attendanceDonutData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                    {attendanceDonutData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
             </ResponsiveContainer>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
                {attendanceDonutData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-main)', borderRadius: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color }} />
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>{d.name}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: '800' }}>{d.value}</span>
                  </div>
                ))}
             </div>
           </div>
        </div>

        {/* Dept Distribution */}
        <div className="hrm-card" style={{ gridColumn: 'span 8' }}>
           <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Staffing by Department</h3>
              <Building2 size={18} className="text-muted" />
           </div>
           <div style={{ padding: '24px' }}>
             <ResponsiveContainer width="100%" height={320}>
                <BarChart data={deptBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} />
                   <Tooltip cursor={{ fill: 'var(--bg-main)' }} />
                   <Bar dataKey="Employees" radius={[6, 6, 0, 0]}>
                      {deptBarData.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Pending Requests */}
        <div className="hrm-card" style={{ gridColumn: 'span 6' }}>
           <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Pending Actions</h3>
              <button className="btn-hrm btn-hrm-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => navigate('/admin/requests/all')}>VIEW ALL</button>
           </div>
           <div style={{ padding: '0' }}>
              {pendingRequests.map(req => (
                <div key={req._id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                   <div style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: req.requestType === 'Leave' ? '#ECFDF5' : '#FEF2F2', color: req.requestType === 'Leave' ? '#059669' : '#DC2626' }}>
                      {req.requestType === 'Leave' ? <Calendar size={18} /> : <XCircle size={18} />}
                   </div>
                   <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '800', fontSize: '14px' }}>{req.employee?.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{req.requestType} • {req.date || req.fromDate}</div>
                   </div>
                   <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-hrm btn-hrm-secondary" style={{ padding: '8px', color: 'var(--success)' }} onClick={() => handleRequestAction(req._id, 'Approved', req.requestType)}><Check size={16} /></button>
                      <button className="btn-hrm btn-hrm-secondary" style={{ padding: '8px', color: 'var(--danger)' }} onClick={() => handleRequestAction(req._id, 'Rejected', req.requestType)}><X size={16} /></button>
                   </div>
                </div>
              ))}
              {pendingRequests.length === 0 && <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No pending requests</div>}
           </div>
        </div>

        {/* Today's Activity */}
        <div className="hrm-card" style={{ gridColumn: 'span 6' }}>
           <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>Today's Clock-ins</h3>
              <RefreshCw size={18} className="text-muted" style={{ cursor: 'pointer' }} onClick={fetchTodayActivities} />
           </div>
           <div style={{ padding: '0' }}>
              {todayActivities.map(rec => (
                <div key={rec._id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                   <div style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--primary-blue)', fontWeight: '800' }}>
                      {rec.employee?.name?.charAt(0)}
                   </div>
                   <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '800', fontSize: '14px' }}>{rec.employee?.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{rec.punchIn || '--:--'} - {rec.punchOut || '--:--'}</div>
                   </div>
                   <div className={`hrm-badge ${rec.status === 'Present' ? 'hrm-badge-success' : 'hrm-badge-danger'}`} style={{ fontSize: '10px' }}>
                      {rec.status}
                   </div>
                </div>
              ))}
              {todayActivities.length === 0 && <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No activity today</div>}
           </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
