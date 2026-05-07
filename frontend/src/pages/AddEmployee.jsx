import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, Camera, Check, X, ArrowLeft, User, Briefcase, Building2, 
    MapPin, Calendar, Mail, Phone, ShieldCheck, Info, CreditCard, 
    Globe, Heart, Clock, Award, UserCheck
} from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const AddEmployee = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [leaveGroups, setLeaveGroups] = useState([]);
    const [countries, setCountries] = useState([]);
    
    const [formData, setFormData] = useState({
        employeeId: '',
        designation: '',
        branch: '',
        department: '',
        shift: '',
        leaveGroup: '',
        firstName: '',
        lastName: '',
        aliasName: '',
        countryCode: '+91',
        phone: '',
        dateOfBirth: '',
        email: '',
        dateJoined: '',
        probationPeriodDays: '',
        trainingCompletionDate: '',
        dateOfPermanent: '',
        gender: 'Male',
        employmentType: 'Full Time',
        sendWhatsApp: true,
        subDepartment: '',
        grade: '',
        employeeLevel: '',
        biometricId: '',
        previousMemberId: '',
        isInternationalWorker: 'No',
        insuranceNumber: '',
        insuranceCompanyName: '',
        insuranceExpiryDate: '',
        retirementAge: ''
    });

    const [profilePhoto, setProfilePhoto] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchDropdownData();
        fetchCountryCodes();
    }, []);

    const fetchCountryCodes = async () => {
        try {
            const response = await fetch('https://restcountries.com/v3.1/all?fields=name,idd,cca2');
            const data = await response.json();
            
            const countryList = data.map(country => {
                const root = country.idd.root || '';
                const suffix = country.idd.suffixes ? country.idd.suffixes[0] : '';
                return {
                    name: country.name.common,
                    code: `${root}${suffix}`,
                    cca2: country.cca2
                };
            }).filter(c => c.code)
            .sort((a, b) => a.name.localeCompare(b.name));

            const indiaIndex = countryList.findIndex(c => c.cca2 === 'IN');
            if (indiaIndex > -1) {
                const india = countryList.splice(indiaIndex, 1)[0];
                countryList.unshift(india);
            }

            setCountries(countryList);
        } catch (error) {
            console.error("Error fetching country codes:", error);
            setCountries([{ name: 'India', code: '+91' }, { name: 'USA', code: '+1' }, { name: 'UK', code: '+44' }]);
        }
    };

    const fetchDropdownData = async () => {
        try {
            const [branchRes, deptRes, desigRes, shiftRes, leaveGroupRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/branches`),
                authenticatedFetch(`${API_URL}/api/departments`),
                authenticatedFetch(`${API_URL}/api/designations`),
                authenticatedFetch(`${API_URL}/api/shifts`),
                authenticatedFetch(`${API_URL}/api/leave-groups`)
            ]);

            const bData = await branchRes.json();
            const dData = await deptRes.json();
            const deData = await desigRes.json();
            const sData = await shiftRes.json();
            const lgData = await leaveGroupRes.json();

            if (bData.success) setBranches(bData.branches);
            if (dData.success) setDepartments(dData.departments);
            if (deData.success) setDesignations(deData.designations);
            if (sData.success) setShifts(sData.shifts);
            if (lgData.success) setLeaveGroups(lgData.leaveGroups);
        } catch (error) {
            console.error("Error fetching dropdown data:", error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    useEffect(() => {
        if (formData.dateJoined && formData.probationPeriodDays) {
            const joiningDate = new Date(formData.dateJoined);
            const days = parseInt(formData.probationPeriodDays);
            
            if (!isNaN(joiningDate.getTime()) && !isNaN(days)) {
                const completionDate = new Date(joiningDate);
                completionDate.setDate(joiningDate.getDate() + days);
                const formattedDate = completionDate.toISOString().split('T')[0];
                setFormData(prev => ({
                    ...prev,
                    trainingCompletionDate: formattedDate,
                    dateOfPermanent: formattedDate
                }));
            }
        }
    }, [formData.dateJoined, formData.probationPeriodDays]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePhoto(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.dateOfBirth) return Swal.fire('Validation', 'Date of Birth is required', 'warning');
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return Swal.fire('Validation', 'Valid Email is required', 'warning');
        
        setLoading(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => data.append(key, formData[key]));
            if (profilePhoto) data.append('profilePhoto', profilePhoto);

            const response = await fetch(`${API_URL}/api/users/add-employee`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });

            const resData = await response.json();
            if (resData.success) {
                Swal.fire({ title: 'Success!', text: resData.message || 'Employee added successfully', icon: 'success', timer: 2000, showConfirmButton: false });
                navigate('/admin/employees/list');
            } else {
                Swal.fire('Error', resData.message || 'Failed to add employee', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'An error occurred while saving', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredDepartments = React.useMemo(() => {
        const selectedBranch = branches.find(b => b.branchName === formData.branch || b._id === formData.branch);
        let list = departments;
        if (selectedBranch) list = departments.filter(d => d.branchId === selectedBranch._id);
        const uniqueNames = Array.from(new Set(list.map(d => d.name)));
        return uniqueNames.map(name => list.find(d => d.name === name));
    }, [departments, formData.branch, branches]);

    return (
        <div className="hrm-container" style={{ maxWidth: '1200px' }}>
            <div className="hrm-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button className="icon-btn" onClick={() => navigate(-1)} style={{ background: 'white', border: '1px solid #E2E8F0' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="hrm-title">Onboard New Employee</h1>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>Initialize a new staff profile in the organization database</p>
                    </div>
                </div>
                <button type="submit" form="employee-form" className="btn-hrm btn-hrm-primary" disabled={loading} style={{ height: '48px', padding: '0 32px' }}>
                    {loading ? <RefreshCw className="animate-spin" size={20} /> : <><Plus size={20} /> CREATE PROFILE</>}
                </button>
            </div>

            <form id="employee-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: '32px' }}>
                {/* 1. Basic Identity & Photo */}
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px' }}>
                    <div className="hrm-card" style={{ padding: '32px', textAlign: 'center', height: 'fit-content' }}>
                        <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 24px' }}>
                            <div style={{ 
                                width: '100%', height: '100%', borderRadius: '32px', 
                                border: '6px solid white', background: '#F8FAFC',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden', boxShadow: '0 12px 30px -10px rgba(0,0,0,0.1)'
                            }}>
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <User size={80} color="#CBD5E1" />
                                )}
                            </div>
                            <label style={{ 
                                position: 'absolute', bottom: '-10px', right: '-10px', 
                                background: 'var(--primary-gradient)', color: 'white', 
                                width: '44px', height: '44px', borderRadius: '14px', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                            }}>
                                <Camera size={20} />
                                <input type="file" hidden onChange={handleFileChange} accept="image/*" />
                            </label>
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-dark)', margin: '0 0 4px' }}>
                            {formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}` : 'Profile Preview'}
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>ID: {formData.employeeId || '---'}</p>
                    </div>

                    <div className="hrm-card" style={{ padding: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ background: 'var(--primary-light)', padding: '10px', borderRadius: '12px', color: 'var(--primary-blue)' }}>
                                <Info size={20} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Personal Identity</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="hrm-form-group">
                                <label className="hrm-label">First Name <span className="req">*</span></label>
                                <input type="text" name="firstName" className="hrm-input" required placeholder="John" value={formData.firstName} onChange={handleInputChange} />
                            </div>
                            <div className="hrm-form-group">
                                <label className="hrm-label">Last Name <span className="req">*</span></label>
                                <input type="text" name="lastName" className="hrm-input" required placeholder="Doe" value={formData.lastName} onChange={handleInputChange} />
                            </div>
                            <div className="hrm-form-group">
                                <label className="hrm-label">Alias Name</label>
                                <input type="text" name="aliasName" className="hrm-input" placeholder="Preferred Name" value={formData.aliasName} onChange={handleInputChange} />
                            </div>
                            <div className="hrm-form-group">
                                <label className="hrm-label">Gender</label>
                                <div style={{ display: 'flex', gap: '24px', height: '48px', alignItems: 'center' }}>
                                    {['Male', 'Female', 'Other'].map(g => (
                                        <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                                            <input type="radio" name="gender" value={g} checked={formData.gender === g} onChange={handleInputChange} style={{ width: '18px', height: '18px' }} /> {g}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                <label className="hrm-label">Date of Birth <span className="req">*</span></label>
                                <input type="date" name="dateOfBirth" className="hrm-input" required value={formData.dateOfBirth} onChange={handleInputChange} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Organization & Role */}
                <div className="hrm-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ background: '#F0F9FF', padding: '10px', borderRadius: '12px', color: '#0369A1' }}>
                            <Briefcase size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Organizational Placement</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                        <div className="hrm-form-group">
                            <label className="hrm-label">Employee ID</label>
                            <input type="text" name="employeeId" className="hrm-input" placeholder="EMP-001" value={formData.employeeId} onChange={handleInputChange} />
                        </div>
                        <div className="hrm-form-group">
                            <SearchableSelect label="Designation" required options={designations.map(d => ({ value: d.designationName, label: d.designationName }))} value={formData.designation} onChange={(v) => setFormData({...formData, designation: v})} />
                        </div>
                        <div className="hrm-form-group">
                            <SearchableSelect label="Branch" required options={branches.map(b => ({ value: b.branchName, label: b.branchName }))} value={formData.branch} onChange={(v) => setFormData({...formData, branch: v})} />
                        </div>
                        <div className="hrm-form-group">
                            <SearchableSelect label="Department" required options={filteredDepartments.map(d => ({ value: d.name, label: d.name }))} value={formData.department} onChange={(v) => setFormData({...formData, department: v})} />
                        </div>
                        <div className="hrm-form-group">
                            <SearchableSelect label="Work Shift" options={shifts.map(s => ({ value: s.shiftName, label: s.shiftName }))} value={formData.shift} onChange={(v) => setFormData({...formData, shift: v})} />
                        </div>
                        <div className="hrm-form-group">
                            <SearchableSelect label="Leave Policy Group" required options={leaveGroups.map(lg => ({ value: lg._id, label: lg.leaveGroupName }))} value={formData.leaveGroup} onChange={(v) => setFormData({...formData, leaveGroup: v})} />
                        </div>
                    </div>
                </div>

                {/* 3. Contact & Communication */}
                <div className="hrm-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ background: '#FEF2F2', padding: '10px', borderRadius: '12px', color: '#DC2626' }}>
                            <Mail size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Contact Information</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                        <div className="hrm-form-group">
                            <SearchableSelect label="Country Code" required options={countries.map(c => ({ value: c.code, label: `${c.name} (${c.code})` }))} value={formData.countryCode} onChange={(v) => setFormData({...formData, countryCode: v})} />
                        </div>
                        <div className="hrm-form-group">
                            <label className="hrm-label">Mobile Number <span className="req">*</span></label>
                            <input type="tel" name="phone" className="hrm-input" required placeholder="98765 43210" value={formData.phone} onChange={handleInputChange} />
                        </div>
                        <div className="hrm-form-group">
                            <label className="hrm-label">Official Email <span className="req">*</span></label>
                            <input type="email" name="email" className="hrm-input" required placeholder="employee@company.com" value={formData.email} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div style={{ marginTop: '16px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input type="checkbox" name="sendWhatsApp" checked={formData.sendWhatsApp} onChange={handleInputChange} style={{ width: '18px', height: '18px' }} />
                        <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-dark)' }}>Send welcome credentials via WhatsApp automated system</label>
                    </div>
                </div>

                {/* 4. Employment Terms */}
                <div className="hrm-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ background: '#ECFDF5', padding: '10px', borderRadius: '12px', color: '#059669' }}>
                            <UserCheck size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Employment Lifecycle</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                        <div className="hrm-form-group">
                            <SearchableSelect label="Employment Type" required options={[{value:'Full Time',label:'Full Time'},{value:'Part Time',label:'Part Time'},{value:'Contract',label:'Contract'},{value:'Intern',label:'Intern'}]} value={formData.employmentType} onChange={(v) => setFormData({...formData, employmentType: v})} />
                        </div>
                        <div className="hrm-form-group">
                            <label className="hrm-label">Date of Joining <span className="req">*</span></label>
                            <input type="date" name="dateJoined" className="hrm-input" required value={formData.dateJoined} onChange={handleInputChange} />
                        </div>
                        <div className="hrm-form-group">
                            <label className="hrm-label">Probation (Days)</label>
                            <input type="number" name="probationPeriodDays" className="hrm-input" placeholder="90" value={formData.probationPeriodDays} onChange={handleInputChange} />
                        </div>
                        <div className="hrm-form-group">
                            <label className="hrm-label">Confirmation Date</label>
                            <input type="date" name="dateOfPermanent" className="hrm-input" value={formData.dateOfPermanent} onChange={handleInputChange} />
                        </div>
                    </div>
                </div>

                {/* 5. Statutory & Security */}
                <div className="hrm-card" style={{ padding: '32px', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ background: '#FFF7ED', padding: '10px', borderRadius: '12px', color: '#C2410C' }}>
                            <ShieldCheck size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Compliance & Identification</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                        <div className="hrm-form-group">
                            <label className="hrm-label">Biometric Device ID</label>
                            <input type="text" name="biometricId" className="hrm-input" placeholder="BIO-XXXX" value={formData.biometricId} onChange={handleInputChange} />
                        </div>
                        <div className="hrm-form-group">
                            <label className="hrm-label">Insurance Policy Number</label>
                            <input type="text" name="insuranceNumber" className="hrm-input" placeholder="POL-123456" value={formData.insuranceNumber} onChange={handleInputChange} />
                        </div>
                        <div className="hrm-form-group">
                            <label className="hrm-label">Insurance Provider</label>
                            <input type="text" name="insuranceCompanyName" className="hrm-input" placeholder="Life Assurance Co." value={formData.insuranceCompanyName} onChange={handleInputChange} />
                        </div>
                    </div>
                </div>
            </form>

            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default AddEmployee;

