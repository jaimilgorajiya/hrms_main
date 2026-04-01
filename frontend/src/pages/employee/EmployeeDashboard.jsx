import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, FileText, Clock, Briefcase, Award } from 'lucide-react';
import authenticatedFetch from '../../utils/apiHandler';
import API_URL from '../../config/api';
import PunchWidget from '../../components/PunchWidget';
import '../../styles/EmployeePanel.css';

const EmployeeDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await authenticatedFetch(`${API_URL}/api/employee-dashboard/stats`);
        const json = await res.json();
        if (json.success) setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader"></div>
        <span>Loading your dashboard...</span>
      </div>
    );
  }

  const emp = data?.employee || {};
  const stats = data?.stats || {};

  const statCards = [
    {
      title: 'Leave Balance',
      value: stats.totalLeaves ?? '—',
      sub: stats.leaveGroupName || 'No group assigned',
      icon: <Calendar size={20} />,
      color: 'green',
      path: '/employee/leaves',
    },
    {
      title: 'Documents',
      value: stats.documentCount ?? 0,
      sub: 'Uploaded documents',
      icon: <FileText size={20} />,
      color: 'purple',
      path: '/employee/documents',
    },
    {
      title: 'Days at Company',
      value: stats.daysSinceJoining ?? '—',
      sub: emp.dateJoined ? `Joined ${new Date(emp.dateJoined).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'Date not set',
      icon: <Award size={20} />,
      color: 'blue',
      path: null,
    },
    {
      title: 'Punch Fix',
      value: stats.missingPunchCount ?? 0,
      sub: 'Pending corrections',
      icon: <Clock size={20} />,
      color: 'orange',
      path: '/employee/attendance',
    },
    {
      title: 'Current Shift',
      value: stats.shiftName || '—',
      sub: stats.shiftStart && stats.shiftEnd ? `${stats.shiftStart} – ${stats.shiftEnd}` : 'Not assigned',
      icon: <Briefcase size={20} />,
      color: 'blue',
      path: '/employee/shift',
    },
  ];

  return (
    <div className="ep-dashboard">
      {/* Welcome Banner */}
      <div className="ep-welcome-banner">
        <div className="ep-welcome-left">
          <div className="ep-welcome-avatar">
            {emp.profilePhoto ? (
              <img src={`${API_URL}/uploads/${emp.profilePhoto}`} alt="profile" />
            ) : (
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name || 'Employee')}&background=2563EB&color=fff&size=80`} alt="avatar" />
            )}
          </div>
          <div className="ep-welcome-info">
            <h1>Welcome back, {emp.firstName || emp.name?.split(' ')[0] || 'Employee'} 👋</h1>
            <p>{emp.designation || 'Employee'} &bull; {emp.department || 'Department'} &bull; {emp.branch || 'Branch'}</p>
            <div className="ep-welcome-badges">
              <span className={`ep-status-badge ${emp.status?.toLowerCase()}`}>{emp.status || 'Active'}</span>
              {emp.employeeId && <span className="ep-emp-id-badge">ID: {emp.employeeId}</span>}
              {emp.employmentType && <span className="ep-emp-type-badge">{emp.employmentType}</span>}
            </div>
          </div>
        </div>
        <div className="ep-welcome-actions">
          <button className="ep-btn-outline" onClick={() => navigate('/employee/attendance')}>
            <Calendar size={16} /> View Attendance
          </button>
          <button className="ep-btn-primary" onClick={() => navigate('/employee/profile')}>
            <User size={16} /> My Profile
          </button>
        </div>
      </div>

      {/* Top row: Punch Widget + Stat Cards */}
      <div className="ep-top-row">
        <div className="ep-punch-highlight">
          <PunchWidget />
        </div>
        <div className="ep-stats-grid">
          {statCards.map((card, i) => (
            <div
              key={i}
              className={`ep-stat-card ${card.path ? 'clickable' : ''}`}
              onClick={() => card.path && navigate(card.path)}
            >
              <div className={`ep-stat-icon ${card.color}`}>{card.icon}</div>
              <div className="ep-stat-content">
                <span className="ep-stat-title">{card.title}</span>
                <span className="ep-stat-value">{card.value}</span>
                <span className="ep-stat-sub">{card.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Grid */}
      <div className="ep-info-grid">
        {/* Personal Info */}
        <div className="ep-card">
          <div className="ep-card-header">
            <User size={18} />
            <h3>Personal Information</h3>
          </div>
          <div className="ep-card-body">
            <div className="ep-info-row"><span>Full Name</span><span>{emp.name || '—'}</span></div>
            <div className="ep-info-row"><span>Email</span><span>{emp.email || '—'}</span></div>
            <div className="ep-info-row"><span>Phone</span><span>{emp.phone || '—'}</span></div>
            <div className="ep-info-row"><span>Gender</span><span>{emp.gender || '—'}</span></div>
            <div className="ep-info-row"><span>Date of Birth</span><span>{emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString('en-IN') : '—'}</span></div>
            <div className="ep-info-row"><span>Blood Group</span><span>{emp.bloodGroup || '—'}</span></div>
          </div>
          <div className="ep-card-footer">
            <button className="ep-link-btn" onClick={() => navigate('/employee/profile')}>View Full Profile →</button>
          </div>
        </div>

        {/* Work Info */}
        <div className="ep-card">
          <div className="ep-card-header">
            <Briefcase size={18} />
            <h3>Work Information</h3>
          </div>
          <div className="ep-card-body">
            <div className="ep-info-row"><span>Employee ID</span><span>{emp.employeeId || '—'}</span></div>
            <div className="ep-info-row"><span>Designation</span><span>{emp.designation || '—'}</span></div>
            <div className="ep-info-row"><span>Department</span><span>{emp.department || '—'}</span></div>
            <div className="ep-info-row"><span>Branch</span><span>{emp.branch || '—'}</span></div>
            <div className="ep-info-row"><span>Reporting To</span><span>{emp.reportingTo || '—'}</span></div>
            <div className="ep-info-row"><span>Work Mode</span><span>{emp.workSetup?.mode || '—'}</span></div>
          </div>
          <div className="ep-card-footer">
            <button className="ep-link-btn" onClick={() => navigate('/employee/shift')}>View Shift Details →</button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="ep-card">
          <div className="ep-card-header">
            <Clock size={18} />
            <h3>Quick Actions</h3>
          </div>
          <div className="ep-quick-links">
            {[
              { label: 'View Attendance', icon: <Calendar size={16} />, path: '/employee/attendance' },
              { label: 'Apply Leave', icon: <Calendar size={16} />, path: '/employee/leaves' },
              { label: 'Download Payslip', icon: <FileText size={16} />, path: '/employee/payslips' },
              { label: 'My Documents', icon: <FileText size={16} />, path: '/employee/documents' },
              { label: 'Shift Schedule', icon: <Clock size={16} />, path: '/employee/shift' },
              { label: 'Edit Profile', icon: <User size={16} />, path: '/employee/profile' },
            ].map((link, i) => (
              <button key={i} className="ep-quick-link-btn" onClick={() => navigate(link.path)}>
                {link.icon}
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
