import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Loader2, Calendar, PieChart, TrendingUp, User, Briefcase, ChevronRight, History, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';

const LeaveBalance = () => {
    const [balances, setBalances] = useState([]);
    const [selectedEmpId, setSelectedEmpId] = useState('');
    const [employeeData, setEmployeeData] = useState(null);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch all leave balances once
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/users/leave-balance`);
            const data = await res.json();
            if (data.success) {
                setBalances(data.balances || []);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            Swal.fire('Error', 'Failed to synchronize leave balances', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const fetchHistory = useCallback(async (empId) => {
        if (!empId) return;
        setDetailsLoading(true);
        try {
            const requestRes = await authenticatedFetch(`${API_URL}/api/requests/admin/all?employee=${empId}&requestType=Leave`);
            const requestData = await requestRes.json();
            if (requestData.success) {
                setLeaveRequests(requestData.requests || []);
            }
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setDetailsLoading(false);
        }
    }, []);

    const handleEmployeeSelect = (empId) => {
        setSelectedEmpId(empId);
        const specific = balances.find(b => b.id === empId);
        setEmployeeData(specific);
        fetchHistory(empId);
    };

    const filteredBalances = useMemo(() => {
        return balances.filter(b => 
            b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [balances, searchTerm]);

    const getStatusStyle = (status) => {
        switch(status) {
            case 'Approved': return { bg: '#ECFDF5', color: '#059669', icon: CheckCircle2 };
            case 'Pending': return { bg: '#FFF7ED', color: '#EA580C', icon: Clock };
            case 'Rejected': return { bg: '#FEF2F2', color: '#DC2626', icon: XCircle };
            default: return { bg: '#F1F5F9', color: 'var(--text-secondary)', icon: AlertCircle };
        }
    };

    return (
        <div style={{ padding: '35px', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '8px' }}>Individual Leave Portfolio</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: '600' }}>Comprehensive entitlement tracking and history for specific staff members.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '35px', alignItems: 'start' }}>
                
                {/* Left Sidebar: Employee List */}
                <div style={{ 
                    background: 'white', 
                    borderRadius: '24px', 
                    border: '1.5px solid #E2E8F0', 
                    overflow: 'hidden',
                    maxHeight: 'calc(100vh - 200px)',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                }}>
                    <div style={{ padding: '20px', borderBottom: '1.5px solid #F1F5F9' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input 
                                type="text" 
                                placeholder="Find employee..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 42px',
                                    background: '#F8FAFC',
                                    border: '1.5px solid #E2E8F0',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" size={24} color="#3B648B" /></div>
                        ) : filteredBalances.map(emp => (
                            <div 
                                key={emp.id}
                                onClick={() => handleEmployeeSelect(emp.id)}
                                style={{
                                    padding: '14px 16px',
                                    borderRadius: '16px',
                                    marginBottom: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: '0.2s',
                                    background: selectedEmpId === emp.id ? '#3B648B' : 'transparent',
                                    color: selectedEmpId === emp.id ? 'white' : '#1E293B',
                                    border: '1px solid transparent'
                                }}
                                onMouseOver={(e) => { if (selectedEmpId !== emp.id) e.currentTarget.style.background = '#F1F5F9'; }}
                                onMouseOut={(e) => { if (selectedEmpId !== emp.id) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ 
                                        width: '36px', 
                                        height: '36px', 
                                        borderRadius: '10px', 
                                        background: selectedEmpId === emp.id ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: '800',
                                        fontSize: '13px',
                                        color: selectedEmpId === emp.id ? 'white' : '#3B648B'
                                    }}>
                                        {emp.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '800', fontSize: '13px' }}>{emp.name}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ fontSize: '10px', opacity: 0.7, fontWeight: '700' }}>{emp.employeeId}</div>
                                            <div style={{ 
                                                fontSize: '9px', 
                                                padding: '2px 6px', 
                                                borderRadius: '4px', 
                                                background: selectedEmpId === emp.id ? 'rgba(255,255,255,0.15)' : '#F1F5F9',
                                                color: selectedEmpId === emp.id ? 'white' : '#64748B',
                                                fontWeight: '800'
                                            }}>
                                                {emp.used} / {emp.totalEntitlement}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={16} opacity={0.5} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Content: Details */}
                <div style={{ minHeight: '600px' }}>
                    {!selectedEmpId ? (
                        <div style={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            background: '#F8FAFC', 
                            borderRadius: '32px', 
                            border: '2px dashed #E2E8F0',
                            padding: '60px'
                        }}>
                            <div style={{ padding: '20px', background: 'white', borderRadius: '50%', marginBottom: '20px', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                                <User size={40} color="#CBD5E1" />
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '8px' }}>Select an Employee</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', fontWeight: '600' }}>Pick a team member from the sidebar to view their comprehensive leave balance and historical data.</p>
                        </div>
                    ) : detailsLoading ? (
                        <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Loader2 className="animate-spin" size={40} color="#3B648B" />
                        </div>
                    ) : (
                        <div style={{ animation: 'fadeIn 0.4s ease' }}>
                            
                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', marginBottom: '35px' }}>
                                <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1.5px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: '#3B648B15', color: '#3B648B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Total Entitlement</div>
                                        <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>{employeeData?.totalEntitlement?.toFixed(2) || '0.00'}</div>
                                    </div>
                                </div>
                                <div style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1.5px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: '#DC262615', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <TrendingUp size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Total Used</div>
                                        <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>{employeeData?.used?.toFixed(2) || '0.00'}</div>
                                    </div>
                                </div>
                                <div style={{ background: '#3B648B', padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px', color: 'white', boxShadow: '0 10px 20px rgba(59,100,139,0.2)' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <PieChart size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: '800', opacity: 0.8, textTransform: 'uppercase', marginBottom: '2px' }}>Remaining Balance</div>
                                        <div style={{ fontSize: '24px', fontWeight: '900' }}>{employeeData?.balance?.toFixed(2) || '0.00'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Leave Group & Policy Card */}
                            <div style={{ background: '#F8FAFC', padding: '20px 25px', borderRadius: '20px', border: '1.5px solid #E2E8F0', marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ padding: '10px', background: 'white', borderRadius: '12px', border: '1.5px solid #E2E8F0' }}>
                                        <Briefcase size={20} color="#3B648B" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Policy Group</div>
                                        <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-primary)' }}>{employeeData?.leaveGroup || 'N/A'}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Employee ID</div>
                                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#3B648B' }}>{employeeData?.employeeId}</div>
                                </div>
                            </div>

                            {/* Request History Section */}
                            <div style={{ background: 'white', borderRadius: '24px', border: '1.5px solid #E2E8F0', overflow: 'hidden' }}>
                                <div style={{ padding: '20px 25px', borderBottom: '1.5px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <History size={18} color="#3B648B" />
                                    <h3 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>Approval History</h3>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#F8FAFC' }}>
                                                <th style={{ padding: '15px 25px', textAlign: 'left', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Period</th>
                                                <th style={{ padding: '15px 25px', textAlign: 'center', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Duration</th>
                                                <th style={{ padding: '15px 25px', textAlign: 'center', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Days</th>
                                                <th style={{ padding: '15px 25px', textAlign: 'center', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</th>
                                                <th style={{ padding: '15px 25px', textAlign: 'left', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Reason</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leaveRequests.length > 0 ? leaveRequests.map((req) => {
                                                const status = getStatusStyle(req.status);
                                                const start = new Date(req.fromDate);
                                                const end = new Date(req.toDate);
                                                const diff = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
                                                const dayCount = req.leaveDuration === 'Full Day' ? diff : 0.5;

                                                return (
                                                    <tr key={req._id} style={{ borderBottom: '1.5px solid #F8FAFC' }}>
                                                        <td style={{ padding: '18px 25px' }}>
                                                            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                                {start.toLocaleDateString('en-GB')} - {end.toLocaleDateString('en-GB')}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '18px 25px', textAlign: 'center' }}>
                                                            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', background: '#F1F5F9', padding: '4px 10px', borderRadius: '8px', display: 'inline-block' }}>
                                                                {req.leaveDuration}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '18px 25px', textAlign: 'center', fontWeight: '900', color: 'var(--text-primary)' }}>
                                                            {dayCount}
                                                        </td>
                                                        <td style={{ padding: '18px 25px', textAlign: 'center' }}>
                                                            <div style={{ 
                                                                display: 'inline-flex', 
                                                                alignItems: 'center', 
                                                                gap: '6px', 
                                                                padding: '6px 12px', 
                                                                borderRadius: '50px', 
                                                                background: status.bg, 
                                                                color: status.color, 
                                                                fontSize: '11px', 
                                                                fontWeight: '800' 
                                                            }}>
                                                                <status.icon size={14} /> {req.status}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '18px 25px', maxWidth: '250px' }}>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {req.reason}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }) : (
                                                <tr>
                                                    <td colSpan="5" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '700' }}>
                                                        No history found for this employee.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
            `}} />
        </div>
    );
};

export default LeaveBalance;
