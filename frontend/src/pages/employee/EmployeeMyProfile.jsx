import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Briefcase, Lock, Eye, EyeOff, CheckCircle2, Camera } from 'lucide-react';
import Swal from 'sweetalert2';
import authenticatedFetch from '../../utils/apiHandler';
import API_URL from '../../config/api';
import '../../styles/EmployeePanel.css';

const EmployeeMyProfile = () => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authenticatedFetch(`${API_URL}/api/employee-dashboard/stats`);
        const json = await res.json();
        if (json.success) setEmployee(json.employee);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const getPhotoUrl = (photo) => {
    if (!photo) return null;
    return photo.startsWith('http') ? photo : `${API_URL}/uploads/${photo}`;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return Swal.fire({ title: 'Error', text: 'Passwords do not match.', icon: 'error', confirmButtonColor: '#2563EB' });
    }
    if (passwords.newPassword.length < 6) {
      return Swal.fire({ title: 'Error', text: 'Password must be at least 6 characters.', icon: 'error', confirmButtonColor: '#2563EB' });
    }
    setSavingPwd(true);
    try {
      const res = await authenticatedFetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({ title: 'Success!', text: 'Password updated.', icon: 'success', timer: 2000, showConfirmButton: false });
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        Swal.fire({ title: 'Error', text: data.message, icon: 'error', confirmButtonColor: '#2563EB' });
      }
    } catch (e) {
      Swal.fire({ title: 'Error', text: 'Something went wrong.', icon: 'error', confirmButtonColor: '#2563EB' });
    } finally { setSavingPwd(false); }
  };

  const getStrength = (pwd) => {
    if (!pwd) return null;
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    const map = ['Very Weak', 'Weak', 'Medium', 'Strong', 'Strong'];
    const colors = ['#EF4444', '#F59E0B', '#10B981', '#2563EB', '#2563EB'];
    return { label: map[s], color: colors[s], width: `${(s / 4) * 100}%` };
  };

  const strength = getStrength(passwords.newPassword);

  const tabs = [
    { key: 'personal', label: 'Personal' },
    { key: 'work', label: 'Work' },
    { key: 'address', label: 'Address' },
    { key: 'experience', label: 'Experience' },
    { key: 'security', label: 'Security' },
  ];

  if (loading) return <div className="dashboard-loading"><div className="loader"></div><span>Loading profile...</span></div>;
  if (!employee) return <div className="ep-empty-state">Profile not found.</div>;

  return (
    <div className="ep-profile-page">
      {/* Profile Header Card */}
      <div className="ep-profile-hero">
        <div className="ep-profile-hero-bg"></div>
        <div className="ep-profile-hero-content">
          <div className="ep-profile-avatar-wrap">
            {getPhotoUrl(employee.profilePhoto) ? (
              <img src={getPhotoUrl(employee.profilePhoto)} alt="profile" className="ep-profile-avatar" />
            ) : (
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name || 'E')}&background=2563EB&color=fff&size=120`} alt="avatar" className="ep-profile-avatar" />
            )}
          </div>
          <div className="ep-profile-hero-info">
            <h1>{employee.name}</h1>
            <p>{employee.designation || 'Employee'} &bull; {employee.department || '—'}</p>
            <div className="ep-profile-hero-meta">
              {employee.employeeId && <span><Briefcase size={13} /> {employee.employeeId}</span>}
              {employee.email && <span><Mail size={13} /> {employee.email}</span>}
              {employee.phone && <span><Phone size={13} /> {employee.phone}</span>}
              {employee.branch && <span><MapPin size={13} /> {employee.branch}</span>}
            </div>
          </div>
          <div className="ep-profile-hero-badge">
            <span className={`ep-status-badge ${employee.status?.toLowerCase()}`}>{employee.status || 'Active'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ep-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`ep-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="ep-tab-content">
        {activeTab === 'personal' && (
          <div className="ep-info-sections">
            <div className="ep-section">
              <h4>Basic Information</h4>
              <div className="ep-detail-grid">
                <div className="ep-detail-item"><label>First Name</label><span>{employee.firstName || '—'}</span></div>
                <div className="ep-detail-item"><label>Last Name</label><span>{employee.lastName || '—'}</span></div>
                <div className="ep-detail-item"><label>Email</label><span>{employee.email || '—'}</span></div>
                <div className="ep-detail-item"><label>Phone</label><span>{employee.phone || '—'}</span></div>
                <div className="ep-detail-item"><label>Gender</label><span>{employee.gender || '—'}</span></div>
                <div className="ep-detail-item"><label>Date of Birth</label><span>{employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('en-IN') : '—'}</span></div>
                <div className="ep-detail-item"><label>Blood Group</label><span>{employee.bloodGroup || '—'}</span></div>
                <div className="ep-detail-item"><label>Marital Status</label><span>{employee.maritalStatus || '—'}</span></div>
                <div className="ep-detail-item"><label>Nationality</label><span>{employee.nationality || '—'}</span></div>
              </div>
            </div>
            <div className="ep-section">
              <h4>Emergency Contact</h4>
              <div className="ep-detail-grid">
                <div className="ep-detail-item"><label>Name</label><span>{employee.emergencyContact?.name || '—'}</span></div>
                <div className="ep-detail-item"><label>Relation</label><span>{employee.emergencyContact?.relation || '—'}</span></div>
                <div className="ep-detail-item"><label>Phone</label><span>{employee.emergencyContact?.phone || '—'}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'work' && (
          <div className="ep-info-sections">
            <div className="ep-section">
              <h4>Employment Details</h4>
              <div className="ep-detail-grid">
                <div className="ep-detail-item"><label>Employee ID</label><span>{employee.employeeId || '—'}</span></div>
                <div className="ep-detail-item"><label>Designation</label><span>{employee.designation || '—'}</span></div>
                <div className="ep-detail-item"><label>Department</label><span>{employee.department || '—'}</span></div>
                <div className="ep-detail-item"><label>Branch</label><span>{employee.branch || '—'}</span></div>
                <div className="ep-detail-item"><label>Employment Type</label><span>{employee.employmentType || '—'}</span></div>
                <div className="ep-detail-item"><label>Date Joined</label><span>{employee.dateJoined ? new Date(employee.dateJoined).toLocaleDateString('en-IN') : '—'}</span></div>
                <div className="ep-detail-item"><label>Reporting To</label><span>{employee.reportingTo || '—'}</span></div>
                <div className="ep-detail-item"><label>Work Mode</label><span>{employee.workSetup?.mode || '—'}</span></div>
                <div className="ep-detail-item"><label>Grade</label><span>{employee.grade || '—'}</span></div>
                <div className="ep-detail-item"><label>Level</label><span>{employee.employeeLevel || '—'}</span></div>
              </div>
            </div>
            <div className="ep-section">
              <h4>Salary Information</h4>
              <div className="ep-detail-grid">
                <div className="ep-detail-item"><label>Salary Type</label><span>{employee.salaryDetails?.salaryType || '—'}</span></div>
                <div className="ep-detail-item"><label>Pay Grade</label><span>{employee.salaryDetails?.payGrade || '—'}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'address' && (
          <div className="ep-info-sections">
            <div className="ep-section">
              <h4>Current Address</h4>
              <div className="ep-detail-grid">
                <div className="ep-detail-item ep-full"><label>Address</label><span>{employee.currentAddress || '—'}</span></div>
                {employee.address && (
                  <>
                    <div className="ep-detail-item"><label>City</label><span>{employee.address.city || '—'}</span></div>
                    <div className="ep-detail-item"><label>State</label><span>{employee.address.state || '—'}</span></div>
                    <div className="ep-detail-item"><label>Country</label><span>{employee.address.country || '—'}</span></div>
                    <div className="ep-detail-item"><label>Pincode</label><span>{employee.address.pincode || '—'}</span></div>
                  </>
                )}
              </div>
            </div>
            <div className="ep-section">
              <h4>Permanent Address</h4>
              <div className="ep-detail-grid">
                <div className="ep-detail-item ep-full"><label>Address</label><span>{employee.permanentAddress || '—'}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'experience' && (
          <div className="ep-info-sections">
            <div className="ep-section">
              <h4>Past Experience</h4>
              {employee.pastExperience?.length > 0 ? (
                <div className="ep-experience-list">
                  {employee.pastExperience.map((exp, i) => (
                    <div key={i} className="ep-experience-card">
                      <div className="ep-exp-header">
                        <div>
                          <span className="ep-exp-company">{exp.companyName || '—'}</span>
                          <span className="ep-exp-designation">{exp.designation || '—'}</span>
                        </div>
                        {exp.isCurrent && <span className="ep-current-badge">Current</span>}
                      </div>
                      <div className="ep-exp-meta">
                        {exp.workFrom && <span>{new Date(exp.workFrom).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>}
                        {exp.workFrom && exp.workTo && <span>–</span>}
                        {exp.workTo && <span>{new Date(exp.workTo).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>}
                        {exp.location && <span>&bull; {exp.location}</span>}
                      </div>
                      {exp.description && <p className="ep-exp-desc">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ep-empty-state-sm">No experience records found.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="ep-info-sections">
            <div className="ep-section ep-security-section">
              <h4><Lock size={16} /> Change Password</h4>
              <form onSubmit={handlePasswordSubmit} className="ep-pwd-form">
                {['currentPassword', 'newPassword', 'confirmPassword'].map((field, i) => (
                  <div key={field} className="ep-form-group">
                    <label>{['Current Password', 'New Password', 'Confirm New Password'][i]}</label>
                    <div className="ep-pwd-input-wrap">
                      <input
                        type={showPwd[field.replace('Password', '').replace('current', 'current').replace('new', 'new').replace('confirm', 'confirm')] ? 'text' : 'password'}
                        value={passwords[field]}
                        onChange={e => setPasswords(p => ({ ...p, [field]: e.target.value }))}
                        placeholder="••••••••"
                        required
                      />
                      <button type="button" className="ep-pwd-toggle" onClick={() => {
                        const k = field === 'currentPassword' ? 'current' : field === 'newPassword' ? 'new' : 'confirm';
                        setShowPwd(p => ({ ...p, [k]: !p[k] }));
                      }}>
                        {showPwd[field === 'currentPassword' ? 'current' : field === 'newPassword' ? 'new' : 'confirm'] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {field === 'newPassword' && strength && (
                      <div className="ep-strength-bar">
                        <div className="ep-strength-fill" style={{ width: strength.width, background: strength.color }}></div>
                        <span style={{ color: strength.color, fontSize: 12 }}>{strength.label}</span>
                      </div>
                    )}
                  </div>
                ))}
                <button type="submit" className="ep-btn-primary" disabled={savingPwd}>
                  <CheckCircle2 size={16} />
                  {savingPwd ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeMyProfile;
