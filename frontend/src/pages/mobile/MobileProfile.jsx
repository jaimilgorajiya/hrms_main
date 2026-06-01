  import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Briefcase, Phone, Award, FileText,
  Sun, Moon, LogOut, ChevronRight, ExternalLink
} from 'lucide-react';
import { useMobileAuth } from './context/MobileAuthContext';
import { useMobileTheme } from './context/MobileThemeContext';
import API_URL from '../../config/api';

const TABS = ['Personal', 'Work', 'Contact', 'Experience', 'Documents'];

function ProfileItem({ icon: Icon, label, value }) {
  return (
    <div className="m-detail-row">
      <span className="m-detail-label" style={{ gap: 8 }}>
        <Icon size={14} color="var(--m-primary)" />
        {label}
      </span>
      <span className="m-detail-value" style={{ maxWidth: '55%', wordBreak: 'break-word', textAlign: 'right' }}>
        {value || '—'}
      </span>
    </div>
  );
}

export default function MobileProfile() {
  const { apiFetch, logout } = useMobileAuth();
  const { isDark, toggle: toggleTheme } = useMobileTheme();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Personal');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    apiFetch('/api/employee-dashboard/stats')
      .then(r => r.json())
      .then(json => { if (json.success) setData(json.employee); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/employee/login', { replace: true });
  };

  const photoUrl = data?.profilePhoto
    ? (data.profilePhoto.startsWith('http') ? data.profilePhoto : `${API_URL}/uploads/${data.profilePhoto}`)
    : null;

  if (loading) return <div className="m-loader" style={{ height: '60vh' }}><div className="m-spinner" /></div>;

  const initial = (data?.name || 'E')[0].toUpperCase();

  return (
    <div style={{ minHeight: '100%', paddingBottom: 20 }}>
      {/* Profile Hero */}
      <div style={{
        background: `linear-gradient(160deg, ${isDark ? '#1e3a6e' : '#6366F1'} 0%, ${isDark ? '#0f172a' : '#4338CA'} 100%)`,
        padding: '24px 20px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />

        {/* Top row: title + actions */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <p style={{ fontSize:12, fontWeight:800, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:1.2, margin:0 }}>ACCOUNT</p>
          <div style={{ display:'flex', gap:10 }}>
            <button
              type="button"
              onClick={toggleTheme}
              style={{ width:40, height:40, borderRadius:12, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 50, position: 'relative' }}
            >
              {isDark ? <Sun size={18} color="white" /> : <Moon size={18} color="white" />}
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('Logout button clicked');
                setShowLogoutConfirm(true);
              }}
              style={{ width:40, height:40, borderRadius:12, background:'rgba(239,68,68,0.2)', border:'1px solid rgba(239,68,68,0.35)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 50, position: 'relative' }}
            >
              <LogOut size={18} color="#F87171" />
            </button>
          </div>
        </div>

        {/* Avatar + name */}
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
          <div className="m-avatar" style={{ width:80, height:80, borderRadius:24, fontSize:32, border:'3px solid rgba(255,255,255,0.35)' }}>
            {photoUrl ? <img src={photoUrl} alt={data?.name} /> : initial}
          </div>
          <div>
            <div style={{ fontSize:22, fontWeight:900, color:'white', letterSpacing:-0.5 }}>{data?.name || 'Employee'}</div>
            <div style={{ marginTop:6, display:'inline-flex', alignItems:'center', background:'rgba(255,255,255,0.15)', borderRadius:8, padding:'4px 10px', fontSize:11, fontWeight:800, color:'white', textTransform:'uppercase', letterSpacing:0.5 }}>
              {data?.designation || 'Staff'}
            </div>
          </div>
        </div>

        {/* Stat pills */}
        <div style={{ display:'flex', gap:0, background:'rgba(255,255,255,0.1)', borderRadius:16, overflow:'hidden' }}>
          <div style={{ flex:1, textAlign:'center', padding:'12px 8px' }}>
            <div style={{ fontSize:14, fontWeight:900, color:'white' }}>{data?.employeeId || '—'}</div>
            <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:0.5, marginTop:2 }}>EMP ID</div>
          </div>
          <div style={{ width:1, background:'rgba(255,255,255,0.2)' }} />
          <div style={{ flex:1, textAlign:'center', padding:'12px 8px' }}>
            <div style={{ fontSize:13, fontWeight:900, color: (data?.personalInfo?.status === 'Active' || !data?.personalInfo?.status) ? '#34D399' : '#F87171' }}>
              {data?.personalInfo?.status || 'ACTIVE'}
            </div>
            <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:0.5, marginTop:2 }}>STATUS</div>
          </div>
          <div style={{ width:1, background:'rgba(255,255,255,0.2)' }} />
          <div style={{ flex:1, textAlign:'center', padding:'12px 8px' }}>
            <div style={{ fontSize:13, fontWeight:900, color:'white' }}>{data?.department?.slice(0,10) || '—'}</div>
            <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:0.5, marginTop:2 }}>DEPT</div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ background:'var(--m-surface)', borderBottom:'1px solid var(--m-border)', paddingTop:4 }}>
        <div className="m-profile-tabs">
          {TABS.map(t => (
            <button key={t} className={`m-profile-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding:'16px' }}>
        <div className="m-card">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingBottom:12, borderBottom:'1px solid var(--m-border)' }}>
            <span style={{ fontSize:16, fontWeight:900, color:'var(--m-text)' }}>{activeTab} Details</span>
          </div>

          {activeTab === 'Personal' && (
            <div>
              <ProfileItem icon={User} label="Full Name" value={data?.name} />
              <ProfileItem icon={Award} label="Date of Birth" value={data?.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }) : null} />
              <ProfileItem icon={User} label="Gender" value={data?.gender} />
              <ProfileItem icon={User} label="Blood Group" value={data?.bloodGroup} />
              <ProfileItem icon={User} label="Marital Status" value={data?.maritalStatus} />
            </div>
          )}

          {activeTab === 'Work' && (
            <div>
              <ProfileItem icon={Briefcase} label="Office Branch" value={data?.branch} />
              <ProfileItem icon={Briefcase} label="Department" value={data?.department} />
              <ProfileItem icon={Briefcase} label="Designation" value={data?.designation} />
              <ProfileItem icon={Award} label="Joining Date" value={data?.dateJoined ? new Date(data.dateJoined).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }) : null} />
              <ProfileItem icon={Briefcase} label="Employment" value={data?.workSetup?.employmentType || 'Permanent'} />
            </div>
          )}

          {activeTab === 'Contact' && (
            <div>
              <ProfileItem icon={Phone} label="Work Email" value={data?.email} />
              <ProfileItem icon={Phone} label="Personal Email" value={data?.personalEmail} />
              <ProfileItem icon={Phone} label="Phone" value={data?.phone} />
              <ProfileItem icon={Phone} label="Address" value={data?.currentAddress} />
            </div>
          )}

          {activeTab === 'Experience' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {(data?.pastExperience || []).length > 0 ? (
                data.pastExperience.map((exp, i) => (
                  <div key={i} style={{ display:'flex', gap:14, paddingBottom:16, borderBottom:'1px solid var(--m-border)' }}>
                    <div style={{ width:36, height:36, borderRadius:12, background:'var(--m-primary)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Briefcase size={16} color="white" />
                    </div>
                    <div>
                      <div style={{ fontSize:15, fontWeight:900, color:'var(--m-text)' }}>{exp.companyName}</div>
                      <div style={{ fontSize:13, color:'var(--m-muted)', marginTop:2 }}>{exp.designation}</div>
                      <div style={{ fontSize:12, color:'var(--m-primary)', fontWeight:800, marginTop:4 }}>
                        {exp.workFrom ? new Date(exp.workFrom).getFullYear() : ''} – {exp.workTo ? new Date(exp.workTo).getFullYear() : 'Present'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign:'center', color:'var(--m-muted)', padding:'30px 0', fontSize:13 }}>No experience records</div>
              )}
            </div>
          )}

          {activeTab === 'Documents' && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {(data?.documents || []).length > 0 ? (
                data.documents.map((doc, i) => {
                  const url = doc.fileUrl ? (doc.fileUrl.startsWith('http') ? doc.fileUrl : `${API_URL}/uploads/${doc.fileUrl}`) : null;
                  return (
                    <div key={i} className="m-list-item" onClick={() => url && window.open(url, '_blank')} style={{ cursor: url ? 'pointer' : 'default' }}>
                      <div className="m-list-icon" style={{ background:'var(--m-primary-light)' }}>
                        <FileText size={18} color="var(--m-primary)" />
                      </div>
                      <div className="m-list-content">
                        <div className="m-list-title">{doc.originalName || 'Document'}</div>
                        <div className="m-list-sub">{doc.documentType?.documentTypeName || 'Internal'}</div>
                      </div>
                      {url && <ExternalLink size={16} color="var(--m-muted)" />}
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign:'center', color:'var(--m-muted)', padding:'30px 0', fontSize:13 }}>No documents found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Logout confirm */}
      {showLogoutConfirm && (
        <div className="m-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="m-bottom-sheet" style={{ maxHeight:'auto' }} onClick={e => e.stopPropagation()}>
            <div className="m-bottom-sheet-handle" />
            <div style={{ padding:'24px 24px 32px', textAlign:'center' }}>
              <div style={{ width:60, height:60, borderRadius:20, background:'var(--m-danger-light)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <LogOut size={28} color="var(--m-danger)" />
              </div>
              <div style={{ fontSize:18, fontWeight:900, color:'var(--m-text)', marginBottom:8 }}>Confirm Logout</div>
              <div style={{ fontSize:14, color:'var(--m-muted)', marginBottom:24 }}>Are you sure you want to log out?</div>
              <div style={{ display:'flex', gap:12 }}>
                <button type="button" className="m-btn m-btn-ghost m-btn-full" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                <button type="button" className="m-btn m-btn-danger m-btn-full" onClick={handleLogout}>Logout</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
