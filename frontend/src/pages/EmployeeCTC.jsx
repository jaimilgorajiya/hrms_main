import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Search, Filter, Plus, Edit2, ChevronRight, Briefcase, 
    CreditCard, PieChart, Users, ArrowUpRight, CheckCircle2,
    X, Wallet, DollarSign, Calculator, Calendar, History, Trash2,
    ChevronDown, Check
} from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import '../pages/AdminDashboard.css'; // Reusing established premium styles

// Generic Premium Select Component
const PremiumSelect = ({ options, value, onChange, placeholder, isAssigned, variant = 'default' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const selectedOption = options.find(opt => opt._id === value || opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isActionable = variant === 'table' ? isAssigned : true;

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    height: variant === 'table' ? '38px' : '42px',
                    fontSize: variant === 'table' ? '11px' : '13px',
                    fontWeight: '800',
                    padding: '0 16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: variant === 'table' ? (isAssigned ? '#F1F5F9' : '#FFFBEB') : 'white',
                    border: variant === 'table' ? (isAssigned ? '1.5px solid #E2E8F0' : '1.5px solid #FDE68A') : '1.5px solid #E2E8F0',
                    color: variant === 'table' ? (isAssigned ? '#475569' : '#B45309') : '#1E293B',
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedOption ? (selectedOption.groupName || selectedOption.name || selectedOption.label) : placeholder}
                </span>
                <ChevronDown size={variant === 'table' ? 14 : 16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s', opacity: 0.5 }} />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                    zIndex: 1200,
                    border: '1px solid #E2E8F0',
                    padding: '8px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    animation: 'dropdownFade 0.2s ease-out'
                }}>
                    {variant === 'table' && (
                        <div 
                            onClick={() => { onChange(''); setIsOpen(false); }}
                            style={{
                                padding: '10px 14px',
                                fontSize: '12px',
                                fontWeight: '700',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                color: '#EF4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '4px'
                            }}
                            className="premium-dd-item"
                        >
                            -- Remove Assignment --
                        </div>
                    )}
                    {options.map((opt) => {
                        const optVal = opt._id || opt.value;
                        const label = opt.groupName || opt.name || opt.label;
                        const isSelected = value === optVal;
                        
                        return (
                            <div 
                                key={optVal}
                                onClick={() => { onChange(optVal); setIsOpen(false); }}
                                style={{
                                    padding: '10px 14px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    color: isSelected ? '#3B648B' : '#475569',
                                    background: isSelected ? '#F0F9FF' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '2px'
                                }}
                                className="premium-dd-item"
                            >
                                {label}
                                {isSelected && <Check size={14} color="#3B648B" strokeWidth={3} />}
                            </div>
                        );
                    })}
                </div>
            )}
            <style>
                {`
                    @keyframes dropdownFade {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .premium-dd-item:hover { background: #F8FAFC !important; color: #1E293B !important; }
                `}
            </style>
        </div>
    );
};

