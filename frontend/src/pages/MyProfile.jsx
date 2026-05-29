import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mail, Phone, Lock, Eye, EyeOff, CheckCircle2, CreditCard, History, TrendingUp, Calendar, ArrowUpRight, Clock, Users, Plus, Minus } from 'lucide-react';
import Swal from 'sweetalert2';
// CSS moved to index.css

const MyProfile = () => {
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState({
    companyName: '',
    companyContact: '',
    companyEmail: '',
    ownerName: '',
    phoneNumber: '',
    email: '',
    logo: ''
  });
  const [subscription, setSubscription] = useState(null);
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

  // Employee Add-on Purchase State
  const [addonPackages, setAddonPackages] = useState([]);
  const [employeeUsage, setEmployeeUsage] = useState(null);
  const [addonQty, setAddonQty] = useState(1);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [addonLoading, setAddonLoading] = useState(false);

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  const fileInputRef = useRef(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [companyRes, subRes, usageRes, addonsRes] = await Promise.all([
          authenticatedFetch('/api/company'),
          authenticatedFetch('/api/packages/subscription-details'),
          authenticatedFetch('/api/packages/employee-usage'),
          authenticatedFetch('/api/packages/addons')
        ]);
        
        if(companyRes.ok) {
          const data = await companyRes.json();
          setCompanyData(data);
        }
        
        if(subRes.ok) {
          const data = await subRes.json();
          if (data.success) setSubscription(data.subscription);
        }

        if(usageRes.ok) {
          const data = await usageRes.json();
          if (data.success && data.usage) setEmployeeUsage(data.usage);
        }

        if(addonsRes.ok) {
          const data = await addonsRes.json();
          if (data.success && data.packages.length > 0) {
            setAddonPackages(data.packages);
            setSelectedAddon(data.packages[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Razorpay addon purchase handler
  const handleAddonPurchase = async () => {
    console.log('Addon purchase initiated', { selectedAddon, addonQty });
    if (!selectedAddon || addonQty < 1) {
      console.warn('Missing addon selection or invalid quantity');
      return;
    }

    // Quick confirmation modal
    const confirm = await Swal.fire({
      title: 'Confirm Purchase',
      text: `Purchase ${addonQty} employee slot(s)?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      confirmButtonText: 'Yes, Proceed'
    });

    if (!confirm.isConfirmed) return;

    if (!window.Razorpay) {
      Swal.fire('Error', 'Payment gateway (Razorpay) failed to load. Please refresh the page and try again.', 'error');
      return;
    }

    setAddonLoading(true);
    try {
      const res = await authenticatedFetch('/api/packages/addons/purchase', {
        method: 'POST',
        body: JSON.stringify({ packageId: selectedAddon._id, quantity: addonQty })
      });
      const data = await res.json();

      if (!data.success) {
        Swal.fire('Error', data.message || 'Failed to initiate payment', 'error');
        setAddonLoading(false);
        return;
      }

      // Open Razorpay checkout
      const options = {
        key: data.key_id,
        amount: data.order.amount,
        currency: 'INR',
        name: companyData.companyName || 'HRMS',
        description: `${addonQty} Employee Seat(s) - ${selectedAddon.name}`,
        order_id: data.order.id,
        handler: async function (response) {
          try {
            const verifyRes = await authenticatedFetch('/api/packages/addons/verify-payment', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                packageId: selectedAddon._id,
                quantity: addonQty
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              Swal.fire({
                title: 'Purchase Successful!',
                text: verifyData.message,
                icon: 'success',
                confirmButtonColor: '#2563EB',
                timer: 3000,
                showConfirmButton: false
              });
              // Refresh data
              setAddonQty(1);
              window.location.reload();
            } else {
              Swal.fire('Error', verifyData.message || 'Payment verification failed', 'error');
            }
          } catch (err) {
            Swal.fire('Error', 'Payment verification failed', 'error');
          }
        },
        theme: { color: '#2563EB' }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Addon purchase error:', error);
      Swal.fire('Error', 'Failed to initiate payment', 'error');
    } finally {
      setAddonLoading(false);
    }
  };


  const getFullLogoUrl = (logoPath) => {
    if (!logoPath) return null;
    return logoPath.startsWith('http') ? logoPath : `${API_URL}${logoPath}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    switch(score) {
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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="profile-container-premium">
      <div className="profile-header-section">
        <h1 className="hrm-title">User Profile</h1>
        </div>

      <div className="profile-grid-premium">
        <div className="profile-left-col">
          <div className="glass-card-premium sidebar-profile-card">
            <div className="avatar-container-premium">
              <img 
                src={companyData.logo ? getFullLogoUrl(companyData.logo) : `https://ui-avatars.com/api/?name=${encodeURIComponent(companyData.companyName || 'Admin')}&background=2563EB&color=fff&size=150`} 
                alt="Avatar" 
                className="avatar-img-premium"
              />
              <div className="avatar-edit-badge" onClick={() => fileInputRef.current.click()}>
                <Camera size={18} />
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                style={{ display: 'none' }}
                accept="image/*"
              />
            </div>
            
            <h2 className="user-name-premium">{companyData.ownerName || 'Admin User'}</h2>
            <div className="role-badge-premium">Administrator</div>

            <div className="contact-list-premium">
              <div className="contact-item-premium">
                <div className="contact-icon-box"><Phone size={18} /></div>
                <div>
                  <label className="contact-label-premium">Phone</label>
                  <span className="contact-value-premium">{companyData.phoneNumber || companyData.companyContact || 'Not provided'}</span>
                </div>
              </div>
              <div className="contact-item-premium">
                <div className="contact-icon-box"><Mail size={18} /></div>
                <div>
                  <label className="contact-label-premium">Email</label>
                  <span className="contact-value-premium">{companyData.email || companyData.companyEmail || 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>

          {subscription && (
            <div className="active-package-card-premium">
              <div className="pkg-mini-header">
                <TrendingUp size={14} />
                <span>Active Package</span>
              </div>
              <h3 className="pkg-mini-title">{subscription.packageName}</h3>
              <div className="pkg-mini-stats">
                {subscription.maxEmployees >= 999999 ? <span className="infinity-symbol-small">∞</span> : subscription.maxEmployees} Employees • Active
              </div>
              <div className="expiry-pill-premium">
                <Calendar size={14} />
                <span>Expires: {formatDate(subscription.expiryDate)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="profile-right-col">
          <div className="glass-card-premium">
            <div className="card-header-premium">
              <div className="card-icon-box"><CreditCard size={22} /></div>
              <h3>Package & Billing</h3>
            </div>

            {!subscription ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-500">
                <p>No active subscription found. Contact support to activate your account.</p>
              </div>
            ) : (
              <>
                <div className="sub-stats-row-premium">
                  <div className="stat-box-premium">
                    <label>Current Plan</label>
                    <div className="value">{subscription.packageName || 'N/A'}</div>
                  </div>
                  <div className="stat-box-premium">
                    <label>Next Billing</label>
                    <div className="value">{formatDate(subscription.expiryDate)}</div>
                  </div>
                  <div className="stat-box-premium">
                    <label>Employee Limit</label>
                    <div className="value">
                      {employeeUsage 
                        ? (employeeUsage.totalAllowed >= 999999 ? <span className="infinity-symbol">∞</span> : employeeUsage.totalAllowed) 
                        : (subscription.maxEmployees >= 999999 ? <span className="infinity-symbol">∞</span> : subscription.maxEmployees)}
                    </div>
                  </div>
                </div>

                <div className="payment-section-premium">
                  <div className="section-title-small">
                    <Clock size={16} />
                    <span>Payment History</span>
                  </div>
                  <div className="table-responsive">
                    <table className="payment-table-premium">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Description</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscription.paymentHistory && subscription.paymentHistory.length > 0 ? (
                          subscription.paymentHistory.sort((a,b) => new Date(b.date) - new Date(a.date)).map((payment, idx) => (
                            <tr key={idx}>
                              <td>{formatDate(payment.date)}</td>
                              <td>{payment.packageId?.name || (payment.type === 'subscription' ? 'Plan Renewal' : 'Add-on Purchase')}</td>
                              <td>₹{payment.amount}</td>
                              <td>
                                <span className={`status-pill-premium ${payment.status?.toLowerCase()}`}>
                                  {payment.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>No payment history found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Expand Team Section */}
          {selectedAddon && employeeUsage && employeeUsage.totalAllowed < 999999 && (
            <div className="glass-card-premium">
              <div className="card-header-premium">
                <div className="card-icon-box green-box-prem">
                  <Users size={22} />
                </div>
                <div>
                  <h3>Expand Your Team</h3>
                  <p className="card-subtitle-prem">
                    Need more employee slots? Purchase additional seats instantly.
                  </p>
                </div>
              </div>

              {/* Current Usage Stats */}
              <div className="sub-stats-row-premium sub-stats-four-cols">
                <div className="stat-box-premium">
                  <label>Base Limit</label>
                  <div className="value">{employeeUsage.baseLimit}</div>
                </div>
                <div className="stat-box-premium">
                  <label>Add-on Seats</label>
                  <div className="value accent-green-text">+{employeeUsage.addonTotal}</div>
                </div>
                <div className="stat-box-premium">
                  <label>Total Allowed</label>
                  <div className="value">
                    {employeeUsage.totalAllowed >= 999999 ? <span className="infinity-symbol">∞</span> : employeeUsage.totalAllowed}
                  </div>
                </div>
                <div className="stat-box-premium">
                  <label>Currently Used</label>
                  <div className={`value ${employeeUsage.remaining <= 2 ? 'danger-text-prem' : ''}`}>
                    {employeeUsage.currentCount}
                  </div>
                </div>
              </div>

              {/* Purchase Flow */}
              <div className="purchase-flow-container-prem">
                <div className="purchase-flow-header-prem">
                  <TrendingUp size={16} className="trend-icon-prem" />
                  <span className="addon-title-prem">
                    {selectedAddon.name} — ₹{selectedAddon.price.toLocaleString()} per employee
                  </span>
                </div>

                <div className="purchase-flow-body-prem">
                  {/* Quantity Picker */}
                  <div>
                    <label className="qty-label-prem">
                      Number of Employees
                    </label>
                    <div className="qty-picker-container-prem">
                      <button 
                        type="button"
                        onClick={() => setAddonQty(prev => Math.max(1, prev - 1))}
                        className="qty-picker-btn-prem"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={addonQty}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val >= 1) setAddonQty(val);
                          else if (e.target.value === '') setAddonQty(1);
                        }}
                        className="qty-picker-input-prem"
                      />
                      <button 
                        type="button"
                        onClick={() => setAddonQty(prev => prev + 1)}
                        className="qty-picker-btn-prem"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Live Price Display */}
                  <div style={{ flex: 1 }}>
                    <label className="qty-label-prem">
                      Total Amount
                    </label>
                    <div className="total-amount-val-prem">
                      ₹{(addonQty * selectedAddon.price).toLocaleString()}
                    </div>
                    <div className="total-amount-sub-prem">
                      {addonQty} x ₹{selectedAddon.price.toLocaleString()} per seat
                    </div>
                  </div>

                  {/* Purchase Button */}
                  <div>
                    <button 
                      className="btn-update-premium btn-purchase-prem" 
                      onClick={handleAddonPurchase}
                      disabled={addonLoading}
                    >
                      <CreditCard size={18} />
                      {addonLoading ? 'Processing...' : 'Purchase Seats'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card-premium">
            <div className="card-header-premium">
              <div className="card-icon-box"><Lock size={22} /></div>
              <h3>Security Settings</h3>
            </div>

            <form onSubmit={handleSave} className="security-form-premium">
              <div className="form-group-premium">
                <label>Current Password</label>
                <div className="password-input-wrapper-premium">
                  <input 
                    type={showPassword.current ? "text" : "password"}
                    name="currentPassword"
                    className="input-premium"
                    placeholder="••••••••••••"
                    value={passwords.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                  <button 
                    type="button" 
                    className="password-toggle-premium"
                    onClick={() => togglePasswordVisibility('current')}
                  >
                    {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group-premium">
                <label>New Password</label>
                <div className="password-input-wrapper-premium">
                  <input 
                    type={showPassword.new ? "text" : "password"}
                    name="newPassword"
                    className="input-premium"
                    placeholder="••••••••••••"
                    value={passwords.newPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                  <button 
                    type="button" 
                    className="password-toggle-premium"
                    onClick={() => togglePasswordVisibility('new')}
                  >
                    {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
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
                    className="input-premium"
                    placeholder="••••••••••••"
                    value={passwords.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                  <button 
                    type="button" 
                    className="password-toggle-premium"
                    onClick={() => togglePasswordVisibility('confirm')}
                  >
                    {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-update-premium" disabled={isChangingPassword}>
                {isChangingPassword ? "Updating..." : (
                  <>
                    <CheckCircle2 size={18} />
                    Update Password
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
