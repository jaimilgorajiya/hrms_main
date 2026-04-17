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
      console.error("Error fetching today's activities:", error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      // Fetch both general requests and resignations
      const [reqRes, resRes] = await Promise.all([
        authenticatedFetch(`${API_URL}/api/requests/admin/all?status=Pending`),
        authenticatedFetch(`${API_URL}/api/resignation/admin/all?status=Pending`)
      ]);
      
      const reqJson = await reqRes.json();
      const resJson = await resRes.json();

      let combined = [];
      if (reqJson.success) {
        // Extra safety: Filter for Pending only
        const filteredReqs = reqJson.requests.filter(r => r.status === 'Pending');
        combined = [...filteredReqs];
      }
      
      if (resJson.success) {
        const resignationRequests = resJson.resignations
          .filter(r => r.status === 'Pending') // Extra safety: Filter for Pending only
          .map(r => ({
            ...r,
            requestType: 'Resignation', // Label it for the UI
            reason: r.reason,
            date: r.lastWorkingDay, // Show LWD as the primary date
            employee: r.employeeId // Backend uses employeeId field
          }));
        combined = [...combined, ...resignationRequests];
      }

      
      // Sort by creation date
      combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPendingRequests(combined.slice(0, 5));
    } catch (e) { console.error(e); }
  };

  const handleRequestAction = async (requestId, status, requestType) => {
    try {
      let noticePeriodDays = 0;
      let comments = `Quick ${status} from Dashboard`;

      if (requestType === 'Resignation' && status === 'Approved') {
        const { value: days } = await Swal.fire({
          title: 'Enter Notice Period',
          input: 'number',
          inputLabel: 'Days',
          inputPlaceholder: 'e.g. 30',
          showCancelButton: true
        });
        if (days) noticePeriodDays = days;
        else return; // Cancelled
      }

      const endpoint = requestType === 'Resignation' 
        ? `${API_URL}/api/resignation/admin/action` 
        : `${API_URL}/api/requests/admin/action`;

      const res = await authenticatedFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requestId,
          resignationId: requestId,
          status, 
          adminRemark: comments,
          comments,
          noticePeriodDays
        })
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire('Success!', `Request ${status.toLowerCase()} successfully`, 'success');
        fetchPendingRequests();
        fetchTodayActivities();
      }
    } catch (e) {
      Swal.fire('Error', 'Action failed', 'error');
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await authenticatedFetch(`${API_URL}/api/dashboard/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader"></div>
        <span>Preparing your dashboard...</span>
      </div>
    );
  }

  const stats = data?.stats || {};

  const DEPT_COLORS = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#F97316'];

  const attendanceDonutData = [
    { name: 'Present',  value: stats.presentToday  || 0, color: '#10B981' },
    { name: 'Absent',   value: stats.absentToday   || 0, color: '#EF4444' },
    { name: 'Half Day', value: stats.halfDayToday  || 0, color: '#F59E0B' },
    { name: 'On Leave', value: stats.onLeaveToday  || 0, color: '#8B5CF6' },
  ].filter(d => d.value > 0);

  const genderData = (data?.genderStats || []).map(g => ({ name: g._id || 'Unknown', value: g.count }));
  const GENDER_COLORS = ['#3B82F6', '#EC4899', '#94A3B8'];

  const deptBarData = (data?.departmentStats || []).slice(0, 7).map(d => ({ name: d.name, Employees: d.count }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: '#1e293b', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontWeight: 600 }}>{label || payload[0].name}</div>
          <div>{payload[0].value} {payload[0].name === 'Employees' ? 'employees' : ''}</div>
        </div>
      );
    }
    return null;
  };

  const statCards = [
    { 
      title: 'Total Employees', 
      value: stats.totalUsers || 0, 
      icon: <Users size={20} />, 
      trend: `${stats.activeUsers || 0} Active`, 
      positive: true,
      color: 'blue',
      link: '/admin/employees/list'
    },
    { 
      title: 'Present Today', 
      value: stats.presentToday || 0, 
      icon: <Check size={20} />, 
      trend: 'Today', 
      positive: true,
      color: 'emerald',
      link: '/admin/attendance/records?status=Present'
    },
    { 
      title: 'Absent Today', 
      value: stats.absentToday || 0, 
      icon: <AlertCircle size={20} />, 
      trend: 'Today', 
      positive: false,
      color: 'red',
      link: '/admin/attendance/absent'
    },
    { 
      title: 'On Leave Today', 
      value: stats.onLeaveToday || 0, 
      icon: <Calendar size={20} />, 
      trend: 'Today', 
      positive: true,
      color: 'purple',
      link: '/admin/attendance/records?status=On Leave'
    },
    { 
      title: 'Half Day Today', 
      value: stats.halfDayToday || 0, 
      icon: <Clock size={20} />, 
      trend: 'Today', 
      positive: false,
      color: 'orange',
      link: '/admin/attendance/records?status=Half Day'
    },
    { 
      title: 'Pending Leaves', 
      value: stats.pendingLeaveRequests || 0, 
      icon: <Calendar size={20} />, 
      trend: 'Requests', 
      positive: true,
      color: 'blue',
      link: '/admin/leave/request'
    },
    { 
      title: 'Punch Out Request', 
      value: stats.pendingAttendanceRequests || 0, 
      icon: <Clock size={20} />, 
      trend: 'Requests', 
      positive: true,
      color: 'orange',
      link: '/admin/attendance/punch-request'
    }
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-premium">
        <div className="header-info">
          <h1>Dashboard</h1>
          <p>Welcome back! Here's what's happening with your workforce today.</p>
        </div>
        <div className="header-actions">
          <button className="btn-outline-prem" onClick={() => navigate('/admin/employees/list')}>
            <Search size={16} />
            Find Employee
          </button>
          <button className="btn-primary-prem" onClick={() => navigate('/admin/attendance/report')}>
            Generate Report
          </button>
        </div>
      </div>

      <div className="stats-grid-premium">
        {statCards.map((card, index) => (
          <div key={index} className="stat-card-premium" onClick={() => navigate(card.link)}>
            <div className={`icon-box-prem ${card.color}`}>
              {card.icon}
            </div>
            <div className="stat-content-prem">
              <h3>{card.title}</h3>
              <div className="stat-value-group">
                <span className="value-prem">{card.value}</span>
                <span className={`trend-prem ${card.positive ? 'up' : 'down'}`}>
                  {card.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {card.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Today's Attendance Donut */}
        <div className="card-prem">
          <div className="card-header-prem"><h2>Today's Attendance</h2></div>
          <div className="card-body-prem" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {attendanceDonutData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={attendanceDonutData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {attendanceDonutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', justifyContent: 'center', marginTop: 8 }}>
                  {attendanceDonutData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                      <span style={{ color: '#64748b' }}>{d.name}</span>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ padding: '40px 0', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>No attendance data today</div>
            )}
          </div>
        </div>

        {/* Department Bar Chart */}
        <div className="card-prem">
          <div className="card-header-prem"><h2>Employees by Department</h2></div>
          <div className="card-body-prem">
            {deptBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="Employees" radius={[6, 6, 0, 0]}>
                    {deptBarData.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: '40px 0', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>No department data</div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-main-grid-three">
        <div className="main-grid-left-col">
          <div className="card-prem">
            <div className="card-header-prem">
              <h2>Today's Activity</h2>
              <button className="icon-btn-prem" onClick={fetchTodayActivities}><RefreshCw size={16} /></button>
            </div>
            <div className="card-body-prem" style={{ padding: '0' }}>
              <div className="attendance-list-dashboard">
                {todayActivities.map((rec) => (
                  <div key={rec._id} className="attendance-item-row" style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #F8FAFC', transition: 'background 0.2s' }}>
                    <div className="emp-brief" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#2563EB', fontSize: '14px' }}>
                          {rec.employee?.name?.charAt(0)}
                       </div>
                       <div>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#1E293B' }}>{rec.employee?.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{rec.date} • {rec.status}</div>
                       </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginRight: '24px' }}>
                        <Clock size={13} style={{ color: '#94A3B8' }} />
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>{rec.punchIn || '--:--'} - {rec.punchOut || '--:--'}</span>
                    </div>
                  </div>
                ))}
                {todayActivities.length === 0 && (
                  <div style={{ padding: '60px 40px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                     No attendance activity today.
                  </div>
                )}
              </div>
            </div>
            <div className="card-footer-prem">
               <button className="view-all-prem" onClick={() => navigate('/admin/attendance/records')}>Review All Records</button>
            </div>
          </div>
        </div>

        <div className="main-grid-middle-col">
          <div className="card-prem">
            <div className="card-header-prem">
              <h2>Pending Requests</h2>
              <button className="icon-btn-prem" onClick={fetchPendingRequests}><RefreshCw size={16} /></button>
            </div>
            <div className="card-body-prem" style={{ padding: '0' }}>
              <div className="attendance-list-dashboard">
                {pendingRequests.map((req) => (
                  <div 
                    key={req._id} 
                    className="attendance-item-row" 
                    style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #F8FAFC', transition: 'background 0.2s', cursor: 'pointer' }}
                    onClick={() => navigate(req.requestType === 'Leave' ? '/admin/leave/request' : (req.requestType === 'Resignation' ? '/admin/employees/resignation' : '/admin/attendance/request'))}
                  >
                    <div className="emp-brief" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: req.requestType === 'Leave' ? '#F0FDF4' : (req.requestType === 'Resignation' ? '#FEF2F2' : '#FFF7ED'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: req.requestType === 'Leave' ? '#10B981' : (req.requestType === 'Resignation' ? '#EF4444' : '#F97316') }}>
                          {req.requestType === 'Leave' ? <Calendar size={16} /> : (req.requestType === 'Resignation' ? <XCircle size={16} /> : <Clock size={16} />)}
                       </div>
                       <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#1E293B' }}>{req.employee?.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{req.requestType} • {req.fromDate || req.date}</div>
                       </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="icon-btn-prem" 
                          style={{ color: '#10B981', backgroundColor: '#F0FDF4' }}
                          onClick={(e) => { e.stopPropagation(); handleRequestAction(req._id, 'Approved', req.requestType); }}
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          className="icon-btn-prem" 
                          style={{ color: '#EF4444', backgroundColor: '#FEF2F2' }}
                          onClick={(e) => { e.stopPropagation(); handleRequestAction(req._id, 'Rejected', req.requestType); }}
                        >
                          <X size={16} />
                        </button>
                    </div>
                  </div>
                ))}
                {pendingRequests.length === 0 && (
                  <div style={{ padding: '60px 40px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                     No pending requests.
                  </div>
                )}
              </div>
            </div>
            <div className="card-footer-prem">
               <button className="view-all-prem" onClick={() => navigate('/admin/leave/request')}>View All Requests</button>
            </div>
          </div>
        </div>

        <div className="main-grid-right">
          <div className="card-prem">
            <div className="card-header-prem">
              <h2>Staffing Distribution</h2>
            </div>
            <div className="card-body-prem">
              <div className="distribution-list-prem">
                {data?.departmentStats?.slice(0, 5).map((dept, index) => (
                  <div key={index} className="dist-item-prem">
                    <div className="dist-info-prem">
                      <span>{dept.name}</span>
                      <span>{dept.count} members</span>
                    </div>
                    <div className="progress-bar-prem">
                      <div 
                        className="progress-fill-prem" 
                        style={{ width: `${(dept.count / stats.totalUsers) * 100 || 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="quick-stats-prem">
             <div className="small-card-prem" onClick={() => navigate('/admin/company/departments')}>
                <span className="small-label">Departments</span>
                <span className="small-value">{stats.totalDepartments || 0}</span>
                <Building2 size={16} className="small-icon" />
             </div>
             <div className="small-card-prem" onClick={() => navigate('/admin/company/designation')}>
                <span className="small-label">Designations</span>
                <span className="small-value">{stats.totalDesignations || 0}</span>
                <LayoutDashboard size={16} className="small-icon" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
