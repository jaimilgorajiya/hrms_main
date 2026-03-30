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
  RefreshCw
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingAttendance, setPendingAttendance] = useState([]);
  const navigate = useNavigate();
  

  useEffect(() => {
    fetchStats();
    fetchPendingAttendance();
  }, []);

  const fetchPendingAttendance = async () => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/attendance/admin/all?approvalStatus=Pending`);
      const result = await response.json();
      if (result.success) {
        setPendingAttendance(result.records?.slice(0, 5) || []);
      }
    } catch (error) {
      console.error("Error fetching pending attendance:", error);
    }
  };

  const handleApprovalAction = async (id, status) => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/attendance/admin/approve`, {
        method: 'POST',
        body: JSON.stringify({ attendanceId: id, status })
      });
      const result = await response.json();
      if (result.success) {
        Swal.fire({ title: `Attendance ${status}`, icon: 'success', timer: 1000, showConfirmButton: false });
        fetchPendingAttendance();
      }
    } catch (err) {
      console.error(err);
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

  const statCards = [
    { 
      title: 'Total Employees', 
      value: stats.totalUsers || 0, 
      icon: <Users size={20} />, 
      trend: '+12%', 
      positive: true,
      color: 'blue',
      link: '/admin/employees/list'
    },
    { 
      title: 'Active Now', 
      value: stats.activeUsers || 0, 
      icon: <Briefcase size={20} />, 
      trend: '+4%', 
      positive: true,
      color: 'green',
      link: '/admin/attendance/records'
    },
    { 
      title: 'Monthly Onboarding', 
      value: stats.activeOnboarding || 0, 
      icon: <UserPlus size={20} />, 
      trend: '+4', 
      positive: true,
      color: 'purple',
      link: '/admin/employees/onboarding'
    },
    { 
      title: 'Active Offboarding', 
      value: stats.activeOffboarding || 0, 
      icon: <UserMinus size={20} />, 
      trend: '-2', 
      positive: false,
      color: 'red',
      link: '/admin/employees/offboarding'
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

      <div className="dashboard-main-grid">
        <div className="main-grid-left">
          <div className="card-prem">
            <div className="card-header-prem">
              <h2>Attendance Approvals</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-pending" style={{ background: '#FFFBEB', color: '#F59E0B', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px' }}>
                  {pendingAttendance.length} Pending
                </span>
                <button className="icon-btn-prem" onClick={fetchPendingAttendance}><RefreshCw size={16} /></button>
              </div>
            </div>
            <div className="card-body-prem" style={{ padding: '0' }}>
              <div className="attendance-list-dashboard">
                {pendingAttendance.map((rec) => (
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

                    <div className="action-buttons-dashboard" style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleApprovalAction(rec._id, 'Approved')}
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#DCFCE7', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                        title="Approve"
                      >
                        <Check size={18} />
                      </button>
                      <button 
                        onClick={() => handleApprovalAction(rec._id, 'Rejected')}
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                        title="Reject"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {pendingAttendance.length === 0 && (
                  <div style={{ padding: '60px 40px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' }}>
                     No pending attendance approvals.
                  </div>
                )}
              </div>
            </div>
            <div className="card-footer-prem">
               <button className="view-all-prem" onClick={() => navigate('/admin/attendance/records')}>Review All Records</button>
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
