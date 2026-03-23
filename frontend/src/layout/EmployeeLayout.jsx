import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import EmployeeSidebar from '../components/EmployeeSidebar';
import EmployeeHeader from '../components/EmployeeHeader';

const EmployeeLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => setIsCollapsed(prev => !prev);

  return (
    <div className={`admin-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <EmployeeSidebar isCollapsed={isCollapsed} />
      <div className="main-wrapper">
        <EmployeeHeader toggleSidebar={toggleSidebar} isCollapsed={isCollapsed} />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default EmployeeLayout;
