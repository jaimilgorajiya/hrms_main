import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Camera, Check, X, ArrowLeft, User, Briefcase, Building2, MapPin, Calendar, Mail, Phone, ShieldCheck } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const AddEmployee = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    
    // States for dropdown data
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

            // Move India to top
            const indiaIndex = countryList.findIndex(c => c.cca2 === 'IN');
            if (indiaIndex > -1) {
                const india = countryList.splice(indiaIndex, 1)[0];
                countryList.unshift(india);
            }

            setCountries(countryList);
        } catch (error) {
            console.error("Error fetching country codes:", error);
            // Fallback
            setCountries([
                { name: 'India', code: '+91' },
                { name: 'USA', code: '+1' },
                { name: 'UK', code: '+44' }
            ]);
        }
    };

    const fetchDropdownData = async () => {
        try {
            const [branchRes, deptRes, desigRes, shiftRes, leaveGroupRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/branches`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/departments`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/designations`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/shifts`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/leave-groups`, { headers: { 'Authorization': `Bearer ${token}` } })
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
            // const [branchRes, deptRes, desigRes, shiftRes, leaveGroupRes] = ...
            // I'll fix this. 

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

    // Auto-calculate Training Completion Date and Date of Permanent
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

        // Required field validation
        if (!formData.dateOfBirth) {
            return Swal.fire('Validation', 'Date of Birth is required', 'warning');
        }
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            return Swal.fire('Validation', 'A valid Email ID is required', 'warning');
        }
        
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });
            if (profilePhoto) {
                data.append('profilePhoto', profilePhoto);
            }

            const response = await fetch(`${API_URL}/api/users/add-employee`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });

            const resData = await response.json();
            if (resData.success) {
                Swal.fire({
                    title: 'Success!',
                    text: resData.message || 'Employee added and credentials sent to email.',
                    icon: 'success',
                    timer: 3000,
                    showConfirmButton: false
                });
                navigate('/admin/employees/list');
            } else {
                Swal.fire('Error', resData.message || 'Failed to add employee', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'An error occurred while saving', 'error');
        }
    };

    const filteredDepartments = React.useMemo(() => {
        // Find the selected branch object to get its ID
        const selectedBranch = branches.find(b => b.branchName === formData.branch || b._id === formData.branch);
        
        let list = departments;
        if (selectedBranch) {
            // Filter by selected branch
            list = departments.filter(d => d.branchId === selectedBranch._id);
        }

        // Return unique names to prevent duplicates if any exist
        const uniqueNames = Array.from(new Set(list.map(d => d.name)));
        return uniqueNames.map(name => list.find(d => d.name === name));
    }, [departments, formData.branch, branches]);

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button className="icon-btn" onClick={() => navigate(-1)} style={{ background: 'white', border: '1px solid #E2E8F0' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="hrm-title">Add Employee</h1>
                </div>
            </div>

            <div className="hrm-card" style={{ padding: '40px' }}>
                <form onSubmit={handleSubmit}>
                    {/* Profile Photo Upload */}
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

                    {/* Form Grid */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                        gap: '24px' 
                    }}>
                        <div className="hrm-form-group">
                            <label className="hrm-label">Employee ID</label>
                            <input type="text" name="employeeId" className="hrm-input" placeholder="Enter employee ID" onChange={handleInputChange} />
                        </div>

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

                        <div className="hrm-form-group">
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
                            <label className="hrm-label">First Name <span className="req">*</span></label>
                            <input type="text" name="firstName" className="hrm-input" required placeholder="Enter first name" onChange={handleInputChange} />
                        </div>

                        <div className="hrm-form-group">
                            <label className="hrm-label">Last Name <span className="req">*</span></label>
                            <input type="text" name="lastName" className="hrm-input" required placeholder="Enter last name" onChange={handleInputChange} />
                        </div>

                        <div className="hrm-form-group">
                            <label className="hrm-label">Alias Name</label>
                            <input type="text" name="aliasName" className="hrm-input" placeholder="Enter alias name" onChange={handleInputChange} />
                        </div>

                        <div className="hrm-form-group">
                            <SearchableSelect 
                                label="Country Code"
                                required={true}
                                searchable={true}
                                placeholder="Select Code"
                                options={countries.map(c => ({ value: c.code, label: `${c.name} (${c.code})` }))}
                                value={formData.countryCode}
                                onChange={(val) => setFormData(prev => ({ ...prev, countryCode: val }))}
                            />
                        </div>

                        <div className="hrm-form-group">
                            <label className="hrm-label">Mobile No. <span className="req">*</span></label>
                            <input type="tel" name="phone" className="hrm-input" required placeholder="Enter mobile number" onChange={handleInputChange} />
                        </div>

                        <div className="hrm-form-group">
                            <label className="hrm-label">Date Of Birth <span className="req">*</span></label>
                            <input type="date" name="dateOfBirth" className="hrm-input" required onChange={handleInputChange} />
                        </div>

                        <div className="hrm-form-group">
                            <label className="hrm-label">Email ID <span className="req">*</span></label>
                            <input type="email" name="email" className="hrm-input" required placeholder="Enter email" onChange={handleInputChange} />
                        </div>

                        <div className="hrm-form-group">
                            <label className="hrm-label">Date Of Joining <span className="req">*</span></label>
                            <input type="date" name="dateJoined" className="hrm-input" required onChange={handleInputChange} />
                        </div>

                        <div className="hrm-form-group">
                            <label className="hrm-label">Probation Period Days</label>
                            <input type="number" name="probationPeriodDays" className="hrm-input" placeholder="Enter days" onChange={handleInputChange} />
                        </div>

                        <div className="hrm-form-group">
                            <label className="hrm-label">Training Completion Date</label>
                            <input type="date" name="trainingCompletionDate" className="hrm-input" value={formData.trainingCompletionDate} onChange={handleInputChange} />
                        </div>

                        <div className="hrm-form-group">
                            <label className="hrm-label">Date of Permanent Employee</label>
                            <input type="date" name="dateOfPermanent" className="hrm-input" value={formData.dateOfPermanent} onChange={handleInputChange} />
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

                    </div>

                 

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
                        <button type="submit" className="btn-hrm btn-hrm-primary" style={{ padding: '12px 60px', borderRadius: '10px' }}>
                            <Check size={20} /> ADD
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEmployee;
