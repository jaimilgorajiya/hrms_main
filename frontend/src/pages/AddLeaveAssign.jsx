import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Briefcase, CheckSquare, ChevronLeft } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const AddLeaveAssign = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const empIdFromQuery = searchParams.get('empId');

    const [employees, setEmployees] = useState([]);
    const [leaveGroups, setLeaveGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);

    // Form states
    const [selectedEmployee, setSelectedEmployee] = useState(empIdFromQuery || '');
    
    // Initial Dynamic Year Logic
    const getInitialYear = () => {
        const now = new Date();
        const year = now.getFullYear();
        const isAfterMarch = now.getMonth() >= 3;
        const bY = isAfterMarch ? year : year - 1;
        return `${bY}-${bY + 1}`;
    };

    const [selectedYear, setSelectedYear] = useState(getInitialYear());
    const [selectedLeaveGroup, setSelectedLeaveGroup] = useState('');
    const [employeeDetails, setEmployeeDetails] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [uRes, lgRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/users`),
                authenticatedFetch(`${API_URL}/api/leave-groups`)
            ]);
            
            const uData = await uRes.json();
            const lgData = await lgRes.json();
            
            if (uData.success) {
                const users = uData.users || [];
                setEmployees(users);
                if (empIdFromQuery) {
                    const emp = users.find(e => e._id === empIdFromQuery);
                    if (emp) updateEmployeeInfo(emp);
                }
            }
            if (lgData.success) setLeaveGroups(lgData.leaveGroups || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const [rowPaidLeave, setRowPaidLeave] = useState('18');
    const [rowMaxPL, setRowMaxPL] = useState('18');
    const [canApplyUnpaidLeave, setCanApplyUnpaidLeave] = useState(false);

    const updateEmployeeInfo = (emp) => {
        setEmployeeDetails({
            joiningDate: emp.dateJoined ? new Date(emp.dateJoined).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A',
            probationEndDate: emp.dateJoined ? new Date(new Date(emp.dateJoined).setDate(new Date(emp.dateJoined).getDate() + (emp.probationPeriodDays || 0))).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A'
        });

        // Prefill assignment data if already exists
        if (emp.leaveGroup) {
            setSelectedLeaveGroup(typeof emp.leaveGroup === 'object' ? emp.leaveGroup._id : emp.leaveGroup);
        }
        if (emp.noOfPaidLeaves) {
            setRowPaidLeave(emp.noOfPaidLeaves.toString());
        }
        if (emp.maxPLMonth) {
            setRowMaxPL(emp.maxPLMonth.toString());
        }
        setCanApplyUnpaidLeave(emp.canApplyUnpaidLeave || false);
    };

    const handleEmployeeChange = (id) => {
        setSelectedEmployee(id);
        const emp = employees.find(e => e._id === id);
        if (emp) updateEmployeeInfo(emp);
        else {
            setEmployeeDetails(null);
            setSelectedLeaveGroup('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEmployee) return Swal.fire('Warning', 'Select employee', 'warning');

        try {
            setFormLoading(true);
            const res = await authenticatedFetch(`${API_URL}/api/users/${selectedEmployee}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    leaveGroup: selectedLeaveGroup,
                    noOfPaidLeaves: selectedLeaveGroup === '' ? '0' : rowPaidLeave,
                    maxPLMonth: selectedLeaveGroup === '' ? '0' : rowMaxPL,
                    canApplyUnpaidLeave: selectedLeaveGroup === '' ? false : canApplyUnpaidLeave
                })
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire('Success!', selectedLeaveGroup === '' ? 'Unassigned successfully' : 'Leave assigned successfully', 'success').then(() => navigate('/admin/leave/bulk-assign'));
            } else {
                Swal.fire('Error', data.message || 'Assignment failed', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Assignment failed', 'error');
        } finally {
            setFormLoading(false);
        }
    };

    const currentGroup = leaveGroups.find(g => g._id === selectedLeaveGroup);

    useEffect(() => {
        if (currentGroup?.noOfPaidLeaves) {
            const val = Math.floor(Number(currentGroup.noOfPaidLeaves)).toString();
            setRowPaidLeave(val);
            setRowMaxPL(val);
        }
    }, [currentGroup]);

    if (loading) return (
        <div className="hrm-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <Loader2 className="animate-spin" size={40} color="#3B648B" />
        </div>
    );

    return (
        <div className="hrm-container">
            <div className="hrm-header" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => navigate(-1)} style={{ background: 'white', border: '1.5px solid #E2E8F0', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: '#64748B' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="hrm-title" style={{ fontSize: '24px' }}>Leave Assign to Employee</h1>
                        <p style={{ color: '#64748B', fontSize: '13px', fontWeight: '600' }}>Configure individual leave quotas and groups</p>
                    </div>
                </div>
            </div>

            <div className="hrm-card" style={{ padding: '35px', borderRadius: '24px' }}>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', marginBottom: '35px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '800', color: '#1E293B' }}>Employee</label>
                            {(() => {
                                const emp = employees.find(e => e._id === selectedEmployee);
                                return (
                                    <div style={{ 
                                        padding: '14px 20px', 
                                        background: '#F8FAFC', 
                                        border: '1.5px solid #E2E8F0', 
                                        borderRadius: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        <div style={{ padding: '8px', background: '#3B648B', borderRadius: '10px', color: 'white' }}>
                                            <Briefcase size={16} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>{emp?.name || 'Loading...'}</div>
                                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B' }}>{emp?.designation || 'Specialist'}</div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '800', color: '#1E293B' }}>Leave Group <span style={{ color: '#EF4444' }}>*</span></label>
                            <SearchableSelect 
                                options={[
                                    { label: '-- Unassign --', value: '' },
                                    ...leaveGroups.map(lg => ({ label: lg.leaveGroupName, value: lg._id }))
                                ]}
                                value={selectedLeaveGroup}
                                onChange={setSelectedLeaveGroup}
                                placeholder="-- Select --"
                            />
                        </div>
                    </div>

                    {employeeDetails && (
                        <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '16px', marginBottom: '35px', border: '1.5px dashed #E2E8F0', display: 'flex', gap: '50px' }}>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Date Of Joining</div>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#3B648B' }}>{employeeDetails.joiningDate}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Probation Period End Date</div>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#3B648B' }}>{employeeDetails.probationEndDate}</div>
                            </div>
                        </div>
                    )}

                    {selectedLeaveGroup && (
                        <div style={{ borderTop: '2px solid #F1F5F9', paddingTop: '20px' }}>
                            <div style={{ overflowX: 'visible', borderRadius: '16px', border: '1.5px solid #E2E8F0' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ background: '#F8FAFC' }}>
                                        <tr>
                                            <th style={{ padding: '15px 20px', fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Leave Type</th>
                                            <th style={{ padding: '15px 20px', fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Paid Leave</th>
                                            <th style={{ padding: '15px 20px', fontSize: '11px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>Max P.L / Month</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '20px', fontWeight: '700', color: '#334155' }}>{currentGroup?.isPaidLeave ? 'Paid Leave' : 'N/A'}</td>
                                            <td style={{ padding: '20px' }}>
                                                <input 
                                                    type="text" 
                                                    className="hrm-input" 
                                                    value={rowPaidLeave} 
                                                    readOnly
                                                    disabled
                                                    style={{ width: '70px', textAlign: 'center', backgroundColor: '#F8FAFC', cursor: 'not-allowed', height: '40px' }} 
                                                />
                                            </td>
                                            <td style={{ padding: '20px', width: '200px' }}>
                                                <SearchableSelect 
                                                    disabled={false}
                                                    options={Array.from({ length: Math.max(1, parseInt(rowPaidLeave) || 1) }, (_, i) => ({
                                                        value: (i + 1).toString(),
                                                        label: (i + 1).toString()
                                                    }))}
                                                    value={rowMaxPL}
                                                    onChange={setRowMaxPL}
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px', padding: '15px 20px', background: '#F8FAFC', borderRadius: '14px', border: '1.5px solid #E2E8F0' }}>
                                <input 
                                    type="checkbox" 
                                    id="canUnpaid"
                                    checked={canApplyUnpaidLeave}
                                    onChange={(e) => setCanApplyUnpaidLeave(e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3B648B' }}
                                />
                                <label htmlFor="canUnpaid" style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', cursor: 'pointer' }}>
                                    Is this employee allowed to apply for Unpaid Leaves?
                                </label>
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
                        <button type="submit" disabled={formLoading} style={{ padding: '15px 60px', background: '#3B648B', color: 'white', border: 'none', borderRadius: '15px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {formLoading ? <Loader2 className="animate-spin" size={18} /> : <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckSquare size={18} /> ADD</div>}
                        </button>
                    </div>
                </form>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }` }} />
        </div>
    );
};

export default AddLeaveAssign;
