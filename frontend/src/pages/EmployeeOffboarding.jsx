import { useNavigate } from 'react-router-dom';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import { Search, RotateCcw, User, Briefcase, ChevronDown, Filter, X } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import Swal from 'sweetalert2';

const EmployeeOffboarding = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeBranchId, setActiveBranchId] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const [userRes, branchRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
                authenticatedFetch(`${API_URL}/api/branches`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const userData = await userRes.json();
            const branchData = await branchRes.json();

            if (userData.success) {
                // Filter out those who are already on notice period (Resigned)
                const pendingOffboarding = userData.users.filter(emp => emp.status !== 'Resigned');
                setEmployees(pendingOffboarding);
            }
            if (branchData.success) setBranches(branchData.branches);

            if (branchData.success && branchData.branches.length > 0) {
                setActiveBranchId(branchData.branches[0]._id);
            }

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

    const handleMarkExEmployee = async (empId) => {
        const { value: formValues } = await Swal.fire({
            title: '<span style="font-size: 24px; font-weight: 800; color: #1E293B;">Employee Separation</span>',
            html: `
                <div style="padding: 10px 5px; text-align: left;">
                    <p style="color: #64748B; font-size: 14px; margin-bottom: 30px; line-height: 1.5; text-align: center;">Please provide the official separation details below to move this employee to the Ex-Employee records.</p>
                    
                    <div style="margin-bottom: 22px;">
                        <label style="display: block; font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.8px;">Resignation Date</label>
                        <input id="swal-resignation-date" type="date" style="width: 100%; padding: 12px 15px; border: 1.5px solid #E2E8F0; border-radius: 12px; font-size: 15px; color: #1E293B; outline: none; transition: border-color 0.2s;" value="${new Date().toISOString().split('T')[0]}">
                    </div>

                    <div style="margin-bottom: 22px;">
                        <label style="display: block; font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.8px;">Exit Date</label>
                        <input id="swal-exit-date" type="date" style="width: 100%; padding: 12px 15px; border: 1.5px solid #E2E8F0; border-radius: 12px; font-size: 15px; color: #1E293B; outline: none; transition: border-color 0.2s;" value="${new Date().toISOString().split('T')[0]}">
                    </div>

                    <div>
                        <label style="display: block; font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.8px;">Reason for Exit</label>
                        <textarea id="swal-exit-reason" style="width: 100%; height: 100px; padding: 12px 15px; border: 1.5px solid #E2E8F0; border-radius: 12px; font-size: 15px; color: #1E293B; outline: none; resize: none; font-family: inherit;" placeholder="Enter specific reasons or remarks..."></textarea>
                    </div>
                </div>
            `,
            width: '450px',
            padding: '2.5rem',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Confirm Separation',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#F1F5F9',
            customClass: {
                confirmButton: 'swal-confirm-separation',
                cancelButton: 'swal-cancel-separation',
                popup: 'swal-custom-popup'
            },
            preConfirm: () => {
                const resignationDate = document.getElementById('swal-resignation-date').value;
                const exitDate = document.getElementById('swal-exit-date').value;
                const exitReason = document.getElementById('swal-exit-reason').value;
                if (!resignationDate || !exitDate) {
                    Swal.showValidationMessage('Both dates are required');
                    return false;
                }
                return { resignationDate, exitDate, exitReason };
            }
        });

        // Add some style to the confirm/cancel buttons via CSS injection
        const style = document.createElement('style');
        style.innerHTML = `
            .swal-confirm-separation { padding: 12px 30px !important; border-radius: 12px !important; font-weight: 700 !important; font-size: 14px !important; height: 48px !important; margin-right: 10px !important; }
            .swal-cancel-separation { padding: 12px 30px !important; border-radius: 12px !important; font-weight: 700 !important; font-size: 14px !important; height: 48px !important; color: #64748B !important; }
            #swal-resignation-date:focus, #swal-exit-date:focus, #swal-exit-reason:focus { border-color: #3B648B !important; box-shadow: 0 0 0 4px rgba(59, 100, 139, 0.1); }
            .swal-custom-popup { border-radius: 24px !important; }
        `;
        document.head.appendChild(style);

        if (formValues) {
            try {
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                const exitDateObj = new Date(formValues.exitDate);
                const targetStatus = exitDateObj > today ? 'Resigned' : 'Ex-Employee';

                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/users/${empId}`, {
                    method: 'PUT',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        status: targetStatus,
                        resignationDate: formValues.resignationDate,
                        exitDate: formValues.exitDate,
                        exitReason: formValues.exitReason
                    })
                });
                
                const resData = await response.json();
                if (resData.success) {
                    const isFuture = targetStatus === 'Resigned';
                    Swal.fire({
                        title: 'Success!',
                        text: isFuture 
                            ? `Employee marked as Resigned. They will move to Ex-Employee list after ${formValues.exitDate}.`
                            : 'Employee moved to Ex-Employee list.',
                        icon: 'success',
                        timer: 3000,
                        showConfirmButton: false
                    }).then(() => {
                        if (isFuture) {
                            fetchData();
                        } else {
                            navigate('/admin/employees/ex');
                        }
                    });
                } else {
                    Swal.fire('Error', resData.message || 'Failed to update status', 'error');
                }
            } catch (error) {
                console.error("Mark Ex-Employee error:", error);
                Swal.fire('Error', error.message, 'error');
            }
        }
    };

    const handleMarkExEmployeeTable = async (empId) => {
        handleMarkExEmployee(empId);
    };

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (emp.employeeId && emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesBranch = activeBranchId === 'all' || 
                                 emp.branch === activeBranchId || 
                                 (branches.find(b => b._id === activeBranchId)?.branchName === emp.branch) ||
                                 (emp.workSetup?.location === activeBranchId) ||
                                 (branches.find(b => b._id === activeBranchId)?.branchName === emp.workSetup?.location);

            const matchesSelected = selectedEmployeeId === 'all' || emp._id === selectedEmployeeId;

            return matchesSearch && matchesBranch && matchesSelected;
        });
    }, [employees, searchTerm, activeBranchId, selectedEmployeeId, branches]);

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
        setSelectedEmployeeId('all');
        if (branches.length > 0) setActiveBranchId(branches[0]._id);
        else setActiveBranchId('all');
    };

    if (loading) return <div className="loading-container">Loading Employees...</div>;

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <h1 className="hrm-title">Employee Offboarding</h1>
                <div className="hrm-header-actions" style={{ gap: '15px' }}>
                    <div style={{ width: '250px' }}>
                        <SearchableSelect 
                            options={[{ value: 'all', label: '-- Select Employee --' }, ...employees.map(e => ({ value: e._id, label: e.name }))]}
                            value={selectedEmployeeId}
                            onChange={setSelectedEmployeeId}
                            placeholder="Select Employee"
                        />
                    </div>
                    <button 
                        className="btn-hrm" 
                        onClick={handleReset}
                        style={{ height: '48px', padding: '0 25px', background: '#475569', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        RESET
                    </button>
                </div>
            </div>

            {/* Branch Selection Tabs */}
            <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginBottom: '40px', 
                overflowX: 'auto', 
                padding: '4px 4px 12px',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
            }}>
                {branches.map(branch => {
                    const isActive = activeBranchId === branch._id;
                    const count = employees.filter(emp => 
                        emp.branch === branch.branchName || 
                        emp.branch === branch._id ||
                        emp.workSetup?.location === branch.branchName ||
                        emp.workSetup?.location === branch._id
                    ).length;
                    
                    return (
                        <button 
                            key={branch._id} 
                            onClick={() => setActiveBranchId(branch._id)}
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
                                minWidth: 'fit-content'
                            }}
                        >
                            <span>{branch.branchShortName || branch.branchName}</span>
                            <span style={{ 
                                background: isActive ? 'rgba(255, 255, 255, 0.15)' : '#F1F5F9', 
                                color: isActive ? 'white' : '#3B648B', 
                                padding: '2px 10px', 
                                borderRadius: '8px', 
                                fontSize: '11px',
                                fontWeight: '800',
                                minWidth: '24px',
                                textAlign: 'center'
                            }}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Department Groups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '45px' }}>
                {Object.entries(groupedByDepartment).length === 0 ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '100px 0', 
                        color: '#94A3B8', 
                        background: 'white', 
                        borderRadius: '24px',
                        border: '2px dashed #E2E8F0'
                    }}>
                        <User size={48} style={{ marginBottom: '15px', opacity: 0.3 }} />
                        <p style={{ fontSize: '16px', fontWeight: '500' }}>No active employees found in this branch.</p>
                    </div>
                ) : (
                    Object.entries(groupedByDepartment).map(([deptName, deptEmployees]) => (
                        <div key={deptName}>
                            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#64748B', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {deptName} <span style={{ color: '#94A3B8' }}>({deptEmployees.length})</span>
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {deptEmployees.map(emp => (
                                    <div 
                                        key={emp._id} 
                                        className="offboarding-row"
                                        style={{ 
                                            background: '#fff', 
                                            borderRadius: '100px', 
                                            padding: '8px 8px 8px 15px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between',
                                            border: '1.5px solid #F1F5F9',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            cursor: 'default'
                                        }}
                                    >
                                        {/* Profile & Identity */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: '1.5' }}>
                                            <div style={{ 
                                                width: '45px', 
                                                height: '45px', 
                                                borderRadius: '50%', 
                                                overflow: 'hidden', 
                                                background: '#F1F5F9',
                                                border: '2px solid #fff',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {emp.profilePhoto ? (
                                                    <img src={`${API_URL}/uploads/${emp.profilePhoto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#3B648B' }}>{getInitials(emp.name)}</span>
                                                )}
                                            </div>

                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.3px' }}>{emp.name}</div>
                                                    {emp.status === 'Resigned' && (
                                                        <span style={{ 
                                                            fontSize: '9.5px', 
                                                            fontWeight: '800', 
                                                            background: '#FEF2F2', 
                                                            color: '#EF4444', 
                                                            padding: '2px 10px', 
                                                            borderRadius: '50px',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.4px',
                                                            border: '1px solid rgba(239, 68, 68, 0.2)'
                                                        }}>
                                                            Notice Period
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '11px', fontWeight: '700', color: '#3B648B', opacity: 0.8 }}>{emp.employeeId || 'IIPL-000'}</div>
                                            </div>
                                        </div>

                                        {/* Designation */}
                                        <div style={{ flex: '1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Briefcase size={14} color="#64748B" />
                                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>{emp.designation || 'Specialist'}</span>
                                        </div>

                                        {/* Branch */}
                                        <div style={{ flex: '1', fontSize: '13px', color: '#64748B', fontWeight: '600' }}>
                                            {emp.branch || emp.workSetup?.location || 'Unassigned'}
                                        </div>

                                        {/* Action Button */}
                                        <div style={{ flex: '1.5', display: 'flex', justifyContent: 'flex-end' }}>
                                            <button 
                                                onClick={() => handleMarkExEmployee(emp._id)}
                                                style={{
                                                    padding: '10px 22px',
                                                    background: '#BE123C',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '50px',
                                                    fontSize: '11px',
                                                    fontWeight: '800',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.6px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    boxShadow: '0 4px 12px rgba(190, 18, 60, 0.15)'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                                                onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                                            >
                                                Mark as Ex-Employee
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .offboarding-row:hover {
                    transform: translateX(5px);
                    border-color: #BE123C20;
                    box-shadow: 0 8px 15px -5px rgba(190, 18, 60, 0.08);
                }
            `}} />
        </div>
    );
};

export default EmployeeOffboarding;
