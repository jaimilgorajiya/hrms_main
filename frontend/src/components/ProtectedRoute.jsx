import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles }) => {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    console.error("Error parsing user from localStorage:", e);
  }
  const token = localStorage.getItem('token');

  if (!token || !user || !user.role) {
    // If half-logged in state, clear everything
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their own dashboard if they try to access something they shouldn't
    const role = user.role;
    const redirectPath = role === 'Admin' ? '/admin' : 
                         role === 'Manager' ? '/manager-dashboard' : '/employee';
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
