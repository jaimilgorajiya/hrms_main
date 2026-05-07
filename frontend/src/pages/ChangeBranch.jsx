import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Briefcase, User, Search, RefreshCw, CheckCircle2, ChevronRight, AlertCircle, Save } from 'lucide-react';
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

        const result = await Swal.fire({
            title: 'Confirm Transfer?',
            text: `Are you sure you want to transfer ${selectedEmployee.name} to ${destinationBranch}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: 'var(--primary-blue)',
            cancelButtonColor: 'var(--text-muted)',
            confirmButtonText: 'Yes, Confirm Transfer'
        });

        if (!result.isConfirmed) return;

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
                    timer: 2000,
                    showConfirmButton: false
                });
                setSelectedEmployee(null);
                setDestinationBranch('');
                setDestinationDept('');
                fetchInitialData();
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
        <div className="hrm-container" style={{ maxWidth: '1200px' }}>
            <div className="hrm-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button className="icon-btn" onClick={() => navigate(-1)} style={{ background: 'white', border: '1px solid #E2E8F0' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="hrm-title">Change Branch</h1>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Securely transfer employees between organizational branches and departments
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px', alignItems: 'start' }}>
                {/* Left Panel: Search & Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="hrm-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <div style={{ background: 'var(--primary-light)', padding: '8px', borderRadius: '10px', color: 'var(--primary-blue)' }}>
                                <Search size={18} />
                            </div>
                            <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>Select Employee</h2>
                        </div>
                        
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="text"
                                className="hrm-input"
                                placeholder="Search by name or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ paddingLeft: '44px', height: '52px' }}
                            />
                            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                            
                            {searchQuery && (
                                <div style={{ 
                                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                                    background: 'white', borderRadius: '16px',
                                    border: '1px solid var(--border)', zIndex: 100,
                                    maxHeight: '320px', overflowY: 'auto',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                                }}>
                                    {filteredEmployees.length > 0 ? filteredEmployees.map(emp => (
                                        <div key={emp._id} onClick={() => handleEmployeeSelect(emp)}
                                            style={{ 
                                                padding: '12px 16px', cursor: 'pointer', 
                                                borderBottom: '1px solid var(--border-subtle)', 
                                                transition: 'all 0.2s ease',
                                                display: 'flex', alignItems: 'center', gap: '12px'
                                            }}
                                            className="search-item-hover"
                                        >
                                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User size={20} color="var(--text-muted)" />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-dark)' }}>{emp.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.employeeId} • {emp.designation}</div>
                                            </div>
                                            <ChevronRight size={16} color="var(--border)" style={{ marginLeft: 'auto' }} />
                                        </div>
                                    )) : (
                                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                            No matches found for "{searchQuery}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedEmployee && (
                        <div className="hrm-card" style={{ padding: '24px', border: '1px solid var(--primary-blue)', background: 'linear-gradient(to bottom, #FFFFFF 0%, #F8FAFC 100%)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ 
                                    width: '64px', height: '64px', borderRadius: '16px', 
                                    background: 'white', display: 'flex', alignItems: 'center', 
                                    justifyContent: 'center', border: '1px solid var(--border)', 
                                    overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                }}>
                                    {selectedEmployee.profilePhoto ? (
                                        <img src={`${API_URL}/uploads/${selectedEmployee.profilePhoto}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : <User size={32} color="var(--border)" />}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-dark)', margin: '0 0 4px' }}>{selectedEmployee.name}</h3>
                                    <span className="hrm-badge hrm-badge-primary">{selectedEmployee.employeeId}</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>Current Branch</div>
                                    <div style={{ fontSize: '14px', color: 'var(--text-dark)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Building2 size={14} color="var(--primary-blue)" /> {selectedEmployee.branch || 'Not Set'}
                                    </div>
                                </div>
                                <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>Department</div>
                                    <div style={{ fontSize: '14px', color: 'var(--text-dark)', fontWeight: '700' }}>{selectedEmployee.department || 'Not Set'}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel: Transfer Config */}
                <div className="hrm-card" style={{ padding: 0, overflow: 'visible' }}>
                    <div className="hrm-modal-header" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)', borderRadius: '16px 16px 0 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: 'var(--primary-gradient)', padding: '10px', borderRadius: '12px', color: 'white' }}>
                                <RefreshCw size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>Transfer Details</h3>
                                <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Configure the new destination for the selected employee</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '32px' }}>
                        {!selectedEmployee ? (
                            <div style={{ textAlign: 'center', padding: '60px 0' }}>
                                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                    <Briefcase size={40} color="var(--border)" />
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '8px' }}>No Employee Selected</h3>
                                <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '340px', margin: '0 auto', lineHeight: '1.6' }}>
                                    Search and select an employee from the left panel to begin the transfer process.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '32px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div className="hrm-form-group" style={{ margin: 0 }}>
                                        <SearchableSelect
                                            label="Destination Branch"
                                            required={true}
                                            options={branches.filter(b => b.branchName !== selectedEmployee?.branch).map(b => ({ value: b.branchName, label: b.branchName }))}
                                            value={destinationBranch}
                                            onChange={(val) => { setDestinationBranch(val); setDestinationDept(''); }}
                                            placeholder="Select Target Branch"
                                        />
                                    </div>
                                    <div className="hrm-form-group" style={{ margin: 0 }}>
                                        <SearchableSelect
                                            label="Target Department"
                                            options={filteredDepartments.map(d => ({ value: d.name, label: d.name }))}
                                            value={destinationDept}
                                            onChange={(val) => setDestinationDept(val)}
                                            placeholder="Select Target Department"
                                            disabled={!destinationBranch}
                                        />
                                        {!destinationBranch && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                                <AlertCircle size={14} /> Select a branch first to see departments
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                                        <button 
                                            onClick={handleChangeBranch} 
                                            disabled={loading || !destinationBranch} 
                                            className="btn-hrm btn-hrm-primary" 
                                            style={{ width: '100%', height: '52px', fontSize: '15px', letterSpacing: '0.02em' }}
                                        >
                                            {loading ? <><RefreshCw className="animate-spin" size={20} /> PROCESSING...</> : <><Save size={20} /> CONFIRM TRANSFER</>}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ background: '#F8FAFC', borderRadius: '20px', padding: '24px', border: '1px solid #E2E8F0' }}>
                                    <h4 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Transfer Summary
                                    </h4>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-blue)', border: '1px solid var(--border-subtle)' }}>
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>EMPLOYEE</div>
                                                <div style={{ fontSize: '14px', color: 'var(--text-dark)', fontWeight: '700' }}>{selectedEmployee.name}</div>
                                            </div>
                                        </div>

                                        <div style={{ paddingLeft: '17px', borderLeft: '2px dashed #CBD5E1', margin: '4px 0 4px 17px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                                                <div style={{ position: 'absolute', left: '-22px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '8px', borderRadius: '50%', background: '#CBD5E1' }}></div>
                                                <MapPin size={16} color="var(--text-muted)" />
                                                <div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>FROM</div>
                                                    <div style={{ fontSize: '14px', color: '#64748B', fontWeight: '600' }}>{selectedEmployee.branch}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                                                <div style={{ position: 'absolute', left: '-22px', top: '50%', transform: 'translateY(-50%)', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-blue)' }}></div>
                                                <RefreshCw size={16} color="var(--primary-blue)" />
                                                <div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>TO</div>
                                                    <div style={{ fontSize: '14px', color: 'var(--text-dark)', fontWeight: '800' }}>{destinationBranch || '---'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ background: '#EFF6FF', padding: '16px', borderRadius: '12px', border: '1px solid #DBEAFE', marginTop: '8px' }}>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <AlertCircle size={16} color="var(--primary-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                <p style={{ fontSize: '11px', color: '#1E40AF', lineHeight: '1.5', margin: 0, fontWeight: '500' }}>
                                                    Transfers are logged in the employee history. Department assignment may need verification after transfer.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .search-item-hover:hover {
                    background-color: #F8FAFC !important;
                }
                .search-item-hover:hover h4 {
                    color: var(--primary-blue) !important;
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ChangeBranch;

