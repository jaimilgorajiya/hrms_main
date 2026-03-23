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
  LayoutDashboard
} from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    fetchStats();
  }, []);

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
      trend: '+12%', 
      positive: true,
      color: 'blue' 
    },
    { 
      title: 'Active Now', 
      value: stats.activeUsers || 0, 
      icon: <Briefcase size={20} />, 
      trend: '+4%', 
      positive: true,
      color: 'green' 
    },
    { 
      title: 'Monthly Onboarding', 
      value: stats.activeOnboarding || 0, 
      icon: <UserPlus size={20} />, 
      trend: '+4', 
      positive: true,
      color: 'purple' 
    },
    { 
      title: 'Active Offboarding', 
      value: stats.activeOffboarding || 0, 
      icon: <UserMinus size={20} />, 
      trend: '-2', 
      positive: false,
      color: 'red' 
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
          <div key={index} className="stat-card-premium">
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

      <div className="dashboard-main-grid">
        <div className="main-grid-left">
          <div className="card-prem">
            <div className="card-header-prem">
              <h2>Recent Employee Activity</h2>
              <button className="icon-btn-prem"><MoreVertical size={18} /></button>
            </div>
            <div className="card-body-prem">
              <div className="activity-list-prem">
                {data?.recentUsers?.map((user, index) => (
                  <div key={index} className="activity-item-prem">
                    <div className="user-avatar-prem">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} alt="" />
                    </div>
                    <div className="activity-info-prem">
                      <div className="info-top">
                        <span className="user-name-prem">{user.name}</span>
                        <span className="time-prem">{new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="info-bottom">
                        <span className="role-chip-prem">{user.role}</span>
                        <span className="action-text-prem">joined the {user.department || 'Company'}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="arrow-icon-prem" />
                  </div>
                ))}
                {(!data?.recentUsers || data.recentUsers.length === 0) && (
                   <div className="empty-state-prem">No recent activity found.</div>
                )}
              </div>
            </div>
            <div className="card-footer-prem">
              <button className="view-all-prem">View Full History</button>
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
             <div className="small-card-prem">
                <span className="small-label">Departments</span>
                <span className="small-value">{stats.totalDepartments || 0}</span>
                <Building2 size={16} className="small-icon" />
             </div>
             <div className="small-card-prem">
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
