import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import MobileBottomNav from './MobileBottomNav';
import { useMobileAuth } from './context/MobileAuthContext';
import { useMobileTheme } from './context/MobileThemeContext';
import '../../styles/MobileApp.css';

export default function MobileLayout() {
  const { isAuthenticated, loading, apiFetch } = useMobileAuth();
  const { isDark } = useMobileTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      apiFetch('/api/notifications/my')
        .then(r => r.json())
        .then(json => { if (json.success) setUnreadCount(json.unreadCount || 0); })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className={`mobile-app-root ${isDark ? 'dark' : ''}`}>
        <div className="mobile-app-page">
          <div className="mobile-container" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div className="m-loader"><div className="m-spinner" /></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/employee/login" replace />;

  return (
    <div className={`mobile-app-root ${isDark ? 'dark' : ''}`}>
      <div className="mobile-app-page">
        <div className="mobile-container">
          <div className="mobile-scroll-area">
            <Outlet context={{ setUnreadCount }} />
          </div>
          <MobileBottomNav unreadCount={unreadCount} />
        </div>
      </div>
    </div>
  );
}
