import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { employeeMenuItems } from '../config/employeeMenuItems';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';

const EmployeeSidebar = ({ isCollapsed }) => {
  const [user, setUser] = useState(null);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(stored);

    const fetchCompany = async () => {
      try {
        const res = await authenticatedFetch(`${API_URL}/api/company`);
        if (res.ok) {
          const data = await res.json();
          if (data?.companyName) setCompanyName(data.companyName);
        }
      } catch (e) {}
    };
    fetchCompany();
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img
          src={isCollapsed ? '/iipl-logo.png' : '/iipl-horizontal-logo.png'}
          alt="Logo"
        />
      </div>

      {!isCollapsed && companyName && (
        <div className="company-info-sidebar">
          <div className="company-name-display">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="company-icon">
              <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
              <path d="M9 22v-4h6v4"/>
              <path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/>
              <path d="M12 10h.01"/><path d="M12 14h.01"/>
              <path d="M16 10h.01"/><path d="M16 14h.01"/>
              <path d="M8 10h.01"/><path d="M8 14h.01"/>
            </svg>
            <span className="truncate-text">{companyName}</span>
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        {employeeMenuItems.map((item, index) => (
          <div key={index} className="menu-group">
            <NavLink
              to={item.path}
              className={({ isActive }) => isActive ? 'menu-item active' : 'menu-item'}
            >
              <span className="icon-wrapper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={item.icon} />
                </svg>
              </span>
              {!isCollapsed && <span className="menu-text">{item.title}</span>}
            </NavLink>
          </div>
        ))}
      </nav>

      {!isCollapsed && user && (
        <div className="sidebar-footer">
          <div className="emp-sidebar-user">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Employee')}&background=2563EB&color=fff`}
              alt="avatar"
              className="emp-sidebar-avatar"
            />
            <div className="emp-sidebar-info">
              <span className="emp-sidebar-name">{user.name || 'Employee'}</span>
              <span className="emp-sidebar-role">Employee</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default EmployeeSidebar;
