import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mail, Phone, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';
// CSS moved to index.css

const MyProfile = () => {
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState({
    companyName: '',
    companyContact: '',
    companyEmail: '',
    logo: ''
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  const fileInputRef = useRef(null);
  
  
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await authenticatedFetch(`${API_URL}/api/company`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if(response.ok) {
          const data = await response.json();
          setCompanyData(data);
        }
      } catch (error) {
        console.error("Error fetching company details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [API_URL]);

  const getFullLogoUrl = (logoPath) => {
    if (!logoPath) return null;
    return logoPath.startsWith('http') ? logoPath : `${API_URL}${logoPath}`;
  };

  const handlePasswordChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (passwords.currentPassword === passwords.newPassword) {
      return Swal.fire({
          title: 'Error',
          text: 'New password cannot be the same as the current password.',
          icon: 'error',
          confirmButtonColor: '#111827',
      });
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      return Swal.fire({
          title: 'Error',
          text: 'New passwords do not match.',
          icon: 'error',
          confirmButtonColor: '#111827',
      });
    }

    if (passwords.newPassword.length < 6) {
      return Swal.fire({
          title: 'Error',
          text: 'New password must be at least 6 characters long.',
          icon: 'error',
          confirmButtonColor: '#111827',
      });
    }

    setIsChangingPassword(true);

    try {
      const token = localStorage.getItem('token');
      const response = await authenticatedFetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        Swal.fire({
          title: 'Success!',
          text: 'Your password has been changed successfully.',
          icon: 'success',
          confirmButtonColor: '#111827',
          timer: 2000,
          showConfirmButton: false
        });
        setPasswords({currentPassword: '', newPassword: '', confirmPassword: ''});
      } else {
        Swal.fire({
            title: 'Error',
            text: data.message || 'Failed to change password.',
            icon: 'error',
            confirmButtonColor: '#111827',
        });
      }
    } catch (error) {
       console.error("Change Password Error:", error);
       Swal.fire({
            title: 'Error',
            text: 'An unexpected error occurred.',
            icon: 'error',
            confirmButtonColor: '#111827',
        });
    } finally {
        setIsChangingPassword(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      Swal.fire({
        title: 'Upload Photo?',
        text: `Do you want to set ${file.name} as your profile photo?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#111827',
        confirmButtonText: 'Yes'
      }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Uploading...',
                text: 'Please wait while we update your profile photo.',
                allowOutsideClick: false,
                didOpen: () => {
                   Swal.showLoading();
                }
            });

            try {
              const uploadDataForm = new FormData();
              uploadDataForm.append('file', file);
              
              const token = localStorage.getItem('token');
              const uploadRes = await authenticatedFetch(`${API_URL}/api/upload`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                body: uploadDataForm
              });
              
              const uploadData = await uploadRes.json();
              if (uploadData.success) {
                  const newLogoUrl = uploadData.fileUrl;
                  
                  const response = await authenticatedFetch(`${API_URL}/api/company`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ ...companyData, logo: newLogoUrl })
                  });

                  if (response.ok) {
                     setCompanyData({ ...companyData, logo: newLogoUrl });
                     window.dispatchEvent(new CustomEvent('companyDetailsUpdated', { 
                       detail: { 
                         companyName: companyData.companyName,
                         logo: newLogoUrl 
                       } 
                     }));
                     
                     Swal.fire({
                       title: 'Success!',
                       text: 'Profile photo updated successfully.',
                       icon: 'success',
                       confirmButtonColor: '#111827',
                       timer: 2000,
                       showConfirmButton: false
                     });
                  } else {
                     throw new Error('Failed to save company logo');
                  }
              } else {
                  throw new Error('Failed to upload image');
              }
            } catch (error) {
                console.error("Upload Error:", error);
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to update profile photo.',
                    icon: 'error',
                    confirmButtonColor: '#111827'
                });
            }
        }
      });
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { label: '', color: '', width: '0%', message: '' };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    switch(strength) {
      case 0: return { label: 'Very Weak', color: '#EF4444', width: '25%', message: 'Use at least 8 characters' };
      case 1: return { label: 'Weak', color: '#F59E0B', width: '50%', message: 'Add uppercase letters or numbers' };
      case 2: return { label: 'Medium', color: '#10B981', width: '75%', message: 'Good, but symbols help!' };
      case 3:
      case 4: return { label: 'Strong', color: '#3B82F6', width: '100%', message: 'Secure password!' };
      default: return { label: '', color: '', width: '0%', message: '' };
    }
  };

  const strength = getPasswordStrength(passwords.newPassword);

  if (loading) {
    return (
      <div className="profile-loading-minimal">
        <div className="spinner-minimal"></div>
      </div>
    );
  }

  return (
    <div className="profile-page-premium">
      <div className="profile-container-premium">
        <div className="profile-header-premium">
          <div className="header-content">
             <h1 className="profile-title-premium">User Profile</h1>
             <p className="profile-subtitle-premium">Manage your identity and account security preferences.</p>
          </div>
          <div className="header-decoration"></div>
        </div>

        <div className="profile-grid-premium">
          
          {/* Left Column: Basic Info */}
          <div className="profile-sidebar-premium">
            <div className="profile-card-premium avatar-card">
              <div className="avatar-section-premium">
                <div className="avatar-wrapper-premium">
                  {companyData.logo ? (
                    <img src={getFullLogoUrl(companyData.logo)} alt="Logo" className="avatar-img-premium" />
                  ) : (
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(companyData.companyName || 'Admin')}&background=0D8ABC&color=fff&size=150`} 
                      alt="Avatar" 
                      className="avatar-img-premium"
                    />
                  )}
                  <button className="avatar-edit-premium" onClick={() => fileInputRef.current.click()} title="Change Photo">
                    <Camera size={18} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    style={{ display: 'none' }}
                    accept="image/*"
                  />
                </div>
                <div className="avatar-info-premium">
                  <h3>{companyData.companyName || 'Manager Account'}</h3>
                  <span className="user-badge">Administrator</span>
                </div>
              </div>

              <div className="contact-info-premium">
                <div className="contact-item">
                  <div className="contact-icon"><Phone size={18} /></div>
                  <div className="contact-text">
                    <label>Phone</label>
                    <span>{companyData.companyContact || 'Not Set'}</span>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-icon"><Mail size={18} /></div>
                  <div className="contact-text">
                    <label>Email</label>
                    <span>{companyData.companyEmail || 'Not Set'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Security */}
          <div className="profile-main-premium">
            <div className="profile-card-premium security-card">
              <div className="card-header-premium">
                 <div className="header-title-box">
                    <Lock size={20} className="header-icon-premium"/>
                    <h2 className="card-title-premium">Security Settings</h2>
                 </div>
              </div>
              
              <form onSubmit={handleSave} className="password-form-premium">
                <div className="form-group-premium">
                  <label>Current Password</label>
                  <div className="password-input-wrapper-premium">
                    <input 
                      type={showPassword.current ? "text" : "password"} 
                      name="currentPassword"
                      value={passwords.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="••••••••••••" 
                      required 
                    />
                    <button type="button" className="password-toggle-premium" onClick={() => togglePasswordVisibility('current')}>
                      {showPassword.current ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="form-group-premium">
                  <label>New Password</label>
                  <div className="password-input-wrapper-premium">
                    <input 
                      type={showPassword.new ? "text" : "password"} 
                      name="newPassword"
                      value={passwords.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="••••••••••••" 
                      required 
                    />
                    <button type="button" className="password-toggle-premium" onClick={() => togglePasswordVisibility('new')}>
                      {showPassword.new ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  
                  {passwords.newPassword && (
                    <div className="strength-meter-container">
                      <div className="strength-meter-bar">
                        <div 
                          className="strength-meter-fill" 
                          style={{ width: strength.width, backgroundColor: strength.color }}
                        ></div>
                      </div>
                      <div className="strength-meter-text">
                        <span style={{ color: strength.color }}>{strength.label}</span>
                        <span className="strength-hint">{strength.message}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group-premium">
                  <label>Confirm New Password</label>
                  <div className="password-input-wrapper-premium">
                    <input 
                      type={showPassword.confirm ? "text" : "password"} 
                      name="confirmPassword"
                      value={passwords.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="••••••••••••" 
                      required 
                    />
                    <button type="button" className="password-toggle-premium" onClick={() => togglePasswordVisibility('confirm')}>
                      {showPassword.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="form-actions-premium">
                  <button type="submit" className="btn-premium-primary" disabled={isChangingPassword}>
                    {isChangingPassword ? (
                      <span className="btn-loader">Updating...</span>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
            
            <div className="security-notice-premium">
              <div className="notice-icon">!</div>
              <div className="notice-content">
                <strong>Password Requirements</strong>
                <ul>
                  <li>Minimum 8 characters long</li>
                  <li>At least one uppercase letter (A-Z)</li>
                  <li>At least one number or special character</li>
                </ul>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
