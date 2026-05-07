import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    User, Camera, ArrowLeft, ChevronDown, Search, Plus, Trash2, 
    FileText, Check, Briefcase, Phone, Globe, Info, GraduationCap,
    MapPin, ShieldCheck, Mail, Calendar, UploadCloud, AlertCircle
} from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const PhoneInput = ({ 
    label, 
    name, 
    countryCode, 
    value, 
    onCodeChange, 
    handlePhoneInputChange, 
    placeholder, 
    required = false,
    isOpen,
    countries,
    codeSearch,
    setCodeSearch,
    setActivePhoneDropdown,
    dropdownRef
}) => {
    const selectedCountry = countries.find(c => c.code === (countryCode || '+91')) || { name: 'India', code: '+91' };
    const filteredCountries = countries.filter(c => 
        c.name.toLowerCase().includes(codeSearch.toLowerCase()) || 
        c.code.includes(codeSearch)
    );

    return (
        <div className="hrm-form-group">
            <label className="hrm-label">{label} {required && <span className="req">*</span>}</label>
            <div className="phone-input-group">
                <div className="select-wrapper" ref={isOpen ? dropdownRef : null}>
                    <div 
                        className={`custom-select-trigger ${isOpen ? 'active' : ''}`}
                        onClick={() => {
                            if (isOpen) { setActivePhoneDropdown(null); } 
                            else { setActivePhoneDropdown(name); setCodeSearch(''); }
                        }}
                    >
                        <span>{selectedCountry.code}</span>
                        <ChevronDown size={14} className="select-chevron" />
                    </div>

                    {isOpen && (
                        <div className="custom-dropdown-list">
                            <div className="dropdown-search">
                                <Search size={14} color="var(--text-muted)" />
                                <input autoFocus placeholder="Search country..." value={codeSearch} onChange={(e) => setCodeSearch(e.target.value)} onClick={(e) => e.stopPropagation()} />
                            </div>
                            <div className="dropdown-options">
                                {filteredCountries.map(c => (
                                    <div key={c.cca2 + c.code} className={`dropdown-option ${countryCode === c.code ? 'selected' : ''}`} 
                                        onClick={(e) => { e.stopPropagation(); onCodeChange(c.code); setActivePhoneDropdown(null); }}>
                                        <span className="country-name">{c.name}</span>
                                        <span className="country-code">{c.code}</span>
                                    </div>
                                ))}
                                {filteredCountries.length === 0 && (
                                    <div className="no-results">No countries found</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <input type="text" name={name} value={value || ''} onChange={handlePhoneInputChange} placeholder={placeholder || ""} className="phone-input-field" required={required} />
            </div>
        </div>
    );
};

const EmployeeOnboarding = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    
    // States for dropdown data
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [leaveGroups, setLeaveGroups] = useState([]);
    const [salaryGroups, setSalaryGroups] = useState([]);
    const [countries, setCountries] = useState([]);
    const [documentTypes, setDocumentTypes] = useState([]);
    
    const [activePhoneDropdown, setActivePhoneDropdown] = useState(null);
    const [codeSearch, setCodeSearch] = useState('');
    const dropdownRef = useRef(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [activeStep, setActiveStep] = useState(0);
    const steps = [
        { title: 'Personal', sub: 'Identity & Info', icon: <User size={18} /> },
        { title: 'Job Info', sub: 'Organization Details', icon: <Briefcase size={18} /> },
        { title: 'Contact', sub: 'Address & Phone', icon: <Phone size={18} /> },
        { title: 'Other Info', sub: 'Documents & Proofs', icon: <FileText size={18} /> }
    ];

    const [formData, setFormData] = useState({
        employeeId: '',
        designation: '',
        branch: '',
        department: '',
        shift: '',
        leaveGroup: '',
        salaryGroup: '',
        firstName: '',
        lastName: '',
        countryCode: '+91',
        phone: '',
        emergencyCountryCode: '+91',
        emergencyNumber: '',
        altPhoneCountryCode: '+91',
        alternateMobileNumber: '',
        companyPhoneCountryCode: '+91',
        companyNumber: '',
        whatsappCountryCode: '+91',
        whatsAppNumber: '',
        dateOfBirth: '',
        bloodGroup: '',
        email: '',
        dateJoined: '',
        probationPeriodDays: '',
        trainingCompletionDate: '',
        dateOfPermanent: '',
        gender: 'Male',
        employmentType: 'Full Time',
        idProofType: '',
        maritalStatus: '',
        personalEmail: '',
        currentAddress: '',
        permanentAddress: '',
    });

    const [profilePhoto, setProfilePhoto] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    
    const [resumeFile, setResumeFile] = useState(null);
    const [idDocuments, setIdDocuments] = useState([]); 
    const [currentIdType, setCurrentIdType] = useState('');
    const [currentIdFile, setCurrentIdFile] = useState(null);

    useEffect(() => {
        fetchDropdownData();
        fetchCountryCodes();

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActivePhoneDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
            setCountries([
                { name: 'India', code: '+91' },
                { name: 'USA', code: '+1' },
                { name: 'UK', code: '+44' }
            ]);
        }
    };

    const fetchDropdownData = async () => {
        try {
            const [branchRes, deptRes, desigRes, shiftRes, leaveGroupRes, salaryGroupRes, docTypeRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/branches`),
                authenticatedFetch(`${API_URL}/api/departments`),
                authenticatedFetch(`${API_URL}/api/designations`),
                authenticatedFetch(`${API_URL}/api/shifts`),
                authenticatedFetch(`${API_URL}/api/leave-groups`),
                authenticatedFetch(`${API_URL}/api/salary-groups/all`),
                authenticatedFetch(`${API_URL}/api/document-types`)
            ]);

            const bData = await branchRes.json();
            const dData = await deptRes.json();
            const deData = await desigRes.json();
            const sData = await shiftRes.json();
            const lgData = await leaveGroupRes.json();
            const sgData = await salaryGroupRes.json();
            const dtData = await docTypeRes.json();

            if (bData.success) setBranches(bData.branches);
            if (dData.success) setDepartments(dData.departments);
            if (deData.success) setDesignations(deData.designations);
            if (sData.success) setShifts(sData.shifts);
            if (lgData.success) setLeaveGroups(lgData.leaveGroups);
            if (sgData.success) setSalaryGroups(sgData.groups);
            if (dtData.success) setDocumentTypes(dtData.documentTypes.filter(d => d.status === true));

        } catch (error) {
            console.error("Error fetching dropdown data:", error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'number') {
            setFormData(prev => ({ ...prev, [name]: value }));
            return;
        }
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handlePhoneInputChange = (e) => {
        const { name, value } = e.target;
        const numericValue = value.replace(/\D/g, '');
        setFormData(prev => ({ ...prev, [name]: numericValue }));
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

    const validateStep = (step) => {
        const errors = [];
        switch(step) {
            case 0:
                if (!formData.firstName.trim()) errors.push('First Name is required');
                if (!formData.lastName.trim()) errors.push('Last Name is required');
                if (!formData.phone.trim()) errors.push('Mobile Number is required');
                if (formData.phone && formData.phone.length < 10) errors.push('Mobile Number must be at least 10 digits');
                if (!formData.dateOfBirth) errors.push('Date of Birth is required');
                break;
            case 1:
                if (!formData.designation.trim()) errors.push('Designation is required');
                if (!formData.branch.trim()) errors.push('Branch is required');
                if (!formData.department.trim()) errors.push('Department is required');
                if (!formData.salaryGroup.trim()) errors.push('Salary Group is required');
                if (!formData.email.trim()) errors.push('Email ID is required');
                if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push('Please enter a valid email address');
                if (!formData.dateJoined.trim()) errors.push('Date of Joining is required');
                break;
            default: break;
        }
        return errors;
    };

    const handleNext = () => {
        const errors = validateStep(activeStep);
        if (errors.length > 0) {
            Swal.fire({ title: 'Missing Info', text: errors[0], icon: 'warning', confirmButtonColor: '#3B648B' });
            return;
        }
        if (activeStep < steps.length - 1) setActiveStep(prev => prev + 1);
    };

    const handlePrev = () => {
        if (activeStep > 0) setActiveStep(prev => prev - 1);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (isSubmitting) return;
        
        let allErrors = [];
        for (let i = 0; i < steps.length; i++) {
            allErrors = allErrors.concat(validateStep(i));
        }
        
        if (allErrors.length > 0) {
            Swal.fire({ title: 'Validation Failed', text: allErrors[0], icon: 'error', confirmButtonColor: '#3B648B' });
            return;
        }

        setIsSubmitting(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => data.append(key, formData[key]));
            if (profilePhoto) data.append('profilePhoto', profilePhoto);
            if (resumeFile) data.append('resume', resumeFile);
            if (idDocuments.length > 0) {
                idDocuments.forEach(doc => {
                    data.append('idProofs', doc.file);
                    data.append('idProofTypes', doc.type);
                });
            }

            const response = await fetch(`${API_URL}/api/users/add-employee`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });

            const resData = await response.json();
            setIsSubmitting(false);
            if (resData.success) {
                Swal.fire({ title: 'Success!', text: 'Employee onboarded successfully.', icon: 'success', timer: 2000, showConfirmButton: false });
                navigate('/admin/employees/list');
            } else {
                Swal.fire('Error', resData.message || 'Failed to onboard employee', 'error');
            }
        } catch (error) {
            setIsSubmitting(false);
            Swal.fire('Error', 'An error occurred while saving', 'error');
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
        <div className="hrm-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="hrm-header" style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button className="icon-btn" onClick={() => navigate(-1)} style={{ background: 'white', border: '1px solid #E2E8F0', width: '44px', height: '44px' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="hrm-title" style={{ fontSize: '28px', marginBottom: '4px' }}>Employee Onboarding</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Add a new talent to your organization</p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px', alignItems: 'start' }}>
                {/* Stepper Sidebar */}
                <div className="hrm-card" style={{ padding: '24px', position: 'sticky', top: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {steps.map((step, idx) => {
                            const isActive = activeStep === idx;
                            const isCompleted = activeStep > idx;
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => idx <= activeStep && setActiveStep(idx)}
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '16px', 
                                        padding: '16px', 
                                        borderRadius: '16px',
                                        background: isActive ? 'var(--primary-light)' : 'transparent',
                                        cursor: idx <= activeStep ? 'pointer' : 'default',
                                        transition: 'all 0.3s ease',
                                        border: isActive ? '1px solid var(--primary-blue)' : '1px solid transparent'
                                    }}
                                >
                                    <div style={{ 
                                        width: '40px', 
                                        height: '40px', 
                                        borderRadius: '12px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        background: isCompleted ? 'var(--success)' : (isActive ? 'var(--primary-blue)' : '#F1F5F9'),
                                        color: (isActive || isCompleted) ? 'white' : 'var(--text-muted)',
                                        boxShadow: isActive ? '0 8px 16px -4px rgba(37, 99, 235, 0.4)' : 'none'
                                    }}>
                                        {isCompleted ? <Check size={20} /> : step.icon}
                                    </div>
                                    <div>
                                        <p style={{ 
                                            fontSize: '14px', 
                                            fontWeight: '800', 
                                            color: isActive ? 'var(--primary-blue)' : (isCompleted ? 'var(--text-primary)' : 'var(--text-muted)'),
                                            margin: 0
                                        }}>{step.title}</p>
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>{step.sub}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Form Content */}
                <div className="hrm-card" style={{ padding: '40px', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', borderBottom: '1px solid #F1F5F9', paddingBottom: '20px' }}>
                            <div style={{ background: 'var(--primary-light)', padding: '10px', borderRadius: '10px', color: 'var(--primary-blue)' }}>
                                {steps[activeStep].icon}
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{steps[activeStep].title} Details</h2>
                        </div>

                        <form onSubmit={e => e.preventDefault()}>
                            {/* STEP 1: Personal Info */}
                            {activeStep === 0 && (
                                <div style={{ animation: 'slideInRight 0.4s ease-out' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ 
                                                width: '140px', height: '140px', borderRadius: '40px', 
                                                border: '4px solid white', background: '#F8FAFC',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                overflow: 'hidden', boxShadow: '0 20px 40px -12px rgba(0,0,0,0.1)'
                                            }}>
                                                {previewUrl ? (
                                                    <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <User size={64} color="#CBD5E1" />
                                                )}
                                            </div>
                                            <label style={{ 
                                                position: 'absolute', bottom: '-10px', right: '-10px', 
                                                background: 'var(--primary-blue)', color: 'white', 
                                                width: '44px', height: '44px', borderRadius: '16px', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer', border: '4px solid white',
                                                boxShadow: '0 8px 16px rgba(0,0,0,0.1)', transition: 'transform 0.2s'
                                            }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                                <Camera size={20} />
                                                <input type="file" hidden onChange={handleFileChange} accept="image/*" />
                                            </label>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                        <div className="hrm-form-group">
                                            <label className="hrm-label">Employee ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Auto-generated if empty)</span></label>
                                            <div style={{ position: 'relative' }}>
                                                <Info size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input type="text" name="employeeId" className="hrm-input" placeholder="EMP-001" onChange={handleInputChange} value={formData.employeeId} />
                                            </div>
                                        </div>
                                        <div className="hrm-form-group">
                                            <label className="hrm-label">First Name <span className="req">*</span></label>
                                            <input type="text" name="firstName" className="hrm-input" required placeholder="John" onChange={handleInputChange} value={formData.firstName} />
                                        </div>
                                        <div className="hrm-form-group">
                                            <label className="hrm-label">Last Name <span className="req">*</span></label>
                                            <input type="text" name="lastName" className="hrm-input" required placeholder="Doe" onChange={handleInputChange} value={formData.lastName} />
                                        </div>
                                        <PhoneInput 
                                            label="Primary Mobile" required={true} name="phone" 
                                            countryCode={formData.countryCode} value={formData.phone} 
                                            onCodeChange={(val) => setFormData(p => ({ ...p, countryCode: val }))} 
                                            handlePhoneInputChange={handlePhoneInputChange} 
                                            placeholder="98765 43210" 
                                            isOpen={activePhoneDropdown === 'phone'}
                                            countries={countries} codeSearch={codeSearch} setCodeSearch={setCodeSearch}
                                            setActivePhoneDropdown={setActivePhoneDropdown} dropdownRef={dropdownRef}
                                        />
                                        <div className="hrm-form-group">
                                            <label className="hrm-label">Date of Birth <span className="req">*</span></label>
                                            <div style={{ position: 'relative' }}>
                                                <Calendar size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                                <input type="date" name="dateOfBirth" className="hrm-input" required onChange={handleInputChange} value={formData.dateOfBirth} />
                                            </div>
                                        </div>
                                        <div className="hrm-form-group">
                                            <label className="hrm-label">Gender</label>
                                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                                {['Male', 'Female', 'Other'].map(g => (
                                                    <label key={g} style={{ 
                                                        flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid',
                                                        borderColor: formData.gender === g ? 'var(--primary-blue)' : '#E2E8F0',
                                                        background: formData.gender === g ? 'var(--primary-light)' : 'white',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                        cursor: 'pointer', transition: 'all 0.2s', fontWeight: 700, fontSize: '13px',
                                                        color: formData.gender === g ? 'var(--primary-blue)' : 'var(--text-secondary)'
                                                    }}>
                                                        <input type="radio" name="gender" value={g} checked={formData.gender === g} onChange={handleInputChange} style={{ display: 'none' }} />
                                                        {g}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Job Info */}
                            {activeStep === 1 && (
                                <div style={{ animation: 'slideInRight 0.4s ease-out' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                        <div className="hrm-form-group">
                                            <SearchableSelect 
                                                label="Designation" required={true} searchable={true} placeholder="Select Designation"
                                                options={designations.map(d => ({ value: d.designationName, label: d.designationName }))}
                                                value={formData.designation} onChange={(val) => setFormData(prev => ({ ...prev, designation: val }))}
                                            />
                                        </div>
                                        <div className="hrm-form-group">
                                            <SearchableSelect 
                                                label="Branch" required={true} searchable={true} placeholder="Select Branch"
                                                options={branches.map(b => ({ value: b.branchName, label: b.branchName }))}
                                                value={formData.branch} onChange={(val) => setFormData(prev => ({ ...prev, branch: val, department: '' }))}
                                            />
                                        </div>
                                        <div className="hrm-form-group">
                                            <SearchableSelect 
                                                label="Department" required={true} searchable={true} placeholder="Select Department"
                                                options={filteredDepartments.map(d => ({ value: d.name, label: d.name }))}
                                                value={formData.department} onChange={(val) => setFormData(prev => ({ ...prev, department: val }))}
                                                disabled={!formData.branch}
                                            />
                                        </div>
                                        <div className="hrm-form-group">
                                            <SearchableSelect 
                                                label="Employment Type" required={true} searchable={false}
                                                options={['Full Time', 'Part Time', 'Contract', 'Intern'].map(v => ({ value: v, label: v }))}
                                                value={formData.employmentType} onChange={(val) => setFormData(prev => ({ ...prev, employmentType: val }))}
                                            />
                                        </div>
                                        <div className="hrm-form-group">
                                            <SearchableSelect 
                                                label="Shift" required={false} searchable={true} placeholder="Select Shift"
                                                options={shifts.map(s => ({ value: s.shiftName, label: s.shiftName }))}
                                                value={formData.shift} onChange={(val) => setFormData(prev => ({ ...prev, shift: val }))}
                                            />
                                        </div>
                                        <div className="hrm-form-group">
                                            <SearchableSelect 
                                                label="Leave Group" required={true} searchable={true}
                                                options={leaveGroups.map(lg => ({ value: lg._id, label: lg.leaveGroupName }))}
                                                value={formData.leaveGroup} onChange={(val) => setFormData(prev => ({ ...prev, leaveGroup: val }))}
                                            />
                                        </div>
                                        <div className="hrm-form-group">
                                            <SearchableSelect 
                                                label="Salary Group" required={true} searchable={true}
                                                options={salaryGroups.map(sg => ({ value: sg._id, label: sg.groupName }))}
                                                value={formData.salaryGroup} onChange={(val) => setFormData(prev => ({ ...prev, salaryGroup: val }))}
                                            />
                                        </div>
                                        <div className="hrm-form-group">
                                            <label className="hrm-label">Official Email <span className="req">*</span></label>
                                            <div style={{ position: 'relative' }}>
                                                <Mail size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} required className="hrm-input" placeholder="work@company.com" />
                                            </div>
                                        </div>
                                        <div className="hrm-form-group">
                                            <label className="hrm-label">Joining Date <span className="req">*</span></label>
                                            <input type="date" name="dateJoined" className="hrm-input" required onChange={handleInputChange} value={formData.dateJoined} />
                                        </div>
                                        <div className="hrm-form-group">
                                            <label className="hrm-label">Probation (Days)</label>
                                            <input type="number" name="probationPeriodDays" className="hrm-input" placeholder="e.g. 90" onChange={handleInputChange} value={formData.probationPeriodDays} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: Contact Info */}
                            {activeStep === 2 && (
                                <div style={{ animation: 'slideInRight 0.4s ease-out' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                        <div className="hrm-form-group" style={{ gridColumn: '1 / -1' }}>
                                            <label className="hrm-label">Current Address</label>
                                            <div style={{ position: 'relative' }}>
                                                <MapPin size={18} style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-muted)' }} />
                                                <textarea name="currentAddress" className="hrm-input" rows="3" placeholder="Apartment, Street, City..." onChange={handleInputChange} value={formData.currentAddress} style={{ paddingRight: '44px', paddingTop: '14px', resize: 'none' }}></textarea>
                                            </div>
                                        </div>
                                        <div className="hrm-form-group" style={{ gridColumn: '1 / -1' }}>
                                            <label className="hrm-label">Permanent Address</label>
                                            <div style={{ position: 'relative' }}>
                                                <MapPin size={18} style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-muted)' }} />
                                                <textarea name="permanentAddress" className="hrm-input" rows="3" placeholder="Home address..." onChange={handleInputChange} value={formData.permanentAddress} style={{ paddingRight: '44px', paddingTop: '14px', resize: 'none' }}></textarea>
                                            </div>
                                        </div>
                                        <div className="hrm-form-group">
                                            <label className="hrm-label">Personal Email</label>
                                            <input type="email" name="personalEmail" className="hrm-input" placeholder="personal@gmail.com" onChange={handleInputChange} value={formData.personalEmail} />
                                        </div>
                                        <PhoneInput 
                                            label="WhatsApp Number" name="whatsAppNumber" 
                                            countryCode={formData.whatsappCountryCode} value={formData.whatsAppNumber} 
                                            onCodeChange={(val) => setFormData(p => ({ ...p, whatsappCountryCode: val }))} 
                                            handlePhoneInputChange={handlePhoneInputChange} 
                                            isOpen={activePhoneDropdown === 'whatsAppNumber'}
                                            countries={countries} codeSearch={codeSearch} setCodeSearch={setCodeSearch}
                                            setActivePhoneDropdown={setActivePhoneDropdown} dropdownRef={dropdownRef}
                                        />
                                        <PhoneInput 
                                            label="Emergency Contact" name="emergencyNumber" 
                                            countryCode={formData.emergencyCountryCode} value={formData.emergencyNumber} 
                                            onCodeChange={(val) => setFormData(p => ({ ...p, emergencyCountryCode: val }))} 
                                            handlePhoneInputChange={handlePhoneInputChange} 
                                            isOpen={activePhoneDropdown === 'emergencyNumber'}
                                            countries={countries} codeSearch={codeSearch} setCodeSearch={setCodeSearch}
                                            setActivePhoneDropdown={setActivePhoneDropdown} dropdownRef={dropdownRef}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Documents */}
                            {activeStep === 3 && (
                                <div style={{ animation: 'slideInRight 0.4s ease-out' }}>
                                    <div className="hrm-card" style={{ background: '#F8FAFC', border: '2px dashed #E2E8F0', padding: '32px', marginBottom: '32px' }}>
                                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--primary-blue)', boxShadow: '0 8px 16px -4px rgba(0,0,0,0.05)' }}>
                                                <UploadCloud size={32} />
                                            </div>
                                            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Add Identification Proofs</h3>
                                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Upload valid government IDs (Aadhar, PAN, Passport, etc.)</p>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'end' }}>
                                            <div style={{ flex: 1.5 }}>
                                                <SearchableSelect 
                                                    label="Document Type" placeholder="Aadhar Card"
                                                    options={documentTypes.filter(d => !idDocuments.some(idDoc => idDoc.type === d.name)).map(d => ({ value: d.name, label: d.name }))}
                                                    value={currentIdType} onChange={setCurrentIdType}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label className="hrm-label">Select File</label>
                                                <input type="file" id="id-file-input" hidden onChange={(e) => setCurrentIdFile(e.target.files[0])} accept="image/*,.pdf" />
                                                <button onClick={() => document.getElementById('id-file-input').click()} style={{ 
                                                    width: '100%', height: '48px', borderRadius: '12px', border: '1.5px solid #E2E8F0',
                                                    background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '0 16px', fontSize: '13px', fontWeight: 600, color: currentIdFile ? 'var(--text-primary)' : 'var(--text-muted)',
                                                    cursor: 'pointer'
                                                }}>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentIdFile ? currentIdFile.name : 'Choose file...'}</span>
                                                    <UploadCloud size={16} />
                                                </button>
                                            </div>
                                            <button type="button" onClick={() => {
                                                if (!currentIdType || !currentIdFile) return Swal.fire('Error', 'Select type and file', 'error');
                                                setIdDocuments([...idDocuments, { type: currentIdType, file: currentIdFile, typeLabel: currentIdType }]);
                                                setCurrentIdType(''); setCurrentIdFile(null);
                                            }} className="btn-hrm btn-hrm-primary" style={{ height: '48px', padding: '0 24px' }}>
                                                <Plus size={18} /> ADD
                                            </button>
                                        </div>

                                        {idDocuments.length > 0 && (
                                            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                                {idDocuments.map((doc, i) => (
                                                    <div key={i} style={{ 
                                                        background: 'white', padding: '14px 18px', borderRadius: '16px', border: '1px solid #E2E8F0',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <ShieldCheck size={20} />
                                                            </div>
                                                            <div>
                                                                <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{doc.typeLabel}</p>
                                                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{doc.file.name}</p>
                                                            </div>
                                                        </div>
                                                        <button type="button" onClick={() => setIdDocuments(idDocuments.filter((_, idx) => idx !== i))} style={{ background: '#FEF2F2', color: '#EF4444', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="hrm-form-group">
                                        <label className="hrm-label">Resume / Curriculum Vitae</label>
                                        <div style={{ 
                                            position: 'relative', height: '100px', borderRadius: '16px', border: '1.5px dashed #E2E8F0',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#F8FAFC'
                                        }} onClick={() => document.getElementById('resume-input').click()}>
                                            <input type="file" id="resume-input" hidden onChange={(e) => setResumeFile(e.target.files[0])} accept=".pdf,.doc,.docx" />
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                                                    <UploadCloud size={20} />
                                                    {resumeFile ? resumeFile.name : 'Click to upload resume'}
                                                </div>
                                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>PDF, DOCX up to 5MB</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Navigation Buttons */}
                    <div style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #F1F5F9' 
                    }}>
                        <button 
                            className="btn-hrm btn-hrm-secondary" 
                            onClick={handlePrev} 
                            disabled={activeStep === 0}
                            style={{ padding: '14px 28px', opacity: activeStep === 0 ? 0.5 : 1 }}
                        >
                            <ArrowLeft size={18} /> BACK
                        </button>
                        
                        {activeStep < steps.length - 1 ? (
                            <button className="btn-hrm btn-hrm-primary" onClick={handleNext} style={{ padding: '14px 32px' }}>
                                CONTINUE <ArrowLeft size={18} style={{ transform: 'rotate(180deg)' }} />
                            </button>
                        ) : (
                            <button className="btn-hrm btn-hrm-primary" onClick={handleSubmit} disabled={isSubmitting} style={{ padding: '14px 40px', background: 'var(--success)', border: 'none', boxShadow: '0 8px 20px -6px rgba(16, 185, 129, 0.4)' }}>
                                {isSubmitting ? 'PROCESSING...' : 'COMPLETE ONBOARDING'} <Check size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeOnboarding;
