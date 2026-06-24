import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calculator, Building2, Briefcase, User, Calendar, DollarSign } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';
import '../pages/AdminDashboard.css'; // Premium styles

const AddEmployeeCTC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const employeeIdParam = searchParams.get('employeeId');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Dropdown options
    const [salaryGroups, setSalaryGroups] = useState([]);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);

    // Breakdown components options and states
    const [earnings, setEarnings] = useState([]);
    const [deductions, setDeductions] = useState([]);
    const [componentTypes, setComponentTypes] = useState({ earnings: [], deductions: [] });

    // Form State
    const [formData, setFormData] = useState({
        salaryGroup: '',
        branch: '',
        department: '',
        employeeId: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        grossSalary: ''
    });

    // Revision States
    const [revisionType, setRevisionType] = useState('increment');
    const [revisionValueType, setRevisionValueType] = useState('percentage');
    const [revisionValue, setRevisionValue] = useState('');

    const applyRevision = () => {
        const val = Number(revisionValue);
        if (!val || val <= 0) {
            Swal.fire('Warning', 'Please enter a valid positive revision value.', 'warning');
            return;
        }

        let factor = 1;
        if (revisionValueType === 'percentage') {
            factor = 1 + (revisionType === 'increment' ? val : -val) / 100;
        } else {
            const oldGross = earnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
            if (oldGross <= 0) {
                Swal.fire('Error', 'Cannot apply fixed amount revision because current gross salary is zero.', 'error');
                return;
            }
            const newGross = oldGross + (revisionType === 'increment' ? val : -val);
            if (newGross < 0) {
                Swal.fire('Error', 'Salary cannot be decremented below zero.', 'error');
                return;
            }
            factor = newGross / oldGross;
        }

        // Apply factor to earnings components
        setEarnings(prev => prev.map(item => ({
            ...item,
            amount: String(Math.round(Number(item.amount) * factor))
        })));

        // Apply factor to deductions components
        setDeductions(prev => prev.map(item => ({
            ...item,
            amount: String(Math.round(Number(item.amount) * factor))
        })));

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `Applied ${revisionType} of ${revisionValueType === 'percentage' ? val + '%' : '₹' + val}`,
            showConfirmButton: false,
            timer: 2500
        });
        setRevisionValue('');
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [sgRes, branchRes, deptRes, empRes, compRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/salary-groups/all`),
                authenticatedFetch(`${API_URL}/api/branches`),
                authenticatedFetch(`${API_URL}/api/departments`),
                authenticatedFetch(`${API_URL}/api/employee-ctc/all`),
                authenticatedFetch(`${API_URL}/api/employee-ctc/components`)
            ]);

            const sgData = await sgRes.json();
            const branchData = await branchRes.json();
            const deptData = await deptRes.json();
            const empData = await empRes.json();
            const compData = await compRes.json();

            const fetchedSalaryGroups = sgData.groups || [];
            const fetchedBranches = branchData.branches || [];
            const fetchedDepartments = deptData.departments || [];
            const fetchedEmployees = empData.data || [];

            if (sgData.success) setSalaryGroups(fetchedSalaryGroups);
            if (branchData.success) setBranches(fetchedBranches);
            if (deptData.success) setDepartments(fetchedDepartments);
            if (empData.success) setAllEmployees(fetchedEmployees);
            if (compData.success) {
                setComponentTypes({ earnings: compData.earnings || [], deductions: compData.deductions || [] });
            }

            if (employeeIdParam && empData.success) {
                const emp = fetchedEmployees.find(e => e._id === employeeIdParam);
                if (emp) {
                    let salaryGroupId = '';
                    if (emp.workSetup?.salaryGroup) {
                        salaryGroupId = emp.workSetup.salaryGroup._id || emp.workSetup.salaryGroup;
                    }
                    const effectiveDate = new Date().toISOString().split('T')[0];
                    const grossSalary = emp.ctcDetails?.monthlyGross !== undefined ? emp.ctcDetails.monthlyGross : '';

                    setFormData({
                        salaryGroup: salaryGroupId,
                        branch: emp.branch || '',
                        department: emp.department || '',
                        employeeId: emp._id,
                        effectiveDate,
                        grossSalary: grossSalary.toString()
                    });

                    setEarnings(emp.ctcDetails?.earnings || []);
                    setDeductions(emp.ctcDetails?.deductions || []);
                }
            }
        } catch (error) {
            console.error("Error fetching initial data for CTC Page:", error);
            Swal.fire('Error', 'Failed to fetch dropdown options', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Filtered departments based on selected branch
    const filteredDepartments = useMemo(() => {
        if (!formData.branch) return departments;
        const selectedBranchObj = branches.find(b => b.branchName === formData.branch);
        if (!selectedBranchObj) return departments;
        return departments.filter(d => d.branchId && selectedBranchObj._id && d.branchId.toString() === selectedBranchObj._id.toString());
    }, [formData.branch, branches, departments]);

    // Filtered employees who DO NOT have a CTC assigned yet,
    // OR matches the employee we are managing.
    const unassignedEmployees = useMemo(() => {
        return allEmployees.filter(emp => !emp.ctcDetails || emp._id === employeeIdParam);
    }, [allEmployees, employeeIdParam]);

    // Filter employees by branch and department
    const filteredEmployees = useMemo(() => {
        let list = unassignedEmployees;
        if (formData.branch) {
            list = list.filter(emp => emp.branch === formData.branch);
        }
        if (formData.department) {
            list = list.filter(emp => emp.department === formData.department);
        }
        return list;
    }, [unassignedEmployees, formData.branch, formData.department]);

    // When branch or department changes, reset employee selection if they don't match
    const handleBranchChange = (val) => {
        setFormData(prev => ({ ...prev, branch: val, department: '', employeeId: '' }));
    };

    const handleDepartmentChange = (val) => {
        setFormData(prev => ({ ...prev, department: val, employeeId: '' }));
    };

    // Helper function to manage component amount changes
    const handleComponentAmountChange = (type, componentId, componentName, value) => {
        if (type === 'earning') {
            setEarnings(prev => {
                const exists = prev.some(item => item.componentId === componentId);
                if (exists) {
                    if (value === '') {
                        return prev.filter(item => item.componentId !== componentId);
                    }
                    return prev.map(item => item.componentId === componentId ? { ...item, amount: value } : item);
                } else {
                    if (value === '') return prev;
                    return [...prev, { componentId, componentName, amount: value }];
                }
            });
        } else {
            setDeductions(prev => {
                const exists = prev.some(item => item.componentId === componentId);
                if (exists) {
                    if (value === '') {
                        return prev.filter(item => item.componentId !== componentId);
                    }
                    return prev.map(item => item.componentId === componentId ? { ...item, amount: value } : item);
                } else {
                    if (value === '') return prev;
                    return [...prev, { componentId, componentName, amount: value }];
                }
            });
        }
    };

    const calculatedGross = useMemo(() => {
        if (earnings.length === 0) return null;
        return earnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }, [earnings]);

    const calculatedDeductions = useMemo(() => {
        return deductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }, [deductions]);

    const handleAddCTC = async (e) => {
        e.preventDefault();
        
        const grossSalaryValue = calculatedGross !== null ? calculatedGross : Number(formData.grossSalary);

        if (!formData.salaryGroup || !formData.branch || !formData.department || !formData.employeeId || !formData.effectiveDate || !grossSalaryValue) {
            Swal.fire('Warning', 'Please fill in all required fields marked with *', 'warning');
            return;
        }

        // Validate complete components inputs
        const invalidEarning = earnings.some(item => !item.componentId || !item.amount);
        const invalidDeduction = deductions.some(item => !item.componentId || !item.amount);
        if (invalidEarning || invalidDeduction) {
            Swal.fire('Warning', 'Please select a category and fill in the amount for all components.', 'warning');
            return;
        }

        try {
            setSubmitting(true);
            
            const payload = {
                employeeId: formData.employeeId,
                salaryGroup: formData.salaryGroup,
                monthlyGross: Number(grossSalaryValue),
                netSalary: Number(grossSalaryValue - calculatedDeductions),
                annualCTC: Number(grossSalaryValue * 12),
                earnings: earnings.map(e => ({
                    componentId: e.componentId,
                    componentName: e.componentName,
                    amount: Number(e.amount)
                })),
                deductions: deductions.map(d => ({
                    componentId: d.componentId,
                    componentName: d.componentName,
                    amount: Number(d.amount)
                })),
                effectiveDate: formData.effectiveDate,
                status: 'Active'
            };

            const response = await authenticatedFetch(`${API_URL}/api/employee-ctc/upsert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: employeeIdParam ? 'CTC Updated Successfully' : 'CTC Assigned Successfully',
                    text: employeeIdParam ? 'The employee CTC details have been updated.' : 'The employee CTC has been configured.',
                    confirmButtonColor: '#3B648B'
                }).then(() => {
                    navigate('/admin/payroll/employee-ctc');
                });
            } else {
                Swal.fire('Error', data.message || 'Failed to assign CTC', 'error');
            }
        } catch (error) {
            console.error("Error saving employee CTC:", error);
            Swal.fire('Error', 'Connection to server failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="hrm-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading setup components...</p>
            </div>
        );
    }

    return (
        <div className="hrm-container">
            {/* Header */}
            <div className="hrm-header" style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                        onClick={() => navigate('/admin/payroll/employee-ctc')} 
                        className="btn-hrm btn-hrm-secondary"
                        style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="hrm-title">{employeeIdParam ? 'Manage Employee CTC' : 'Add Employee CTC'}</h1>
                    </div>
                </div>
            </div>

            {/* Form Card */}
            <div className="hrm-card" style={{ margin: '0 auto', padding: '32px' }}>
                <form onSubmit={handleAddCTC}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                        {/* Salary Group */}
                        <div className="hrm-form-group">
                            <label className="hrm-label" style={{ fontWeight: '700' }}>Salary Group <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <SearchableSelect 
                                options={salaryGroups.map(g => ({ value: g._id, label: g.groupName }))}
                                value={formData.salaryGroup}
                                onChange={val => setFormData(prev => ({ ...prev, salaryGroup: val }))}
                                placeholder="-- Select --"
                            />
                        </div>

                        {/* Branch */}
                        <div className="hrm-form-group">
                            <label className="hrm-label" style={{ fontWeight: '700' }}>Branch <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <SearchableSelect 
                                options={branches.map(b => ({ value: b.branchName, label: b.branchName }))}
                                value={formData.branch}
                                onChange={handleBranchChange}
                                placeholder="-- Select --"
                                disabled={!!employeeIdParam}
                            />
                        </div>

                        {/* Department */}
                        <div className="hrm-form-group">
                            <label className="hrm-label" style={{ fontWeight: '700' }}>Department <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <SearchableSelect 
                                options={filteredDepartments.map(d => ({ value: d.name, label: d.name }))}
                                value={formData.department}
                                onChange={handleDepartmentChange}
                                placeholder="-- Select --"
                                disabled={!formData.branch || !!employeeIdParam}
                            />
                        </div>

                        {/* Employee Name */}
                        <div className="hrm-form-group">
                            <label className="hrm-label" style={{ fontWeight: '700' }}>Employee Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <SearchableSelect 
                                options={filteredEmployees.map(emp => ({ value: emp._id, label: `${emp.name} (${emp.employeeId || 'No ID'})` }))}
                                value={formData.employeeId}
                                onChange={val => setFormData(prev => ({ ...prev, employeeId: val }))}
                                placeholder="-- Select --"
                                disabled={!!employeeIdParam}
                            />
                            {filteredEmployees.length === 0 && !employeeIdParam && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                    No active employees without CTC in this branch/dept
                                </span>
                            )}
                        </div>

                        {/* Salary Start Date */}
                        <div className="hrm-form-group">
                            <label className="hrm-label" style={{ fontWeight: '700' }}>Salary Start Date <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="date" 
                                    className="hrm-input" 
                                    value={formData.effectiveDate}
                                    onChange={e => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Gross Salary */}
                        <div className="hrm-form-group">
                            <label className="hrm-label" style={{ fontWeight: '700' }}>Gross Salary <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', fontWeight: '700', color: 'var(--text-muted)' }}>₹</span>
                                <input 
                                    type="number" 
                                    className="hrm-input" 
                                    style={{ paddingLeft: '28px' }}
                                    placeholder="Enter gross salary per month"
                                    value={calculatedGross !== null ? calculatedGross : formData.grossSalary}
                                    onChange={e => setFormData(prev => ({ ...prev, grossSalary: e.target.value }))}
                                    disabled={calculatedGross !== null}
                                />
                            </div>
                            {calculatedGross !== null && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                    Gross salary is calculated from earnings components below
                                </span>
                            )}
                        </div>
                    </div>
                {/* Earnings & Deductions Breakdown Section (Visible in Edit mode) */}
                    {employeeIdParam && (
                        <div style={{ marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '32px', marginBottom: '32px' }}>
                            {/* Salary Revision Panel */}
                            <div style={{ background: 'var(--bg-main)', borderRadius: '16px', padding: '24px', border: '1.5px solid var(--border)', marginBottom: '32px' }}>
                                <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)' }}>Salary Revision (Increment / Decrement)</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr auto', gap: '20px', alignItems: 'end' }}>
                                    <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                        <label className="hrm-label" style={{ fontWeight: '700' }}>Revision Type</label>
                                        <select className="hrm-input" style={{ height: '42px' }} value={revisionType} onChange={e => setRevisionType(e.target.value)}>
                                            <option value="increment">Increment (+)</option>
                                            <option value="decrement">Decrement (-)</option>
                                        </select>
                                    </div>
                                    <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                        <label className="hrm-label" style={{ fontWeight: '700' }}>Value Type</label>
                                        <select className="hrm-input" style={{ height: '42px' }} value={revisionValueType} onChange={e => setRevisionValueType(e.target.value)}>
                                            <option value="percentage">Percentage (%)</option>
                                            <option value="fixed">Fixed Amount (₹)</option>
                                        </select>
                                    </div>
                                    <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                        <label className="hrm-label" style={{ fontWeight: '700' }}>Value</label>
                                        <input type="number" className="hrm-input" style={{ height: '42px' }} placeholder="Enter value" value={revisionValue} onChange={e => setRevisionValue(e.target.value)} />
                                    </div>
                                    <button 
                                        type="button" 
                                        className="btn-hrm btn-hrm-primary" 
                                        style={{ height: '42px', padding: '0 24px', fontWeight: '800' }}
                                        onClick={applyRevision}
                                    >
                                        Apply Revision
                                    </button>
                                </div>
                            </div>

                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '24px' }}>Salary Components Breakdown</h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '32px' }}>
                                {/* Earnings Table */}
                                <div>
                                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Earnings</h4>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', paddingBottom: '12px', borderBottom: '2px solid var(--border)' }}>Category</th>
                                                <th style={{ textAlign: 'right', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', paddingBottom: '12px', borderBottom: '2px solid var(--border)', width: '140px' }}>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {componentTypes.earnings.map((comp) => {
                                                const existing = earnings.find(e => e.componentId === comp._id);
                                                const value = existing ? existing.amount : '';
                                                return (
                                                    <tr key={comp._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ padding: '14px 0', fontSize: '13.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                                            {comp.name}
                                                        </td>
                                                        <td style={{ padding: '8px 0', textAlign: 'right' }}>
                                                            <div style={{ position: 'relative', display: 'inline-block', width: '130px' }}>
                                                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>₹</span>
                                                                <input 
                                                                    type="number" 
                                                                    className="hrm-input" 
                                                                    style={{ paddingLeft: '24px', height: '36px', width: '100%', textAlign: 'right', paddingRight: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'default' }}
                                                                    placeholder="0"
                                                                    value={value}
                                                                    readOnly
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {componentTypes.earnings.length === 0 && (
                                                <tr>
                                                    <td colSpan="2" style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                                        No earning categories available.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
 
                                {/* Deductions Table */}
                                <div>
                                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Deductions</h4>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', paddingBottom: '12px', borderBottom: '2px solid var(--border)' }}>Category</th>
                                                <th style={{ textAlign: 'right', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', paddingBottom: '12px', borderBottom: '2px solid var(--border)', width: '140px' }}>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {componentTypes.deductions.map((comp) => {
                                                const existing = deductions.find(d => d.componentId === comp._id);
                                                const value = existing ? existing.amount : '';
                                                return (
                                                    <tr key={comp._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ padding: '14px 0', fontSize: '13.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                                            {comp.name}
                                                        </td>
                                                        <td style={{ padding: '8px 0', textAlign: 'right' }}>
                                                            <div style={{ position: 'relative', display: 'inline-block', width: '130px' }}>
                                                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>₹</span>
                                                                <input 
                                                                    type="number" 
                                                                    className="hrm-input" 
                                                                    style={{ paddingLeft: '24px', height: '36px', width: '100%', textAlign: 'right', paddingRight: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'default' }}
                                                                    placeholder="0"
                                                                    value={value}
                                                                    readOnly
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {componentTypes.deductions.length === 0 && (
                                                <tr>
                                                    <td colSpan="2" style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                                        No deduction categories available.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Summary Calculations */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', background: 'var(--bg-main)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', marginTop: '24px' }}>
                                <div>
                                    <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Monthly Gross Salary</span>
                                    <span style={{ fontSize: '20px', fontWeight: '950', color: 'var(--text-dark)' }}>₹{(calculatedGross !== null ? calculatedGross : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div>
                                    <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Total Monthly Deductions</span>
                                    <span style={{ fontSize: '20px', fontWeight: '950', color: 'var(--text-dark)' }}>₹{calculatedDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div>
                                    <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Net Take-Home Salary</span>
                                    <span style={{ fontSize: '20px', fontWeight: '950', color: 'var(--primary-blue)' }}>₹{(calculatedGross !== null ? (calculatedGross - calculatedDeductions) : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                        <button 
                            type="button" 
                            className="btn-hrm btn-hrm-secondary" 
                            style={{ width: '150px' }}
                            onClick={() => navigate('/admin/payroll/employee-ctc')}
                        >
                            CANCEL
                        </button>
                        <button 
                            type="submit" 
                            className="btn-hrm btn-hrm-primary" 
                            style={{ width: '150px' }}
                            disabled={submitting}
                        >
                            {submitting ? (employeeIdParam ? 'SAVING...' : 'ADDING...') : (employeeIdParam ? 'SAVE' : 'ADD')}
                        </button>
                    </div>
                </form>
            </div>
            
            <style>
                {`
                    body.dark-mode input[type="date"] { color-scheme: dark; }
                `}
            </style>
        </div>
    );
};

export default AddEmployeeCTC;
