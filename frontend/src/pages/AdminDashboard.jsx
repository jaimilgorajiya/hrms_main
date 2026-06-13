import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, UserMinus, Calendar, RefreshCw, 
  MoreVertical, Check, X, ClipboardList, TrendingUp, TrendingDown,
  ChevronRight, ArrowRight
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import PageLoader from '../components/PageLoader';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todayActivities, setTodayActivities] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
        fetchStats(),
        fetchTodayActivities(),
        fetchPendingRequests()
    ]);
    setLoading(false);
  };

  const fetchTodayActivities = async () => {
    try {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' }).split(' ')[0];
      const response = await authenticatedFetch(`${API_URL}/api/attendance/admin/all?date=${today}`);
      const result = await response.json();
      if (result.success) {
        setTodayActivities(result.records?.slice(0, 5) || []);
      }
    } catch (error) { console.error(error); }
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
        const { value: days } = await Swal.fire({ 
            title: 'Notice Period', 
            input: 'number', 
            inputLabel: 'Days', 
            showCancelButton: true,
            confirmButtonColor: '#0052ff',
            borderRadius: '24px'
        });
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
        Swal.fire({ 
            title: 'Action Success', 
            text: `The request has been ${status.toLowerCase()}.`,
            icon: 'success', 
            timer: 2000, 
            showConfirmButton: false,
            borderRadius: '24px'
        });
        fetchPendingRequests();
      }
    } catch (e) { Swal.fire('Error', 'Action failed', 'error'); }
  };

  const fetchStats = async () => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/dashboard/admin/stats`);
      const result = await response.json();
      if (result.success) setData(result);
    } catch (error) { console.error(error); }
  };

  if (loading && !data) return <PageLoader message="Synchronizing Management Intelligence" />;

  const stats = data?.stats || {};
  const DEPT_COLORS = ['#c3c0ff', '#10b981', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4'];
  
  const attendanceDonutData = [
    { name: 'Present',  value: stats.presentToday || 0, color: '#10b981' },
    { name: 'Absent',   value: stats.absentToday || 0, color: '#f43f5e' },
    { name: 'Half Day', value: stats.halfDayToday || 0, color: '#f59e0b' },
    { name: 'On Leave', value: stats.onLeaveToday || 0, color: '#c3c0ff' },
  ].filter(d => d.value > 0);

  const deptBarData = (data?.departmentStats || []).slice(0, 7).map(d => ({ name: d.name, Employees: d.count }));

  const calculateTrendString = (sparkArray) => {
    if (!sparkArray || sparkArray.length < 2) return { label: 'Stable', up: true };
    const last = sparkArray[sparkArray.length - 1].v;
    const prev = sparkArray[sparkArray.length - 2].v;
    if (prev === 0) {
      return last > 0 ? { label: `+${last}`, up: true } : { label: 'Stable', up: true };
    }
    const diff = last - prev;
    const pct = ((diff / prev) * 100).toFixed(1);
    if (diff > 0) return { label: `+${pct}%`, up: true };
    if (diff < 0) return { label: `${pct}%`, up: false };
    return { label: 'Stable', up: true };
  };

  const calculateWeekOverWeekTrend = (sparkArray) => {
    if (!sparkArray || sparkArray.length < 2) return { label: 'Stable', up: true };
    const last = sparkArray[sparkArray.length - 1].v;
    const first = sparkArray[0].v;
    if (first === 0) {
      return last > 0 ? { label: `+${last}`, up: true } : { label: 'Stable', up: true };
    }
    const diff = last - first;
    const pct = ((diff / first) * 100).toFixed(1);
    if (diff > 0) return { label: `+${pct}%`, up: true };
    if (diff < 0) return { label: `${pct}%`, up: false };
    return { label: 'Stable', up: true };
  };

  const trends = data?.trends || {};
  const workforceTrend = trends.workforce || [];
  const presentTrend = trends.present || [];
  const absentTrend = trends.absent || [];
  const onLeaveTrend = trends.onLeave || [];

  const activeCount = stats.activeUsers || 0;
  const presentCount = (stats.presentToday || 0) + (stats.halfDayToday || 0);
  const absentCount = stats.absentToday || 0;
  const leaveCount = stats.onLeaveToday || 0;

  const presentRate = activeCount > 0 ? ((presentCount / activeCount) * 100).toFixed(1) : '0.0';
  const absentRate = activeCount > 0 ? ((absentCount / activeCount) * 100).toFixed(1) : '0.0';
  const leaveRate = activeCount > 0 ? ((leaveCount / activeCount) * 100).toFixed(1) : '0.0';

  const statCards = [
    { 
      title: 'Total Workforce', 
      value: stats.totalUsers || 0, 
      icon: <Users size={22} />, 
      color: 'blue', 
      link: '/admin/employees/list', 
      trendText: `${activeCount} Active`, 
      trendClass: 'blue', 
      trendIcon: null, 
      sparkData: workforceTrend 
    },
    { 
      title: 'Present Today', 
      value: presentCount, 
      icon: <UserPlus size={22} />, 
      color: 'green', 
      link: '/admin/attendance/records?status=Present', 
      trendText: `${presentRate}% Rate`, 
      trendClass: 'up', 
      trendIcon: null, 
      sparkData: presentTrend 
    },
    { 
      title: 'Absent Today', 
      value: absentCount, 
      icon: <UserMinus size={22} />, 
      color: 'red', 
      link: '/admin/attendance/absent', 
      trendText: `${absentRate}% Rate`, 
      trendClass: absentCount > 0 ? 'down' : 'up', 
      trendIcon: null, 
      sparkData: absentTrend 
    },
    { 
      title: 'On Leave', 
      value: leaveCount, 
      icon: <Calendar size={22} />, 
      color: 'purple', 
      link: '/admin/attendance/records?status=On Leave', 
      trendText: `${leaveRate}% Rate`, 
      trendClass: 'blue', 
      trendIcon: null, 
      sparkData: onLeaveTrend 
    },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-premium">
        <div className="header-info">
          <h1 className="hrm-title">Admin Dashboard</h1>
          </div>
        <div className="header-actions">
           <button className="btn-primary-prem" onClick={() => navigate('/admin/employees/list')}>
             <UserPlus size={18} /> NEW EMPLOYEE
           </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-grid-premium">
        {statCards.map((card, idx) => (
          <div key={idx} className="stat-card-premium" onClick={() => navigate(card.link)}>
             <div className="stat-value-group">
                <div className={`icon-box-prem ${card.color}`}>
                    {card.icon}
                </div>
                <div className={`trend-prem ${card.trendClass}`}>
                    {card.trendIcon}
                    {card.trendText}
                </div>
             </div>
             <div className="stat-content-prem">
                <h3>{card.title}</h3>
                <span className="value-prem">{card.value}</span>
             </div>
             <div style={{ height: 40, width: '100%', marginTop: 'auto' }}>
                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                   <AreaChart data={card.sparkData}>
                      <defs>
                         <linearGradient id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={card.color === 'blue' ? '#0052ff' : card.color === 'green' ? '#10b981' : card.color === 'red' ? '#f43f5e' : '#8b5cf6'} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={card.color === 'blue' ? '#0052ff' : card.color === 'green' ? '#10b981' : card.color === 'red' ? '#f43f5e' : '#8b5cf6'} stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke={card.color === 'blue' ? '#0052ff' : card.color === 'green' ? '#10b981' : card.color === 'red' ? '#f43f5e' : '#8b5cf6'} strokeWidth={2} fill={`url(#grad-${idx})`} />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        ))}
      </div>

      <div className="dashboard-main-grid-three">
        
        {/* Real-time Presence */}
        <div className="card-prem">
           <div className="card-header-prem">
              <h2>Real-time Presence</h2>
              <div className="icon-btn-prem"><MoreVertical size={18} /></div>
           </div>
           <div className="card-body-prem">
              <div style={{ height: 220, position: 'relative' }}>
                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                    <PieChart>
                      <Pie 
                        data={attendanceDonutData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={70} 
                        outerRadius={90} 
                        paddingAngle={10} 
                        dataKey="value" 
                        stroke="none"
                        cornerRadius={40}
                        animationBegin={0}
                        animationDuration={1500}
                      >
                        {attendanceDonutData.map((entry, i) => (
                           <Cell 
                             key={i} 
                             fill={entry.color} 
                             style={{ filter: `drop-shadow(0 4px 12px ${entry.color}44)` }} 
                           />
                        ))}
                      </Pie>
                      <Tooltip 
                        cornerRadius={16} 
                        border="none" 
                        contentStyle={{ 
                            borderRadius: '16px', 
                            border: 'none', 
                            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                            background: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(8px)'
                        }} 
                      />
                    </PieChart>
                </ResponsiveContainer>
                <div className="chart-center-text">
                   <div className="chart-center-val">{(stats.presentToday || 0) + (stats.halfDayToday || 0)}</div>
                   <div className="chart-center-label">Active</div>
                </div>
              </div>
              <div className="chart-legend-grid-prem">
                 {attendanceDonutData.map((d, i) => (
                   <div key={i} className="chart-legend-item-prem">
                     <div className="chart-legend-dot-prem" style={{ background: d.color, boxShadow: `0 0 8px ${d.color}44` }} />
                     <span className="legend-name-prem">{d.name}</span>
                     <span className="legend-value-prem">{d.value}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Today's Punch Ins */}
        <div className="card-prem">
           <div className="card-header-prem">
              <h2>Today's Punch Ins</h2>
              <button className="icon-btn-prem" onClick={fetchTodayActivities}><RefreshCw size={16} /></button>
           </div>
           <div className="card-body-prem" style={{ padding: '16px' }}>
              <div className="activity-list-prem">
                 {todayActivities.map(rec => (
                   <div key={rec.employee?._id || rec.employeeId} className="activity-item-prem" onClick={() => navigate('/admin/attendance/records')} style={{ cursor: 'pointer' }}>
                      <div className="user-avatar-prem">
                         {rec.employee?.profilePhoto ? (
                           <img src={`${API_URL}/uploads/${rec.employee.profilePhoto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                         ) : (rec.employee?.name || 'U')[0]}
                      </div>
                      <div className="activity-info-prem">
                         <span className="user-name-prem">{rec.employee?.name || 'Unassigned User'}</span>
                         <div className="info-bottom">
                            <span className="role-chip-prem">{rec.employee?.department || 'General'}</span>
                            <span className={`status-badge-prem ${rec.status === 'Clocked In' || rec.status === 'Present' ? 'success' : 'danger'}`}>
                                {rec.punchIn || '---'}
                            </span>
                         </div>
                      </div>
                      <ChevronRight size={14} color="#cbd5e1" />
                   </div>
                 ))}
                 {todayActivities.length === 0 && <div className="empty-state-prem">No activity logged today.</div>}
              </div>
           </div>
           <div className="card-footer-prem">
              <button className="view-all-prem" onClick={() => navigate('/admin/attendance/records')}>
                 VIEW FULL LOG <ArrowRight size={14} />
              </button>
           </div>
        </div>

        {/* Priority Approvals */}
        <div className="card-prem">
            <div className="card-header-prem">
               <h2>Priority Approvals</h2>
               <button className="icon-btn-prem" onClick={() => navigate('/admin/leave/request')}><ClipboardList size={18} /></button>
            </div>
           <div className="card-body-prem" style={{ padding: '16px' }}>
              <div className="activity-list-prem">
                 {pendingRequests.map(req => (
                   <div 
                     key={req._id} 
                     className="activity-item-prem" 
                     style={{ cursor: 'pointer' }}
                     onClick={() => {
                       if (req.requestType === 'Resignation') navigate('/admin/employees/resignation');
                       else if (req.requestType === 'Leave') navigate('/admin/leave/request');
                       else navigate('/admin/attendance/request');
                     }}
                   >
                      <div className={`icon-box-prem ${req.requestType === 'Leave' ? 'blue' : 'purple'}`}>
                         {req.requestType === 'Leave' ? <Calendar size={18} /> : <Check size={18} />}
                      </div>
                      <div className="activity-info-prem">
                         <span className="user-name-prem">{req.employee?.name || 'Employee'}</span>
                         <span className="activity-type-prem">{req.requestType} • {req.date || req.fromDate}</span>
                      </div>
                      <ChevronRight size={14} color="#cbd5e1" />
                   </div>
                 ))}
                 {pendingRequests.length === 0 && (
                    <div className="empty-state-card-prem">
                        <div className="empty-state-icon-prem">
                            <Check size={28} />
                        </div>
                        <p className="system-clear-title-prem">System Clear</p>
                        <p className="system-clear-desc-prem">No pending tasks requiring action.</p>
                    </div>
                 )}
              </div>
           </div>
           <div className="card-footer-prem">
              <button className="view-all-prem" onClick={() => navigate('/admin/requests/all')}>
                 MANAGE ALL <ArrowRight size={14} />
              </button>
           </div>
        </div>

      </div>

      <div className="dashboard-main-grid">
         <div className="card-prem">
            <div className="card-header-prem">
                <h2>Workforce Allocation</h2>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800', letterSpacing: '0.1em' }}>BY DEPARTMENT</div>
            </div>
            <div className="card-body-prem">
                <ResponsiveContainer width="99%" height={300} minWidth={1}>
                    <BarChart data={deptBarData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            {deptBarData.map((entry, index) => (
                                <linearGradient key={`grad-${index}`} id={`colorGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={DEPT_COLORS[index % DEPT_COLORS.length]} stopOpacity={1}/>
                                    <stop offset="100%" stopColor={DEPT_COLORS[index % DEPT_COLORS.length]} stopOpacity={0.6}/>
                                </linearGradient>
                            ))}
                        </defs>
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} 
                        />
                        <Tooltip 
                            cursor={{ fill: 'rgba(0,0,0,0.02)', radius: 12 }} 
                            contentStyle={{ 
                                borderRadius: '16px', 
                                border: 'none', 
                                boxShadow: '0 20px 40px rgba(0,0,0,0.1)', 
                                padding: '12px 16px',
                                background: 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: 'blur(8px)',
                                fontFamily: 'Sora', 
                                fontSize: '12px' 
                            }} 
                        />
                        <Bar 
                            dataKey="Employees" 
                            radius={[12, 12, 12, 12]} 
                            barSize={32}
                            animationDuration={1500}
                        >
                            {deptBarData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={`url(#colorGrad-${index})`}
                                    style={{ filter: `drop-shadow(0 4px 8px ${DEPT_COLORS[index % DEPT_COLORS.length]}33)` }}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </div>

          <div className="card-prem">
            <div className="card-header-prem">
                <h2>System Health</h2>
            </div>
            <div className="card-body-prem">
                <div className="distribution-list-prem">
                    {[
                        { label: 'Active Onboarding', value: stats.activeOnboarding || 0, color: '#0052ff', link: '/admin/employees/onboarding' },
                        { label: 'Leave Requests', value: stats.pendingLeaveRequests || 0, color: '#f59e0b', link: '/admin/leave/request' },
                        { label: 'Correction Requests', value: stats.pendingAttendanceRequests || 0, color: '#8b5cf6', link: '/admin/attendance/request' },
                        { label: 'Notice Period', value: stats.activeOffboarding || 0, color: '#f43f5e', link: '/admin/employees/resignation' }
                    ].map((item, i) => (
                        <div 
                          key={i} 
                          className="dist-item-prem clickable-item-prem" 
                          onClick={() => navigate(item.link)}
                        >
                            <div className="dist-info-prem">
                                <span className="dist-label-prem">{item.label}</span>
                                <span className="dist-val-prem">{item.value}</span>
                            </div>
                            <div className="progress-bar-prem">
                                <div className="progress-fill-prem" style={{ width: `${Math.min(100, (item.value / (stats.totalUsers || 1)) * 100)}%`, background: `linear-gradient(90deg, ${item.color}cc, ${item.color})`, boxShadow: `0 0 10px ${item.color}44` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
