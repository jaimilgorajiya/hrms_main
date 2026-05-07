import { useNavigate } from 'react-router-dom';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, RotateCcw, User, Briefcase, Calendar, 
    ChevronDown, Filter, Users, LogOut, ArrowRight 
} from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';

const ExEmployees = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeBranchId, setActiveBranchId] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedYear, setSelectedYear] = useState('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const [userRes, branchRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/users/ex-employees`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/branches`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const userData = await userRes.json();
            const branchData = await branchRes.json();

            if (userData.success) setEmployees(userData.users);
            if (branchData.success) setBranches(branchData.branches);

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

    const months = [
        { value: 'all', label: 'All Months' },
        { value: '0', label: 'January' }, { value: '1', label: 'February' },
        { value: '2', label: 'March' }, { value: '3', label: 'April' },
        { value: '4', label: 'May' }, { value: '5', label: 'June' },
        { value: '6', label: 'July' }, { value: '7', label: 'August' },
        { value: '8', label: 'September' }, { value: '9', label: 'October' },
        { value: '10', label: 'November' }, { value: '11', label: 'December' }
    ];

    const currentYear = new Date().getFullYear();
    const years = [{ value: 'all', label: 'All Years' }];
    for (let i = 0; i < 5; i++) {
        years.push({ value: (currentYear - i).toString(), label: (currentYear - i).toString() });
    }

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (emp.employeeId && emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesBranch = activeBranchId === 'all' || 
                                 emp.branch === activeBranchId || 
                                 (branches.find(b => b._id === activeBranchId)?.branchName === emp.branch);

            const exitDate = emp.exitDate ? new Date(emp.exitDate) : null;
            const matchesMonth = selectedMonth === 'all' || (exitDate && exitDate.getMonth().toString() === selectedMonth);
            const matchesYear = selectedYear === 'all' || (exitDate && exitDate.getFullYear().toString() === selectedYear);

            return matchesSearch && matchesBranch && matchesMonth && matchesYear;
        });
    }, [employees, searchTerm, activeBranchId, selectedMonth, selectedYear, branches]);

    const groupedByDepartment = useMemo(() => {
        const grouped = {};
        filteredEmployees.forEach(emp => {
            const dept = emp.department || 'Other';
            if (!grouped[dept]) grouped[dept] = [];
            grouped[dept].push(emp);
        });
        return grouped;
    }, [filteredEmployees]);

    const handleReset = () => {
        setSearchTerm('');
        setActiveBranchId('all');
        setSelectedMonth('all');
        setSelectedYear('all');
    };

    if (loading) return (
        <div className="hrm-container" style={{ textAlign: 'center', padding: '100px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading exit records...</p>
        </div>
    );

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Alumni Directory</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
                        Viewing records of {employees.length} former employees
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text" 
                            className="hrm-input"
                            placeholder="Search by name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '44px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="hrm-card" style={{ marginBottom: '32px', overflow: 'visible' }}>
                <div style={{ padding: '24px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                        <SearchableSelect 
                            label="Branch Location"
                            options={[{ value: 'all', label: 'All Branches' }, ...branches.map(b => ({ value: b._id, label: b.branchName }))]}
                            value={activeBranchId}
                            onChange={setActiveBranchId}
                        />
                    </div>
                    <div style={{ width: '180px' }}>
                        <SearchableSelect 
                            label="Exit Month"
                            options={months}
                            value={selectedMonth}
                            onChange={setSelectedMonth}
                        />
                    </div>
                    <div style={{ width: '150px' }}>
                        <SearchableSelect 
                            label="Exit Year"
                            options={years}
                            value={selectedYear}
                            onChange={setSelectedYear}
                        />
                    </div>
                    <button 
                        className="btn-hrm btn-hrm-secondary" 
                        onClick={handleReset}
                        style={{ height: '44px' }}
                    >
                        <RotateCcw size={16} /> RESET
                    </button>
                </div>
            </div>

            {/* Content Grouped by Department */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                {Object.entries(groupedByDepartment).length === 0 ? (
                    <div className="hrm-card" style={{ textAlign: 'center', padding: '120px 40px', background: 'transparent', border: '2px dashed var(--border)' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#CBD5E1', boxShadow: '0 8px 16px -4px rgba(0,0,0,0.05)' }}>
                            <Users size={40} />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', margin: '0 0 8px' }}>No alumni found</h3>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto', fontSize: '14px' }}>Try adjusting your search or filters to find specific former colleagues.</p>
                    </div>
                ) : (
                    Object.entries(groupedByDepartment).map(([dept, deptEmps]) => (
                        <div key={dept}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <div style={{ height: '20px', width: '4px', background: 'var(--primary-blue)', borderRadius: '4px' }} />
                                <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                                    {dept} <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontWeight: '500' }}>({deptEmps.length})</span>
                                </h3>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                                {deptEmps.map(emp => (
                                    <div 
                                        key={emp._id} 
                                        className="hrm-card"
                                        onClick={() => navigate(`/admin/employees/profile/${emp._id}`)}
                                        style={{ 
                                            cursor: 'pointer', 
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                                            border: '1px solid var(--border)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{ padding: '24px' }}>
                                            <div style={{ display: 'flex', gap: '20px', alignItems: 'start' }}>
                                                <div style={{ 
                                                    width: '64px', height: '64px', borderRadius: '18px', 
                                                    background: 'var(--bg-main)', border: '2.5px solid white',
                                                    boxShadow: 'var(--shadow-sm)', overflow: 'hidden', flexShrink: 0
                                                }}>
                                                    {emp.profilePhoto ? (
                                                        <img src={`${API_URL}/uploads/${emp.profilePhoto}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900', color: 'var(--primary-blue)', background: 'var(--primary-light)' }}>
                                                            {getInitials(emp.name)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div>
                                                            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#1E293B', margin: '0 0 2px' }}>{emp.name}</h3>
                                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{emp.employeeId || 'ID N/A'}</p>
                                                        </div>
                                                        <div style={{ 
                                                            padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '800',
                                                            background: emp.status === 'Resigned' ? '#FEE2E2' : '#F1F5F9',
                                                            color: emp.status === 'Resigned' ? '#EF4444' : '#64748B'
                                                        }}>
                                                            {emp.status?.toUpperCase() || 'EXITED'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                                                    <Briefcase size={15} color="var(--primary-blue)" />
                                                    {emp.designation || 'Former Staff'}
                                                </div>
                                                <div style={{ 
                                                    display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', 
                                                    color: '#EF4444', fontWeight: 700, padding: '12px', background: '#FEF2F2',
                                                    borderRadius: '12px', border: '1px solid #FEE2E2'
                                                }}>
                                                    <LogOut size={15} />
                                                    Relieved: {emp.exitDate ? new Date(emp.exitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date N/A'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div style={{ 
                                            padding: '12px 24px', background: '#F8FAFC', borderTop: '1px solid #F1F5F9',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Profile View</span>
                                            <ArrowRight size={14} color="var(--text-muted)" />
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

export default ExEmployees;
