import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Mail, Phone, MapPin, Building2, Briefcase, 
    Calendar, User, ShieldCheck, Clock, Award, FileText,
    Check, X, Camera, ChevronDown, Search, GraduationCap, RotateCcw,
    History, AlertCircle, StickyNote, Plus, Trash2, Edit2, Eye
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
    activePhoneDropdown,
    setActivePhoneDropdown,
    countries,
    codeSearch,
    setCodeSearch,
    dropdownRef
}) => {
    const isOpen = activePhoneDropdown === name;
    const selectedCountry = countries.find(c => c.code === (countryCode || '+91')) || { name: 'India', code: '+91' };
    const filteredCountries = countries.filter(c => 
        c.name.toLowerCase().includes(codeSearch.toLowerCase()) || 
        c.code.includes(codeSearch)
    );

    return (
        <div className="ss-form-group">
            <label className="ss-label">{label} {required && <span style={{ color: '#ef4444' }}>*</span>}</label>
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
                                <Search size={14} />
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
                <input type="text" name={name} value={value || ''} onChange={handlePhoneInputChange} placeholder={placeholder || ""} />
            </div>
        </div>
    );
};

const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('Job Information');
    const tabs = [
        { id: 'Job Information', label: 'Job Information', icon: <Briefcase size={16} /> },
        { id: 'Contact Detail', label: 'Contact Detail', icon: <Phone size={16} /> },
        { id: 'Personal Info', label: 'Personal Info', icon: <User size={16} /> },
        { id: 'Experience', label: 'Experience', icon: <History size={16} /> },
        { id: 'Documents', label: 'Documents', icon: <FileText size={16} /> }
    ];
    
    // Experience specific states
    const [isExpModalOpen, setIsExpModalOpen] = useState(false);
    const [editingExpIndex, setEditingExpIndex] = useState(null);
    const [expFormData, setExpFormData] = useState({
        companyName: '',
        designation: '',
        workFrom: '',
        workTo: '',
        isCurrent: false,
        location: '',
        description: ''
    });
    
    // Document specific states
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [viewingDoc, setViewingDoc] = useState(null);
    const [docFormData, setDocFormData] = useState({
        documentType: '',
        documentNumber: '',
        issueDate: '',
        expiryDate: '',
        file: null
    });
    
    // New states for premium phone dropdowns
    const [activePhoneDropdown, setActivePhoneDropdown] = useState(null);
    const [codeSearch, setCodeSearch] = useState('');
    const dropdownRef = React.useRef(null);
    
    // Dropdown data
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [leaveGroups, setLeaveGroups] = useState([]);
    const [salaryGroups, setSalaryGroups] = useState([]);
    const [documentTypes, setDocumentTypes] = useState([]);
    const [countries, setCountries] = useState([]);

    const [formData, setFormData] = useState({});
    const [resignationInfo, setResignationInfo] = useState(null);
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [companyName, setCompanyName] = useState('Company');

    useEffect(() => {
        fetchEmployeeDetails();
        fetchDropdownData();
        fetchCountryCodes();
        fetchCompanyDetails();
    }, [id]);

    const fetchCompanyDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await authenticatedFetch(`${API_URL}/api/company`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data && data.companyName) {
                    setCompanyName(data.companyName);
                }
            }
        } catch (error) {
            console.error("Error fetching company details:", error);
        }
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
                
                // Only update if they actually differ to avoid unnecessary state changes or infinite loops
                setFormData(prev => {
                    if (prev.trainingCompletionDate === formattedDate && prev.dateOfPermanent === formattedDate) {
                        return prev;
                    }
                    return {
                        ...prev,
                        trainingCompletionDate: formattedDate,
                        dateOfPermanent: formattedDate
                    };
                });
            }
        }
    }, [formData.dateJoined, formData.probationPeriodDays]);

    const fetchEmployeeDetails = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await authenticatedFetch(`${API_URL}/api/users/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setEmployee(data.user);
                setFormData(data.user);

                // Fetch resignation specific details if user is not active
                if (['Resigned', 'Ex-Employee'].includes(data.user.status)) {
                    fetchResignationDetails(data.user._id);
                }
            } else {
                Swal.fire('Error', data.message || 'Failed to fetch employee details', 'error');
                navigate('/admin/employees/list');
            }
        } catch (error) {
            console.error("Error fetching employee details:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchResignationDetails = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await authenticatedFetch(`${API_URL}/api/resignation/admin/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                const userRes = data.resignations.find(r => r.employeeId?._id === userId);
                if (userRes) {
                    setResignationInfo(userRes);
                }
            }
        } catch (error) {
            console.error("Error fetching resignation details:", error);
        }
    };

    // Handle clicking outside to close country code dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActivePhoneDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);



    const calculateDuration = (from, to, isCurrent) => {
        if (!from) return '--';
        const start = new Date(from);
        const end = isCurrent ? new Date() : new Date(to);
        
        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();
        let days = end.getDate() - start.getDate();

        if (days < 0) {
            months--;
            days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        let result = [];
        if (years > 0) result.push(`${years} Year(s)`);
        if (months > 0) result.push(`${months} Month(s)`);
        if (days > 0) result.push(`${days} Day(s)`);
        
        return result.length > 0 ? result.join(', ') : '0 Day(s)';
    };

    const handleAddExperience = async (e) => {
        e.preventDefault();
        try {
            let updatedExp;
            if (editingExpIndex !== null) {
                updatedExp = [...(formData.pastExperience || [])];
                updatedExp[editingExpIndex] = expFormData;
            } else {
                updatedExp = [...(formData.pastExperience || []), expFormData];
            }

            const response = await authenticatedFetch(`${API_URL}/api/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pastExperience: updatedExp })
            });
            const data = await response.json();
            if (data.success) {
                setFormData(data.user);
                setIsExpModalOpen(false);
                setExpFormData({ companyName: '', designation: '', workFrom: '', workTo: '', isCurrent: false, location: '', description: '' });
                setEditingExpIndex(null);
                Swal.fire('Success', editingExpIndex !== null ? 'Experience updated successfully' : 'Experience added successfully', 'success');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to save experience', 'error');
        }
    };

    const handleEditExperience = (index) => {
        const exp = formData.pastExperience[index];
        setExpFormData({
            ...exp,
            workFrom: exp.workFrom ? exp.workFrom.split('T')[0] : '',
            workTo: exp.workTo ? exp.workTo.split('T')[0] : ''
        });
        setEditingExpIndex(index);
        setIsExpModalOpen(true);
    };

    const handleDeleteExperience = async (index) => {
        const result = await Swal.fire({
            title: 'Delete Experience?',
            text: "Are you sure you want to remove this record?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const updatedExp = [...(formData.pastExperience || [])];
                updatedExp.splice(index, 1);
                const response = await authenticatedFetch(`${API_URL}/api/users/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pastExperience: updatedExp })
                });
                const data = await response.json();
                if (data.success) {
                    setFormData(data.user);
                    Swal.fire('Deleted', 'Experience record removed', 'success');
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete experience', 'error');
            }
        }
    };

    const handleUploadDocument = async (e) => {
        e.preventDefault();
        if (!docFormData.documentType || !docFormData.file) {
            return Swal.fire('Error', 'Please select a document type and attach a file', 'error');
        }
        
        const data = new FormData();
        data.append('documentType', docFormData.documentType);
        data.append('file', docFormData.file);
        if (docFormData.documentNumber) data.append('documentNumber', docFormData.documentNumber);
        if (docFormData.issueDate) data.append('issueDate', docFormData.issueDate);
        if (docFormData.expiryDate) data.append('expiryDate', docFormData.expiryDate);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/users/${id}/documents`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });
            const resData = await response.json();
            if (resData.success) {
                setFormData(resData.user);
                setIsDocModalOpen(false);
                setDocFormData({ documentType: '', documentNumber: '', issueDate: '', expiryDate: '', file: null });
                Swal.fire('Success', 'Document uploaded successfully', 'success');
            } else {
                Swal.fire('Error', resData.message || 'Failed to upload document', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'An error occurred while uploading', 'error');
        }
    };

    const handleDeleteDocument = async (docId) => {
        const result = await Swal.fire({
            title: 'Delete Document?',
            text: "Are you sure you want to remove this document?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/users/${id}/documents/${docId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    setFormData(data.user);
                    Swal.fire('Deleted', 'Document removed successfully', 'success');
                } else {
                    Swal.fire('Error', data.message || 'Failed to delete document', 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete document', 'error');
            }
        }
    };
    
    const fetchDropdownData = async () => {
        const token = localStorage.getItem('token');
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
            const docData = await docTypeRes.json();

            if (bData.success) setBranches(bData.branches);
            if (dData.success) setDepartments(dData.departments);
            if (deData.success) setDesignations(deData.designations);
            if (sData.success) setShifts(sData.shifts);
            if (lgData.success) setLeaveGroups(lgData.leaveGroups);
            if (sgData.success) setSalaryGroups(sgData.groups);
            if (docData.success) setDocumentTypes(docData.documentTypes.filter(d => d.status));
// Only keep active
        } catch (error) {
            console.error("Error fetching dropdowns:", error);
        }
    };

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
            setCountries([
                { name: 'India', code: '+91', cca2: 'IN' },
                { name: 'USA', code: '+1', cca2: 'US' }
            ]);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // Mobile number validation: only allow digits and enforce length by country
        if (name === 'phone') {
            const numericValue = value.replace(/\D/g, ''); 
            const code = formData.countryCode || '+91';
            
            // Length definitions
            const lengths = {
                '+91': 10, // India
                '+1': 10,  // USA/Canada
                '+44': 10, // UK
                '+61': 9,  // Australia
            };
            
            const maxLen = lengths[code] || 15;
            
            if (numericValue.length <= maxLen) {
                setFormData(prev => ({ ...prev, [name]: numericValue }));
            }
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhoneInputChange = (e) => {
        const { name, value } = e.target;
        // Allow only digits for all phone number fields
        const numericValue = value.replace(/\D/g, '');
        setFormData(prev => ({ ...prev, [name]: numericValue }));
    };

    const calculateExperience = (joiningDate) => {
        if (!joiningDate) return 'N/A';
        const start = new Date(joiningDate);
        const end = new Date();
        
        // Check if joining date is in the future
        if (start > end) {
            return 'Not Joined Yet';
        }
        
        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();
        let days = end.getDate() - start.getDate();

        if (days < 0) {
            months -= 1;
            days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
        }
        if (months < 0) {
            years -= 1;
            months += 12;
        }

        let result = [];
        if (years > 0) result.push(`${years} ${years === 1 ? 'Year' : 'Years'}`);
        if (months > 0) result.push(`${months} ${months === 1 ? 'Month' : 'Months'}`);
        if (days > 0 && years === 0 && months === 0) result.push(`${days} ${days === 1 ? 'Day' : 'Days'}`);
        
        return result.length > 0 ? result.join(' ') : 'Joined Today';
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePhoto(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleUpdate = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            
            // Use FormData for file upload support
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                // Skip internal and conflicting nested objects
                const excludedFields = ['_id', '__v', 'createdAt', 'updatedAt', 'workSetup', 'salaryDetails', 'permissions', 'documents', 'verification'];
                if (excludedFields.includes(key)) return;

                const value = formData[key];
                if (value !== null && value !== undefined) {
                    if (Array.isArray(value)) {
                        // For arrays like pastExperience
                        data.append(key, JSON.stringify(value));
                    } else if (typeof value === 'object' && !(value instanceof File)) {
                        // Skip other nested objects to let backend mapping handle them
                        return;
                    } else {
                        data.append(key, value);
                    }
                }
            });

            console.log("SENDING DATA:", Object.fromEntries(data.entries()));

            if (profilePhoto) {
                data.append('profilePhoto', profilePhoto);
            }

            const response = await fetch(`${API_URL}/api/users/${id}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`
                    // Note: Browser sets Content-Type boundary for FormData
                },
                body: data
            });
            
            const resData = await response.json();
            if (resData.success) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Profile updated successfully.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                setEmployee(resData.user);
                setFormData(resData.user);
                setProfilePhoto(null);
            } else {
                Swal.fire('Error', resData.message || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error("Save error:", error);
            Swal.fire('Error', `An error occurred while saving: ${error.message}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleMarkExEmployee = async () => {
        const { value: formValues } = await Swal.fire({
            title: '<span style="font-size: 24px; font-weight: 800; color: #1E293B;">Employee Separation</span>',
            html: `
                <div style="padding: 10px 5px; text-align: left;">
                    <p style="color: #64748B; font-size: 14px; margin-bottom: 30px; line-height: 1.5; text-align: center;">Please provide the official separation details below. This action will archive the employee profile.</p>
                    
                    <div style="margin-bottom: 22px;">
                        <label style="display: block; font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.8px;">Resignation Date</label>
                        <input id="swal-resignation-date" type="date" style="width: 100%; padding: 12px 15px; border: 1.5px solid #E2E8F0; border-radius: 12px; font-size: 15px; color: #1E293B; outline: none; transition: border-color 0.2s;" value="${new Date().toISOString().split('T')[0]}">
                    </div>

                    <div style="margin-bottom: 22px;">
                        <label style="display: block; font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.8px;">Exit Date</label>
                        <input id="swal-exit-date" type="date" style="width: 100%; padding: 12px 15px; border: 1.5px solid #E2E8F0; border-radius: 12px; font-size: 15px; color: #1E293B; outline: none; transition: border-color 0.2s;" value="${new Date().toISOString().split('T')[0]}">
                    </div>

                    <div>
                        <label style="display: block; font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.8px;">Reason for Exit</label>
                        <textarea id="swal-exit-reason" style="width: 100%; height: 100px; padding: 12px 15px; border: 1.5px solid #E2E8F0; border-radius: 12px; font-size: 15px; color: #1E293B; outline: none; resize: none; font-family: inherit;" placeholder="Enter specific reasons or remarks..."></textarea>
                    </div>
                </div>
            `,
            width: '450px',
            padding: '2.5rem',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Confirm Separation',
            cancelButtonText: 'Keep Active',
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#F1F5F9',
            customClass: {
                confirmButton: 'swal-confirm-separation',
                cancelButton: 'swal-cancel-separation',
                popup: 'swal-custom-popup'
            },
            preConfirm: () => {
                const resignationDate = document.getElementById('swal-resignation-date').value;
                const exitDate = document.getElementById('swal-exit-date').value;
                const exitReason = document.getElementById('swal-exit-reason').value;
                if (!resignationDate || !exitDate) {
                    Swal.showValidationMessage('Both dates are required');
                    return false;
                }
                return { resignationDate, exitDate, exitReason };
            }
        });

        // Add some style to the confirm/cancel buttons via CSS injection
        const style = document.createElement('style');
        style.innerHTML = `
            .swal-confirm-separation { padding: 12px 30px !important; border-radius: 12px !important; font-weight: 700 !important; font-size: 14px !important; height: 48px !important; margin-right: 10px !important; }
            .swal-cancel-separation { padding: 12px 30px !important; border-radius: 12px !important; font-weight: 700 !important; font-size: 14px !important; height: 48px !important; color: #64748B !important; }
            #swal-resignation-date:focus, #swal-exit-date:focus, #swal-exit-reason:focus { border-color: #3B648B !important; box-shadow: 0 0 0 4px rgba(59, 100, 139, 0.1); }
            .swal-custom-popup { border-radius: 24px !important; }
        `;
        document.head.appendChild(style);

        if (formValues) {
            try {
                setSaving(true);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                const exitDateObj = new Date(formValues.exitDate);
                const targetStatus = exitDateObj > today ? 'Resigned' : 'Ex-Employee';

                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/users/${id}`, {
                    method: 'PUT',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        status: targetStatus,
                        resignationDate: formValues.resignationDate,
                        exitDate: formValues.exitDate,
                        exitReason: formValues.exitReason
                    })
                });
                
                const resData = await response.json();
                if (resData.success) {
                    const isFuture = targetStatus === 'Resigned';
                    Swal.fire({
                        title: isFuture ? 'Marked as Resigned!' : 'Marked as Ex-Employee!',
                        text: isFuture 
                            ? `This employee is now in notice period until ${formValues.exitDate}.`
                            : 'Redirecting to Ex-Employee list...',
                        icon: 'success',
                        timer: 3000,
                        showConfirmButton: false
                    }).then(() => {
                        if (isFuture) {
                            fetchEmployeeDetails();
                        } else {
                            navigate('/admin/employees/ex');
                        }
                    });
                } else {
                    Swal.fire('Error', resData.message || 'Failed to update status', 'error');
                }
            } catch (error) {
                console.error("Mark Ex-Employee error:", error);
                Swal.fire('Error', error.message, 'error');
            } finally {
                setSaving(false);
            }
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

    const handleReactive = async () => {
        const result = await Swal.fire({
            title: '<span style="font-size: 22px; font-weight: 800; color: #1E293B;">Re-activate Employee?</span>',
            text: "This will set the employee status back to Active and clear separation records.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Re-activate',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#45B79E',
            cancelButtonColor: '#F1F5F9',
            customClass: {
                confirmButton: 'swal-confirm-separation',
                cancelButton: 'swal-cancel-separation',
                popup: 'swal-custom-popup'
            }
        });

        if (result.isConfirmed) {
            try {
                setSaving(true);
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/users/${id}`, {
                    method: 'PUT',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        status: 'Active',
                        resignationDate: null,
                        exitDate: null,
                        exitReason: ''
                    })
                });
                
                const resData = await response.json();
                if (resData.success) {
                    Swal.fire({
                        title: 'Success!',
                        text: 'Employee status restored to Active.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        fetchEmployeeDetails();
                    });
                } else {
                    Swal.fire('Error', resData.message || 'Failed to update status', 'error');
                }
            } catch (error) {
                console.error("Reactive error:", error);
                Swal.fire('Error', error.message, 'error');
            } finally {
                setSaving(false);
            }
        }
    };

    if (loading) return <div className="loading-container">Loading Profile...</div>;
    if (!employee) return <div className="loading-container">Employee not found.</div>;

    return (
        <div className="hrm-container" style={{ background: '#f8fafc', minHeight: '100vh', padding: '30px', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button className="icon-btn" onClick={() => navigate('/admin/employees/list')} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>
                        <ArrowLeft size={20} color="#64748b" />
                    </button>
                    <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee Profile</h1>
                </div>
            </div>

            {/* Tenure Insight (Top Banner Style) */}
            <div style={{ 
                background: 'white', 
                padding: '12px 24px', 
                borderRadius: '12px', 
                border: '1px solid #e2e8f0',
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
                <div style={{ background: 'rgba(59, 100, 139, 0.1)', padding: '8px', borderRadius: '8px' }}>
                    <Clock size={20} color="#3B648B" />
                </div>
                <div>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', display: 'block' }}>Employee joined since:</span>
                    <span style={{ fontSize: '16px', color: '#1e293b', fontWeight: '800' }}>{calculateExperience(formData.dateJoined)}</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '30px' }}>
                {/* Sidebar (Left) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '30px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto 20px' }}>
                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#f8fafc', overflow: 'hidden', border: '4px solid #fff', boxShadow: '0 0 0 1px #e2e8f0' }}>
                                {previewUrl ? (
                                    <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : formData.profilePhoto ? (
                                    <img src={`${API_URL}/uploads/${formData.profilePhoto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: '800', color: '#cbd5e1' }}>
                                        {formData.name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>
                            <label style={{ 
                                position: 'absolute', bottom: '5px', right: '5px', background: '#3B648B', border: '3px solid #fff', 
                                borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', 
                                justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' 
                            }}>
                                <Camera size={18} color="white" />
                                <input type="file" hidden onChange={handleFileChange} accept="image/*" />
                            </label>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: '0 0 5px' }}>
                            {formData.name}
                            {formData.status === 'Resigned' && (
                                <>
                                    <br />
                                    <span style={{ 
                                        fontSize: '9px', 
                                        fontWeight: '800', 
                                        background: '#FEF2F2', 
                                        color: '#EF4444', 
                                        padding: '2px 10px', 
                                        borderRadius: '50px',
                                        textTransform: 'uppercase',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        display: 'inline-block',
                                        marginTop: '4px'
                                    }}>Notice Period</span>
                                </>
                            )}
                        </h2>
                        <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', margin: '0 0 20px' }}>{formData.designation || 'Web Developer'}</p>
                        
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ minWidth: '32px', height: '32px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Phone size={14} color="#64748b" />
                                </div>
                                <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>{formData.countryCode} {formData.phone}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ minWidth: '32px', height: '32px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Mail size={14} color="#64748b" />
                                </div>
                                <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formData.email}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ minWidth: '32px', height: '32px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={14} color="#64748b" />
                                </div>
                                <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>{formData.gender}</span>
                            </div>
                        </div>

                        {/* Mark as Ex-Emp Button */}
                        {!['Ex-Employee', 'Resigned', 'Terminated', 'Absconding', 'Retired'].includes(formData.status) ? (
                            <button 
                                onClick={handleMarkExEmployee}
                                style={{
                                    marginTop: '25px',
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    color: '#EF4444',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#EF4444';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                                    e.currentTarget.style.color = '#EF4444';
                                }}
                            >
                                <X size={16} /> Mark as Ex-Emp
                            </button>
                        ) : (
                            <div style={{ marginTop: '25px', borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>Resignation Date:</span>
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '700' }}>
                                        {(formData.resignationDate || resignationInfo?.noticeDate) ? new Date(formData.resignationDate || resignationInfo?.noticeDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>Company Last Day:</span>
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '700' }}>
                                        {(formData.exitDate || resignationInfo?.lastWorkingDay) ? new Date(formData.exitDate || resignationInfo?.lastWorkingDay).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>Perform By:</span>
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '700' }}>{companyName}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>Resignation Remark:</span>
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '700' }}>{formData.exitReason || '-'}</span>
                                </div>

                                {formData.status !== 'Resigned' && (
                                    <button 
                                        onClick={handleReactive}
                                        style={{
                                            marginTop: '15px',
                                            width: '100%',
                                            padding: '12px 20px',
                                            background: 'rgba(59, 100, 139, 0.08)',
                                            color: '#3B648B',
                                            border: '1.5px solid rgba(59, 100, 139, 0.2)',
                                            borderRadius: '12px',
                                            fontSize: '12.5px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: '0 4px 12px rgba(59, 100, 139, 0.05)'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.background = '#3B648B';
                                            e.currentTarget.style.color = 'white';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 100, 139, 0.2)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = 'rgba(59, 100, 139, 0.08)';
                                            e.currentTarget.style.color = '#3B648B';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 100, 139, 0.05)';
                                        }}
                                    >
                                        <RotateCcw size={16} strokeWidth={2.5} />
                                        RE-ACTIVATE EMPLOYEE
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Area (Right) */}
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'visible', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    {/* Tabs Navigation */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 10px', background: '#fcfcfd' }}>
                        {tabs.map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '20px 20px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    color: activeTab === tab.id ? '#3B648B' : '#94a3b8',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transition: 'all 0.3s ease',
                                    textTransform: 'uppercase',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    flexShrink: 0
                                }}
                            >
                                {tab.icon}
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '3px', background: '#3B648B', borderRadius: '3px 3px 0 0' }} />
                                )}
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: '35px', paddingBottom: '150px', flex: 1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                            {activeTab === 'Job Information' && (
                                <>
                                    <div className="ss-form-group">
                                        <SearchableSelect 
                                            label="Designation"
                                            options={designations.filter(d => d.designationName).map(d => ({ value: d.designationName, label: d.designationName }))}
                                            value={formData.designation}
                                            onChange={(val) => setFormData(prev => ({ ...prev, designation: val }))}
                                        />
                                    </div>
                                    <div className="ss-form-group">
                                        <SearchableSelect 
                                            label="Employment Type"
                                            options={[
                                                { value: 'Full Time', label: 'Full Time' },
                                                { value: 'Part Time', label: 'Part Time' },
                                                { value: 'Contract', label: 'Contract' },
                                                { value: 'Intern', label: 'Intern' }
                                            ]}
                                            value={formData.employmentType}
                                            onChange={(val) => setFormData(prev => ({ ...prev, employmentType: val }))}
                                        />
                                    </div>
                                    <div className="ss-form-group">
                                        <label className="ss-label">Employee ID</label>
                                        <input type="text" name="employeeId" value={formData.employeeId || ''} onChange={handleInputChange} className="ss-input" />
                                    </div>
                                    <div className="ss-form-group">
                                        <label className="ss-label">Date Of Joining <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="date" name="dateJoined" value={formData.dateJoined ? formData.dateJoined.split('T')[0] : ''} onChange={handleInputChange} className="ss-input" />
                                    </div>
                                    <div className="ss-form-group">
                                        <label className="ss-label">Probation Period Days</label>
                                        <input type="number" name="probationPeriodDays" value={formData.probationPeriodDays || ''} onChange={handleInputChange} className="ss-input" />
                                    </div>
                                    <div className="ss-form-group">
                                        <label className="ss-label">Training Completion Date</label>
                                        <input type="date" name="trainingCompletionDate" value={formData.trainingCompletionDate ? formData.trainingCompletionDate.split('T')[0] : ''} onChange={handleInputChange} className="ss-input" />
                                    </div>
                                    <div className="ss-form-group">
                                        <label className="ss-label">Date of Permanent</label>
                                        <input type="date" name="dateOfPermanent" value={formData.dateOfPermanent ? formData.dateOfPermanent.split('T')[0] : ''} onChange={handleInputChange} className="ss-input" />
                                    </div>
                                    <div className="ss-form-group">
                                        <SearchableSelect 
                                            label="Branch"
                                            searchable={true}
                                            options={branches.filter(b => b.branchName).map(b => ({ value: b.branchName, label: b.branchName }))}
                                            value={formData.branch}
                                            onChange={(val) => setFormData(prev => ({ ...prev, branch: val }))}
                                        />
                                    </div>
                                    <div className="ss-form-group">
                                        <SearchableSelect 
                                            label="Department"
                                            searchable={true}
                                            options={filteredDepartments.map(d => ({ value: d.name, label: d.name }))}
                                            value={formData.department}
                                            onChange={(val) => setFormData(prev => ({ ...prev, department: val }))}
                                        />
                                    </div>
                                    <div className="ss-form-group">
                                        <SearchableSelect 
                                            label="Shift"
                                            searchable={true}
                                            options={shifts.filter(s => s.shiftName).map(s => ({ value: s.shiftName, label: s.shiftName }))}
                                            value={formData.shift}
                                            onChange={(val) => setFormData(prev => ({ ...prev, shift: val }))}
                                        />
                                    </div>
                                    <div className="ss-form-group">
                                        <SearchableSelect 
                                            label="Leave Group"
                                            searchable={true}
                                            options={[{ value: '', label: 'None (Unassign)' }, ...leaveGroups.map(lg => ({ value: lg._id, label: lg.leaveGroupName }))]}
                                            value={typeof formData.leaveGroup === 'object' ? formData.leaveGroup?._id : (formData.leaveGroup || '')}
                                            onChange={(val) => setFormData(prev => ({ ...prev, leaveGroup: val }))}
                                        />
                                    </div>
                                    <div className="ss-form-group">
                                        <SearchableSelect 
                                            label="Salary Group"
                                            searchable={true}
                                            placeholder="Assign Salary Group"
                                            options={salaryGroups.map(sg => ({ value: sg._id, label: sg.groupName }))}
                                            value={formData.salaryGroupId || ''}
                                            onChange={(val) => setFormData(prev => ({ ...prev, salaryGroupId: val, salaryGroup: val }))}
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'Contact Detail' && (() => {

                                return (
                                    <>
                                        <div className="ss-form-group" style={{ gridColumn: 'span 2', marginBottom: '10px' }}>
                                            <label className="ss-label" style={{ opacity: 0.6 }}>Email ID (Read Only)</label>
                                            <input type="email" name="email" value={formData.email || ''} readOnly disabled className="ss-input disabled-input" style={{ background: '#f8fafc', color: '#94a3b8' }} />
                                        </div>
                                        <PhoneInput 
                                            label="Mobile No." 
                                            required={true} 
                                            name="phone" 
                                            countryCode={formData.phoneCountryCode} 
                                            value={formData.phone} 
                                            onCodeChange={(val) => setFormData(p => ({ ...p, phoneCountryCode: val }))} 
                                            handlePhoneInputChange={handlePhoneInputChange} 
                                            placeholder="6354088391" 
                                            activePhoneDropdown={activePhoneDropdown}
                                            setActivePhoneDropdown={setActivePhoneDropdown}
                                            countries={countries}
                                            codeSearch={codeSearch}
                                            setCodeSearch={setCodeSearch}
                                            dropdownRef={dropdownRef}
                                        />
                                        <PhoneInput 
                                            label="Emergency Number" 
                                            name="emergencyNumber" 
                                            countryCode={formData.emergencyCountryCode} 
                                            value={formData.emergencyNumber} 
                                            onCodeChange={(val) => setFormData(p => ({ ...p, emergencyCountryCode: val }))} 
                                            handlePhoneInputChange={handlePhoneInputChange}
                                            activePhoneDropdown={activePhoneDropdown}
                                            setActivePhoneDropdown={setActivePhoneDropdown}
                                            countries={countries}
                                            codeSearch={codeSearch}
                                            setCodeSearch={setCodeSearch}
                                            dropdownRef={dropdownRef}
                                        />
                                        <PhoneInput 
                                            label="Alt. Phone Number" 
                                            name="alternateMobileNumber" 
                                            countryCode={formData.altPhoneCountryCode} 
                                            value={formData.alternateMobileNumber} 
                                            onCodeChange={(val) => setFormData(p => ({ ...p, altPhoneCountryCode: val }))} 
                                            handlePhoneInputChange={handlePhoneInputChange}
                                            activePhoneDropdown={activePhoneDropdown}
                                            setActivePhoneDropdown={setActivePhoneDropdown}
                                            countries={countries}
                                            codeSearch={codeSearch}
                                            setCodeSearch={setCodeSearch}
                                            dropdownRef={dropdownRef}
                                        />
                                        <PhoneInput 
                                            label="Company Mobile" 
                                            name="companyNumber" 
                                            countryCode={formData.companyPhoneCountryCode} 
                                            value={formData.companyNumber} 
                                            onCodeChange={(val) => setFormData(p => ({ ...p, companyPhoneCountryCode: val }))} 
                                            handlePhoneInputChange={handlePhoneInputChange} 
                                            activePhoneDropdown={activePhoneDropdown}
                                            setActivePhoneDropdown={setActivePhoneDropdown}
                                            countries={countries}
                                            codeSearch={codeSearch}
                                            setCodeSearch={setCodeSearch}
                                            dropdownRef={dropdownRef}
                                        />
                                        <div className="ss-form-group">
                                            <label className="ss-label">Current Address</label>
                                            <textarea name="currentAddress" value={formData.currentAddress || ''} onChange={handleInputChange} className="ss-input" style={{ height: '80px', padding: '10px 16px' }} placeholder="Enter current address" />
                                        </div>
                                        <div className="ss-form-group">
                                            <label className="ss-label">Permanent Address</label>
                                            <textarea name="permanentAddress" value={formData.permanentAddress || ''} onChange={handleInputChange} className="ss-input" style={{ height: '80px', padding: '10px 16px' }} placeholder="Enter permanent address" />
                                        </div>
                                        <div className="ss-form-group">
                                            <label className="ss-label">Personal Email ID</label>
                                            <input type="email" name="personalEmail" value={formData.personalEmail || ''} onChange={handleInputChange} className="ss-input" placeholder="abc@gmail.com" />
                                        </div>
                                    </>
                                );
                            })()}

                            {activeTab === 'Personal Info' && (
                                <>
                                    <div className="ss-form-group"><label className="ss-label">First Name</label><input type="text" name="firstName" value={formData.firstName || ''} onChange={handleInputChange} className="ss-input" /></div>
                                    <div className="ss-form-group"><label className="ss-label">Last Name</label><input type="text" name="lastName" value={formData.lastName || ''} onChange={handleInputChange} className="ss-input" /></div>
                                    <div className="ss-form-group"><label className="ss-label">Alias Name</label><input type="text" name="aliasName" value={formData.aliasName || ''} onChange={handleInputChange} className="ss-input" /></div>
                                    <div className="ss-form-group"><label className="ss-label">Date of Birth</label><input type="date" name="dateOfBirth" value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''} onChange={handleInputChange} className="ss-input" /></div>
                                    <div className="ss-form-group">
                                        <SearchableSelect label="Gender" options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} value={formData.gender} onChange={(val) => setFormData(p => ({ ...p, gender: val }))} />
                                    </div>
                                    <div className="ss-form-group">
                                        <SearchableSelect label="Marital Status" options={[{ value: 'Single', label: 'Single' }, { value: 'Married', label: 'Married' }, { value: 'Widowed', label: 'Widowed' }, { value: 'Divorced', label: 'Divorced' }, { value: 'Separated', label: 'Separated' }]} value={formData.maritalStatus} onChange={(val) => setFormData(p => ({ ...p, maritalStatus: val }))} />
                                    </div>
                                    <div className="ss-form-group">
                                        <SearchableSelect label="Blood Group" options={[{ value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' }, { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' }, { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' }, { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' }]} value={formData.bloodGroup} onChange={(val) => setFormData(p => ({ ...p, bloodGroup: val }))} />
                                    </div>
                                    <div className="ss-form-group">
                                        <SearchableSelect label="Nationality" searchable={true} options={countries.filter(c => c.name).map(c => ({ value: c.name, label: c.name }))} value={formData.nationality} onChange={(val) => setFormData(p => ({ ...p, nationality: val }))} />
                                    </div>
                                </>
                            )}

                             {activeTab === 'Experience' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', gridColumn: 'span 2' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Past Experience</h3>
                                        <button onClick={() => setIsExpModalOpen(true)} style={{ background: '#f43f5e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textTransform: 'uppercase' }}><Plus size={16} /> ADD PAST EXPERIENCE</button>
                                    </div>
                                    <div className="hrm-table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflowX: 'auto', width: '100%' }}>
                                        <table className="hrm-table" style={{ border: 'none', width: '100%', minWidth: '750px', tableLayout: 'auto' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '30px', padding: '10px 5px' }}>#</th>
                                                    <th style={{ padding: '10px 5px' }}>Company Name</th>
                                                    <th style={{ padding: '10px 5px' }}>Designation</th>
                                                    <th style={{ padding: '10px 5px' }}>Work From</th>
                                                    <th style={{ padding: '10px 5px' }}>Work To</th>
                                                    <th style={{ padding: '10px 5px' }}>Experience</th>
                                                    <th style={{ padding: '10px 5px' }}>Location</th>
                                                    <th style={{ textAlign: 'center', width: '80px', padding: '10px 5px' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.pastExperience?.length > 0 ? formData.pastExperience.map((exp, idx) => (
                                                    <tr key={idx}>
                                                        <td style={{ padding: '10px 5px' }}>{idx + 1}</td>
                                                        <td style={{ fontWeight: '700', color: '#1E293B', padding: '10px 5px' }}>{exp.companyName}</td>
                                                        <td style={{ padding: '10px 5px' }}>{exp.designation}</td>
                                                        <td style={{ padding: '10px 5px', fontSize: '13px' }}>{new Date(exp.workFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                        <td style={{ padding: '10px 5px', fontSize: '13px' }}>{exp.isCurrent ? 'Current' : new Date(exp.workTo).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                        <td style={{ padding: '10px 5px', fontSize: '13px' }}>{calculateDuration(exp.workFrom, exp.workTo, exp.isCurrent)}</td>
                                                        <td style={{ padding: '10px 5px' }}>{exp.location}</td>
                                                        <td style={{ textAlign: 'center', padding: '10px 5px' }}>
                                                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                                                <button onClick={() => handleEditExperience(idx)} style={{ border: 'none', background: 'transparent', color: '#3B648B', cursor: 'pointer', padding: '5px' }} title="Edit">
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button onClick={() => handleDeleteExperience(idx)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '5px' }} title="Delete">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                            No past experience records found.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Documents' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', gridColumn: 'span 2' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Employee Documents</h3>
                                        <button onClick={() => setIsDocModalOpen(true)} style={{ background: '#f43f5e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textTransform: 'uppercase' }}><Plus size={16} /> ADD DOCUMENT</button>
                                    </div>
                                    <div className="hrm-table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflowX: 'auto', width: '100%' }}>
                                        <table className="hrm-table" style={{ border: 'none', width: '100%', minWidth: '750px', tableLayout: 'auto' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '30px', padding: '10px 5px' }}>#</th>
                                                    <th style={{ padding: '10px 5px' }}>Document Type</th>
                                                    <th style={{ padding: '10px 5px' }}>Document No.</th>
                                                    <th style={{ padding: '10px 5px' }}>Uploaded Date</th>
                                                    <th style={{ padding: '10px 5px' }}>Attachment</th>
                                                    <th style={{ textAlign: 'center', width: '60px', padding: '10px 5px' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.documents?.length > 0 ? formData.documents.map((doc, idx) => (
                                                    <tr key={idx}>
                                                        <td style={{ padding: '10px 5px' }}>{idx + 1}</td>
                                                        <td style={{ fontWeight: '700', color: '#1E293B', padding: '10px 5px' }}>{doc.documentType?.name || 'Unknown'}</td>
                                                        <td style={{ padding: '10px 5px' }}>{doc.documentNumber || '-'}</td>
                                                        <td style={{ padding: '10px 5px', fontSize: '13px' }}>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '-'}</td>
                                                        <td style={{ padding: '10px 5px' }}>{doc.fileUrl ? (
                                                            <button 
                                                                type="button" 
                                                                onClick={(e) => { e.preventDefault(); setViewingDoc({ url: `${API_URL}/uploads/${doc.fileUrl}`, type: doc.fileUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image' }) }} 
                                                                style={{ background: 'none', border: 'none', color: '#3B648B', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', padding: 0 }}
                                                            >
                                                                <Eye size={16} /> View
                                                            </button>
                                                        ) : '-'}</td>
                                                        <td style={{ textAlign: 'center', padding: '10px 5px' }}>
                                                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                                                <button onClick={() => handleDeleteDocument(doc._id)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '5px' }} title="Delete">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                            No documents uploaded yet.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Education, Pending, Notes, Emergency tabs removed by user request */}
                        </div>

                        {/* Save Changes Button only in Edit Mode */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '40px', borderTop: '1px solid #f1f5f9', paddingTop: '25px' }}>
                            <button 
                                onClick={handleUpdate}
                                disabled={saving}
                                style={{ 
                                    background: '#3B648B', color: 'white', border: 'none', padding: '12px 36px', 
                                    borderRadius: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', 
                                    gap: '10px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 100, 139, 0.25)',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {saving ? 'Saving...' : <><Check size={20} /> SAVE CHANGES</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Experience Modal */}
            {isExpModalOpen && (
                <div className="hrm-modal-overlay">
                    <div className="hrm-modal-content" style={{ maxWidth: '500px' }}>
                        <div className="hrm-modal-header">
                            <h2 style={{ fontSize: '18px', fontWeight: '800' }}>{editingExpIndex !== null ? 'Edit Past Experience' : 'Add Past Experience'}</h2>
                            <button className="icon-btn" onClick={() => {
                                setIsExpModalOpen(false);
                                setEditingExpIndex(null);
                                setExpFormData({ companyName: '', designation: '', workFrom: '', workTo: '', isCurrent: false, location: '', description: '' });
                            }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddExperience}>
                            <div className="hrm-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div className="ss-form-group">
                                    <label className="ss-label" style={{ fontSize: '12px' }}>Company Name *</label>
                                    <input type="text" className="ss-input" required value={expFormData.companyName} onChange={e => setExpFormData(p => ({ ...p, companyName: e.target.value }))} placeholder="e.g. IFLORA INFO PVT LTD" />
                                </div>
                                <div className="ss-form-group">
                                    <label className="ss-label" style={{ fontSize: '12px' }}>Designation *</label>
                                    <input type="text" className="ss-input" required value={expFormData.designation} onChange={e => setExpFormData(p => ({ ...p, designation: e.target.value }))} placeholder="e.g. Web Developer" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="ss-form-group">
                                        <label className="ss-label" style={{ fontSize: '12px' }}>Work From *</label>
                                        <input type="date" className="ss-input" required value={expFormData.workFrom} onChange={e => setExpFormData(p => ({ ...p, workFrom: e.target.value }))} />
                                    </div>
                                    <div className="ss-form-group">
                                        <label className="ss-label" style={{ fontSize: '12px' }}>Work To</label>
                                        <input type="date" className="ss-input" disabled={expFormData.isCurrent} value={expFormData.workTo} onChange={e => setExpFormData(p => ({ ...p, workTo: e.target.value }))} />
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginTop: '5px', cursor: 'pointer', fontWeight: '600', color: '#64748b' }}>
                                            <input type="checkbox" checked={expFormData.isCurrent} onChange={e => setExpFormData(p => ({ ...p, isCurrent: e.target.checked }))} /> Currently working here
                                        </label>
                                    </div>
                                </div>
                                <div className="ss-form-group">
                                    <label className="ss-label" style={{ fontSize: '12px' }}>Company Location</label>
                                    <input type="text" className="ss-input" value={expFormData.location} onChange={e => setExpFormData(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Ahmedabad" />
                                </div>
                            </div>
                            <div className="hrm-modal-footer">
                                <button type="button" className="btn-hrm btn-hrm-secondary" onClick={() => {
                                    setIsExpModalOpen(false);
                                    setEditingExpIndex(null);
                                    setExpFormData({ companyName: '', designation: '', workFrom: '', workTo: '', isCurrent: false, location: '', description: '' });
                                }}>CANCEL</button>
                                <button type="submit" className="btn-hrm btn-hrm-primary">{editingExpIndex !== null ? 'UPDATE EXPERIENCE' : 'SAVE EXPERIENCE'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Document Modal */}
            {isDocModalOpen && (
                <div className="hrm-modal-overlay">
                    <div className="hrm-modal-content" style={{ maxWidth: '500px' }}>
                        <div className="hrm-modal-header">
                            <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Add Employee Document</h2>
                            <button className="icon-btn" onClick={() => {
                                setIsDocModalOpen(false);
                                setDocFormData({ documentType: '', documentNumber: '', issueDate: '', expiryDate: '', file: null });
                            }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUploadDocument}>
                            <div className="hrm-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div className="ss-form-group" style={{ position: 'relative', zIndex: 100 }}>
                                    <SearchableSelect 
                                        label="Document Type"
                                        required={true}
                                        searchable={true}
                                        options={documentTypes.map(doc => ({ value: doc._id, label: doc.name }))}
                                        value={docFormData.documentType}
                                        onChange={(val) => setDocFormData(p => ({ ...p, documentType: val, documentNumber: '', issueDate: '', expiryDate: '', file: null }))}
                                        placeholder="Select Document Type"
                                    />
                                </div>
                                
                                {(() => {
                                    const selectedDocType = documentTypes.find(d => d._id === docFormData.documentType);
                                    if (!selectedDocType) return null;

                                    return (
                                        <>
                                            <div className="ss-form-group">
                                                <label className="ss-label" style={{ fontSize: '12px' }}>Document Number *</label>
                                                <input type="text" className="ss-input" required value={docFormData.documentNumber} onChange={e => setDocFormData(p => ({ ...p, documentNumber: e.target.value }))} placeholder={`Enter ${selectedDocType.name} number`} />
                                            </div>

                                            <div className="ss-form-group">
                                                <label className="ss-label" style={{ fontSize: '12px' }}>Upload Document *</label>
                                                <input 
                                                    type="file" 
                                                    className="ss-input" 
                                                    required 
                                                    onChange={e => setDocFormData(p => ({ ...p, file: e.target.files[0] }))} 
                                                    accept={selectedDocType.allowDocumentType === 'PDF Only' ? '.pdf' : selectedDocType.allowDocumentType === 'Image Only' ? 'image/*' : 'image/*,.pdf'} 
                                                />
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="hrm-modal-footer">
                                <button type="button" onClick={() => setIsDocModalOpen(false)} style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ background: '#3B648B', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Upload Document</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Document Quick View Modal */}
            {viewingDoc && (
                <div className="hrm-modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="hrm-modal-content" style={{ width: '90%', maxWidth: '900px', height: '85vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div className="hrm-modal-header" style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Document Quick View</h2>
                            <button onClick={() => setViewingDoc(null)} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="hrm-modal-body" style={{ flex: 1, padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8fafc', overflow: 'hidden' }}>
                            <div style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
                                {viewingDoc.type === 'pdf' ? (
                                    <iframe src={viewingDoc.url} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }} title="Document Viewer" />
                                ) : (
                                    <img src={viewingDoc.url} alt="Document View" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: '8px' }} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style dangerouslySetInnerHTML={{ __html: `
                .ss-form-group { display: flex; flex-direction: column; gap: 8px; }
                .ss-label { font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; }
                .ss-input { height: 45px; padding: 0 16px; border: 1.5px solid #E2E8F0; border-radius: 10px; font-size: 15px; color: #1e293b; background: #fff; transition: all 0.2s; outline: none; }
                .ss-input:focus { border-color: #3B648B; box-shadow: 0 0 0 4px rgba(59, 100, 139, 0.1); }
                .ss-input.disabled-input:hover { cursor: not-allowed; }
                .ss-view-value { padding: 12px 0; font-size: 16px; font-weight: 700; color: #1e293b; border-bottom: 1px dashed #e2e8f0; min-height: 24px; }
                
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
                .phone-input-group input { 
                    flex: 1; 
                    border: none; 
                    padding: 12px 18px; 
                    outline: none; 
                    font-size: 15.5px; 
                    font-weight: 500;
                    color: #1e293b; 
                    background: transparent;
                }
            `}} />
        </div>
    );
};

export default EmployeeProfile;
