import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Calendar, Umbrella, Receipt, User } from 'lucide-react';

const tabs = [
  { to: '/mobile/dashboard',  icon: Home,       label: 'Home'       },
  { to: '/mobile/attendance', icon: Calendar,   label: 'Attendance'  },
  { to: '/mobile/leaves',     icon: Umbrella,   label: 'Leaves'      },
  { to: '/mobile/payslips',    icon: Receipt,    label: 'Payslips'    },
  { to: '/mobile/profile',    icon: User,       label: 'Profile'     },
];

export default function MobileBottomNav({ unreadCount = 0 }) {
  const location = useLocation();

  return (
    <nav className="mobile-bottom-nav">
      {tabs.map(({ to, icon: Icon, label }) => {
        const isActive = location.pathname.startsWith(to);
        return (
          <NavLink
            key={to}
            to={to}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <span className="nav-icon-wrap" style={{ position: 'relative' }}>
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                style={{ transition: 'all 200ms ease' }}
              />
              {label === 'Home' && unreadCount > 0 && (
                <span className="mobile-nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </span>
            <span className="nav-label">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
