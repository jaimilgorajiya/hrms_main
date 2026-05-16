import { useNavigate } from 'react-router-dom';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, User, Briefcase, RotateCcw, Upload } from 'lucide-react';
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
                if (!activeBranchId) setActiveBranchId(branchData.branches[0]._id);
            }
            if (deptData.success) setDepartments(deptData.departments);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        Swal.fire({
            title: 'Import Personnel',
            width: '850px',
            html: `
                <div style="text-align: left; padding: 10px 5px;">
                    <style>
                        .import-steps-container {
                            display: flex;
                            gap: 24px;
                            margin-bottom: 24px;
                        }
                        .import-step-card {
                            flex: 1;
                            background: #F8FAFC;
                            border: 1px solid #E2E8F0;
                            border-radius: 20px;
                            padding: 24px;
                            transition: all 0.3s ease;
                            display: flex;
                            flex-direction: column;
                        }
                        .import-step-card:hover {
                            border-color: #CBD5E1;
                            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
                            transform: translateY(-2px);
                        }
                        .step-badge {
                            background: #E0F2FE;
                            color: #0369A1;
                            font-size: 11px;
                            font-weight: 800;
                            padding: 4px 12px;
                            border-radius: 20px;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                            margin-bottom: 16px;
                            display: inline-block;
                            width: fit-content;
                        }
                        .step-title {
                            font-weight: 800;
                            color: #0F172A;
                            font-size: 17px;
                            margin-bottom: 8px;
                            display: block;
                        }
                        .step-desc {
                            color: #64748B;
                            font-size: 13px;
                            margin-bottom: 24px;
                            display: block;
                            line-height: 1.6;
                            flex: 1;
                        }
                        .custom-file-upload {
                            border: 2px dashed #CBD5E1;
                            border-radius: 16px;
                            padding: 30px 20px;
                            text-align: center;
                            cursor: pointer;
                            transition: all 0.2s;
                            background: white;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            min-height: 140px;
                        }
                        .custom-file-upload:hover {
                            border-color: #2563EB;
                            background: #F0F7FF;
                        }
                        #file-name-display {
                            font-weight: 700;
                            color: #2563EB;
                            margin-top: 12px;
                            display: none;
                            font-size: 13px;
                            background: #EFF6FF;
                            padding: 6px 12px;
                            border-radius: 8px;
                            word-break: break-all;
                        }
                        .sample-download-btn {
                            background: white; 
                            border: 2px solid #E2E8F0; 
                            color: #475569; 
                            width: 100%; 
                            justify-content: center; 
                            font-weight: 700; 
                            padding: 14px;
                            border-radius: 12px;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            cursor: pointer;
                            transition: all 0.2s;
                        }
                        .sample-download-btn:hover {
                            border-color: #CBD5E1;
                            background: #F8FAFC;
                            color: #1E293B;
                        }
                    </style>

                    <div class="import-steps-container">
                        <div class="import-step-card">
                            <span class="step-badge">Phase 01</span>
                            <span class="step-title">Get Template</span>
                            <span class="step-desc">Download our standardized workforce schema to ensure seamless data synchronization.</span>
                            <button id="downloadSample" class="sample-download-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Download Excel
                            </button>
                        </div>

                        <div class="import-step-card">
                            <span class="step-badge">Phase 02</span>
                            <span class="step-title">Deploy Sheet</span>
                            <span class="step-desc">Upload your data. We'll automatically provision new Departments, Branches, and Roles.</span>
                            
                            <label for="importFile" class="custom-file-upload">
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                <div style="font-size: 14px; color: #475569; font-weight: 600;">Drop personnel file here</div>
                                <div style="font-size: 12px; color: #94A3B8; margin-top: 4px;">Supports XLSX & XLS</div>
                                <div id="file-name-display"></div>
                                <input type="file" id="importFile" hidden accept=".xlsx, .xls">
                            </label>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: #F0F9FF; border-radius: 12px; border: 1px solid #BAE6FD;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0369A1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <p style="margin: 0; font-size: 13px; color: #0C4A6E; font-weight: 500; line-height: 1.4;">
                            <strong>Pro Tip:</strong> Our intelligent parser will auto-resolve structural metadata to eliminate manual configuration.
                        </p>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Run Deployment',
            confirmButtonColor: '#2563EB',
            cancelButtonColor: '#F1F5F9',
            customClass: {
                title: 'premium-swal-title',
                confirmButton: 'premium-swal-confirm',
                cancelButton: 'premium-swal-cancel',
                popup: 'premium-swal-popup'
            },
            didOpen: () => {
                const downloadBtn = document.getElementById('downloadSample');
                const fileInput = document.getElementById('importFile');
                const fileNameDisplay = document.getElementById('file-name-display');

                fileInput.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) {
                        fileNameDisplay.textContent = e.target.files[0].name;
                        fileNameDisplay.style.display = 'block';
                    }
                });

                downloadBtn.addEventListener('click', async () => {
                    try {
                        const originalHtml = downloadBtn.innerHTML;
                        downloadBtn.innerHTML = 'Generating...';
                        const token = localStorage.getItem('token');
                        const response = await fetch(`${API_URL}/api/users/import/sample`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'workforce_deployment_template.xlsx';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        downloadBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Ready';
                        setTimeout(() => { downloadBtn.innerHTML = originalHtml; }, 3000);
                    } catch (err) {
                        Swal.fire('Error', 'Failed to generate template', 'error');
                    }
                });
            },
            preConfirm: () => {
                const fileInput = document.getElementById('importFile');
                if (!fileInput.files.length) {
                    Swal.showValidationMessage('Please select a personnel sheet to initiate deployment');
                    return false;
                }
                return fileInput.files[0];
            }
        })
.then(async (result) => {
            if (result.isConfirmed) {
                const file = result.value;
                const formData = new FormData();
                formData.append('file', file);

                Swal.fire({
                    title: 'Importing Employees',
                    text: 'Analyzing and processing data...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${API_URL}/api/users/import`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    const data = await response.json();
                    if (data.success) {
                        const { success, failed, errors } = data.results;
                        let detailHtml = `Successfully imported <b>${success}</b> employees.`;
                        if (failed > 0) {
                            detailHtml += `<br><br><div style="text-align: left; color: #DC2626; font-size: 13px;"><b>${failed} failures:</b><ul style="max-height: 150px; overflow-y: auto;">${errors.map(e => `<li>${e}</li>`).join('')}</ul></div>`;
                        }

                        Swal.fire({
                            title: 'Import Result',
                            html: detailHtml,
                            icon: failed === 0 ? 'success' : (success > 0 ? 'warning' : 'error')
                        });
                        fetchData();
                    } else {
                        Swal.fire('Error', data.message || 'Import failed', 'error');
                    }
                } catch (error) {
                    Swal.fire('Error', 'An error occurred during import', 'error');
                }
            }
        });
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
                    <button className="btn-hrm btn-hrm-secondary" onClick={handleImport}>
                        <Upload size={18} /> IMPORT
                    </button>
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