const EmployeeCTC = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [componentTypes, setComponentTypes] = useState({ earnings: [], deductions: [] });
    const [salaryGroups, setSalaryGroups] = useState([]);
    
    // Modal Form State
    const [formData, setFormData] = useState({
        annualCTC: 0,
        monthlyGross: 0,
        earnings: [],
        deductions: [],
        netSalary: 0,
        effectiveDate: new Date().toISOString().split('T')[0],
        status: 'Active'
    });

    useEffect(() => {
        fetchData();
        fetchComponents();
        fetchSalaryGroups();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch(`${API_URL}/api/employee-ctc/all`);
            const data = await response.json();
            if (data.success) {
                setEmployees(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching CTC data:", error);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchComponents = async () => {
        try {
            const response = await authenticatedFetch(`${API_URL}/api/employee-ctc/components`);
            const data = await response.json();
            if (data.success) {
                setComponentTypes({ earnings: data.earnings, deductions: data.deductions });
            }
        } catch (error) {
            console.error("Error fetching components:", error);
        }
    };

    const fetchSalaryGroups = async () => {
        try {
            const response = await authenticatedFetch(`${API_URL}/api/salary-groups/all`);
            const data = await response.json();
            if (data.success) {
                setSalaryGroups(data.groups || []);
            }
        } catch (error) {
            console.error("Error fetching salary groups:", error);
            setSalaryGroups([]);
        }
    };

    const handleSalaryGroupChange = async (employeeId, groupId) => {
        try {
            const response = await authenticatedFetch(`${API_URL}/api/users/${employeeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salaryGroup: groupId })
            });
            const data = await response.json();
            if (data.success) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Salary Group updated',
                    showConfirmButton: false,
                    timer: 2000
                });
                fetchData();
            } else {
                Swal.fire('Error', data.message || 'Update failed', 'error');
            }
        } catch (error) {
            console.error("Error updating salary group:", error);
            Swal.fire('Error', 'Connection failed', 'error');
        }
    };

    const handleOpenManage = (employee) => {
        if (!employee.workSetup?.salaryGroup) {
            Swal.fire({
                icon: 'warning',
                title: 'Salary Group Required',
                text: 'Please select a Salary Group for this employee first to manage their CTC.',
                confirmButtonColor: '#3B648B'
            });
            return;
        }
        setSelectedEmployee(employee);
        if (employee.ctcDetails) {
            setFormData({
                ...employee.ctcDetails,
                effectiveDate: employee.ctcDetails.effectiveDate ? employee.ctcDetails.effectiveDate.split('T')[0] : new Date().toISOString().split('T')[0]
            });
        } else {
            setFormData({
                annualCTC: 0,
                monthlyGross: 0,
                earnings: [],
                deductions: [],
                netSalary: 0,
                effectiveDate: new Date().toISOString().split('T')[0],
                status: 'Active'
            });
        }
        setIsModalOpen(true);
    };

    // Auto-calculate logic
    useEffect(() => {
        const totalEarnings = formData.earnings.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const totalDeductions = formData.deductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const monthlyGross = totalEarnings;
        const netSalary = monthlyGross - totalDeductions;
        const annualCTC = monthlyGross * 12;

        setFormData(prev => ({
            ...prev,
            monthlyGross,
            netSalary,
            annualCTC
        }));
    }, [formData.earnings, formData.deductions]);

    const addComponent = (type) => {
        const list = type === 'earning' ? 'earnings' : 'deductions';
        setFormData(prev => ({
            ...prev,
            [list]: [...prev[list], { componentId: '', componentName: '', amount: 0 }]
        }));
    };

    const removeComponent = (type, index) => {
        const list = type === 'earning' ? 'earnings' : 'deductions';
        const updated = [...formData[list]];
        updated.splice(index, 1);
        setFormData(prev => ({ ...prev, [list]: updated }));
    };

    const updateComponent = (type, index, field, value) => {
        const list = type === 'earning' ? 'earnings' : 'deductions';
        const updated = [...formData[list]];
        
        if (field === 'componentId') {
            const listToSearch = type === 'earning' ? componentTypes.earnings : componentTypes.deductions;
            const comp = listToSearch.find(c => c._id === value);
            updated[index].componentId = value;
            updated[index].componentName = comp ? comp.name : '';
        } else {
            updated[index][field] = value;
        }
        
        setFormData(prev => ({ ...prev, [list]: updated }));
    };

    const handleSave = async () => {
        try {
            const response = await authenticatedFetch(`${API_URL}/api/employee-ctc/upsert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: selectedEmployee._id,
                    ...formData
                })
            });
            const data = await response.json();
            if (data.success) {
                Swal.fire('Success', 'CTC Structure updated effectively', 'success');
                setIsModalOpen(false);
                fetchData();
            } else {
                Swal.fire('Error', data.message || 'Failed to update', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Server connection error', 'error');
        }
    };

    const filteredEmployees = useMemo(() => {
        if (!Array.isArray(employees)) return [];
        return employees.filter(emp => 
            emp && emp.name && (
                emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [employees, searchTerm]);

    return (
        <div className="hrm-container" style={{ background: '#F8FAFC', padding: '30px' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1E293B', letterSpacing: '-0.5px', marginBottom: '8px' }}>
                        Employee CTC
                    </h1>
                    <p style={{ color: '#64748B', fontSize: '14px', fontWeight: '600' }}>
                        Manage individual salary structures and compensation breakdowns
                    </p>
                </div>
                
                <div style={{ position: 'relative', width: '350px' }}>
                    <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                        type="text" 
                        placeholder="Search by name or Employee ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="ss-input"
                        style={{ paddingLeft: '48px', height: '48px', borderRadius: '14px', border: '1.5px solid #E2E8F0' }}
                    />
                </div>
            </div>

            {/* Quick Stats Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
                {[
                    { label: 'Total Payroll Budget', value: `₹${(employees || []).reduce((sum, e) => sum + (e.ctcDetails?.annualCTC || 0), 0).toLocaleString()}`, icon: <Wallet color="#3B648B" />, bgColor: '#E0F2FE' },
                    { label: 'Unassigned CTC', value: (employees || []).filter(e => !e.ctcDetails).length, icon: <Users color="#D97706" />, bgColor: '#FEF3C7' },
                    { label: 'Active Structures', value: (employees || []).filter(e => e.ctcDetails?.status === 'Active').length, icon: <CheckCircle2 color="#059669" />, bgColor: '#D1FAE5' }
                ].map((stat, i) => (
                    <div key={i} style={{ background: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: stat.bgColor, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {stat.icon}
                        </div>
                        <div>
                            <p style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
                            <p style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B' }}>{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Employee CTC List */}
            <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #E2E8F0', overflow: 'visible', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                            <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Employee & Designation</th>
                            <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Salary Group Assignment</th>
                            <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Annual CTC</th>
                            <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Monthly Gross</th>
                            <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Net Pay</th>
                            <th style={{ padding: '20px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ padding: '100px', textAlign: 'center', color: '#94A3B8', fontWeight: '600' }}>Loading payroll data...</td></tr>
                        ) : filteredEmployees.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '100px', textAlign: 'center', color: '#94A3B8', fontWeight: '600' }}>No employees found matching criteria</td></tr>
                        ) : filteredEmployees.map((emp) => (
                            <tr key={emp._id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'all 0.2s' }} className="table-row-hover">
                                <td style={{ padding: '20px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            {emp.profilePhoto ? <img src={`${API_URL}/uploads/${emp.profilePhoto}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Briefcase size={20} color="#94A3B8" />}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '15px', fontWeight: '800', color: '#1E293B', margin: 0 }}>{emp.name}</p>
                                            <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', margin: 0 }}>{emp.employeeId} | {emp.designation}</p>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '20px 24px', width: '220px' }}>
                                    <PremiumSelect 
                                        options={salaryGroups} 
                                        value={emp.workSetup?.salaryGroup?._id || ''} 
                                        onChange={(val) => handleSalaryGroupChange(emp._id, val)}
                                        placeholder="-- Assign Group --"
                                        isAssigned={!!emp.workSetup?.salaryGroup}
                                        variant="table"
                                    />
                                </td>
                                <td style={{ padding: '20px 24px' }}>
                                    <p style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', margin: 0 }}>₹{(emp.ctcDetails?.annualCTC || 0).toLocaleString()}</p>
                                    <p style={{ fontSize: '10px', fontWeight: '700', color: '#94A3B8', margin: 0 }}>CTC / ANNUM</p>
                                </td>
                                <td style={{ padding: '20px 24px' }}>
                                    <p style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', margin: 0 }}>₹{(emp.ctcDetails?.monthlyGross || 0).toLocaleString()}</p>
                                </td>
                                <td style={{ padding: '20px 24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Wallet size={14} color="#10B981" />
                                        <span style={{ fontSize: '15px', fontWeight: '900', color: '#10B981' }}>₹{(emp.ctcDetails?.netSalary || 0).toLocaleString()}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                                    <button 
                                        onClick={() => handleOpenManage(emp)}
                                        style={{ 
                                            padding: '10px 20px', 
                                            background: emp.workSetup?.salaryGroup ? '#3B648B' : '#E2E8F0', 
                                            color: emp.workSetup?.salaryGroup ? 'white' : '#94A3B8', 
                                            border: 'none', 
                                            borderRadius: '10px', 
                                            fontSize: '11px', 
                                            fontWeight: '800', 
                                            cursor: emp.workSetup?.salaryGroup ? 'pointer' : 'not-allowed',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                        disabled={!emp.workSetup?.salaryGroup}
                                    >
                                        <Calculator size={14} /> MANAGE CTC
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* CTC Management Side Drawer */}
            {isModalOpen && (
                <div 
                    className="drawer-overlay" 
                    style={{ 
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)',
                        zIndex: 1100, display: 'flex', justifyContent: 'flex-end',
                        animation: 'fadeIn 0.3s ease-out'
                    }}
                    onClick={() => setIsModalOpen(false)}
                >
                    <div 
                        className="drawer-panel" 
                        style={{ 
                            width: '600px', height: '100%', background: 'white', 
                            boxShadow: '-20px 0 50px -10px rgba(0,0,0,0.1)',
                            display: 'flex', flexDirection: 'column',
                            animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div style={{ padding: '35px 40px', background: '#3B648B', color: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Calculator size={26} color="white" />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Salary breakdown</h2>
                                        <p style={{ fontSize: '13px', opacity: 0.9, margin: '2px 0 0' }}>Assigning CTC for: {selectedEmployee.name}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} style={{ background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={20} color="white" />
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
                            {/* Summary View */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '40px' }}>
                                <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '18px', border: '1.5px solid #F1F5F9' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>Total Annual CTC</p>
                                    <p style={{ fontSize: '24px', fontWeight: '900', color: '#1E293B', margin: 0 }}>₹{formData.annualCTC.toLocaleString()}</p>
                                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#3B648B', marginTop: '4px' }}>₹{formData.monthlyGross.toLocaleString()} / mo Gross</p>
                                </div>
                                <div style={{ background: '#ECFDF5', padding: '20px', borderRadius: '18px', border: '1.5px solid #D1FAE5' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '800', color: '#059669', textTransform: 'uppercase', marginBottom: '8px' }}>Est. Net Salary</p>
                                    <p style={{ fontSize: '24px', fontWeight: '900', color: '#059669', margin: 0 }}>₹{formData.netSalary.toLocaleString()}</p>
                                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#10B981', marginTop: '4px' }}>Take-home amount</p>
                                </div>
                            </div>

                            {/* Earnings Section */}
                            <div style={{ marginBottom: '40px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B', margin: 0 }}>Earnings Breakdown</h3>
                                    <button onClick={() => addComponent('earning')} style={{ fontSize: '11px', fontWeight: '800', color: '#3B648B', background: 'none', border: 'none', cursor: 'pointer' }}>+ ADD NEW</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {formData.earnings.map((item, index) => (
                                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 40px', gap: '10px', alignItems: 'baseline' }}>
                                            <PremiumSelect 
                                                options={componentTypes.earnings}
                                                value={item.componentId}
                                                onChange={(val) => updateComponent('earning', index, 'componentId', val)}
                                                placeholder="Select Category"
                                            />
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '800', color: '#94A3B8' }}>₹</span>
                                                <input 
                                                    type="number" 
                                                    value={item.amount}
                                                    onChange={(e) => updateComponent('earning', index, 'amount', e.target.value)}
                                                    className="ss-input" 
                                                    style={{ height: '42px', paddingLeft: '28px', borderRadius: '12px' }}
                                                />
                                            </div>
                                            <button onClick={() => removeComponent('earning', index)} style={{ background: '#FFF1F2', border: 'none', borderRadius: '10px', height: '42px', cursor: 'pointer' }}><Trash2 size={16} color="#EF4444" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Deductions Section */}
                            <div style={{ marginBottom: '40px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B', margin: 0 }}>Deductions Breakdown</h3>
                                    <button onClick={() => addComponent('deduction')} style={{ fontSize: '11px', fontWeight: '800', color: '#3B648B', background: 'none', border: 'none', cursor: 'pointer' }}>+ ADD NEW</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {formData.deductions.map((item, index) => (
                                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 40px', gap: '10px', alignItems: 'baseline' }}>
                                            <PremiumSelect 
                                                options={componentTypes.deductions}
                                                value={item.componentId}
                                                onChange={(val) => updateComponent('deduction', index, 'componentId', val)}
                                                placeholder="Select Category"
                                            />
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '800', color: '#94A3B8' }}>₹</span>
                                                <input 
                                                    type="number" 
                                                    value={item.amount}
                                                    onChange={(e) => updateComponent('deduction', index, 'amount', e.target.value)}
                                                    className="ss-input" 
                                                    style={{ height: '42px', paddingLeft: '28px', borderRadius: '12px' }}
                                                />
                                            </div>
                                            <button onClick={() => removeComponent('deduction', index)} style={{ background: '#FFF1F2', border: 'none', borderRadius: '10px', height: '42px', cursor: 'pointer' }}><Trash2 size={16} color="#EF4444" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div style={{ padding: '25px', background: '#F8FAFC', borderRadius: '18px', border: '1px solid #F1F5F9' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '8px' }}>EFFECTIVE FROM</label>
                                        <input type="date" value={formData.effectiveDate} onChange={e => setFormData({...formData, effectiveDate: e.target.value})} className="ss-input" style={{ height: '42px', borderRadius: '12px' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '8px' }}>STATUS</label>
                                        <PremiumSelect 
                                            options={[
                                                { value: 'Active', label: 'Active Structure' },
                                                { value: 'Inactive', label: 'Inactive' }
                                            ]}
                                            value={formData.status}
                                            onChange={val => setFormData({...formData, status: val})}
                                            placeholder="Select Status"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '30px 40px', borderTop: '1px solid #F1F5F9', background: 'white', display: 'flex', gap: '15px' }}>
                            <button className="btn-hrm btn-hrm-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>DISCARD CHANGES</button>
                            <button className="btn-hrm btn-hrm-primary" style={{ flex: 1.5 }} onClick={handleSave}>PUBLISH STRUCTURE</button>
                        </div>
                    </div>
                </div>
            )}
            <style>
                {`
                    @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                `}
            </style>
        </div>
    );
};

export default EmployeeCTC;
