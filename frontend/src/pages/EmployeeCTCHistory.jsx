import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, History, Users, Wallet, CreditCard, 
    TrendingUp, Calendar, Building2, Briefcase, Eye, ArrowUpRight 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import '../pages/AdminDashboard.css';

const EmployeeCTCHistory = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [employeeDetails, setEmployeeDetails] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    useEffect(() => {
        fetchRevisionHistory();
    }, [id]);

    const fetchRevisionHistory = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch(`${API_URL}/api/employee-ctc/${id}`);
            const data = await response.json();
            if (data.success && data.ctc) {
                const emp = data.ctc.employeeId || {};
                setEmployeeDetails(emp);

                // Construct list of revisions: Current + history
                // salaryGroup may be populated object OR a plain string ID
                const sgRaw = emp.workSetup?.salaryGroup;
                const currentSalaryGroup =
                    (sgRaw && typeof sgRaw === 'object' && sgRaw.groupName)
                        ? sgRaw.groupName
                        : (typeof sgRaw === 'string' ? sgRaw : '');

                const currentItem = {
                    status: 'Current',
                    branch: emp.branch || '',
                    department: emp.department || '',
                    designation: emp.designation || '',
                    salaryGroup: currentSalaryGroup,
                    netSalary: data.ctc.netSalary,
                    monthlyGross: data.ctc.monthlyGross,
                    annualCTC: data.ctc.annualCTC,
                    effectiveDate: data.ctc.effectiveDate,
                    endDate: null,
                    updatedAt: data.ctc.updatedAt || new Date()
                };

                const historyList = (data.ctc.history || []).map(h => ({
                    status: 'Previous',
                    branch: h.branch || emp.branch || '',
                    department: h.department || emp.department || '',
                    designation: h.designation || emp.designation || '',
                    salaryGroup: h.salaryGroup || '',
                    netSalary: h.netSalary,
                    monthlyGross: h.monthlyGross,
                    annualCTC: h.annualCTC,
                    effectiveDate: h.effectiveDate,
                    endDate: h.endDate,
                    updatedAt: h.updatedAt || h.effectiveDate || 0
                }));

                const allRevisions = [currentItem, ...historyList];

                // Sort chronologically ascending (oldest first) to compute increments sequentially
                const sortedChrono = [...allRevisions].sort((a, b) => {
                    const dateA = new Date(a.effectiveDate || 0);
                    const dateB = new Date(b.effectiveDate || 0);
                    if (dateA.getTime() !== dateB.getTime()) {
                        return dateA - dateB;
                    }
                    if (a.status === 'Previous' && b.status === 'Current') return -1;
                    if (a.status === 'Current' && b.status === 'Previous') return 1;
                    const updateA = new Date(a.updatedAt || 0);
                    const updateB = new Date(b.updatedAt || 0);
                    return updateA - updateB;
                });

                for (let i = 0; i < sortedChrono.length; i++) {
                    if (i === 0) {
                        sortedChrono[i].calculatedIncrement = 0;
                    } else {
                        const prevAnnual = sortedChrono[i - 1].annualCTC || 0;
                        const currAnnual = sortedChrono[i].annualCTC || 0;
                        if (prevAnnual > 0) {
                            sortedChrono[i].calculatedIncrement = Math.round(((currAnnual - prevAnnual) / prevAnnual) * 100);
                        } else {
                            sortedChrono[i].calculatedIncrement = 0;
                        }
                    }
                }

                // Sort descending (newest first) for rendering
                const newestFirst = [...sortedChrono].reverse();
                setHistoryData(newestFirst);


            } else {
                SwDetailsFail(data.message || 'Failed to load revision history.');
            }
        } catch (error) {
            console.error("Error fetching revision history:", error);
            SwDetailsFail('Server connection error.');
        } finally {
            setLoading(false);
        }
    };

    const SwDetailsFail = (msg) => {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: msg,
            confirmButtonColor: '#3B648B'
        }).then(() => {
            navigate('/admin/payroll/employee-ctc');
        });
    };

    if (loading) {
        return (
            <div className="hrm-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading Revision History...</p>
            </div>
        );
    }

    if (!employeeDetails) {
        return (
            <div className="hrm-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No revision history data found.</p>
            </div>
        );
    }

    const getInitials = (name) => {
        if (!name) return 'EE';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    return (
        <div className="hrm-container view-ctc-wrapper">
            {/* Top Header Section */}
            <div className="view-ctc-header" style={{ marginBottom: '20px' }}>
                <div className="header-left">
                    <button 
                        onClick={() => navigate('/admin/payroll/employee-ctc')} 
                        className="icon-btn"
                        style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        title="Back to List"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="view-title">Salary Revision History</h1>
                </div>
            </div>

            {/* Employee Info Banner */}
            <div className="emp-info-banner">
                <div className="emp-avatar-initials">
                    {getInitials(employeeDetails.name)}
                </div>
                <div className="emp-info-main">
                    <p className="emp-info-name">{employeeDetails.name || '--'}</p>
                    <div className="emp-info-chips">
                        <span className="emp-chip emp-chip-id">
                            {employeeDetails.employeeId || '--'}
                        </span>
                        {employeeDetails.designation && (
                            <span className="emp-chip">
                                <Briefcase size={12} />
                                {employeeDetails.designation}
                            </span>
                        )}
                        {employeeDetails.department && (
                            <span className="emp-chip">
                                <Building2 size={12} />
                                {employeeDetails.department}
                            </span>
                        )}
                        {employeeDetails.branch && (
                            <span className="emp-chip">
                                <Calendar size={12} />
                                {employeeDetails.branch}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Revisions Table Card */}
            <div className="hrm-card" style={{ marginBottom: '32px', padding: '24px' }}>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Salary Revision Log
                </h4>
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <table className="hrm-table" style={{ margin: 0, minWidth: '1100px' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '90px' }}>Status</th>
                                <th>Branch</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Salary Group</th>
                                <th>Net Salary</th>
                                <th>Gross Salary</th>
                                <th>Increment %</th>
                                <th>CTC</th>
                                <th>CTC Annum</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyData.map((item, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <span style={item.status === 'Current' ? {
                                            background: 'rgba(59, 100, 139, 0.15)',
                                            color: 'var(--primary-blue)',
                                            border: '1px solid rgba(59, 100, 139, 0.3)',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            display: 'inline-block'
                                        } : {
                                            background: 'rgba(100, 116, 139, 0.12)',
                                            color: 'var(--text-secondary)',
                                            border: '1px solid rgba(100, 116, 139, 0.25)',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: '500',
                                            display: 'inline-block'
                                        }}>
                                            {item.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>{item.branch || '-'}</td>
                                    <td>{item.department || '-'}</td>
                                    <td>{item.designation || '-'}</td>
                                    <td>{item.salaryGroup || '-'}</td>
                                    <td style={{ fontWeight: '600' }}>₹{Number(item.netSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td>₹{Number(item.monthlyGross || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td>
                                        {item.calculatedIncrement > 0 ? (
                                            <span style={{ color: 'var(--success)', fontWeight: '600' }}>
                                                +{item.calculatedIncrement}%
                                            </span>
                                        ) : item.calculatedIncrement < 0 ? (
                                            <span style={{ color: 'var(--danger)', fontWeight: '600' }}>
                                                {item.calculatedIncrement}%
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                                        )}
                                    </td>
                                    <td>₹{Number(item.monthlyGross || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td style={{ fontWeight: '600' }}>₹{Number(item.annualCTC || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td>{formatDate(item.effectiveDate)}</td>
                                    <td>{formatDate(item.endDate)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Chart Card */}
            <div className="hrm-card" style={{ padding: '24px', background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Salary Increment Trend
                </h4>
                <div style={{ width: '100%', height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={[...historyData].reverse().map((item, idx, arr) => {
                                let label = formatDate(item.effectiveDate);
                                const duplicateDates = arr.filter(x => formatDate(x.effectiveDate) === label);
                                if (duplicateDates.length > 1) {
                                    if (item.status === 'Current') {
                                        label += ' (Current)';
                                    } else {
                                        const prevDuplicates = duplicateDates.filter(x => x.status === 'Previous');
                                        const sortedPrev = [...prevDuplicates].sort((a, b) => new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0));
                                        const revIndex = sortedPrev.findIndex(x => x.updatedAt === item.updatedAt);
                                        label += ` (Rev ${revIndex !== -1 ? revIndex + 1 : idx + 1})`;
                                    }
                                }
                                return {
                                    period: label,
                                    'Net Salary': item.netSalary || 0,
                                    'Annual CTC': item.annualCTC || 0
                                };
                            })}
                            margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                            <XAxis dataKey="period" stroke="var(--text-secondary)" fontSize={12} tickLine={false} />
                            <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} />
                            <Tooltip 
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div style={{
                                                background: 'var(--card-bg)',
                                                border: '1px solid var(--border)',
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                color: 'var(--text-main)'
                                            }}>
                                                <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                                    {payload[0].payload.period}
                                                </p>
                                                <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '600', color: 'var(--primary-blue)' }}>
                                                    Net Salary: ₹{payload[0].value.toLocaleString('en-IN')}
                                                </p>
                                                <p style={{ margin: '0', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                                                    Annual CTC: ₹{payload[0].payload['Annual CTC'].toLocaleString('en-IN')}
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="Net Salary" 
                                stroke="var(--primary-blue)" 
                                strokeWidth={3} 
                                activeDot={{ r: 8 }} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                {historyData.length <= 1 && (
                    <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                        Only one configuration exists. Progression trend will plot dynamically on future revisions.
                    </p>
                )}
            </div>

            {/* Styles */}
            <style>
                {`
                    .view-ctc-wrapper {
                        font-family: 'Inter', sans-serif;
                        padding-bottom: 60px;
                        max-width: 100%;
                        margin: 0 auto;
                    }

                    .view-ctc-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                    }

                    .header-left {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    }

                    .view-title {
                        font-size: 24px;
                        font-weight: 800;
                        color: var(--text-dark);
                        margin: 0;
                        letter-spacing: -0.5px;
                    }

                    /* Employee Info Banner */
                    .emp-info-banner {
                        display: flex;
                        align-items: center;
                        gap: 18px;
                        background: var(--card-bg);
                        border: 1px solid var(--border);
                        border-radius: 16px;
                        padding: 18px 24px;
                        margin-bottom: 28px;
                        box-shadow: var(--shadow-sm);
                    }

                    .emp-avatar-initials {
                        width: 52px;
                        height: 52px;
                        border-radius: 14px;
                        background: linear-gradient(135deg, #3B648B 0%, #5a8ab5 100%);
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 18px;
                        font-weight: 800;
                        flex-shrink: 0;
                        letter-spacing: 0.5px;
                    }

                    .emp-info-main {
                        flex: 1;
                        min-width: 0;
                    }

                    .emp-info-name {
                        font-size: 16px;
                        font-weight: 800;
                        color: var(--text-dark);
                        margin: 0 0 8px 0;
                    }

                    .emp-info-chips {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 8px;
                        align-items: center;
                    }

                    .emp-chip {
                        display: inline-flex;
                        align-items: center;
                        gap: 5px;
                        background: var(--bg-main);
                        border: 1px solid var(--border);
                        border-radius: 6px;
                        padding: 4px 10px;
                        font-size: 12px;
                        font-weight: 600;
                        color: var(--text-secondary);
                        white-space: nowrap;
                    }

                    .emp-chip-id {
                        background: rgba(59, 100, 139, 0.1);
                        border-color: rgba(59, 100, 139, 0.25);
                        color: var(--primary-blue);
                        font-family: 'Courier New', monospace;
                        letter-spacing: 0.3px;
                    }
                `}
            </style>
        </div>
    );
};

export default EmployeeCTCHistory;
