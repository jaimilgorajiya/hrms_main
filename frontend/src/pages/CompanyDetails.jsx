import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Globe, 
  Mail, 
  Phone, 
  Upload,
  Save
} from 'lucide-react';
import Swal from 'sweetalert2';

const CompanyDetails = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    address: '',
    companyEmail: '',
    companyContact: '',
    hrEmail: ''
  });

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCompanyDetails();
  }, []);

  const fetchCompanyDetails = async () => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/company`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data && data._id) {
        setFormData(data);
        if (data.logo) {
          setLogoPreview(data.logo.startsWith('http') ? data.logo : `${API_URL}${data.logo}`);
        }
        window.dispatchEvent(new CustomEvent('companyDetailsUpdated', { 
          detail: { 
            companyName: data.companyName,
            logo: data.logo 
          } 
        }));
      }
    } catch (error) { 
      console.error("Error fetching company details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;

    if (name === 'companyContact') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }

    let errorMsg = '';
    if (name === 'companyEmail' || name === 'hrEmail') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        errorMsg = 'Please enter a valid email address';
      }
    } else if (name === 'companyContact') {
      if (value && value.length !== 10) {
        errorMsg = 'Contact number must be exactly 10 digits';
      }
    }
    
    setErrors(prev => ({
      ...prev,
      [name]: errorMsg
    }));

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    const hasErrors = Object.values(errors).some(err => err !== '');
    if (hasErrors) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Please fix the form errors before saving.',
        icon: 'warning',
        confirmButtonColor: '#3A82F6'
      });
      return;
    }

    setUpdating(true);
    
    Swal.fire({
      title: 'Updating...',
      text: 'Please wait while we save company details.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      let logoPath = formData.logo;

      if (logo) {
        const logoFormData = new FormData();
        logoFormData.append('file', logo);
        
        const token = localStorage.getItem('token');
        const uploadRes = await authenticatedFetch(`${API_URL}/api/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: logoFormData
        });
        
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          logoPath = uploadData.fileUrl;
        }
      }

      const response = await authenticatedFetch(`${API_URL}/api/company`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...formData, logo: logoPath })
      });

      if (response.ok) {
        Swal.fire({
          title: 'Updated!',
          text: 'Company details have been updated successfully.',
          icon: 'success',
          confirmButtonColor: '#3A82F6'
        });
        
        window.dispatchEvent(new CustomEvent('companyDetailsUpdated', { 
          detail: { 
            companyName: formData.companyName,
            logo: logoPath 
          } 
        }));

        fetchCompanyDetails();
      } else {
        const result = await response.json();
        throw new Error(result.message || 'Failed to update');
      }
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: error.message || 'Something went wrong.',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Loading company details...</div>;
  }
                 
  return (
    <div className="designation-container">
      <header className="designation-header">
        <div>
          <h1 className="profile-title">Company Profile</h1>
          <p className="text-light" style={{ fontSize: '14px', marginTop: '4px', color: '#64748B' }}>
            Manage your organization's core contact information and branding.
          </p>
        </div>
      </header>

      <form onSubmit={handleUpdate} className="details-form">
        
        {/* Company Logo Section */}
        <section className="hrm-card">
          <div className="card-header-hrm">
            <h2><Upload size={18} /> Company Branding</h2>
          </div>
          <div className="card-body-hrm" style={{ padding: '24px' }}>
            <div className="logo-section-wrapper">
              <div className="logo-display">
                {logoPreview ? (
                  <img src={logoPreview} alt="Company Logo" />
                ) : (
                  <div className="logo-empty">
                    <Building2 size={32} />
                    <span>NO LOGO</span>
                  </div>
                )}
              </div>
              <div className="upload-button-wrapper">
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label className="btn-primary-hrm" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer' }}>
                    <Upload size={14} />
                    Upload Logo
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleLogoChange} 
                      style={{ display: 'none' }}
                      accept="image/*"
                    />
                  </label>
                </div>
                <span className="upload-hint">Square image (512x512px). JPG, PNG or SVG recommended.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Basic Information */}
        <div className="form-row">
          <section className="hrm-card" style={{ marginBottom: 0 }}>
            <div className="card-header-hrm">
              <h2><Building2 size={18} /> Business Profile</h2>
            </div>
            <div className="card-body-hrm" style={{ padding: '24px' }}>
              <div className="form-group-hrm" style={{ marginBottom: '20px' }}>
                <label>Company Name <span>*</span></label>
                <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} className="form-control-hrm" required />
              </div>
              <div className="form-group-hrm" style={{ marginBottom: '20px' }}>
                <label>Website</label>
                <div className="social-input-group">
                  <div className="social-icon"><Globe size={16} /></div>
                  <input type="url" name="website" value={formData.website} onChange={handleInputChange} className="form-control-hrm social-input" placeholder="https://www.company.com" />
                </div>
              </div>
              <div className="form-group-hrm">
                <label>Company Address <span>*</span></label>
                <textarea name="address" value={formData.address} onChange={handleInputChange} className="form-control-hrm textarea-hrm" required style={{ minHeight: '100px' }}></textarea>
              </div>
            </div>
          </section>

          <section className="hrm-card" style={{ marginBottom: 0 }}>
            <div className="card-header-hrm">
              <h2><Mail size={18} /> Contact Information</h2>
            </div>
            <div className="card-body-hrm" style={{ padding: '24px' }}>
              <div className="form-group-hrm" style={{ marginBottom: '20px' }}>
                <label>Primary Email <span>*</span></label>
                <div className="social-input-group">
                  <div className="social-icon"><Mail size={16} /></div>
                  <input type="email" name="companyEmail" value={formData.companyEmail} onChange={handleInputChange} className={`form-control-hrm social-input ${errors.companyEmail ? 'error-border' : ''}`} required />
                </div>
                {errors.companyEmail && <span className="error-text-hrm">{errors.companyEmail}</span>}
              </div>
              <div className="form-group-hrm" style={{ marginBottom: '20px' }}>
                <label>Contact Number <span>*</span></label>
                <div className="social-input-group">
                  <div className="social-icon"><Phone size={16} /></div>
                  <input type="tel" name="companyContact" value={formData.companyContact} maxLength={10} onChange={handleInputChange} className={`form-control-hrm social-input ${errors.companyContact ? 'error-border' : ''}`} required />
                </div>
                {errors.companyContact && <span className="error-text-hrm">{errors.companyContact}</span>}
              </div>
              <div className="form-group-hrm">
                <label>HR / Support Email</label>
                <input type="email" name="hrEmail" value={formData.hrEmail || ''} onChange={handleInputChange} className={`form-control-hrm ${errors.hrEmail ? 'error-border' : ''}`} placeholder="hr@company.com" />
                {errors.hrEmail && <span className="error-text-hrm">{errors.hrEmail}</span>}
              </div>
            </div>
          </section>
        </div>

        <footer className="form-footer-hrm">
          <button type="submit" className="btn-primary-hrm" style={{ padding: '14px 40px' }} disabled={updating}>
            <Save size={18} />
            {updating ? 'Processing...' : 'Save Company Details'}
          </button>
        </footer>

      </form>
    </div>
  );
};

export default CompanyDetails;