import { useNavigate } from 'react-router-dom';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import { Search, RotateCcw, User, Briefcase, Calendar, ChevronDown, Filter } from 'lucide-react';
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
        { value: 'all', label: 'All Month' },
        { value: '0', label: 'January' }, { value: '1', label: 'February' },
        { value: '2', label: 'March' }, { value: '3', label: 'April' },
        { value: '4', label: 'May' }, { value: '5', label: 'June' },
        { value: '6', label: 'July' }, { value: '7', label: 'August' },
        { value: '8', label: 'September' }, { value: '9', label: 'October' },
        { value: '10', label: 'November' }, { value: '11', label: 'December' }
    ];

    const currentYear = new Date().getFullYear();
    const years = [{ value: 'all', label: 'All Year' }];
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

    if (loading) return <div className="loading-container">Loading Ex-Employees...</div>;

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <h1 className="hrm-title">Ex Employee</h1>
                <div className="hrm-header-actions" style={{ gap: '12px' }}>
                    <div className="search-wrapper" style={{ width: '300px' }}>
                        <Search size={18} color="#64748B" />
                        <input 
                            type="text" 
                            placeholder="Ex: Search Ex Employee" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="hrm-card" style={{ marginBottom: '30px', padding: '15px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ width: '220px' }}>
                        <SearchableSelect 
                            options={[{ value: 'all', label: '-- Select Branch --' }, ...branches.map(b => ({ value: b._id, label: b.branchName }))]}
                            value={activeBranchId}
                            onChange={setActiveBranchId}
                            placeholder="Select Branch"
                        />
                    </div>
                    <div style={{ width: '180px' }}>
                        <SearchableSelect 
                            options={months}
                            value={selectedMonth}
                            onChange={setSelectedMonth}
                            placeholder="All Month"
                        />
                    </div>
                    <div style={{ width: '150px' }}>
                        <SearchableSelect 
                            options={years}
                            value={selectedYear}
                            onChange={setSelectedYear}
                            placeholder="All Year"
                        />
                    </div>
                    <button 
                        className="btn-hrm btn-hrm-danger" 
                        onClick={handleReset}
                        style={{ background: '#F87171', border: 'none', height: '48px', padding: '0 25px' }}
                    >
                        <RotateCcw size={18} /> RESET
                    </button>
                </div>
            </div>

            {/* Branch Stats Tabs */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', overflowX: 'auto', paddingBottom: '10px' }}>
                <button 
                    onClick={() => setActiveBranchId('all')}
                    className={`branch-tab ${activeBranchId === 'all' ? 'active' : ''}`}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        border: 'none',
                        background: activeBranchId === 'all' ? '#3B648B' : 'white',
                        color: activeBranchId === 'all' ? 'white' : '#64748B',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s'
                    }}
                >
                    All <span>{employees.length}</span>
                </button>
                {branches.map(branch => {
                    const count = employees.filter(e => e.branch === branch.branchName || e.branch === branch._id).length;
                    return (
                        <button 
                            key={branch._id}
                            onClick={() => setActiveBranchId(branch._id)}
                            className={`branch-tab ${activeBranchId === branch._id ? 'active' : ''}`}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '12px',
                                border: 'none',
                                background: activeBranchId === branch._id ? '#3B648B' : 'white',
                                color: activeBranchId === branch._id ? 'white' : '#64748B',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {branch.branchShortName || branch.branchName.substring(0, 2).toUpperCase()} <span>{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Grouped Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
                {Object.entries(groupedByDepartment).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '100px', background: 'white', borderRadius: '20px', border: '2.5px dashed #E2E8F0' }}>
                        <User size={60} color="#CBD5E1" style={{ marginBottom: '20px' }} />
                        <h3 style={{ color: '#64748B', fontWeight: '700' }}>No ex-employees found</h3>
                        <p style={{ color: '#94A3B8' }}>Try adjusting your filters or search term</p>
                    </div>
                ) : (
                    Object.entries(groupedByDepartment).map(([dept, deptEmps]) => (
                        <div key={dept}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B' }}>{dept}</h2>
                                <span style={{ background: '#3B648B', color: 'white', padding: '2px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}>{deptEmps.length}</span>
                                <ChevronDown size={20} color="#94A3B8" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
                                {deptEmps.map(emp => (
                                    <div 
                                        key={emp._id} 
                                        className="ex-emp-card"
                                        onClick={() => navigate(`/admin/employees/profile/${emp._id}`)}
                                        style={{
                                            background: 'white',
                                            borderRadius: '24px',
                                            padding: '24px',
                                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
                                            border: '1px solid #F1F5F9',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            textAlign: 'center',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {/* Status Tag */}
                                        <div style={{ 
                                            position: 'absolute', 
                                            top: '15px', 
                                            right: '15px' 
                                        }}>
                                            <span style={{ 
                                                fontSize: '10px', 
                                                fontWeight: '800', 
                                                padding: '4px 10px', 
                                                borderRadius: '20px',
                                                background: emp.status === 'Resigned' ? '#FEF2F2' : '#F8FAFC',
                                                color: emp.status === 'Resigned' ? '#EF4444' : '#64748B',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>{emp.status}</span>
                                        </div>

                                        {/* Avatar */}
                                        <div style={{ 
                                            width: '85px', 
                                            height: '85px', 
                                            borderRadius: '50%', 
                                            background: '#F8FAFC', 
                                            border: '4px solid #fff',
                                            boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: '18px',
                                            overflow: 'hidden'
                                        }}>
                                            {emp.profilePhoto ? (
                                                <img src={`${API_URL}/uploads/${emp.profilePhoto}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                            ) : (
                                                <div style={{ 
                                                    width: '100%', 
                                                    height: '100%', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
                                                    color: '#3B648B',
                                                    fontSize: '28px',
                                                    fontWeight: '800'
                                                }}>
                                                    {getInitials(emp.name)}
                                                </div>
                                            )}
                                        </div>

                                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B', marginBottom: '6px' }}>{emp.name}</h3>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', fontSize: '13px', fontWeight: '600', marginBottom: '15px' }}>
                                            <Briefcase size={14} /> {emp.designation || 'Ex-Employee'}
                                        </div>

                                        <div style={{ 
                                            width: '100%', 
                                            paddingTop: '15px', 
                                            borderTop: '1px solid #F1F5F9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            color: '#EF4444',
                                            fontSize: '13px',
                                            fontWeight: '700'
                                        }}>
                                            <Calendar size={15} /> 
                                            <span>Exit: {emp.exitDate ? new Date(emp.exitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .ex-emp-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1);
                    border-color: #3B648B30;
                }
                .branch-tab span {
                    opacity: 0.6;
                    font-size: 0.8em;
                }
                .branch-tab.active span {
                    opacity: 1;
                }
            `}} />
        </div>
    );
};

export default ExEmployees;
