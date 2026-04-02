import { useNavigate } from 'react-router-dom';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Mail, Phone, MapPin, Building2, User, MoreVertical, Edit2, Trash2, Eye, UserCircle, Briefcase, Download, Upload, CreditCard, RotateCcw, ChevronDown } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import Swal from 'sweetalert2';

const Employees = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeBranchId, setActiveBranchId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('all');
    const [filterDesignation, setFilterDesignation] = useState('all');
    const [filterNotice, setFilterNotice] = useState('all');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setFilterDept('all');
        setFilterDesignation('all');
        setFilterNotice('all');
        setSearchTerm('');
    }, [activeBranchId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const [userRes, branchRes, deptRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/branches`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/departments`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const userData = await userRes.json();
            const branchData = await branchRes.json();
            const deptData = await deptRes.json();

            if (userData.success) setEmployees(userData.users);
            if (branchData.success && branchData.branches.length > 0) {
                setBranches(branchData.branches);
                setActiveBranchId(branchData.branches[0]._id);
            }
            if (deptData.success) setDepartments(deptData.departments);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const relevantEmployees = useMemo(() => {
        if (!activeBranchId) return [];
        const activeBranch = branches.find(b => b._id === activeBranchId);
        if (!activeBranch) return [];
        return employees.filter(emp => emp.branch === activeBranch.branchName);
    }, [employees, activeBranchId, branches]);

    const availableDepartments = useMemo(() => {
        const unique = [...new Set(relevantEmployees.map(emp => emp.department).filter(Boolean))].sort();
        return unique;
    }, [relevantEmployees]);

    const designations = useMemo(() => {
        const unique = [...new Set(relevantEmployees.map(emp => emp.designation).filter(Boolean))].sort();
        return unique;
    }, [relevantEmployees]);

    const filteredEmployeesList = useMemo(() => {
        return relevantEmployees.filter(emp => {
            const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesDept = filterDept === 'all' || emp.department === filterDept;
            const matchesDesignation = filterDesignation === 'all' || emp.designation === filterDesignation;
            const matchesNotice = filterNotice === 'all' || 
                                 (filterNotice === 'notice' && emp.status === 'Resigned') ||
                                 (filterNotice === 'regular' && emp.status !== 'Resigned');

            return matchesSearch && matchesDept && matchesDesignation && matchesNotice;
        });
    }, [relevantEmployees, searchTerm, filterDept, filterDesignation, filterNotice]);

    const employeesByBranch = useMemo(() => {
        const grouped = {};
        filteredEmployeesList.forEach(emp => {
            const deptName = emp.department || 'Unassigned';
            if (!grouped[deptName]) grouped[deptName] = [];
            grouped[deptName].push(emp);
        });
        return grouped;
    }, [filteredEmployeesList]);

    if (loading) return <div className="loading-container">Loading Employees...</div>;

    return (
        <div className="hrm-container">
            {/* Standard Header Section */}
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Employees</h1>
                    <p style={{ fontSize: '13px', color: '#64748B', fontWeight: '600', marginTop: '4px' }}>
                        Manage and monitor your workforce across all branches
                    </p>
                </div>
                <div className="hrm-header-actions" style={{ gap: '15px' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input 
                            type="text" 
                            placeholder="Search by name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 15px 12px 45px',
                                background: 'white',
                                border: '1.5px solid #E2E8F0',
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: '600',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                        />
                    </div>
                    <button className="btn-hrm btn-hrm-primary" onClick={() => navigate('/admin/employees/add')} style={{ height: '45px', padding: '0 25px' }}>
                        <Plus size={18} /> ADD EMPLOYEE
                    </button>
                </div>
            </div>

            {/* Branch Selection Tabs */}
            <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginBottom: '25px', 
                overflowX: 'auto', 
                padding: '4px 4px 12px',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
            }}>
                {branches.map(branch => {
                    const isActive = activeBranchId === branch._id;
                    const count = employees.filter(emp => emp.branch === branch.branchName).length;
                    
                    return (
                        <button 
                            key={branch._id} 
                            onClick={() => setActiveBranchId(branch._id)}
                            className={`branch-tab ${isActive ? 'active' : ''}`}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '14px',
                                border: 'none',
                                background: isActive ? '#3B648B' : 'white',
                                color: isActive ? 'white' : '#64748B',
                                fontWeight: '700',
                                fontSize: '13.5px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer',
                                boxShadow: isActive ? '0 10px 20px -5px rgba(59, 100, 139, 0.3)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
                                whiteSpace: 'nowrap',
                                minWidth: 'fit-content',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <span style={{ position: 'relative', zIndex: 1 }}>{branch.branchShortName || branch.branchName}</span>
                            <span style={{ 
                                background: isActive ? 'rgba(255, 255, 255, 0.15)' : '#F1F5F9', 
                                color: isActive ? 'white' : '#3B648B', 
                                padding: '2px 10px', 
                                borderRadius: '8px', 
                                fontSize: '11px',
                                fontWeight: '800',
                                position: 'relative',
                                zIndex: 1,
                                minWidth: '24px',
                                textAlign: 'center'
                            }}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Advanced Filters */}
            <div style={{ 
                background: 'white', 
                padding: '24px', 
                borderRadius: '20px', 
                border: '1px solid #E2E8F0', 
                marginBottom: '40px',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '24px',
                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)',
                alignItems: 'end'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.8px', paddingLeft: '4px' }}>Department</label>
                    <SearchableSelect 
                        options={[{ value: 'all', label: 'All Departments' }, ...availableDepartments.map(dept => ({ value: dept, label: dept }))]}
                        value={filterDept}
                        onChange={setFilterDept}
                        placeholder="All Departments"
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.8px', paddingLeft: '4px' }}>Designation</label>
                    <SearchableSelect 
                        options={[{ value: 'all', label: 'All Designations' }, ...designations.map(desig => ({ value: desig, label: desig }))]}
                        value={filterDesignation}
                        onChange={setFilterDesignation}
                        placeholder="All Designations"
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.8px', paddingLeft: '4px' }}>Status Type</label>
                    <SearchableSelect 
                        options={[
                            { value: 'all', label: 'All Status' },
                            { value: 'regular', label: 'Active/Regular' },
                            { value: 'notice', label: 'On Notice Period' }
                        ]}
                        value={filterNotice}
                        onChange={setFilterNotice}
                        placeholder="All Status"
                    />
                </div>

                <div style={{ height: '48px' }}>
                    <button 
                        onClick={() => {
                            setFilterDept('all');
                            setFilterDesignation('all');
                            setFilterNotice('all');
                            setSearchTerm('');
                        }}
                        style={{ 
                            width: '100%', 
                            height: '100%',
                            padding: '0 15px', 
                            borderRadius: '12px', 
                            border: '1.5px solid #F1F5F9', 
                            background: '#F8FAFC', 
                            color: '#64748B', 
                            fontSize: '13px', 
                            fontWeight: '800', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            transition: 'all 0.3s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = '#F1F5F9';
                            e.currentTarget.style.color = '#334155';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = '#F8FAFC';
                            e.currentTarget.style.color = '#64748B';
                        }}
                    >
                        <RotateCcw size={14} strokeWidth={2.5} /> RESET FILTERS
                    </button>
                </div>
            </div>

            {/* Department Groups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                {Object.entries(employeesByBranch).length === 0 ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '120px 0', 
                        color: '#94A3B8', 
                        background: 'white', 
                        borderRadius: '24px',
                        border: '2px dashed #E2E8F0'
                    }}>
                        <User size={48} style={{ marginBottom: '15px', opacity: 0.3 }} />
                        <p style={{ fontSize: '16px', fontWeight: '500' }}>No employees connected to this branch yet.</p>
                    </div>
                ) : (
                    Object.entries(employeesByBranch).map(([deptName, deptEmployees]) => (
                        <div key={deptName}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                                <h2 style={{ fontSize: '13px', fontWeight: '800', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <span style={{ color: '#94A3B8' }}>Department:</span> {deptName} <span style={{ color: '#94A3B8', fontWeight: '600' }}>({deptEmployees.length})</span>
                                </h2>
                            </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {deptEmployees.map((emp) => (
                                        <div 
                                            key={emp._id} 
                                            className="bio-capsule" 
                                            onClick={() => navigate(`/admin/employees/profile/${emp._id}`)}
                                            style={{ 
                                                background: '#fff', 
                                                borderRadius: '100px', 
                                                padding: '12px 12px 12px 24px', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'space-between',
                                                border: '1.5px solid #F1F5F9',
                                                boxShadow: '0 8px 15px -5px rgba(0, 0, 0, 0.02)',
                                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {/* Profile & Identity */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                                                <div style={{ 
                                                    position: 'relative',
                                                    width: '56px',
                                                    height: '56px'
                                                }}>
                                                    {/* Animated Status Ring */}
                                                    <div style={{ 
                                                        position: 'absolute',
                                                        inset: -3,
                                                        borderRadius: '50%',
                                                        border: `2px solid ${emp.status === 'Active' ? '#10B981' : '#CBD5E1'}`,
                                                        opacity: 0.3
                                                    }} />
                                                    <div style={{ 
                                                        width: '100%', 
                                                        height: '100%', 
                                                        borderRadius: '50%', 
                                                        overflow: 'hidden', 
                                                        background: '#F1F5F9',
                                                        border: '2px solid #fff',
                                                        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        {emp.profilePhoto ? (
                                                            <img src={`${API_URL}/uploads/${emp.profilePhoto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <span style={{ fontSize: '18px', fontWeight: '800', color: '#3B648B' }}>{getInitials(emp.name)}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.3px' }}>{emp.name}</div>
                                                        {emp.status === 'Resigned' && (
                                                            <span style={{ 
                                                                fontSize: '9px', 
                                                                fontWeight: '800', 
                                                                background: '#FEF2F2', 
                                                                color: '#EF4444', 
                                                                padding: '1px 8px', 
                                                                borderRadius: '50px',
                                                                textTransform: 'uppercase',
                                                                border: '1px solid rgba(239, 68, 68, 0.2)'
                                                            }}>Notice Period</span>
                                                        )}
                                                        {/* Online/Punched Status */}
                                                        {emp.isPunchedIn ? (
                                                            <span style={{ fontSize: '9px', fontWeight: '800', background: '#ECFDF5', color: '#10B981', padding: '1px 8px', borderRadius: '50px', textTransform: 'uppercase', border: '1px solid rgba(16, 185, 129, 0.2)' }}>● Live</span>
                                                        ) : emp.isOnline ? (
                                                            <span style={{ fontSize: '9px', fontWeight: '800', background: '#EFF6FF', color: '#3B82F6', padding: '1px 8px', borderRadius: '50px', textTransform: 'uppercase', border: '1px solid rgba(59, 130, 246, 0.2)' }}>● Online</span>
                                                        ) : (
                                                            <span style={{ fontSize: '9px', fontWeight: '800', background: '#FEF2F2', color: '#EF4444', padding: '1px 8px', borderRadius: '50px', textTransform: 'uppercase', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Logged Out</span>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ 
                                                            fontSize: '11px', 
                                                            fontWeight: '700', 
                                                            color: '#3B648B', 
                                                            backgroundColor: 'rgba(59, 100, 139, 0.08)',
                                                            padding: '2px 8px',
                                                            borderRadius: '6px',
                                                            textTransform: 'uppercase'
                                                        }}>{emp.employeeId || 'IIPL-000'}</span>
                                                        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>• {emp.employmentType || 'Permanent'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Role Info - Distinct Pill */}
                                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                                <div style={{ 
                                                    padding: '8px 20px', 
                                                    background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                                                    borderRadius: '50px',
                                                    border: '1px solid #E2E8F0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px'
                                                }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                        <Briefcase size={14} color="#3B648B" strokeWidth={2.5} />
                                                    </div>
                                                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>{emp.designation || 'Specialist'}</span>
                                                </div>
                                            </div>

                                            {/* Payroll Policy */}
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase' }}>Payroll Policy</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ 
                                                        fontSize: '12.5px', 
                                                        color: emp.workSetup?.salaryGroup ? '#0F172A' : '#94A3B8', 
                                                        fontWeight: '750' 
                                                    }}>
                                                        {emp.workSetup?.salaryGroup?.groupName || 'Unassigned'}
                                                    </span>
                                                    {emp.workSetup?.salaryGroup && (
                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB' }} />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Contact Details */}
                                            <div style={{ flex: 1, display: 'flex', gap: '30px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase' }}>Email Address</span>
                                                    <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>{emp.email || 'not-provided@iipl.com'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <style dangerouslySetInnerHTML={{ __html: `
                                    .bio-capsule:hover {
                                        transform: scale(1.01) translateX(5px);
                                        background-color: #fff;
                                        border-color: #3B648B40;
                                        box-shadow: 0 15px 30px -10px rgba(59, 100, 139, 0.12);
                                    }
                                    .hub-btn {
                                        width: 50px;
                                        height: 50px;
                                        border-radius: 50%;
                                        border: none;
                                        background: #F8FAFC;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        cursor: pointer;
                                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                                    }
                                    .hub-btn:hover {
                                        background-color: var(--hover-color);
                                        transform: rotate(15deg) scale(1.1);
                                    }
                                `}} />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Employees;
