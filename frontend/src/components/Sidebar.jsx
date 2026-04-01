import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { menuItems } from '../config/menuItems';

const Sidebar = ({ isCollapsed }) => {
  const [expandedMenus, setExpandedMenus] = useState({});
  const [companyName, setCompanyName] = useState("");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        
        const token = localStorage.getItem('token');
        const response = await authenticatedFetch(`${API_URL}/api/company`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.companyName) {
            setCompanyName(data.companyName);
          }
        }
      } catch (error) {
        console.error("Error fetching company name:", error);
      }
    };
    
    const fetchUserData = async () => {
      try {
        const response = await authenticatedFetch(`${API_URL}/api/auth/verify`);
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    
    fetchCompanyData();
    fetchUserData();

    // Listen for cross-component updates from the CompanyDetails page
    const handleCompanyUpdate = (event) => {
      if (event.detail && event.detail.companyName) {
        setCompanyName(event.detail.companyName);
      }
    };
    window.addEventListener('companyDetailsUpdated', handleCompanyUpdate);

    return () => {
      window.removeEventListener('companyDetailsUpdated', handleCompanyUpdate);
    };
  }, []);

  // Automatically expand parent menus based on current path
  useEffect(() => {
    const currentPath = location.pathname;
    const newExpandedMenus = {};

    menuItems.forEach(item => {
      if (item.subItems) {
        let isParentActive = false;
        item.subItems.forEach(sub => {
          if (sub.children) {
            const isSubParentActive = sub.children.some(child => child.path === currentPath);
            if (isSubParentActive) {
              newExpandedMenus[sub.title] = true;
              isParentActive = true;
            }
          } else if (sub.path === currentPath) {
            isParentActive = true;
          }
        });

        if (isParentActive) {
          newExpandedMenus[item.title] = true;
        }
      }
    });

    setExpandedMenus(newExpandedMenus);
  }, [location.pathname]);

  const toggleMenu = (key, siblings = []) => {
    setExpandedMenus(prev => {
      const isOpening = !prev[key];
      const newState = { ...prev, [key]: isOpening };
      
      if (isOpening && siblings.length > 0) {
        siblings.forEach(sibling => {
          if (sibling !== key) {
            newState[sibling] = false;
          }
        });
      }
      return newState;
    });
  };

  const isAllowed = (permissions, module, subModule = null, childModule = null) => {
    // Force allow Sidebar Setup for Admin safety
    if (childModule === "Sidebar Setup" || childModule === "Monthly Attendances") return true;

    return permissions?.some(
      (p) =>
        p.access &&
        p.module === module &&
        (p.subModule ?? null) === (subModule ?? null) &&
        (p.childModule ?? null) === (childModule ?? null)
    );
  };

  const filterItemsByPermissions = (items, permissions) => {
    return items
      .map((mod) => {
        // Leaf module like Dashboard
        if (!mod.subItems) {
          return isAllowed(permissions, mod.title, null, null) ? mod : null;
        }

        const filteredSubItems = (mod.subItems || [])
          .map((sub) => {
            if (!sub.children) {
              // Submodule leaf
              return isAllowed(permissions, mod.title, sub.title, null) ? sub : null;
            }

            const filteredChildren = (sub.children || []).filter((child) =>
              isAllowed(permissions, mod.title, sub.title, child.title)
            );
            if (filteredChildren.length === 0) return null;
            return { ...sub, children: filteredChildren };
          })
          .filter(Boolean);

        if (filteredSubItems.length === 0) return null;
        return { ...mod, subItems: filteredSubItems };
      })
      .filter(Boolean);
  };

  const filteredMenuItems = (() => {
    // Admin fallback (prevent lockout): Admin with no assigned managementRole sees everything
    if (user?.role === "Admin" && !user?.managementRole) return menuItems;

    // Once managementRole assigned, strictly follow matrix (even for Admin)
    if (user?.managementRole?.permissions) {
      return filterItemsByPermissions(menuItems, user.managementRole.permissions);
    }

    // Everyone else: hide everything (current app is admin-only anyway)
    return [];
  })();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img 
          src={isCollapsed ? "/iipl-logo.png" : "/iipl-horizontal-logo.png"} 
          alt="Logo" 
        />
      </div>
      
      {!isCollapsed && companyName && (
        <div className="company-info-sidebar">
          <div className="company-name-display">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="company-icon">
              <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
              <path d="M9 22v-4h6v4"/>
              <path d="M8 6h.01"/>
              <path d="M16 6h.01"/>
              <path d="M12 6h.01"/>
              <path d="M12 10h.01"/>
              <path d="M12 14h.01"/>
              <path d="M16 10h.01"/>
              <path d="M16 14h.01"/>
              <path d="M8 10h.01"/>
              <path d="M8 14h.01"/>
            </svg>
            <span className="truncate-text">{companyName}</span>
          </div>
        </div>
      )} 
      
      <nav className="sidebar-nav">
        {filteredMenuItems.map((item, index) => (
          <div key={index} className="menu-group">
            {item.subItems ? (
              <div className="has-submenu">
                <button 
                  className={`menu-item ${expandedMenus[item.title] ? 'active' : ''}`}
                  onClick={() => toggleMenu(item.title, menuItems.filter(m => m.subItems).map(m => m.title))}
                >
                  <span className="icon-wrapper">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={item.icon} />
                    </svg>
                  </span>
                  {!isCollapsed && (
                    <>
                      <span className="menu-text">{item.title}</span>
                      <span className={`arrow ${expandedMenus[item.title] ? 'open' : ''}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </>
                  )}
                </button>
                {!isCollapsed && expandedMenus[item.title] && (
                  <ul className="submenu">
                    {item.subItems.map((sub, sIdx) => (
                      <li key={sIdx} className="submenu-item-container">
                        {sub.children ? (
                          <>
                            <div 
                              className={`submenu-label ${expandedMenus[sub.title] ? 'expanded' : ''}`}
                              onClick={() => toggleMenu(sub.title, item.subItems.filter(s => s.children).map(s => s.title))}
                            >
                              <div className="label-content">
                                <span className="sub-icon">
                                  <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="12" r="12" />
                                  </svg>
                                </span>
                                {sub.title}
                              </div>
                              <svg className={`sub-arrow ${expandedMenus[sub.title] ? 'open' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            {expandedMenus[sub.title] && (
                              <ul className="nested-submenu">
                                {sub.children.map((child, cIdx) => (
                                  <li key={cIdx}>
                                    <NavLink to={child.path} className={({ isActive }) => isActive ? 'active' : ''}>
                                      <span className="nested-dot"></span>
                                      {child.title}
                                    </NavLink>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        ) : (
                          <NavLink to={sub.path} className={({ isActive }) => isActive ? 'active' : ''}>
                            <span className="sub-icon">
                              <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="12" />
                              </svg>
                            </span>
                            {sub.title}
                          </NavLink>
                        )
                        }
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
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
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
