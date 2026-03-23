import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Briefcase, User, Search, RefreshCw, CheckCircle2 } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const ChangeBranch = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);
    
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    
    const [destinationBranch, setDestinationBranch] = useState('');
    const [destinationDept, setDestinationDept] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [branchRes, deptRes, empRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/branches`),
                authenticatedFetch(`${API_URL}/api/departments`),
                authenticatedFetch(`${API_URL}/api/users`)
            ]);

            const bData = await branchRes.json();
            const dData = await deptRes.json();
            const eData = await empRes.json();

            if (bData.success) setBranches(bData.branches);
            if (dData.success) setDepartments(dData.departments);
            if (eData.success) setEmployees(eData.users);
        } catch (error) {
            console.error("Error fetching initial data:", error);
        }
    };

    const filteredEmployees = employees.filter(emp => 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (emp.employeeId && emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const filteredDepartments = departments.filter(dept => {
        const selectedBranchObj = branches.find(b => b.branchName === destinationBranch);
        return selectedBranchObj && dept.branchId === selectedBranchObj._id;
    });

    const handleEmployeeSelect = (emp) => {
        setSelectedEmployee(emp);
        setSearchQuery('');
        setDestinationBranch('');
        setDestinationDept('');
    };

    const handleChangeBranch = async () => {
        if (!selectedEmployee || !destinationBranch) {
            Swal.fire('Required', 'Please select both employee and a new branch', 'warning');
            return;
        }

        try {
            setLoading(true);
            const response = await authenticatedFetch(`${API_URL}/api/users/${selectedEmployee._id}/change-branch`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    branch: destinationBranch,
                    department: destinationDept || selectedEmployee.department 
                })
            });

            const data = await response.json();
            if (data.success) {
                Swal.fire({
                    title: 'Transfer Successful',
                    text: data.message,
                    icon: 'success',
                    confirmButtonColor: '#3B648B'
                });
                setSelectedEmployee(null);
                setDestinationBranch('');
                setDestinationDept('');
                fetchInitialData(); // Refresh list
            } else {
                Swal.fire('Error', data.message || 'Failed to move employee', 'error');
            }
        } catch (error) {
            console.error("Error changing branch:", error);
            Swal.fire('Error', 'An error occurred during the transfer', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button className="icon-btn" onClick={() => navigate(-1)} style={{ background: 'white', border: '1px solid #E2E8F0' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="hrm-title">Change Branch</h1>
                        <p style={{ fontSize: '13px', color: '#64748B', fontWeight: '500' }}>Relocate employees between company branches</p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px', alignItems: 'start' }}>
                {/* Search & Select Panel */}
                <div style={{ background: 'white', padding: '30px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#1E293B', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Search size={18} color="#3B648B" /> Select Employee
                    </h2>
                    
                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                        <input 
                            type="text"
                            placeholder="Search by name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ 
                                width: '100%', 
                                padding: '12px 40px 12px 15px', 
                                borderRadius: '12px', 
                                border: '1.5px solid #E2E8F0', 
                                fontSize: '14px', 
                                outline: 'none' 
                            }}
                        />
                        <Search style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)' }} size={16} color="#94A3B8" />
                        
                        {searchQuery && (
                            <div style={{ 
                                position: 'absolute', 
                                top: '100%', 
                                left: 0, 
                                right: 0, 
                                background: 'white', 
                                borderRadius: '0 0 12px 12px', 
                                border: '1.5px solid #E2E8F0', 
                                borderTop: 'none',
                                zIndex: 10,
                                maxHeight: '300px',
                                overflowY: 'auto',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                            }}>
                                {filteredEmployees.length > 0 ? filteredEmployees.map(emp => (
                                    <div 
                                        key={emp._id}
                                        onClick={() => handleEmployeeSelect(emp)}
                                        style={{ 
                                            padding: '12px 15px', 
                                            cursor: 'pointer', 
                                            borderBottom: '1px solid #F1F5F9',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#F8FAFC'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{emp.name}</div>
                                        <div style={{ fontSize: '11px', color: '#64748B' }}>{emp.employeeId} • {emp.designation}</div>
                                    </div>
                                )) : (
                                    <div style={{ padding: '15px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>No employees found</div>
                                )}
                            </div>
                        )}
                    </div>

                    {selectedEmployee && (
                        <div style={{ 
                            background: 'rgba(59, 100, 139, 0.03)', 
                            border: '1.5px dashed rgba(59, 100, 139, 0.2)', 
                            borderRadius: '16px', 
                            padding: '20px',
                            animation: 'fadeIn 0.3s ease-out'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                                <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                                    {selectedEmployee.profilePhoto ? (
                                        <img src={`${API_URL}/uploads/${selectedEmployee.profilePhoto}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <User size={24} color="#CBD5E1" />
                                    )}
                                </div>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#1E293B' }}>{selectedEmployee.name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Current ID: {selectedEmployee.employeeId}</div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div style={{ padding: '12px', background: 'white', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                    <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Branch</div>
                                    <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: '700' }}>{selectedEmployee.branch || 'Not Set'}</div>
                                </div>
                                <div style={{ padding: '12px', background: 'white', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                    <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>Dept.</div>
                                    <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: '700' }}>{selectedEmployee.department || 'Not Set'}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Transfer Action Panel */}
                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)' }}>
                    <div style={{ padding: '25px 30px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1E293B' }}>Transfer Details</h2>
                        <p style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>Specify the employee's new workplace location</p>
                    </div>

                    <div style={{ padding: '40px' }}>
                        {!selectedEmployee ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <Briefcase size={32} color="#94A3B8" />
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#475569', marginBottom: '10px' }}>No Employee Selected</h3>
                                <p style={{ fontSize: '14px', color: '#94A3B8', maxWidth: '300px', margin: '0 auto' }}>Please select an employee from the search panel to proceed with the branch transfer.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>Destination Branch</label>
                                        <SearchableSelect
                                            options={[
                                                { value: '', label: 'Select Target Branch' },
                                                ...branches
                                                    .filter(b => b.branchName !== selectedEmployee?.branch)
                                                    .map(b => ({ value: b.branchName, label: b.branchName }))
                                            ]}
                                            value={destinationBranch}
                                            onChange={(val) => {
                                                setDestinationBranch(val);
                                                setDestinationDept('');
                                            }}
                                            placeholder="Select Target Branch"
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>Target Department</label>
                                        <SearchableSelect
                                            options={[
                                                { value: '', label: 'Select Target Department' },
                                                ...filteredDepartments.map(d => ({ value: d.name, label: d.name }))
                                            ]}
                                            value={destinationDept}
                                            onChange={(val) => setDestinationDept(val)}
                                            placeholder="Select Target Department"
                                            disabled={!destinationBranch}
                                        />
                                        {!destinationBranch && <p style={{ fontSize: '11px', color: '#94A3B8' }}>Select a branch first to see departments</p>}
                                    </div>

                                    <div style={{ marginTop: '20px' }}>
                                        <button 
                                            onClick={handleChangeBranch}
                                            disabled={loading || !destinationBranch}
                                            className="btn-hrm btn-hrm-primary"
                                            style={{ width: '100%', height: '52px', fontSize: '15px', gap: '10px' }}
                                        >
                                            {loading ? <><RefreshCw className="animate-spin" size={20} /> PROCESSING...</> : <><CheckCircle2 size={20} /> CONFIRM TRANSFER</>}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: '25px', border: '1px solid #E2E8F0' }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#1E293B', marginBottom: '15px', textTransform: 'uppercase' }}>Transfer Summary</h4>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 100, 139, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B648B' }}>
                                                <User size={16} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700' }}>EMPLOYEE</div>
                                                <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: '700' }}>{selectedEmployee.name}</div>
                                            </div>
                                        </div>

                                        <div style={{ position: 'relative', paddingLeft: '15px', ml: '16px', borderLeft: '2px dashed #E2E8F0', py: 2 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                                                    <MapPin size={14} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700' }}>FROM</div>
                                                    <div style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>{selectedEmployee.branch}</div>
                                                </div>
                                            </div>
                                            <div style={{ margin: '15px 0' }}></div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22C55E' }}>
                                                    <RefreshCw size={14} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700' }}>TO</div>
                                                    <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: '800' }}>{destinationBranch || '---'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '5px' }}>
                                            <p style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.6' }}>
                                                <strong>Note:</strong> Branch transfers may affect department assignment and shift availability. Ensure the target branch has the required infrastructure for this employee.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                input:focus, select:focus {
                    border-color: #3B648B !important;
                    box-shadow: 0 0 0 4px rgba(59, 100, 139, 0.08) !important;
                }
            `}</style>
        </div>
    );
};

export default ChangeBranch;
