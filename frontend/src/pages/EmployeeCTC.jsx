import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Search, Filter, Plus, Edit2, ChevronRight, Briefcase, 
    CreditCard, PieChart, Users, ArrowUpRight, CheckCircle2,
    X, Wallet, DollarSign, Calculator, Calendar, History, Trash2,
    ChevronDown, Check, Eye
} from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';
import { useNavigate } from 'react-router-dom';
import '../pages/AdminDashboard.css'; // Reusing established premium styles


const EmployeeCTC = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [salaryGroups, setSalaryGroups] = useState([]);

    useEffect(() => {
        fetchData();
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

    const filteredEmployees = useMemo(() => {
        if (!Array.isArray(employees)) return [];
        return employees.filter(emp => 
            emp && emp.ctcDetails && emp.name && (
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
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="search-wrapper" style={{ width: '350px', margin: 0 }}>
                        <Search size={18} color="var(--text-secondary)" />
                        <input 
                            type="text" 
                            placeholder="Search by name or Employee ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        className="btn-hrm btn-hrm-primary" 
                        style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => navigate('/admin/payroll/employee-ctc/add')}
                    >
                        <Plus size={16} /> ADD NEW
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="hrm-stats-grid" style={{ marginBottom: '32px' }}>
                {[
                    { label: 'Total Payroll Budget', value: `₹${(employees || []).reduce((sum, e) => sum + (e.ctcDetails?.annualCTC || 0), 0).toLocaleString()}`, icon: <Wallet size={20} />, color: 'var(--primary-blue)', bg: 'var(--primary-light)' },
                    { label: 'Unassigned CTC', value: (employees || []).filter(e => !e.ctcDetails).length, icon: <Users size={20} />, color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.15)' },
                    { label: 'Active Structures', value: (employees || []).filter(e => e.ctcDetails?.status === 'Active').length, icon: <CheckCircle2 size={20} />, color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.15)' }
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
                                <th>Employee </th>
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
                                                <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', margin: 0 }}>{emp.employeeId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-dark)' }}>
                                            {emp.workSetup?.salaryGroup?.groupName || '--'}
                                        </span>
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
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                            {emp.ctcDetails && (
                                                <button 
                                                    onClick={() => navigate(`/admin/payroll/employee-ctc/view/${emp._id}`)}
                                                    title="View CTC Details"
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--card-bg)',
                                                        color: 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.color = 'var(--primary-blue)';
                                                        e.currentTarget.style.borderColor = 'var(--primary-blue)';
                                                        e.currentTarget.style.background = 'var(--primary-light)';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                                        e.currentTarget.style.borderColor = 'var(--border)';
                                                        e.currentTarget.style.background = 'var(--card-bg)';
                                                    }}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            )}
                                            {emp.ctcDetails && (
                                                <button 
                                                    onClick={() => navigate(`/admin/payroll/employee-ctc/history/${emp._id}`)}
                                                    title="View Revision History"
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--card-bg)',
                                                        color: 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.color = 'var(--primary-blue)';
                                                        e.currentTarget.style.borderColor = 'var(--primary-blue)';
                                                        e.currentTarget.style.background = 'var(--primary-light)';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                                        e.currentTarget.style.borderColor = 'var(--border)';
                                                        e.currentTarget.style.background = 'var(--card-bg)';
                                                    }}
                                                >
                                                    <History size={16} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => navigate(`/admin/payroll/employee-ctc/add?employeeId=${emp._id}`)}
                                                disabled={!emp.workSetup?.salaryGroup}
                                                title="Edit CTC Details"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)',
                                                    background: emp.workSetup?.salaryGroup ? 'var(--card-bg)' : 'rgba(0,0,0,0.05)',
                                                    color: emp.workSetup?.salaryGroup ? 'var(--text-secondary)' : 'var(--text-muted)',
                                                    cursor: emp.workSetup?.salaryGroup ? 'pointer' : 'not-allowed',
                                                    transition: 'all 0.2s',
                                                    opacity: emp.workSetup?.salaryGroup ? 1 : 0.5
                                                }}
                                                onMouseOver={(e) => {
                                                    if (emp.workSetup?.salaryGroup) {
                                                        e.currentTarget.style.color = '#10B981';
                                                        e.currentTarget.style.borderColor = '#10B981';
                                                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                                                    }
                                                }}
                                                onMouseOut={(e) => {
                                                    if (emp.workSetup?.salaryGroup) {
                                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                                        e.currentTarget.style.borderColor = 'var(--border)';
                                                        e.currentTarget.style.background = 'var(--card-bg)';
                                                    }
                                                }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>
                {`
                    body.dark-mode input[type="date"] { color-scheme: dark; }
                `}
            </style>
        </div>
    );
};

export default EmployeeCTC;
