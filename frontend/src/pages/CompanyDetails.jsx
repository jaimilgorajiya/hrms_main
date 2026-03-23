import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Globe, 
  Clock, 
  MapPin, 
  Mail, 
  Phone, 
  Coins, 
  Instagram, 
  Facebook, 
  Linkedin, 
  Youtube,
  Upload,
  Save,
  Settings2,
  Map,
  Share2
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-control-geocoder/dist/Control.Geocoder.css';
import * as L from 'leaflet';
import 'leaflet-control-geocoder';
import Swal from 'sweetalert2';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const CompanyDetails = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    address: '',
    companyEmail: '',
    companyContact: '',
    hrEmail: '',
    pincode: '',
    gstNumber: '',
    pan: '',
    tan: '',
    currency: '₹',
    socials: {
      instagram: '',
      facebook: '',
      linkedin: '',
      youtube: ''
    },
    location: {
      lat: 23.0225,
      lng: 72.5714
    }
  });

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isRelocating, setIsRelocating] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  

  // Component to handle map search functionality
  const MapSearchControl = () => {
    const map = useMap();

    useEffect(() => {
      if (!isRelocating) return;

      // Using ArcGIS as a fallback as it has high-quality commercial street data for India
      // without requiring an explicit API key in this library wrapper.
      const geocoder = L.Control.geocoder({
        defaultMarkGeocode: false,
        placeholder: "Search for office address...",
        geocoder: L.Control.Geocoder.arcgis()
      });

      geocoder.on('markgeocode', function(e) {
        if (e.geocode.bbox) {
          map.fitBounds(e.geocode.bbox);
        } else {
          map.flyTo(e.geocode.center, 18);
        }
        
        setFormData(prev => ({
          ...prev,
          location: {
            lat: e.geocode.center.lat,
            lng: e.geocode.center.lng
          }
        }));
      });

      geocoder.addTo(map);

      // Clean up when leaving relocation mode
      return () => {
        map.removeControl(geocoder);
      };
    }, [map, isRelocating]);

    return null;
  };

  // Component to handle map clicks and marker dragging
  const LocationPicker = () => {
    useMapEvents({
      click(e) {
        if (!isRelocating) return;
        setFormData(prev => ({
          ...prev,
          location: {
            lat: e.latlng.lat,
            lng: e.latlng.lng
          }
        }));
      },
    });

    const markerRef = useRef(null);
    const eventHandlers = {
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          setFormData(prev => ({
            ...prev,
            location: {
              lat: latLng.lat,
              lng: latLng.lng
            }
          }));
        }
      },
    };

    return (
      <Marker
        draggable={isRelocating}
        eventHandlers={eventHandlers}
        position={[formData.location.lat, formData.location.lng]}
        ref={markerRef}
      >
        <Popup>
          <div style={{ textAlign: 'center' }}>
            <strong>{formData.companyName || 'Office'}</strong><br />
            Lat: {formData.location.lat.toFixed(4)}, Lng: {formData.location.lng.toFixed(4)}
          </div>
        </Popup>
      </Marker>
    );
  };

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
        // Sync with Header/Sidebar
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

    // Filter to only allow max 10 digits for contact
    if (name === 'companyContact') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }

    // Real-time validation
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

    if (name.startsWith('social_')) {
      const socialName = name.split('_')[1];
      setFormData(prev => ({
        ...prev,
        socials: {
          ...prev.socials,
          [socialName]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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
        
        // Notify other components (like Sidebar, Header) to update without a refresh
        window.dispatchEvent(new CustomEvent('companyDetailsUpdated', { 
          detail: { 
            companyName: formData.companyName,
            logo: logoPath 
          } 
        }));

        setIsRelocating(false); // Disable relocation edit mode automatically
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
          <h1 className="profile-title">Company Details</h1>
          <p className="text-light" style={{ fontSize: '14px', marginTop: '4px', color: '#64748B' }}>
            Manage your organization's core information and online presence.
          </p>
        </div>
        {formData.updatedAt && (
          <div className="last-updated">
            Last Modified: {new Date(formData.updatedAt).toLocaleString()}
          </div>
        )}
      </header>

      <form onSubmit={handleUpdate} className="details-form">
        
        {/* Company Logo Section */}
        <section className="hrm-card">
          <div className="card-header-hrm">
            <h2><Upload size={18} /> Company Identity</h2>
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
                <span className="upload-hint">Recommended: Square image (512x512px). JPG, PNG or SVG. Max size: 2MB.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Basic & Contact Information */}
        <div className="form-row">
          <section className="hrm-card" style={{ marginBottom: 0 }}>
            <div className="card-header-hrm">
              <h2><Building2 size={18} /> Business Profile</h2>
            </div>
            <div className="card-body-hrm" style={{ padding: '24px' }}>
              <div className="form-group-hrm" style={{ marginBottom: '20px' }}>
                <label>Legal Company Name <span>*</span></label>
                <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} className="form-control-hrm" required />
              </div>
              <div className="form-group-hrm" style={{ marginBottom: '20px' }}>
                <label>Official Website</label>
                <div className="social-input-group">
                  <div className="social-icon"><Globe size={16} /></div>
                  <input type="url" name="website" value={formData.website} onChange={handleInputChange} className="form-control-hrm social-input" placeholder="https://www.company.com" />
                </div>
              </div>
              <div className="form-group-hrm">
                <label>Primary Address <span>*</span></label>
                <textarea name="address" value={formData.address} onChange={handleInputChange} className="form-control-hrm textarea-hrm" required placeholder="Full street address..."></textarea>
              </div>
            </div>
          </section>

          <section className="hrm-card" style={{ marginBottom: 0 }}>
            <div className="card-header-hrm">
              <h2><Mail size={18} /> Communication</h2>
            </div>
            <div className="card-body-hrm" style={{ padding: '24px' }}>
              <div className="form-group-hrm" style={{ marginBottom: '20px' }}>
                <label>Company Email <span>*</span></label>
                <div className="social-input-group">
                  <div className="social-icon"><Mail size={16} /></div>
                  <input type="email" name="companyEmail" value={formData.companyEmail} onChange={handleInputChange} className={`form-control-hrm social-input ${errors.companyEmail ? 'error-border' : ''}`} required />
                </div>
                {errors.companyEmail && <span className="error-text-hrm">{errors.companyEmail}</span>}
              </div>
              <div className="form-group-hrm" style={{ marginBottom: '20px' }}>
                <label>Phone Number <span>*</span></label>
                <div className="social-input-group">
                  <div className="social-icon"><Phone size={16} /></div>
                  <input type="tel" name="companyContact" value={formData.companyContact} maxLength={10} onChange={handleInputChange} className={`form-control-hrm social-input ${errors.companyContact ? 'error-border' : ''}`} required />
                </div>
                {errors.companyContact && <span className="error-text-hrm">{errors.companyContact}</span>}
              </div>
              <div className="form-group-hrm">
                <label>HR / Admin Email</label>
                <input type="email" name="hrEmail" value={formData.hrEmail || ''} onChange={handleInputChange} className={`form-control-hrm ${errors.hrEmail ? 'error-border' : ''}`} placeholder="hr@company.com" />
                {errors.hrEmail && <span className="error-text-hrm">{errors.hrEmail}</span>}
              </div>
            </div>
          </section>
        </div>

        {/* Tax & Financials */}
        <section className="hrm-card">
          <div className="card-header-hrm">
            <h2><Coins size={18} /> Tax & Financial Configuration</h2>
          </div>
          <div className="card-body-hrm" style={{ padding: '24px' }}>
            <div className="form-row">
              <div className="form-group-hrm">
                <label>Local Pincode <span>*</span></label>
                <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} className="form-control-hrm" required />
              </div>
              <div className="form-group-hrm">
                <label>Currency Symbol <span>*</span></label>
                <input type="text" name="currency" value={formData.currency} onChange={handleInputChange} className="form-control-hrm" required placeholder="₹" />
              </div>
            </div>
            <div className="form-row" style={{ marginTop: '20px' }}>
              <div className="form-group-hrm">
                <label>GST Number (Optional)</label>
                <input type="text" name="gstNumber" value={formData.gstNumber || ''} onChange={handleInputChange} className="form-control-hrm" placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="form-group-hrm">
                <label>PAN Number (Optional)</label>
                <input type="text" name="pan" value={formData.pan || ''} onChange={handleInputChange} className="form-control-hrm" placeholder="ABCDE1234F" />
              </div>
            </div>
            <div className="form-group-hrm" style={{ marginTop: '20px' }}>
              <label>TAN Number (Optional)</label>
              <input type="text" name="tan" value={formData.tan || ''} onChange={handleInputChange} className="form-control-hrm" placeholder="ABCD12345E" />
            </div>
          </div>
        </section>

        {/* Social Presence */}
        <section className="hrm-card">
          <div className="card-header-hrm">
            <h2><Share2 size={18} /> Social Connectivity</h2>
          </div>
          <div className="card-body-hrm" style={{ padding: '24px' }}>
            <div className="social-links-hrm">
              <div className="form-group-hrm">
                <label>Instagram</label>
                <div className="social-input-group">
                  <div className="social-icon"><Instagram size={16} /></div>
                  <input type="text" name="social_instagram" value={formData.socials.instagram} onChange={handleInputChange} className="form-control-hrm social-input" placeholder="@handle" />
                </div>
              </div>
              <div className="form-group-hrm">
                <label>Facebook</label>
                <div className="social-input-group">
                  <div className="social-icon"><Facebook size={16} /></div>
                  <input type="text" name="social_facebook" value={formData.socials.facebook} onChange={handleInputChange} className="form-control-hrm social-input" placeholder="profile_url" />
                </div>
              </div>
              <div className="form-group-hrm">
                <label>LinkedIn</label>
                <div className="social-input-group">
                  <div className="social-icon"><Linkedin size={16} /></div>
                  <input type="text" name="social_linkedin" value={formData.socials.linkedin} onChange={handleInputChange} className="form-control-hrm social-input" placeholder="company_handle" />
                </div>
              </div>
              <div className="form-group-hrm">
                <label>YouTube</label>
                <div className="social-input-group">
                  <div className="social-icon"><Youtube size={16} /></div>
                  <input type="text" name="social_youtube" value={formData.socials.youtube} onChange={handleInputChange} className="form-control-hrm social-input" placeholder="channel_id" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Office Location */}
        <section className="hrm-card">
          <div className="card-header-hrm">
            <div className="header-with-action">
              <h2><Map size={18} /> Registered Office Location</h2>
              <button 
                type="button"
                className={`btn-relocate ${isRelocating ? 'active' : ''}`}
                onClick={() => setIsRelocating(!isRelocating)}
              >
                {isRelocating ? 'Cancel Relocation' : 'Relocate Office'}
              </button>
            </div>
          </div>
          <div className="card-body-hrm" style={{ padding: '24px' }}>
            <div className={`map-container-hrm ${isRelocating ? 'editing' : ''}`}>
              {isRelocating && <div className="map-instruction">Tap on map to set new office location</div>}
              <MapContainer 
                center={[formData.location.lat, formData.location.lng]} 
                zoom={20} 
                maxZoom={20}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer 
                  url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" 
                  maxZoom={20}
                  attribution='&copy; Google Maps' 
                />
                <LocationPicker />
                <MapSearchControl />
              </MapContainer>
            </div>
          </div>
        </section>

        <footer className="form-footer-hrm">
          <button type="submit" className="btn-primary-hrm" style={{ padding: '14px 40px' }} disabled={updating}>
            <Save size={18} />
            {updating ? 'Processing...' : 'Save All Changes'}
          </button>
        </footer>

      </form>
    </div>
  );
};

export default CompanyDetails;