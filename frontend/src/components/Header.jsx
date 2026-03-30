import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { menuItems } from '../config/menuItems';
import { Bell } from 'lucide-react';

const buildSearchableItems = () => {
  const items = [];
  for (const mod of menuItems) {
    if (!mod.subItems) {
      if (mod.path) items.push({ title: mod.title, path: mod.path, breadcrumb: mod.title });
      continue;
    }
    for (const sub of mod.subItems) {
      if (!sub.children) {
        if (sub.path) items.push({ title: sub.title, path: sub.path, breadcrumb: mod.title + ' / ' + sub.title });
        continue;
      }
      for (const child of sub.children) {
        items.push({ title: child.title, path: child.path, breadcrumb: sub.title + ' / ' + child.title });
      }
    }
  }
  return items;
};



const Header = ({ title, toggleSidebar, isCollapsed }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const profileRef = useRef(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [companyLogo, setCompanyLogo] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  

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
          if (data && data.logo) {
            setCompanyLogo(data.logo.startsWith('http') ? data.logo : `${API_URL}${data.logo}`);
          }
        }
      } catch (error) {
        console.error("Error fetching company logo:", error);
      }
    };
    
    fetchCompanyData();

    // Listen for cross-component updates
    const handleCompanyUpdate = (event) => {
      if (event.detail && event.detail.logo) {
        setCompanyLogo(event.detail.logo.startsWith('http') ? event.detail.logo : `${API_URL}${event.detail.logo}`);
      }
    };
    window.addEventListener('companyDetailsUpdated', handleCompanyUpdate);

    return () => {
      window.removeEventListener('companyDetailsUpdated', handleCompanyUpdate);
    };
  }, []);

  const placeholders = [
    "Search for modules...",
    "Search for Designation...",
    "Search for Employees...",
    "Search for Attendance...",
    "Search for Payroll...",
    "Search for Holidays...",
    "Search for WFH...",
    "Search for upcoming events..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Dynamically built from menuItems config
  const searchableItems = buildSearchableItems();

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const filtered = searchableItems.filter(item => 
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(filtered);
    setShowResults(true);
  }, [searchQuery]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = (path) => {
    navigate(path);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    Swal.fire({
      title: 'Are you sure?',
      text: "You will be logged out of your session!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3A82F6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, logout!',
      cancelButtonText: 'No, stay logged in'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        
        Swal.fire({
          title: 'Logged Out!',
          text: 'You have been successfully logged out.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  return (
    <header className="admin-header">
      <div className="header-left">
        <button className="icon-btn toggle-btn" onClick={toggleSidebar}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isCollapsed ? (
              <path d="M4 6h16M4 12h16M4 18h16" />
            ) : (
              <path d="M4 6h16M4 12h10M4 18h16" />
            )}
          </svg>
        </button>
        <h1 className="page-title">{title || ""}</h1>
      </div>
      
      <div className="header-search" ref={searchRef}>
        <div className="search-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            placeholder={placeholders[placeholderIndex]}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowResults(true)}
          />
        </div>
        
        {showResults && searchResults.length > 0 && (
          <div className="search-dropdown">
            {searchResults.map((result, index) => (
              <div 
                key={index} 
                className="search-result-item" 
                onClick={() => handleResultClick(result.path)}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{result.title}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{result.breadcrumb}</div>
              </div>
            ))}
          </div>
        )}
        {showResults && searchQuery && searchResults.length === 0 && (
          <div className="search-dropdown">
            <div className="search-no-results">No modules found</div>
          </div>
        )}
      </div>

      <div className="header-right">
      
        <button className="icon-btn notification-btn">
          <Bell size={20} />
          <span className="badge"></span>
        </button>
        
        <div className="user-profile-container" ref={profileRef} style={{ position: 'relative' }}>
          <div className="user-profile" onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ cursor: 'pointer' }}>
            <div className="avatar" style={{ overflow: 'hidden', padding: companyLogo ? '0' : '2px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {companyLogo ? (
                <img src={companyLogo} alt="Company Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Admin')}&background=0D8ABC&color=fff`} alt="Avatar" />
              )}
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3B648B', transform: showProfileMenu ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>

          {showProfileMenu && (
            <div className="profile-dropdown-menu">
              <div className="profile-dropdown-header">
                <strong>{user.name || "Admin"}</strong>
                <span>{user.email || "admin@example.com"}</span>
              </div>
              <div className="profile-dropdown-divider"></div>
              <button className="profile-dropdown-item" onClick={() => { setShowProfileMenu(false); navigate('/admin/profile'); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Profile
              </button>
              <button className="profile-dropdown-item logout-item" onClick={handleLogout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
