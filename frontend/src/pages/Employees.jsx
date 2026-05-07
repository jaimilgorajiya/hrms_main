import { useNavigate } from 'react-router-dom';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, User, Briefcase, RotateCcw } from 'lucide-react';
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

    useEffect(() => { fetchData(); }, []);
    useEffect(() => {
        setFilterDept('all'); setFilterDesignation('all'); setFilterNotice('all'); setSearchTerm('');
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
        return [...new Set(relevantEmployees.map(emp => emp.department).filter(Boolean))].sort();
    }, [relevantEmployees]);

    const designations = useMemo(() => {
        return [...new Set(relevantEmployees.map(emp => emp.designation).filter(Boolean))].sort();
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
        <div className="hrm-container" style={{ paddingBottom: '60px' }}>
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Directory</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Manage your global workforce across {branches.length} branches
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text" className="hrm-input" placeholder="Search name or ID..."
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '44px' }}
                        />
                    </div>
                    <button className="btn-hrm btn-hrm-primary" onClick={() => navigate('/admin/employees/add')}>
                        <Plus size={18} /> NEW EMPLOYEE
                    </button>
                </div>
            </div>

            {/* Branch Selector Tabs */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', overflowX: 'auto', padding: '4px' }}>
                {branches.map(branch => {
                    const isActive = activeBranchId === branch._id;
                    const count = employees.filter(emp => emp.branch === branch.branchName).length;
                    return (
                        <button
                            key={branch._id} onClick={() => setActiveBranchId(branch._id)}
                            style={{
                                padding: '10px 24px', borderRadius: '12px', whiteSpace: 'nowrap',
                                border: '1px solid', borderColor: isActive ? 'var(--primary-blue)' : 'var(--border)',
                                background: isActive ? 'var(--primary-blue)' : 'var(--bg-surface)',
                                color: isActive ? 'white' : 'var(--text-secondary)',
                                fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px',
                                cursor: 'pointer', transition: 'all 0.2s',
                                boxShadow: isActive ? '0 8px 16px -4px rgba(37, 99, 235, 0.25)' : 'none'
                            }}
                        >
                            {branch.branchShortName || branch.branchName}
                            <span style={{
                                background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-main)',
                                color: isActive ? 'white' : 'var(--text-muted)',
                                padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800'
                            }}>{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Premium Filter Bar */}
            <div className="hrm-card" style={{ marginBottom: '40px' }}>
                <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', alignItems: 'end' }}>
                    <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                        <label className="hrm-label">Department</label>
                        <SearchableSelect
                            options={[{ value: 'all', label: 'All Departments' }, ...availableDepartments.map(d => ({ value: d, label: d }))]}
                            value={filterDept} onChange={setFilterDept}
                        />
                    </div>
                    <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                        <label className="hrm-label">Designation</label>
                        <SearchableSelect
                            options={[{ value: 'all', label: 'All Designations' }, ...designations.map(d => ({ value: d, label: d }))]}
                            value={filterDesignation} onChange={setFilterDesignation}
                        />
                    </div>
                    <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                        <label className="hrm-label">Employment Status</label>
                        <SearchableSelect
                            options={[
                                { value: 'all', label: 'All Staff' },
                                { value: 'regular', label: 'Active Employees' },
                                { value: 'notice', label: 'On Notice Period' }
                            ]}
                            value={filterNotice} onChange={setFilterNotice}
                        />
                    </div>
                    <button className="btn-hrm btn-hrm-secondary" onClick={() => { setFilterDept('all'); setFilterDesignation('all'); setFilterNotice('all'); setSearchTerm(''); }}>
                        <RotateCcw size={16} /> RESET FILTERS
                    </button>
                </div>
            </div>

            {/* Employee Groups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                {Object.entries(employeesByBranch).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '120px 0', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border)' }}>
                        <User size={48} color="var(--text-muted)" style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <h3 style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>No employees found</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    Object.entries(employeesByBranch).map(([deptName, deptEmployees]) => (
                        <div key={deptName}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <div style={{ height: '20px', width: '4px', background: 'var(--primary-blue)', borderRadius: '4px' }} />
                                <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                                    {deptName} <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontWeight: '500' }}>({deptEmployees.length})</span>
                                </h3>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
                                {deptEmployees.map((emp) => (
                                    <div
                                        key={emp._id} className="hrm-card"
                                        onClick={() => navigate(`/admin/employees/profile/${emp._id}`)}
                                        style={{ cursor: 'pointer', transition: 'all 0.3s ease', border: '1px solid var(--border)' }}
                                    >
                                        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                            <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
                                                <div style={{ width: '100%', height: '100%', borderRadius: '18px', overflow: 'hidden', background: 'var(--bg-main)', border: '2px solid white', boxShadow: 'var(--shadow-sm)' }}>
                                                    {emp.profilePhoto ? (
                                                        <img src={`${API_URL}/uploads/${emp.profilePhoto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', color: 'var(--primary-blue)', background: 'var(--primary-light)' }}>
                                                            {getInitials(emp.name)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ position: 'absolute', bottom: -4, right: -4, width: '16px', height: '16px', borderRadius: '50%', border: '3px solid white', background: emp.isPunchedIn ? 'var(--success)' : 'var(--text-muted)' }} />
                                            </div>

                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>{emp.name}</h3>
                                                    <div className={`hrm-badge ${emp.status === 'Resigned' ? 'hrm-badge-danger' : 'hrm-badge-success'}`} style={{ fontSize: '10px' }}>
                                                        {emp.status === 'Resigned' ? 'Notice' : 'Active'}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary-blue)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '6px' }}>{emp.employeeId}</span>
                                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{emp.designation}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase size={14} /> {emp.employmentType}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{emp.isPunchedIn ? <span style={{ color: 'var(--success)' }}>● Clocked In</span> : '○ Away'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Employees;
