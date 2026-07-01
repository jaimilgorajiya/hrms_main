import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_URL from '../config/api';
import Swal from 'sweetalert2';

const Signup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        ownerName: '',
        businessName: '',
        email: '',
        phoneNumber: '',
        packageId: ''
    });
    const [packages, setPackages] = useState([]);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const res = await fetch(`${API_URL}/api/packages`);
                const data = await res.json();
                if (data.success) {
                    setPackages(data.packages.filter(p => p.isActive && p.packageType !== 'employee_addon'));
                }
            } catch (err) {
                console.error("Failed to fetch packages");
            }
        };
        fetchPackages();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePackageSelect = (e) => {
        const pkgId = e.target.value;
        setFormData({ ...formData, packageId: pkgId });
        const pkg = packages.find(p => p._id === pkgId);
        setSelectedPackage(pkg);
    };

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        
        if (!formData.ownerName || !formData.businessName || !formData.email || !formData.phoneNumber) {
            return setError("All fields are required");
        }
        if (!formData.packageId) {
            return setError("Please select a subscription plan");
        }
        
        setLoading(true);
        setError("");
        
        const res = await loadRazorpay();
        if (!res) {
            setError('Razorpay SDK failed to load. Are you online?');
            setLoading(false);
            return;
        }

        try {
            const signupRes = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await signupRes.json();
            
            if (!data.success) {
                setError(data.message || 'Signup failed');
                setLoading(false);
                return;
            }

            const options = {
                key: data.key_id,
                amount: data.order.amount,
                currency: data.order.currency,
                name: 'HRMS Platform',
                description: `Subscription: ${selectedPackage?.name}`,
                order_id: data.order.id,
                handler: async function (response) {
                    const verifyRes = await fetch(`${API_URL}/api/auth/verify-payment`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            userId: data.userId,
                            companyId: data.companyId
                        })
                    });
                    const verifyData = await verifyRes.json();
                    if (verifyData.success) {
                        Swal.fire({
                            title: 'Payment Successful!',
                            text: 'Your workspace is active. Please check your email for login credentials.',
                            icon: 'success',
                            confirmButtonColor: '#0052ff',
                            confirmButtonText: 'Proceed to Login'
                        }).then(() => {
                            navigate('/login');
                        });
                    } else {
                        Swal.fire({
                            title: 'Verification Failed',
                            text: verifyData.message || 'Payment verification failed. Please contact support.',
                            icon: 'error',
                            confirmButtonColor: '#0052ff'
                        });
                        setError('Payment verification failed. Contact support.');
                    }
                },
                prefill: {
                    name: formData.ownerName,
                    email: formData.email,
                    contact: formData.phoneNumber
                },
                theme: { color: '#0052ff' },
                modal: {
                    ondismiss: function() {
                        setLoading(false);
                    }
                }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
        } catch (err) {
            setError("Something went wrong with the server connection");
            setLoading(false);
        }
    };

    return (
        <div className="modern-auth-layout">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

                .modern-auth-layout {
                    display: flex;
                    min-height: 100vh;
                    width: 100vw;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    background: #FFFFFF;
                }

                /* LEFT SIDE - BRANDING (Hidden on Mobile) */
                .auth-banner {
                    flex: 1;
                    background: linear-gradient(rgba(30, 58, 138, 0.7), rgba(37, 99, 235, 0.7)), url('/login_img.png');
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 60px;
                    color: white;
                }

                @media (max-width: 1024px) {
                    .auth-banner { display: none; }
                }

                .auth-banner::before {
                    content: '';
                    position: absolute;
                    top: -20%; right: -20%; width: 600px; height: 600px;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
                    border-radius: 50%;
                }

                .auth-banner::after {
                    content: '';
                    position: absolute;
                    bottom: -10%; left: -10%; width: 400px; height: 400px;
                    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%);
                    border-radius: 50%;
                }

                .banner-logo img {
                    filter: brightness(0) invert(1);
                    max-width: 100%;
                }

                .banner-content {
                    z-index: 1;
                    max-width: 480px;
                }

                .banner-title {
                    font-size: 48px;
                    font-weight: 800;
                    line-height: 1.1;
                    margin: 0 0 24px 0;
                    letter-spacing: -0.03em;
                }

                .banner-text {
                    font-size: 18px;
                    font-weight: 400;
                    line-height: 1.6;
                    color: rgba(255,255,255,0.8);
                    margin: 0;
                }

                .banner-footer {
                    z-index: 1;
                    font-size: 14px;
                    color: rgba(255,255,255,0.6);
                }

                /* RIGHT SIDE - FORM */
                .auth-form-section {
                    flex: 1.2;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #FFFFFF;
                    padding: 40px;
                    overflow-y: auto;
                }

                @media (max-width: 1024px) {
                    .auth-form-section { flex: 1; }
                }

                .auth-form-container {
                    width: 100%;
                    max-width: 600px;
                    margin: auto 0;
                }

                .mobile-logo {
                    display: none;
                    margin-bottom: 40px;
                }

                .mobile-logo img {
                    width: 180px;
                    height: auto;
                    object-fit: contain;
                }

                @media (max-width: 1024px) {
                    .mobile-logo { display: block; }
                }

                .form-header {
                    margin-bottom: 40px;
                }

                .form-title {
                    font-size: 32px;
                    font-weight: 700;
                    color: #0F172A;
                    margin: 0 0 12px 0;
                    letter-spacing: -0.02em;
                }

                .form-subtitle {
                    font-size: 16px;
                    color: #64748B;
                    margin: 0;
                }

                .error-alert {
                    background: #FEF2F2;
                    color: #DC2626;
                    padding: 16px;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 500;
                    margin-bottom: 24px;
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    border: 1px solid #FEE2E2;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 24px;
                }

                @media (max-width: 600px) {
                    .form-grid { grid-template-columns: 1fr; gap: 16px; }
                }

                .input-block {
                    margin-bottom: 20px;
                }

                .input-label {
                    display: block;
                    font-size: 14px;
                    font-weight: 600;
                    color: #334155;
                    margin-bottom: 8px;
                }

                body.dark-mode .modern-auth-layout .auth-input,
                .auth-input {
                    width: 100%;
                    background: #F8FAFC !important;
                    border: 1px solid #E2E8F0 !important;
                    border-radius: 12px;
                    padding: 16px;
                    font-size: 15px;
                    color: #0F172A !important;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    transition: all 0.2s ease;
                    box-sizing: border-box;
                }

                body.dark-mode .modern-auth-layout .auth-input:focus,
                .auth-input:focus {
                    outline: none;
                    background: #FFFFFF !important;
                    border-color: #0052ff !important;
                    box-shadow: 0 0 0 4px rgba(37,99,235,0.1);
                }

                body.dark-mode .modern-auth-layout .auth-input::placeholder,
                .auth-input::placeholder { color: #94A3B8 !important; }

                body.dark-mode .modern-auth-layout .select-input,
                .select-input {
                    appearance: none;
                    cursor: pointer;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 16px center;
                    padding-right: 48px;
                    height: 56px !important;
                }

                body.dark-mode .modern-auth-layout .select-input option,
                .select-input option {
                    background: #FFFFFF !important;
                    color: #0F172A !important;
                }

                .section-divider {
                    display: flex;
                    align-items: center;
                    margin: 32px 0 24px;
                }

                .section-divider::before, .section-divider::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: #E2E8F0;
                }

                .section-divider span {
                    margin: 0 16px;
                    font-size: 12px;
                    font-weight: 700;
                    color: #94A3B8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .package-card {
                    background: #F1F5F9;
                    border: 1px solid #E2E8F0;
                    border-radius: 16px;
                    padding: 24px;
                    margin-bottom: 32px;
                }

                .package-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .package-name {
                    font-size: 16px;
                    font-weight: 700;
                    color: #0F172A;
                    margin: 0;
                }

                .package-price {
                    font-size: 20px;
                    font-weight: 800;
                    color: #0052ff;
                    margin: 0;
                }

                .package-desc {
                    font-size: 14px;
                    color: #64748B;
                    margin: 0;
                    line-height: 1.5;
                }

                .auth-submit-btn {
                    width: 100%;
                    background: #0052ff;
                    color: #FFFFFF;
                    border: none;
                    border-radius: 12px;
                    padding: 16px;
                    font-size: 16px;
                    font-weight: 600;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 12px rgba(37,99,235,0.2);
                }

                .auth-submit-btn:hover {
                    background: #1D4ED8;
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(37,99,235,0.3);
                }

                .auth-submit-btn:disabled {
                    background: #94A3B8;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .auth-redirect {
                    text-align: center;
                    margin-top: 32px;
                    font-size: 15px;
                    color: #64748B;
                }

                .auth-redirect a {
                    color: #0052ff;
                    font-weight: 600;
                    text-decoration: none;
                    cursor: pointer;
                    margin-left: 4px;
                }

                .auth-redirect a:hover {
                    text-decoration: underline;
                }
            `}</style>

            {/* LEFT SIDE - BRAND BANNER */}
            <div className="auth-banner">
                <div></div>
                <div className="banner-content">
                    <div className="banner-logo" style={{ marginBottom: '32px' }}>
                        <img src="/iipl-horizontal-logo.png" alt="IIPL Logo" style={{ width: '260px', height: 'auto', objectFit: 'contain' }} />
                    </div>
                    <h1 className="banner-title">Welcome to your HR Ecosystem.</h1>
                    <p className="banner-text">Seamlessly manage your workforce, automate payroll, and drive productivity from one unified command center.</p>
                </div>
                <div className="banner-footer">
                    © {new Date().getFullYear()} Iflora Info Pvt. Ltd. All rights reserved.
                </div>
            </div>

            {/* RIGHT SIDE - FORM CONTAINER */}
            <div className="auth-form-section">
                <div className="auth-form-container">
                    
                    <div className="mobile-logo">
                        <img src="/iipl-horizontal-logo.png" alt="IIPL Logo" style={{ width: '220px' }} />
                    </div>

                    <div className="form-header">
                        <h2 className="form-title">Create workspace</h2>
                        <p className="form-subtitle">Set up your admin account and configure your subscription</p>
                    </div>

                    {error && (
                        <div className="error-alert">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handlePayment}>
                        <div className="form-grid">
                            <div className="input-block" style={{ marginBottom: 0 }}>
                                <label className="input-label">Full Name</label>
                                <input 
                                    type="text" name="ownerName" 
                                    className="auth-input" placeholder="e.g. John Doe" 
                                    value={formData.ownerName} onChange={handleChange} required 
                                />
                            </div>

                            <div className="input-block" style={{ marginBottom: 0 }}>
                                <label className="input-label">Business Name</label>
                                <input 
                                    type="text" name="businessName" 
                                    className="auth-input" placeholder="e.g. Acme Corp" 
                                    value={formData.businessName} onChange={handleChange} required 
                                />
                            </div>

                            <div className="input-block" style={{ marginBottom: 0 }}>
                                <label className="input-label">Email Address</label>
                                <input 
                                    type="email" name="email" 
                                    className="auth-input" placeholder="john@example.com" 
                                    value={formData.email} onChange={handleChange} required 
                                />
                            </div>

                            <div className="input-block" style={{ marginBottom: 0 }}>
                                <label className="input-label">Contact Number</label>
                                <input 
                                    type="text" name="phoneNumber" 
                                    className="auth-input" placeholder="+1 (555) 000-0000" 
                                    value={formData.phoneNumber} onChange={handleChange} required 
                                />
                            </div>
                        </div>

                        <div className="section-divider">
                            <span>Select Subscription</span>
                        </div>

                        <div className="input-block" style={{ marginBottom: selectedPackage ? '20px' : '32px' }}>
                            <select 
                                name="packageId" 
                                className="auth-input select-input"
                                value={formData.packageId} 
                                onChange={handlePackageSelect} 
                                required
                            >
                                <option value="" disabled>Choose a plan that fits your team</option>
                                {packages.map(pkg => (
                                    <option key={pkg._id} value={pkg._id}>
                                        {pkg.name} — Up to {pkg.maxEmployees || 10} employees
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedPackage && (
                            <div className="package-card">
                                <div className="package-card-header">
                                    <h4 className="package-name">{selectedPackage.name} License</h4>
                                    <h4 className="package-price">₹{selectedPackage.price}</h4>
                                </div>
                                <p className="package-desc">Billed for {selectedPackage.duration.value} {selectedPackage.duration.unit}(s)</p>
                                <p className="package-desc" style={{ marginTop: '6px', color: '#0052ff', fontWeight: 600 }}>
                                    Up to {selectedPackage.maxEmployees || 10} employees
                                </p>
                            </div>
                        )}

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? 'Initializing payment...' : 'Checkout & Create Workspace'}
                        </button>
                    </form>

                    <div className="auth-redirect">
                        Already have a workspace? <a onClick={() => navigate('/login')}>Sign in here</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;
