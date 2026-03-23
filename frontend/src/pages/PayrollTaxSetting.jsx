import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect, useRef } from 'react';
import { 
    FileText, 
    Calendar, 
    CircleDollarSign, 
    User, 
    MapPin, 
    Signature, 
    Save, 
    Upload, 
    X,
    Info,
    CheckCircle2,
    Eraser,
    Settings2,
    Building2,
    Plus,
    Eye
} from 'lucide-react';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const PayrollTaxSetting = () => {
    const [formData, setFormData] = useState({
        payslipFormat: 'Format 1',
        publishedSalarySlipDurationLimit: '5 Days',
        displayRoundOffAmount: 'No',
        weekStartDay: 'Monday',
        form16ResponsibleUser: '',
        form16ResponsibleUserFatherName: '',
        form16ResponsibleUserDesignation: '',
        citTdsAddress: '',
        form16Signature: null,
        salaryStampSignature: null,
        fnfDeclaration: ''
    });

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previews, setPreviews] = useState({
        form16: null,
        salary: null
    });

    const form16Ref = useRef(null);
    const salaryRef = useRef(null);
    const editorRef = useRef(null);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [settingsRes, usersRes] = await Promise.all([
                    authenticatedFetch(`${API_URL}/api/payroll-settings`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    authenticatedFetch(`${API_URL}/api/users`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                if (settingsRes.ok) {
                    const settingsData = await settingsRes.json();
                    if (settingsData.setting) {
                        setFormData(prev => ({
                            ...prev,
                            ...settingsData.setting,
                            form16ResponsibleUser: settingsData.setting.form16ResponsibleUser || ''
                        }));
                        setPreviews({
                            form16: settingsData.setting.form16Signature ? `${API_URL}${settingsData.setting.form16Signature}` : null,
                            salary: settingsData.setting.salaryStampSignature ? `${API_URL}${settingsData.setting.salaryStampSignature}` : null
                        });

                        // Initialize rich text editor with loaded content
                        if (editorRef.current) {
                            editorRef.current.innerHTML = settingsData.setting.fnfDeclaration || '';
                        }
                    }
                }

                if (usersRes.ok) {
                    const usersData = await usersRes.json();
                    setUsers(usersData.users || []);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                Swal.fire('Error', 'Failed to load settings', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRichTextChange = (html) => {
        setFormData(prev => ({ ...prev, fnfDeclaration: html }));
    };

    const handleFormat = (command) => {
        document.execCommand(command, false, null);
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, [type === 'form16' ? 'form16Signature' : 'salaryStampSignature']: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviews(prev => ({ ...prev, [type]: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const removeSavedSignature = async (type) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `This will permanently remove the ${type === 'form16' ? 'Form 16' : 'Salary'} signature.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#64748B',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const response = await authenticatedFetch(`${API_URL}/api/payroll-settings/signature/${type}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    setPreviews(prev => ({ ...prev, [type]: null }));
                    setFormData(prev => ({ ...prev, [type === 'form16' ? 'form16Signature' : 'salaryStampSignature']: null }));
                    Swal.fire('Deleted!', 'Signature has been removed.', 'success');
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to remove signature', 'error');
            }
        }
    };

    const handlePreview = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/payroll-settings/preview-payslip?format=${formData.payslipFormat}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
            } else {
                Swal.fire('Error', 'Failed to generate preview', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'An error occurred during preview', 'error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const token = localStorage.getItem('token');
            const data = new FormData();

            Object.keys(formData).forEach(key => {
                if (key !== 'form16Signature' && key !== 'salaryStampSignature') {
                    data.append(key, formData[key]);
                }
            });

            if (formData.form16Signature instanceof File) {
                data.append('form16Signature', formData.form16Signature);
            }
            if (formData.salaryStampSignature instanceof File) {
                data.append('salaryStampSignature', formData.salaryStampSignature);
            }

            const response = await authenticatedFetch(`${API_URL}/api/payroll-settings`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });

            if (response.ok) {
                Swal.fire({
                    title: 'Saved!',
                    text: 'Payroll settings have been updated.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                
                const refreshData = await response.json();
                if (refreshData.setting) {
                    setFormData(prev => ({
                        ...prev,
                        ...refreshData.setting
                    }));
                    setPreviews({
                        form16: refreshData.setting.form16Signature ? `${API_URL}${refreshData.setting.form16Signature}` : null,
                        salary: refreshData.setting.salaryStampSignature ? `${API_URL}${refreshData.setting.salaryStampSignature}` : null
                    });
                }
            } else {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to save settings');
            }
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="loading-container">Configuring Payroll Vault...</div>;
    }

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <h1 className="hrm-title">Payroll & Tax Setting</h1>
            </div>

            <form onSubmit={handleSubmit}>
                
                {/* 1. General & Processing Settings */}
                <section className="hrm-card">
                    <div className="hrm-card-header">
                        <h2><Settings2 size={18} /> General Preferences</h2>
                    </div>
                    <div className="hrm-card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginBottom: '30px' }}>
                            <div className="hrm-form-group">
                                <label className="hrm-label">Payslip Format <span className="req">*</span></label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1 }}>
                                        <SearchableSelect 
                                            options={[
                                                { value: 'Format 1', label: 'Format 1 (Standard)' },
                                                { value: 'Format 2', label: 'Format 2 (Modern Boxed)' },
                                                { value: 'Format 3', label: 'Format 3 (Compact)' }
                                            ]}
                                            value={formData.payslipFormat}
                                            onChange={(val) => setFormData(prev => ({ ...prev, payslipFormat: val }))}
                                            placeholder="Select Format"
                                        />
                                    </div>
                                    <button type="button" onClick={handlePreview} className="btn-hrm btn-hrm-secondary" style={{ height: '48px', padding: '0 15px', whiteSpace: 'nowrap' }}>
                                        <Eye size={16} /> PREVIEW
                                    </button>
                                </div>
                            </div>
                            <div className="hrm-form-group">
                                <SearchableSelect 
                                    label="Published Salary Slip Duration Limit"
                                    required={true}
                                    options={[
                                        { value: '1 Day', label: '1 Day' },
                                        { value: '3 Days', label: '3 Days' },
                                        { value: '5 Days', label: '5 Days' },
                                        { value: '7 Days', label: '7 Days' },
                                        { value: '15 Days', label: '15 Days' },
                                        { value: '30 Days', label: '30 Days' }
                                    ]}
                                    value={formData.publishedSalarySlipDurationLimit}
                                    onChange={(val) => setFormData(prev => ({ ...prev, publishedSalarySlipDurationLimit: val }))}
                                />
                            </div>
                            <div className="hrm-form-group">
                                <SearchableSelect 
                                    label="Display the round-off amount on the salary slip."
                                    required={true}
                                    options={[
                                        { value: 'No', label: 'No' },
                                        { value: 'Yes', label: 'Yes' }
                                    ]}
                                    value={formData.displayRoundOffAmount}
                                    onChange={(val) => setFormData(prev => ({ ...prev, displayRoundOffAmount: val }))}
                                />
                            </div>
                        </div>

                        <div className="hrm-form-group" style={{ maxWidth: '400px', marginBottom: '30px' }}>
                            <SearchableSelect 
                                label="Week Start Day For Payroll Processing"
                                required={true}
                                options={[
                                    { value: 'Monday', label: 'Monday' },
                                    { value: 'Sunday', label: 'Sunday' },
                                    { value: 'Saturday', label: 'Saturday' }
                                ]}
                                value={formData.weekStartDay}
                                onChange={(val) => setFormData(prev => ({ ...prev, weekStartDay: val }))}
                            />
                            <p style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444', fontStyle: 'italic', lineHeight: '1.4' }}>
                                If this field is frequently changed or edited, it may lead to calculation issues in the salary if the weekly salary has already been processed.
                            </p>
                        </div>

                    </div>
                </section>

                {/* 2. Form16 & Statutory Reporting */}
                <section className="hrm-card">
                    <div className="hrm-card-header">
                        <h2><FileText size={18} /> Form16 Responsible User details</h2>
                    </div>
                    <div className="hrm-card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginBottom: '30px' }}>
                            <div className="hrm-form-group">
                                <SearchableSelect 
                                    label="Form16 Responsible User"
                                    options={users.map(u => ({ value: u._id, label: `${u.name} (${u.role})` }))}
                                    value={formData.form16ResponsibleUser}
                                    onChange={(val) => setFormData(prev => ({ ...prev, form16ResponsibleUser: val }))}
                                    placeholder="--Select User--"
                                    searchable={true}
                                />
                            </div>
                            <div className="hrm-form-group">
                                <label className="hrm-label">Form16 Responsible User Father Name</label>
                                <input type="text" name="form16ResponsibleUserFatherName" value={formData.form16ResponsibleUserFatherName} onChange={handleInputChange} className="hrm-input" placeholder="Enter Full Name" />
                            </div>
                            <div className="hrm-form-group">
                                <label className="hrm-label">Form16 Responsible User Designation</label>
                                <input type="text" name="form16ResponsibleUserDesignation" value={formData.form16ResponsibleUserDesignation} onChange={handleInputChange} className="hrm-input" placeholder="Enter Designation" />
                            </div>
                        </div>

                        <div className="hrm-form-group">
                            <label className="hrm-label">CIT (TDS) Address</label>
                            <textarea 
                                name="citTdsAddress" 
                                value={formData.citTdsAddress} 
                                onChange={handleInputChange} 
                                className="hrm-textarea" 
                                placeholder="Enter CIT (TDS) Address"
                            ></textarea>
                        </div>
                    </div>
                </section>

                {/* 3. Signatures & Stamps */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '30px', marginBottom: '30px' }}>
                    <section className="hrm-card" style={{ marginBottom: 0 }}>
                        <div className="hrm-card-header">
                            <h2><Signature size={18} /> Form16 Signature</h2>
                        </div>
                        <div className="hrm-card-body">
                            <div 
                                style={{ 
                                    border: '2px dashed #cbd5e1', 
                                    borderRadius: '12px', 
                                    height: '150px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    background: '#f8fafc', 
                                    cursor: 'pointer' 
                                }}
                                onClick={() => form16Ref.current.click()}
                            >
                                {previews.form16 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <img src={previews.form16} alt="Form16 Signature" style={{ maxWidth: '250px', maxHeight: '80px', objectFit: 'contain' }} />
                                        <button type="button" onClick={(e) => { e.stopPropagation(); removeSavedSignature('form16'); }} className="btn-hrm-danger" style={{ marginTop: '10px', padding: '4px 12px', fontSize: '11px' }}>
                                            REMOVE FORM16 SIGNATURE
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Plus size={32} color="#cbd5e1" />
                                        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '10px' }}>(300 PX * 100 PX)</p>
                                    </>
                                )}
                                <input type="file" ref={form16Ref} onChange={(e) => handleFileChange(e, 'form16')} hidden accept="image/*" />
                            </div>
                        </div>
                    </section>

                    <section className="hrm-card" style={{ marginBottom: 0 }}>
                        <div className="hrm-card-header">
                            <h2><Signature size={18} /> Salary Stamp/Signature</h2>
                        </div>
                        <div className="hrm-card-body">
                            <div 
                                style={{ 
                                    border: '2px dashed #cbd5e1', 
                                    borderRadius: '12px', 
                                    height: '150px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    background: '#f8fafc', 
                                    cursor: 'pointer' 
                                }}
                                onClick={() => salaryRef.current.click()}
                            >
                                {previews.salary ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <img src={previews.salary} alt="Salary Stamp" style={{ maxWidth: '250px', maxHeight: '80px', objectFit: 'contain' }} />
                                        <button type="button" onClick={(e) => { e.stopPropagation(); removeSavedSignature('salary'); }} className="btn-hrm-danger" style={{ marginTop: '10px', padding: '4px 12px', fontSize: '11px' }}>
                                            REMOVE SALARY STAMP
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Plus size={32} color="#cbd5e1" />
                                        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '10px' }}>(300 PX * 100 PX)</p>
                                    </>
                                )}
                                <input type="file" ref={salaryRef} onChange={(e) => handleFileChange(e, 'salary')} hidden accept="image/*" />
                            </div>
                        </div>
                    </section>
                </div>

                {/* 4. FnF Declaration */}
                <section className="hrm-card" style={{ marginBottom: '40px' }}>
                    <div className="hrm-card-header">
                        <h2><FileText size={18} /> Full and Final Settlement (FnF)</h2>
                    </div>
                    <div className="hrm-card-body">
                        <div className="hrm-form-group">
                            <label className="hrm-label">Declaration By the Receiver</label>
                            <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <div style={{ background: '#f8fafc', padding: '12px 20px', display: 'flex', gap: '20px', borderBottom: '1px solid #cbd5e1', alignItems: 'center' }}>
                                    <button 
                                        type="button" 
                                        className="format-btn" 
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '900', fontSize: '16px', color: '#1e293b', padding: '5px' }} 
                                        onClick={() => handleFormat('bold')}
                                        onMouseDown={(e) => e.preventDefault()}
                                        title="Bold"
                                    >B</button>
                                    <button 
                                        type="button" 
                                        className="format-btn" 
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontStyle: 'italic', fontWeight: '900', fontSize: '16px', color: '#1e293b', padding: '5px' }} 
                                        onClick={() => handleFormat('italic')}
                                        onMouseDown={(e) => e.preventDefault()}
                                        title="Italic"
                                    >I</button>
                                    <button 
                                        type="button" 
                                        className="format-btn" 
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: '900', fontSize: '16px', color: '#1e293b', padding: '5px' }} 
                                        onClick={() => handleFormat('underline')}
                                        onMouseDown={(e) => e.preventDefault()}
                                        title="Underline"
                                    >U</button>
                                    <div style={{ width: '1px', height: '20px', background: '#cbd5e1', margin: '0 5px' }}></div>
                                    <button 
                                        type="button" 
                                        onClick={() => handleFormat('insertUnorderedList')} 
                                        onMouseDown={(e) => e.preventDefault()}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e293b' }}
                                    >• List</button>
                                </div>
                                <div 
                                    ref={editorRef}
                                    contentEditable
                                    className="rich-text-editor"
                                    onInput={(e) => handleRichTextChange(e.currentTarget.innerHTML)}
                                    onBlur={(e) => handleRichTextChange(e.currentTarget.innerHTML)}
                                    style={{ 
                                        padding: '25px', 
                                        minHeight: '250px', 
                                        outline: 'none', 
                                        background: 'white',
                                        fontSize: '15px',
                                        lineHeight: '1.6',
                                        color: '#334155'
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </section>

                <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '50px' }}>
                    <button type="submit" className="btn-hrm btn-hrm-primary" style={{ padding: '12px 60px' }} disabled={saving}>
                        {saving ? 'SAVING...' : <><Save size={18} /> SAVE</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PayrollTaxSetting;
