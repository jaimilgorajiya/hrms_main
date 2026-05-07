import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Edit, RotateCcw, Building2, Briefcase, Users } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';

const AssignBulkLeave = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/users`);
            const data = await res.json();
            if (data.success) {
                setEmployees(data.users || []);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            Swal.fire('Error', 'Failed to synchronize with server', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch = !searchTerm || 
                emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                emp.department?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [employees, searchTerm]);

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px' }}>Assign Leaves</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px', fontWeight: '600' }}>Manage annual leave allotments and bulk credits for the roster</p>
                </div>
                <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                        type="text" 
                        placeholder="Search by name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '14px 16px 14px 48px',
                            background: 'white',
                            border: '1.5px solid #E2E8F0',
                            borderRadius: '14px',
                            fontSize: '14px',
                            fontWeight: '600',
                            outline: 'none',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                    />
                </div>
            </div>

            {/* Table Card */}
            <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ padding: '8px', background: 'rgba(59, 100, 139, 0.1)', borderRadius: '10px' }}>
                            <Users size={18} color="#3B648B" />
                        </div>
                        <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Enrollment Roster</h2>
                   </div>
                   <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                        Total: <span style={{ color: '#3B648B' }}>{filteredEmployees.length}</span> Employees
                   </div>
                </div>

                {loading ? (
                    <div style={{ padding: '100px', textAlign: 'center' }}>
                        <Loader2 className="animate-spin" size={40} color="#3B648B" style={{ margin: '0 auto' }} />
                        <p style={{ marginTop: '20px', color: 'var(--text-secondary)', fontWeight: '700' }}>Synchronizing data...</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>No.</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', minWidth: '150px' }}>Manage</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', minWidth: '250px' }}>Employee Details</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Work Hub</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Department</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Joining</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Paid Leave</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.map((emp, idx) => (
                                    <tr key={emp._id} style={{ borderBottom: '1px solid #F1F5F9', transition: '0.15s' }}>
                                        <td style={{ padding: '16px 24px', fontWeight: '700', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <button 
                                                onClick={() => navigate(`/admin/leave/assign/add?empId=${emp._id}`)}
                                                style={{ 
                                                    background: '#3B648B', color: 'white', padding: '10px 16px', 
                                                    borderRadius: '10px', border: 'none', fontWeight: '800', fontSize: '11px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                    width: 'fit-content', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(59, 100, 139, 0.2)'
                                                }}
                                            >
                                                <Edit size={14} /> {emp.leaveGroup ? 'EDIT' : 'ASSIGN BULK'}
                                            </button>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#F1F5F9', border: '1.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', color: '#3B648B', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                    {emp.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '14px' }}>{emp.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>{emp.employeeId || 'IIPL-000'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                                <Building2 size={14} color="var(--text-muted)" /> {emp.branch || 'HO'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                                <Briefcase size={14} color="var(--text-muted)" /> {emp.department || 'N/A'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                            {emp.dateJoined ? new Date(emp.dateJoined).toLocaleDateString('en-GB') : 'N/A'}
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                            <div style={{ 
                                                fontWeight: '900', 
                                                color: (emp.leaveGroup && typeof emp.leaveGroup === 'object' && emp.leaveGroup.noOfPaidLeaves) ? '#3B648B' : '#94A3B8', 
                                                background: '#F1F5F9', 
                                                padding: '6px 12px', 
                                                borderRadius: '8px', 
                                                border: '1px solid #E2E8F0', 
                                                display: 'inline-block' 
                                            }}>
                                                {(emp.leaveGroup && typeof emp.leaveGroup === 'object' && emp.leaveGroup.noOfPaidLeaves) ? Number(emp.leaveGroup.noOfPaidLeaves).toFixed(2) : '0.00'}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                tr:hover { background-color: #F8FAFC !important; }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />
        </div>
    );
};

export default AssignBulkLeave;
