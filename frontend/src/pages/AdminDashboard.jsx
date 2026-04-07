import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Briefcase, 
  UserPlus, 
  UserMinus, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronRight,
  MoreVertical,
  Search,
  LayoutDashboard,
  Check,
  X,
  Clock,
  RefreshCw,
  Calendar,
  AlertCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
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
      const response = await authenticatedFetch(`${API_URL}/api/requests/admin/all?status=Pending`);
      const result = await response.json();
      if (result.success) {
        setPendingRequests(result.requests?.slice(0, 5) || []);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  const handleRequestAction = async (requestId, status) => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/requests/admin/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status, adminRemark: `Quick ${status} from Dashboard` })
      });
      const result = await response.json();
      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: `Request ${status}`,
          timer: 1500,
          showConfirmButton: false
        });
        fetchPendingRequests();
        fetchTodayActivities(); // Refresh because activities might change (on leave / correction)
      }
    } catch (error) {
      console.error("Error updating request:", error);
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
          <h1>Dashboard Overview</h1>
          <p>Welcome back! Here's what's happening with your workforce today.</p>
        </div>
        <div className="header-actions">
          <button className="btn-outline-prem">
            <Search size={16} />
            Find Employee
          </button>
          <button className="btn-primary-prem">
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
                    onClick={() => navigate(req.requestType === 'Leave' ? '/admin/leave/request' : '/admin/attendance/request')}
                  >
                    <div className="emp-brief" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: req.requestType === 'Leave' ? '#F0FDF4' : '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: req.requestType === 'Leave' ? '#10B981' : '#F97316' }}>
                          {req.requestType === 'Leave' ? <Calendar size={16} /> : <Clock size={16} />}
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
                          onClick={(e) => { e.stopPropagation(); handleRequestAction(req._id, 'Approved'); }}
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          className="icon-btn-prem" 
                          style={{ color: '#EF4444', backgroundColor: '#FEF2F2' }}
                          onClick={(e) => { e.stopPropagation(); handleRequestAction(req._id, 'Rejected'); }}
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
