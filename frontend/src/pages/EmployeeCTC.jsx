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
import SearchableSelect from '../components/SearchableSelect';
import '../pages/AdminDashboard.css'; // Reusing established premium styles


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
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Employee CTC</h1>
                    <p className="hrm-subtitle">Manage individual salary structures and compensation breakdowns</p>
                </div>
                
                <div className="hrm-search-wrapper" style={{ width: '350px' }}>
                    <Search size={18} className="hrm-search-icon" />
                    <input 
                        type="text" 
                        className="hrm-input hrm-search-input"
                        placeholder="Search by name or Employee ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="hrm-stats-grid" style={{ marginBottom: '32px' }}>
                {[
                    { label: 'Total Payroll Budget', value: `₹${(employees || []).reduce((sum, e) => sum + (e.ctcDetails?.annualCTC || 0), 0).toLocaleString()}`, icon: <Wallet size={20} />, color: 'var(--primary-blue)', bg: 'var(--primary-light)' },
                    { label: 'Unassigned CTC', value: (employees || []).filter(e => !e.ctcDetails).length, icon: <Users size={20} />, color: 'var(--warning)', bg: '#FFFBEB' },
                    { label: 'Active Structures', value: (employees || []).filter(e => e.ctcDetails?.status === 'Active').length, icon: <CheckCircle2 size={20} />, color: 'var(--success)', bg: '#ECFDF5' }
                ].map((stat, i) => (
                    <div key={i} className="hrm-stat-card">
                        <div className="hrm-stat-icon-wrapper" style={{ background: stat.bg, color: stat.color }}>
                            {stat.icon}
                        </div>
                        <div className="hrm-stat-details">
                            <span className="hrm-stat-label">{stat.label}</span>
                            <h3 className="hrm-stat-value">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Employee CTC List */}
            <div className="hrm-card">
                <div className="hrm-table-container">
                    <table className="hrm-table">
                        <thead>
                            <tr>
                                <th>Employee & Designation</th>
                                <th style={{ width: '220px' }}>Salary Group Assignment</th>
                                <th>Annual CTC</th>
                                <th>Monthly Gross</th>
                                <th>Net Pay</th>
                                <th style={{ textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ padding: '100px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>Loading payroll data...</td></tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '100px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600' }}>No employees found matching criteria</td></tr>
                            ) : filteredEmployees.map((emp) => (
                                <tr key={emp._id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                {emp.profilePhoto ? <img src={`${API_URL}/uploads/${emp.profilePhoto}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Briefcase size={20} color="var(--text-muted)" />}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>{emp.name}</p>
                                                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', margin: 0 }}>{emp.employeeId} | {emp.designation}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <SearchableSelect 
                                            options={salaryGroups.map(g => ({ value: g._id, label: g.groupName }))} 
                                            value={emp.workSetup?.salaryGroup?._id || ''} 
                                            onChange={(val) => handleSalaryGroupChange(emp._id, val)}
                                            placeholder="-- Assign Group --"
                                        />
                                    </td>
                                    <td>
                                        <p style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>₹{(emp.ctcDetails?.annualCTC || 0).toLocaleString()}</p>
                                        <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase' }}>CTC / Annum</p>
                                    </td>
                                    <td>
                                        <p style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>₹{(emp.ctcDetails?.monthlyGross || 0).toLocaleString()}</p>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Wallet size={14} color="var(--success)" />
                                            <span style={{ fontSize: '15px', fontWeight: '900', color: 'var(--success)' }}>₹{(emp.ctcDetails?.netSalary || 0).toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <button 
                                                className={`btn-hrm ${emp.workSetup?.salaryGroup ? 'btn-hrm-primary' : 'btn-hrm-secondary'}`}
                                                style={{ padding: '8px 16px', fontSize: '11px' }}
                                                onClick={() => handleOpenManage(emp)}
                                                disabled={!emp.workSetup?.salaryGroup}
                                            >
                                                <Calculator size={14} /> MANAGE CTC
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CTC Management Modal (Drawer-style) */}
            {isModalOpen && (
                <div className="hrm-modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div 
                        className="hrm-modal-content" 
                        style={{ 
                            width: '600px', height: '100%', margin: 0, borderRadius: 0, marginLeft: 'auto',
                            display: 'flex', flexDirection: 'column'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="hrm-modal-header" style={{ background: 'linear-gradient(135deg, var(--primary-blue) 0%, #1E40AF 100%)', color: 'white', padding: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.3)' }}>
                                    <Calculator size={24} color="white" />
                                </div>
                                <div>
                                    <h3 className="hrm-modal-title" style={{ color: 'white', fontSize: '20px', fontWeight: 900, marginBottom: '2px' }}>CTC Management</h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Structuring compensation for {selectedEmployee.name}</p>
                                </div>
                            </div>
                            <button className="icon-btn" style={{ color: 'white', background: 'rgba(255,255,255,0.1)', border: 'none' }} onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="hrm-modal-body" style={{ flex: 1, overflowY: 'auto' }}>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Assigning CTC for: <strong>{selectedEmployee.name}</strong></p>
                            
                            {/* Summary View */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '32px' }}>
                                <div style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: '18px', border: '1px solid var(--border)' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Total Annual CTC</p>
                                    <p style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-dark)', margin: 0 }}>₹{formData.annualCTC.toLocaleString()}</p>
                                    <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-blue)', marginTop: '4px' }}>₹{formData.monthlyGross.toLocaleString()} / mo Gross</p>
                                </div>
                                <div style={{ background: '#ECFDF5', padding: '20px', borderRadius: '18px', border: '1px solid #D1FAE5' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--success)', textTransform: 'uppercase', marginBottom: '8px' }}>Est. Net Salary</p>
                                    <p style={{ fontSize: '24px', fontWeight: '900', color: 'var(--success)', margin: 0 }}>₹{formData.netSalary.toLocaleString()}</p>
                                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#10B981', marginTop: '4px' }}>Take-home amount</p>
                                </div>
                            </div>

                            {/* Earnings Section */}
                            <div style={{ marginBottom: '32px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>Earnings Breakdown</h4>
                                    <button className="btn-hrm btn-hrm-secondary" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => addComponent('earning')}>+ ADD NEW</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {formData.earnings.map((item, index) => (
                                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 40px', gap: '10px', alignItems: 'center' }}>
                                            <SearchableSelect 
                                                options={componentTypes.earnings.map(c => ({ value: c._id, label: c.name }))}
                                                value={item.componentId}
                                                onChange={(val) => updateComponent('earning', index, 'componentId', val)}
                                                placeholder="Select Category"
                                            />
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>₹</span>
                                                <input 
                                                    type="number" 
                                                    className="hrm-input"
                                                    style={{ paddingLeft: '24px' }}
                                                    value={item.amount}
                                                    onChange={(e) => updateComponent('earning', index, 'amount', e.target.value)}
                                                />
                                            </div>
                                            <button className="btn-hrm btn-hrm-secondary" style={{ color: 'var(--danger)', padding: '10px' }} onClick={() => removeComponent('earning', index)}><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Deductions Section */}
                            <div style={{ marginBottom: '32px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>Deductions Breakdown</h4>
                                    <button className="btn-hrm btn-hrm-secondary" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => addComponent('deduction')}>+ ADD NEW</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {formData.deductions.map((item, index) => (
                                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 40px', gap: '10px', alignItems: 'center' }}>
                                            <SearchableSelect 
                                                options={componentTypes.deductions.map(c => ({ value: c._id, label: c.name }))}
                                                value={item.componentId}
                                                onChange={(val) => updateComponent('deduction', index, 'componentId', val)}
                                                placeholder="Select Category"
                                            />
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>₹</span>
                                                <input 
                                                    type="number" 
                                                    className="hrm-input"
                                                    style={{ paddingLeft: '24px' }}
                                                    value={item.amount}
                                                    onChange={(e) => updateComponent('deduction', index, 'amount', e.target.value)}
                                                />
                                            </div>
                                            <button className="btn-hrm btn-hrm-secondary" style={{ color: 'var(--danger)', padding: '10px' }} onClick={() => removeComponent('deduction', index)}><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div style={{ padding: '20px', background: 'var(--bg-main)', borderRadius: '18px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="hrm-form-group">
                                        <label className="hrm-label">EFFECTIVE FROM</label>
                                        <input type="date" className="hrm-input" value={formData.effectiveDate} onChange={e => setFormData({...formData, effectiveDate: e.target.value})} />
                                    </div>
                                    <div className="hrm-form-group">
                                        <label className="hrm-label">STATUS</label>
                                        <SearchableSelect 
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

                        <div className="hrm-modal-footer">
                            <button className="btn-hrm btn-hrm-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>DISCARD</button>
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
