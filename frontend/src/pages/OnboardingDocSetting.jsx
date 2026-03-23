import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Check, 
    ChevronLeft, 
    ChevronRight, 
    AlertCircle,
    Save,
    UserCheck,
    Briefcase,
    Building2
} from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const OnboardingDocSetting = () => {
    const [branches, setBranches] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [filteredDepartments, setFilteredDepartments] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedBranch) {
            const branchObj = branches.find(b => b.branchName === selectedBranch);
            if (branchObj) {
                const filtered = allDepartments.filter(dept => 
                    dept.branchId.toString() === branchObj._id.toString()
                );
                setFilteredDepartments(filtered);
            }
        } else {
            setFilteredDepartments([]);
        }
        setSelectedDepartment('');
        setEmployees([]);
    }, [selectedBranch, branches, allDepartments]);

    useEffect(() => {
        if (selectedBranch && selectedDepartment) {
            fetchEmployees();
        } else {
            setEmployees([]);
        }
    }, [selectedBranch, selectedDepartment]);

    const fetchInitialData = async () => {
        try {
            const [branchRes, deptRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/branches`),
                authenticatedFetch(`${API_URL}/api/departments`)
            ]);
            
            const branchData = await branchRes.json();
            const deptData = await deptRes.json();

            if (branchData.success) setBranches(branchData.branches);
            if (deptData.success) setAllDepartments(deptData.departments);
        } catch (error) {
            console.error("Error fetching initial data:", error);
        }
    };

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const res = await authenticatedFetch(`${API_URL}/api/onboarding-doc-settings/employees?branch=${selectedBranch}&department=${selectedDepartment}`);
            const data = await res.json();
            setEmployees(data || []);
        } catch (error) {
            console.error("Error fetching employees:", error);
            Swal.fire('Error', 'Failed to fetch employees', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateIndividual = async (empId, val) => {
        try {
            const res = await authenticatedFetch(`${API_URL}/api/onboarding-doc-settings/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId: empId, requirementType: val })
            });
            if (res.ok) {
                setEmployees(prev => prev.map(emp => 
                    emp._id === empId ? { ...emp, setting: val } : emp
                ));
            }
        } catch (error) {
            Swal.fire('Error', 'Update failed', 'error');
        }
    };

    const handleBulkUpdate = async () => {
        if (selectedIds.length === 0) {
            return Swal.fire('Info', 'Please select at least one employee', 'info');
        }

        const { value: setting } = await Swal.fire({
            title: 'Bulk Update Setting',
            input: 'select',
            inputOptions: {
                'Always Required': 'Always Required',
                'Never Required': 'Never Required'
            },
            inputPlaceholder: 'Select setting',
            showCancelButton: true,
            confirmButtonColor: '#3B648B',
            inputValidator: (value) => {
                return new Promise((resolve) => {
                    if (value) resolve();
                    else resolve('You need to select a setting');
                });
            }
        });

        if (setting) {
            try {
                const res = await authenticatedFetch(`${API_URL}/api/onboarding-doc-settings/bulk-update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ employeeIds: selectedIds, requirementType: setting })
                });
                if (res.ok) {
                    Swal.fire('Success', 'Updated multiple records', 'success');
                    setSelectedIds([]);
                    fetchEmployees();
                }
            } catch (error) {
                Swal.fire('Error', 'Bulk update failed', 'error');
            }
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filteredEmployees.map(e => e._id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleRowSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredEmployees = employees.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <h1 className="hrm-title">Onboarding Doc. Setting</h1>
                {selectedBranch && selectedDepartment && (
                    <div className="hrm-header-actions">
                        <button 
                            onClick={handleBulkUpdate} 
                            className="btn-hrm btn-hrm-primary"
                            disabled={selectedIds.length === 0}
                            style={{ textTransform: 'uppercase' }}
                        >
                            <Save size={18} /> UPDATE MULTIPLE
                        </button>
                    </div>
                )}
            </div>

            {/* Selection Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 300px', gap: '20px', marginBottom: '30px' }}>
                <SearchableSelect 
                    label="-- Select Branch --"
                    options={branches.map(b => ({ value: b.branchName, label: b.branchName }))}
                    value={selectedBranch}
                    onChange={(val) => setSelectedBranch(val)}
                />
                <SearchableSelect 
                    label="-- Select Department --"
                    options={filteredDepartments.map(d => ({ value: d.name, label: d.name }))}
                    value={selectedDepartment}
                    onChange={(val) => setSelectedDepartment(val)}
                    disabled={!selectedBranch}
                />
            </div>

            {(!selectedBranch || !selectedDepartment) ? (
                <div className="hrm-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#3B648B', fontWeight: '500' }}>
                    <AlertCircle size={20} />
                    Note : Please Select Branch And Department
                </div>
            ) : (
                <div className="hrm-card">
                    <div className="hrm-card-body">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input 
                                    type="text"
                                    placeholder="Search Employee..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="hrm-input"
                                    style={{ paddingLeft: '40px', width: '250px' }}
                                />
                            </div>
                        </div>

                        <div className="hrm-table-wrapper">
                            <table className="hrm-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}>
                                            <input 
                                                type="checkbox" 
                                                onChange={handleSelectAll} 
                                                checked={selectedIds.length === filteredEmployees.length && filteredEmployees.length > 0} 
                                            />
                                        </th>
                                        <th>Sr. No</th>
                                        <th>Employee Name</th>
                                        <th>Department</th>
                                        <th style={{ width: '250px' }}>Document</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Loading Employees...</td></tr>
                                    ) : filteredEmployees.length === 0 ? (
                                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>No employees found in this criteria.</td></tr>
                                    ) : (
                                        filteredEmployees.map((emp, index) => (
                                            <tr key={emp._id}>
                                                <td>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedIds.includes(emp._id)} 
                                                        onChange={() => handleRowSelect(emp._id)} 
                                                    />
                                                </td>
                                                <td>{index + 1}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <UserCheck size={16} color="#64748b" />
                                                        </div>
                                                        {emp.name}
                                                    </div>
                                                </td>
                                                <td>{emp.department || 'N/A'}</td>
                                                <td>
                                                    <SearchableSelect 
                                                        options={[
                                                            { value: 'Always Required', label: 'Always Required' },
                                                            { value: 'Never Required', label: 'Never Required' }
                                                        ]}
                                                        value={emp.setting}
                                                        onChange={(val) => handleUpdateIndividual(emp._id, val)}
                                                        style={{ width: '200px' }}
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnboardingDocSetting;
