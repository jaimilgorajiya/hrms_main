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
  const DEPT_COLORS = ['#1e293b', '#059669', '#0369a1', '#4f46e5', '#be123c', '#0891b2', '#475569'];
  
  const attendanceDonutData = [
    { name: 'Present',  value: stats.presentToday || 0, color: '#059669' },
    { name: 'Absent',   value: stats.absentToday || 0, color: '#be123c' },
    { name: 'Half Day', value: stats.halfDayToday || 0, color: '#d97706' },
    { name: 'On Leave', value: stats.onLeaveToday || 0, color: '#4f46e5' },
  ].filter(d => d.value > 0);

  const deptBarData = (data?.departmentStats || []).slice(0, 7).map(d => ({ name: d.name, Employees: d.count }));

  const statCards = [
    { title: 'Total Workforce', value: stats.totalUsers || 0, icon: <Users size={22} />, color: 'blue', link: '/admin/employees/list', trend: '+2.4%', up: true },
    { title: 'Present Today', value: stats.presentToday || 0, icon: <UserPlus size={22} />, color: 'green', link: '/admin/attendance/records?status=Present', trend: 'Stable', up: true },
    { title: 'Absent Today', value: stats.absentToday || 0, icon: <UserMinus size={22} />, color: 'red', link: '/admin/attendance/absent', trend: '-1.2%', up: false },
    { title: 'On Leave', value: stats.onLeaveToday || 0, icon: <Calendar size={22} />, color: 'purple', link: '/admin/attendance/records?status=On Leave', trend: 'Normal', up: true },
  ];

  // Mock data for sparklines
  const sparkData = [
    { v: 40 }, { v: 45 }, { v: 42 }, { v: 50 }, { v: 48 }, { v: 55 }, { v: 60 }
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-premium">
        <div className="header-info">
          <h1>Admin Dashboard</h1>
          <p>Unified workforce intelligence and operational overview</p>
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
                <div className={`trend-prem ${card.up ? 'up' : 'down'}`}>
                    {card.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {card.trend}
                </div>
             </div>
             <div className="stat-content-prem">
                <h3>{card.title}</h3>
                <span className="value-prem">{card.value}</span>
             </div>
             <div style={{ height: 40, width: '100%', marginTop: 'auto' }}>
                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                   <AreaChart data={sparkData}>
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
                   <div className="chart-center-val">{stats.presentToday || 0}</div>
                   <div className="chart-center-label">Active</div>
                </div>
              </div>
              <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                 {attendanceDonutData.map((d, i) => (
                   <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color, boxShadow: `0 0 8px ${d.color}44` }} />
                     <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>{d.name}</span>
                     <span style={{ fontSize: '13px', fontWeight: '700', color: '#1c1b1b', marginLeft: 'auto' }}>{d.value}</span>
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
              <button className="icon-btn-prem" onClick={() => navigate('/admin/requests/all')}><ClipboardList size={18} /></button>
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
                      <div className={`icon-box-prem ${req.requestType === 'Leave' ? 'blue' : 'purple'}`} style={{ width: '40px', height: '40px', minWidth: '40px', borderRadius: '12px' }}>
                         {req.requestType === 'Leave' ? <Calendar size={18} /> : <Check size={18} />}
                      </div>
                      <div className="activity-info-prem">
                         <span className="user-name-prem">{req.employee?.name || 'Employee'}</span>
                         <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>{req.requestType} • {req.date || req.fromDate}</span>
                      </div>
                      <ChevronRight size={14} color="#cbd5e1" />
                   </div>
                 ))}
                 {pendingRequests.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ background: '#f0fdf4', color: '#10b981', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.1)' }}>
                            <Check size={28} />
                        </div>
                        <p style={{ fontWeight: '700', color: '#1c1b1b', margin: 0, fontFamily: 'Sora' }}>System Clear</p>
                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>No pending tasks requiring action.</p>
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
                          style={{ cursor: 'pointer', padding: '12px', borderRadius: '16px', transition: 'all 0.2s', border: '1px solid transparent' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'transparent';
                          }}
                        >
                            <div className="dist-info-prem">
                                <span style={{ fontWeight: '700', color: '#475569', fontSize: '14px' }}>{item.label}</span>
                                <span style={{ fontWeight: '900', color: '#1e293b', fontSize: '16px' }}>{item.value}</span>
                            </div>
                            <div className="progress-bar-prem" style={{ marginTop: '8px' }}>
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
