import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera, ArrowLeft, ChevronDown, Search, Plus, Trash2, FileText, Check } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

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
    const steps = ['Basic Info', 'Job Info', 'Contact Info', 'Other Info'];

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
    const [idDocuments, setIdDocuments] = useState([]); // Array of { type, file, typeLabel }
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
                authenticatedFetch(`${API_URL}/api/branches`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/departments`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/designations`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/shifts`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/leave-groups`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/salary-groups/all`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/document-types`, { headers: { 'Authorization': `Bearer ${token}` } })
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
        
        // Handle number inputs to prevent cursor jumping
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
        // Allow only digits, but don't interfere with cursor position
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

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        // Prevent multiple submissions
        if (isSubmitting) {
            return;
        }
        
        setIsSubmitting(true);
        
        // Validate all steps before submission
        let allErrors = [];
        for (let i = 0; i < steps.length; i++) {
            const stepErrors = validateStep(i);
            allErrors = allErrors.concat(stepErrors);
        }
        
        if (allErrors.length > 0) {
            setIsSubmitting(false);
            Swal.fire({
                title: 'Required Fields',
                text: 'Please complete all required fields before saving.',
                icon: 'warning',
                confirmButtonColor: '#3B648B',
                confirmButtonText: 'OK'
            });
            return;
        }
        
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });
            if (profilePhoto) {
                data.append('profilePhoto', profilePhoto);
            }
            if (resumeFile) {
                data.append('resume', resumeFile);
            }
            
            // Handle multiple ID Proofs
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
                Swal.fire({
                    title: 'Success!',
                    text: resData.message || 'Employee onboarded successfully.',
                    icon: 'success',
                    timer: 3000,
                    showConfirmButton: false
                });
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
        if (selectedBranch) {
            list = departments.filter(d => d.branchId === selectedBranch._id);
        }
        const uniqueNames = Array.from(new Set(list.map(d => d.name)));
        return uniqueNames.map(name => list.find(d => d.name === name));
    }, [departments, formData.branch, branches]);

    const validateStep = (step) => {
        const errors = [];
        
        switch(step) {
            case 0: // Basic Info
                if (!formData.firstName.trim()) errors.push('First Name is required');
                if (!formData.lastName.trim()) errors.push('Last Name is required');
                if (!formData.phone.trim()) errors.push('Mobile Number is required');
                if (formData.phone && formData.phone.length < 10) errors.push('Mobile Number must be at least 10 digits');
                if (!formData.dateOfBirth) errors.push('Date of Birth is required');
                break;
                
            case 1: // Job Info
                if (!formData.designation.trim()) errors.push('Designation is required');
                if (!formData.branch.trim()) errors.push('Branch is required');
                if (!formData.department.trim()) errors.push('Department is required');
                if (!formData.salaryGroup.trim()) errors.push('Salary Group is required');
                if (!formData.employmentType.trim()) errors.push('Employment Type is required');
                if (!formData.email.trim()) errors.push('Email ID is required');
                if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push('Please enter a valid email address');
                if (!formData.dateJoined.trim()) errors.push('Date of Joining is required');
                break;
                
            case 2: // Contact Info
                // No required fields in Contact Info step, but can add validation if needed
                break;
                
            case 3: // Other Info
                // No required fields in Other Info step, but can add validation if needed
                break;
                
            default:
                break;
        }
        
        return errors;
    };

    const handleNext = () => {
        const errors = validateStep(activeStep);
        
        if (errors.length > 0) {
            Swal.fire({
                title: 'Required Fields',
                text: 'Please fill in all required fields to continue.',
                icon: 'warning',
                confirmButtonColor: '#3B648B',
                confirmButtonText: 'OK'
            });
            return;
        }
        
        if (activeStep < steps.length - 1) setActiveStep(prev => prev + 1);
    };

    const handleStepClick = (idx) => {
        if (idx === activeStep) return;
        
        if (idx < activeStep) {
            setActiveStep(idx);
        } else {
            // If moving forward, must validate all steps in between
            for (let i = activeStep; i < idx; i++) {
                const errors = validateStep(i);
                if (errors.length > 0) {
                    Swal.fire({
                        title: 'Required Fields',
                        text: `Please complete step ${i + 1} before moving to step ${idx + 1}.`,
                        icon: 'warning',
                        confirmButtonColor: '#3B648B'
                    });
                    return;
                }
            }
            setActiveStep(idx);
        }
    };

    const handlePrev = () => {
        if (activeStep > 0) setActiveStep(prev => prev - 1);
    };

    const PhoneInput = ({ label, name, countryCode, value, onCodeChange, onChange, placeholder, required = false }) => {
        const isOpen = activePhoneDropdown === name;
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
                                    <Search size={14} color="#94a3b8" />
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

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button className="icon-btn" onClick={() => navigate(-1)} style={{ background: 'white', border: '1px solid #E2E8F0' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="hrm-title">Employee Onboarding</h1>
                </div>
            </div>

            <div className="hrm-card" style={{ padding: '40px' }}>
                
                {/* Steps Navigation */}
                <div className="hrm-stepper">
                    <div className="hrm-stepper-line" />
                    <div 
                        className="hrm-stepper-progress" 
                        style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }} 
                    />
                    {steps.map((step, idx) => (
                        <div 
                            key={idx} 
                            className={`hrm-step ${activeStep === idx ? 'active' : ''} ${activeStep > idx ? 'completed' : ''}`}
                            onClick={() => handleStepClick(idx)}
                        >
                            <div className="hrm-step-circle">
                                {activeStep > idx ? <Check size={20} /> : idx + 1}
                            </div>
                            <div className="hrm-step-label">{step}</div>
                        </div>
                    ))}
                </div>

                <form 
                    onSubmit={handleSubmit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                            e.preventDefault();
                        }
                    }}
                >
                    
                    {/* STEP 1: Basic Info */}
                    {activeStep === 0 && (
                        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ 
                                        width: '130px', 
                                        height: '130px', 
                                        borderRadius: '50%', 
                                        border: '4px solid #F1F5F9',
                                        background: '#F8FAFC',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
                                    }}>
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <User size={60} color="#CBD5E1" />
                                        )}
                                    </div>
                                    <label style={{ 
                                        position: 'absolute', 
                                        bottom: '5px', 
                                        right: '5px', 
                                        background: '#3B648B', 
                                        color: 'white', 
                                        width: '36px', 
                                        height: '36px', 
                                        borderRadius: '50%', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        border: '3px solid white',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                    }}>
                                        <Camera size={18} />
                                        <input type="file" hidden onChange={handleFileChange} accept="image/*" />
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                                <div className="hrm-form-group">
                                    <label className="hrm-label">Employee ID</label>
                                    <input type="text" name="employeeId" className="hrm-input" placeholder="Enter employee ID" onChange={handleInputChange} value={formData.employeeId} />
                                </div>

                                <div className="hrm-form-group">
                                    <label className="hrm-label">First Name <span className="req">*</span></label>
                                    <input type="text" name="firstName" className="hrm-input" required placeholder="Enter first name" onChange={handleInputChange} value={formData.firstName} />
                                </div>

                                <div className="hrm-form-group">
                                    <label className="hrm-label">Last Name <span className="req">*</span></label>
                                    <input type="text" name="lastName" className="hrm-input" required placeholder="Enter last name" onChange={handleInputChange} value={formData.lastName} />
                                </div>

                                <PhoneInput label="Mobile No." required={true} name="phone" countryCode={formData.countryCode} value={formData.phone} onCodeChange={(val) => setFormData(p => ({ ...p, countryCode: val }))} onChange={handleInputChange} placeholder="Enter mobile number" />

                                <div className="hrm-form-group">
                                    <label className="hrm-label">Date of Birth <span className="req">*</span></label>
                                    <input type="date" name="dateOfBirth" className="hrm-input" required onChange={handleInputChange} value={formData.dateOfBirth} />
                                </div>

                                <div className="hrm-form-group">
                                    <label className="hrm-label">Gender</label>
                                    <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#64748B' }}>
                                            <input type="radio" name="gender" value="Male" checked={formData.gender === 'Male'} onChange={handleInputChange} /> Male
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#64748B' }}>
                                            <input type="radio" name="gender" value="Female" checked={formData.gender === 'Female'} onChange={handleInputChange} /> Female
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="hrm-form-group">
                                    <label className="hrm-label">Resume</label>
                                    <input type="file" onChange={(e) => setResumeFile(e.target.files[0])} className="hrm-input file-input-styled" accept=".pdf,.doc,.docx" />
                                </div>

                                <div className="hrm-form-group" style={{ position: 'relative', zIndex: 89, gridColumn: '1 / -1' }}>
                                    <label className="hrm-label">ID Proof Documents</label>
                                    
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: '15px', 
                                        background: '#F8FAFC', 
                                        padding: '20px', 
                                        borderRadius: '12px', 
                                        border: '1.5px dashed #E2E8F0',
                                        marginBottom: '20px',
                                        alignItems: 'flex-end'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <SearchableSelect 
                                                label="Select Document Type"
                                                searchable={true}
                                                placeholder="Choose document..."
                                                options={documentTypes
                                                    .filter(d => !idDocuments.some(idDoc => idDoc.type === d.name))
                                                    .map(d => ({ value: d.name, label: d.name }))}
                                                value={currentIdType}
                                                onChange={(val) => setCurrentIdType(val)}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label className="hrm-label">Upload File</label>
                                            <input 
                                                type="file" 
                                                onChange={(e) => setCurrentIdFile(e.target.files[0])} 
                                                className="hrm-input file-input-styled" 
                                                accept="image/*,.pdf"
                                                id="id-file-input"
                                            />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                if (!currentIdType || !currentIdFile) {
                                                    Swal.fire('Error', 'Please select a document type and a file', 'error');
                                                    return;
                                                }
                                                setIdDocuments([...idDocuments, { type: currentIdType, file: currentIdFile, typeLabel: currentIdType }]);
                                                setCurrentIdType('');
                                                setCurrentIdFile(null);
                                                document.getElementById('id-file-input').value = '';
                                            }}
                                            style={{ 
                                                height: '48px', 
                                                padding: '0 20px', 
                                                background: '#3B648B', 
                                                color: 'white', 
                                                border: 'none', 
                                                borderRadius: '10px', 
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontWeight: '600'
                                            }}
                                        >
                                            <Plus size={18} /> Add
                                        </button>
                                    </div>

                                    {/* List of added documents */}
                                    {idDocuments.length > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                            {idDocuments.map((doc, index) => (
                                                <div key={index} style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'space-between', 
                                                    padding: '12px 18px', 
                                                    background: 'white', 
                                                    border: '1px solid #E2E8F0', 
                                                    borderRadius: '10px' 
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 100, 139, 0.1)', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#3B648B' }}>
                                                            <FileText size={18} style={{ margin: 'auto' }} />
                                                        </div>
                                                        <div>
                                                            <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#1E293B' }}>{doc.typeLabel}</p>
                                                            <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>{doc.file.name}</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setIdDocuments(idDocuments.filter((_, i) => i !== index))}
                                                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Job Info */}
                    {activeStep === 1 && (
                        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                                <div className="hrm-form-group">
                                    <SearchableSelect 
                                        label="Designation"
                                        required={true}
                                        searchable={true}
                                        placeholder="Select Designation"
                                        options={designations.map(d => ({ value: d.designationName, label: d.designationName }))}
                                        value={formData.designation}
                                        onChange={(val) => setFormData(prev => ({ ...prev, designation: val }))}
                                    />
                                </div>

                                <div className="hrm-form-group">
                                    <SearchableSelect 
                                        label="Branch"
                                        required={true}
                                        searchable={true}
                                        placeholder="Select Branch"
                                        options={branches.map(b => ({ value: b.branchName, label: b.branchName }))}
                                        value={formData.branch}
                                        onChange={(val) => setFormData(prev => ({ ...prev, branch: val }))}
                                    />
                                </div>

                                {formData.branch && (
                                    <div className="hrm-form-group" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                        <SearchableSelect 
                                            label="Department"
                                            required={true}
                                            searchable={true}
                                            placeholder="Select Department"
                                            options={filteredDepartments.map(d => ({ value: d.name, label: d.name }))}
                                            value={formData.department}
                                            onChange={(val) => setFormData(prev => ({ ...prev, department: val }))}
                                        />
                                    </div>
                                )}

                                <div className="hrm-form-group">
                                    <SearchableSelect 
                                        label="Employment Type"
                                        required={true}
                                        searchable={true}
                                        placeholder="Employment Type"
                                        options={[
                                            { value: 'Full Time', label: 'Full Time' },
                                            { value: 'Part Time', label: 'Part Time' },
                                            { value: 'Contract', label: 'Contract' },
                                            { value: 'Intern', label: 'Intern' },
                                        ]}
                                        value={formData.employmentType}
                                        onChange={(val) => setFormData(prev => ({ ...prev, employmentType: val }))}
                                    />
                                </div>

                                <div className="hrm-form-group">
                                    <SearchableSelect 
                                        label="Shift"
                                        required={false}
                                        searchable={true}
                                        placeholder="Select Shift"
                                        options={shifts.map(s => ({ value: s.shiftName, label: s.shiftName }))}
                                        value={formData.shift}
                                        onChange={(val) => setFormData(prev => ({ ...prev, shift: val }))}
                                    />
                                </div>
                                <div className="hrm-form-group">
                                    <SearchableSelect 
                                        label="Leave Group"
                                        required={true}
                                        searchable={true}
                                        placeholder="Select Leave Group"
                                        options={leaveGroups.map(lg => ({ value: lg._id, label: lg.leaveGroupName }))}
                                        value={formData.leaveGroup}
                                        onChange={(val) => setFormData(prev => ({ ...prev, leaveGroup: val }))}
                                    />
                                </div>

                                <div className="hrm-form-group">
                                    <SearchableSelect 
                                        label="Salary Group"
                                        required={true}
                                        searchable={true}
                                        placeholder="Select Salary Group"
                                        options={salaryGroups.map(sg => ({ value: sg._id, label: sg.groupName }))}
                                        value={formData.salaryGroup}
                                        onChange={(val) => setFormData(prev => ({ ...prev, salaryGroup: val }))}
                                    />
                                </div>
                                
                                <div className="hrm-form-group">
                                    <label className="hrm-label">Email ID <span className="req">*</span> <span style={{ textTransform: 'none', color: '#94a3b8', fontSize: '12px', fontWeight: '500', marginLeft: '5px' }}>(Credentials will be sent here)</span></label>
                                    <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} required className="hrm-input" placeholder="Enter personal email" />
                                </div>

                                <div className="hrm-form-group">
                                    <label className="hrm-label">Date of Joining <span className="req">*</span></label>
                                    <input type="date" name="dateJoined" className="hrm-input" required onChange={handleInputChange} value={formData.dateJoined} />
                                </div>

                                <div className="hrm-form-group">
                                    <label className="hrm-label">Probation Period Days</label>
                                    <input 
                                        type="number" 
                                        name="probationPeriodDays" 
                                        className="hrm-input" 
                                        placeholder="Enter days" 
                                        onChange={handleInputChange} 
                                        value={formData.probationPeriodDays}
                                        key="probationPeriodDays"
                                    />
                                </div>

                                <div className="hrm-form-group">
                                    <label className="hrm-label">Training Completion Date</label>
                                    <input type="date" name="trainingCompletionDate" className="hrm-input" value={formData.trainingCompletionDate} onChange={handleInputChange} />
                                </div>

                                <div className="hrm-form-group">
                                    <label className="hrm-label">Date of Permanent Employee</label>
                                    <input type="date" name="dateOfPermanent" className="hrm-input" value={formData.dateOfPermanent} onChange={handleInputChange} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Contact Info */}
                    {activeStep === 2 && (
                        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                                <PhoneInput label="WhatsApp Number" name="whatsAppNumber" countryCode={formData.whatsappCountryCode} value={formData.whatsAppNumber} onCodeChange={(val) => setFormData(p => ({ ...p, whatsappCountryCode: val }))} onChange={handleInputChange} placeholder="Enter whatsapp number"/>
                                <PhoneInput label="Alt. Phone Number" name="alternateMobileNumber" countryCode={formData.altPhoneCountryCode} value={formData.alternateMobileNumber} onCodeChange={(val) => setFormData(p => ({ ...p, altPhoneCountryCode: val }))} onChange={handleInputChange} placeholder="Enter alternate number" />
                                <PhoneInput label="Emergency Number" name="emergencyNumber" countryCode={formData.emergencyCountryCode} value={formData.emergencyNumber} onCodeChange={(val) => setFormData(p => ({ ...p, emergencyCountryCode: val }))} onChange={handleInputChange} placeholder="Enter emergency number"/>
                                
                                <div className="hrm-form-group">
                                    <label className="hrm-label">Current Address</label>
                                    <input type="text" name="currentAddress" className="hrm-input" placeholder="Enter current address" onChange={handleInputChange} value={formData.currentAddress} />
                                </div>

                                <div className="hrm-form-group">
                                    <label className="hrm-label">Permanent Address</label>
                                    <input type="text" name="permanentAddress" className="hrm-input" placeholder="Enter permanent address" onChange={handleInputChange} value={formData.permanentAddress} />
                                </div>

                                <div className="hrm-form-group">
                                    <label className="hrm-label">Personal Email</label>
                                    <input type="email" name="personalEmail" className="hrm-input" placeholder="Enter personal email" onChange={handleInputChange} value={formData.personalEmail} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Other Info */}
                    {activeStep === 3 && (
                        <div style={{ animation: 'fadeIn 0.3s ease-out', minHeight: '300px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                                <div className="hrm-form-group" style={{ position: 'relative', zIndex: 100 }}>
                                    <SearchableSelect 
                                        label="Marital Status"
                                        searchable={false}
                                        placeholder="Select Marital Status"
                                        options={[
                                            { value: 'Single', label: 'Single' },
                                            { value: 'Married', label: 'Married' },
                                            { value: 'Divorced', label: 'Divorced' },
                                            { value: 'Widowed', label: 'Widowed' }
                                        ]}
                                        value={formData.maritalStatus}
                                        onChange={(val) => setFormData(prev => ({ ...prev, maritalStatus: val }))}
                                    />
                                </div>
                                <div className="hrm-form-group" style={{ position: 'relative', zIndex: 99 }}>
                                    <SearchableSelect 
                                        label="Blood Group"
                                        searchable={false}
                                        placeholder="Select Blood Group"
                                        options={[
                                            { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' }, 
                                            { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' }, 
                                            { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' }, 
                                            { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' }
                                        ]}
                                        value={formData.bloodGroup}
                                        onChange={(val) => setFormData(prev => ({ ...prev, bloodGroup: val }))}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Form Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '50px', borderTop: '1px solid #f1f5f9', paddingTop: '25px' }}>
                        {activeStep > 0 && (
                            <button type="button" onClick={handlePrev} style={{ padding: '12px 30px', borderRadius: '8px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                Previous
                            </button>
                        )}
                        {activeStep < steps.length - 1 ? (
                            <button type="button" onClick={handleNext} disabled={isSubmitting} style={{ padding: '12px 30px', borderRadius: '8px', background: '#3B648B', color: 'white', border: 'none', fontWeight: '700', cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: isSubmitting ? 0.6 : 1 }}>
                                Next Step
                            </button>
                        ) : (
                            <button type="button" onClick={() => handleSubmit()} className="btn-hrm btn-hrm-primary" disabled={isSubmitting} style={{ padding: '12px 40px', borderRadius: '8px', fontWeight: '700', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}>
                                {isSubmitting ? 'Saving...' : 'Save Employee'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .phone-input-group { 
                    display: flex; 
                    height: 48px; 
                    border: 1.5px solid #E2E8F0; 
                    border-radius: 12px; 
                    overflow: visible; 
                    background: #fff;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }
                .phone-input-group:focus-within { 
                    border-color: #3B648B; 
                    box-shadow: 0 0 0 4px rgba(59, 100, 139, 0.08); 
                }
                .phone-input-group .select-wrapper {
                    position: relative;
                    width: 90px;
                    border-right: 1.5px solid #E2E8F0;
                    background: #F8FAFC;
                    border-radius: 10.5px 0 0 10.5px;
                }
                .custom-select-trigger {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 12px;
                    cursor: pointer;
                    font-size: 14.5px;
                    color: #1e293b;
                    font-weight: 700;
                    border-radius: 10.5px 0 0 10.5px;
                    transition: all 0.2s;
                }
                .custom-select-trigger:hover {
                    background: #F1F5F9;
                }
                .custom-select-trigger.active {
                    background: #fff;
                }
                .custom-dropdown-list {
                    position: absolute;
                    top: calc(100% + 8px);
                    left: 0;
                    width: 280px;
                    background: #fff;
                    border: 1.5px solid #E2E8F0;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                    z-index: 1000;
                    overflow: hidden;
                    animation: dropdownIn 0.2s ease-out;
                }
                .dropdown-search {
                    padding: 12px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    border-bottom: 1px solid #F1F5F9;
                    background: #F8FAFC;
                }
                .dropdown-search input {
                    border: none !important;
                    background: transparent !important;
                    padding: 0 !important;
                    height: auto !important;
                    font-size: 14px !important;
                    font-weight: 500 !important;
                    outline: none !important;
                    width: 100%;
                    color: #1e293b;
                }
                .dropdown-options {
                    max-height: 250px;
                    overflow-y: auto;
                    padding: 6px;
                }
                .dropdown-option {
                    padding: 10px 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.15s;
                    margin-bottom: 2px;
                }
                .dropdown-option:hover {
                    background: #F8FAFC;
                }
                .dropdown-option.selected {
                    background: rgba(59, 100, 139, 0.08);
                    color: #3B648B;
                }
                .country-name {
                    font-size: 14px;
                    font-weight: 600;
                    color: #475569;
                }
                .country-code {
                    font-size: 12.5px;
                    color: #94a3b8;
                    font-weight: 700;
                }
                .dropdown-option.selected .country-name { color: #3B648B; }
                .dropdown-option.selected .country-code { color: #3B648B; opacity: 0.8; }
                
                .no-results {
                    padding: 24px;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 13.5px;
                    font-weight: 500;
                }
                .phone-input-group input.phone-input-field { 
                    flex: 1; 
                    border: none; 
                    padding: 12px 18px; 
                    outline: none; 
                    font-size: 15.5px; 
                    font-weight: 500;
                    color: #1e293b; 
                    background: transparent;
                }

                .file-input-styled {
                    padding: 8px 12px;
                    line-height: normal;
                }
                .file-input-styled::file-selector-button {
                    background: #F8FAFC;
                    border: 1px solid #E2E8F0;
                    border-radius: 8px;
                    padding: 8px 16px;
                    color: #475569;
                    font-weight: 600;
                    font-size: 13px;
                    cursor: pointer;
                    margin-right: 12px;
                    transition: all 0.2s ease;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
                }
                .file-input-styled::file-selector-button:hover {
                    background: #F1F5F9;
                    color: #3B648B;
                    border-color: #cbd5e1;
                }
            `}</style>
        </div>
    );
};

export default EmployeeOnboarding;
