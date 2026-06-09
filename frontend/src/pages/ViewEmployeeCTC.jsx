import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, Building2, Briefcase, Award, CheckCircle2, Wallet, CreditCard } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import '../pages/AdminDashboard.css';

const ViewEmployeeCTC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [ctcData, setCtcData] = useState(null);

    useEffect(() => {
        fetchCTCDetails();
    }, [id]);

    const fetchCTCDetails = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch(`${API_URL}/api/employee-ctc/${id}`);
            const data = await response.json();
            if (data.success) {
                setCtcData(data.ctc);
            } else {
                SwDetailsFail(data.message || 'Failed to load CTC details');
            }
        } catch (error) {
            console.error("Error fetching CTC details:", error);
            SwDetailsFail('Server connection error');
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

    const formatDate = (dateString) => {
        if (!dateString) return '--';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const getInitials = (name) => {
        if (!name) return 'EE';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    const numberToWords = (num) => {
        if (!num || isNaN(num)) return 'Zero';
        const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
        const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        
        const formatNumber = (n) => {
            if (n < 20) return a[n];
            if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
            if (n < 1000) {
                const hundred = a[Math.floor(n / 100)];
                const rest = n % 100;
                return hundred + ' hundred' + (rest !== 0 ? ' and ' + formatNumber(rest) : '');
            }
            return '';
        };

        let result = '';
        let tempNum = Math.floor(num);
        
        let crores = Math.floor(tempNum / 10000000);
        tempNum %= 10000000;
        let lakhs = Math.floor(tempNum / 100000);
        tempNum %= 100000;
        let thousands = Math.floor(tempNum / 1000);
        tempNum %= 1000;
        let remaining = tempNum;

        if (crores > 0) {
            result += formatNumber(crores) + ' crore ';
        }
        if (lakhs > 0) {
            result += formatNumber(lakhs) + ' lakh ';
        }
        if (thousands > 0) {
            result += formatNumber(thousands) + ' thousand ';
        }
        if (remaining > 0) {
            result += formatNumber(remaining);
        }
        
        const finalStr = result.trim();
        if (!finalStr) return 'Zero';
        return finalStr.charAt(0).toUpperCase() + finalStr.slice(1) + ' only.';
    };

    if (loading) {
        return (
            <div className="hrm-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading CTC Details...</p>
            </div>
        );
    }

    if (!ctcData) {
        return (
            <div className="hrm-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No CTC data found.</p>
            </div>
        );
    }

    const employee = ctcData.employeeId || {};
    const earnings = ctcData.earnings || [];
    const deductions = ctcData.deductions || [];

    const monthlyGross = ctcData.monthlyGross || 0;
    const totalDeductions = deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const netSalary = ctcData.netSalary !== undefined ? ctcData.netSalary : (monthlyGross - totalDeductions);
    const annualCTC = ctcData.annualCTC || (monthlyGross * 12);

    return (
        <div className="hrm-container view-ctc-wrapper">
            {/* Top Header Section */}
            <div className="view-ctc-header">
                <div className="header-left">
                    <button 
                        onClick={() => navigate('/admin/payroll/employee-ctc')} 
                        className="icon-btn"
                        style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        title="Back to List"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="view-title">Salary Structure &amp; CTC Detail</h1>
                        {/* <p className="view-subtitle">Detailed compensation overview and breakdown</p> */}
                    </div>
                </div>
                <div className="header-right">
                    <span className="badge-status-active">
                        <span className="dot-glowing"></span>
                        Active Structure
                    </span>
                </div>
            </div>


            {/* Dashboard Master-Detail Layout */}
            <div className="ctc-dashboard-layout">
                {/* Left Sidebar: Profile Details */}
                <div className="emp-profile-sidebar">
                    <div className="avatar-section">
                        <div className="initials-avatar">
                            {getInitials(employee.name)}
                        </div>
                        <h2 className="emp-name">{employee.name || '--'}</h2>
                    </div>
                    
                    <div className="sidebar-divider"></div>

                    <div className="profile-metadata-list">
                        <div className="metadata-item">
                            <Briefcase size={16} className="metadata-icon" />
                            <div className="metadata-content">
                                <span className="metadata-label">Designation</span>
                                <span className="metadata-value">{employee.designation || '--'}</span>
                            </div>
                        </div>

                        <div className="metadata-item">
                            <Building2 size={16} className="metadata-icon" />
                            <div className="metadata-content">
                                <span className="metadata-label">Department</span>
                                <span className="metadata-value">{employee.department || '--'}</span>
                            </div>
                        </div>

                        <div className="metadata-item">
                            <Mail size={16} className="metadata-icon" />
                            <div className="metadata-content">
                                <span className="metadata-label">Email Address</span>
                                <span className="metadata-value">{employee.email || '--'}</span>
                            </div>
                        </div>

                        <div className="metadata-item">
                            <Phone size={16} className="metadata-icon" />
                            <div className="metadata-content">
                                <span className="metadata-label">Contact Number</span>
                                <span className="metadata-value">
                                    {employee.phone ? `${employee.phoneCountryCode || ''} ${employee.phone}` : '--'}
                                </span>
                            </div>
                        </div>

                        <div className="metadata-item">
                            <Calendar size={16} className="metadata-icon" />
                            <div className="metadata-content">
                                <span className="metadata-label">Date of Joining</span>
                                <span className="metadata-value">{formatDate(employee.dateJoined)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Compensation Breakdown */}
                <div className="main-ctc-panel">
                    {/* Top Executive Summary Banner */}
                    <div className="executive-summary-banner">
                        <div className="summary-col">
                            <div className="summary-top">
                                <div className="summary-icon-wrapper wallet-icon">
                                    <Wallet size={20} />
                                </div>
                                <h4>Net Take-Home Salary (Monthly)</h4>
                            </div>
                            <div className="summary-main">
                                <h3 className="summary-value">₹{netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                <p className="summary-words">{numberToWords(netSalary)}</p>
                            </div>
                        </div>
                        <div className="summary-col divider-left">
                            <div className="summary-top">
                                <div className="summary-icon-wrapper ctc-icon">
                                    <CheckCircle2 size={20} />
                                </div>
                                <h4>Total Cost to Company (Annual CTC)</h4>
                            </div>
                            <div className="summary-main">
                                <h3 className="summary-value ctc-highlight">₹{annualCTC.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                <p className="summary-words">{numberToWords(annualCTC)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Stack / Cards */}
                    <div className="breakdown-grid">
                        {/* Earnings Card */}
                        <div className="breakdown-card earnings-theme">
                            <div className="card-header">
                                <div className="header-icon-box">
                                    <Award size={18} />
                                </div>
                                <h3>Earnings Breakdown</h3>
                            </div>
                            <div className="card-body">
                                {earnings.length > 0 ? (
                                    <div className="component-list">
                                        {earnings.map((earning, idx) => (
                                            <div className="component-row" key={idx}>
                                                <span className="comp-name">{earning.componentName}</span>
                                                <span className="comp-amount">₹{Number(earning.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-breakdown">No earnings components configured.</div>
                                )}
                            </div>
                            <div className="card-footer-summary">
                                <span>Monthly Gross Salary</span>
                                <span className="footer-amount">₹{monthlyGross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        {/* Deductions Card */}
                        <div className="breakdown-card deductions-theme">
                            <div className="card-header">
                                <div className="header-icon-box">
                                    <CreditCard size={18} />
                                </div>
                                <h3>Deductions Breakdown</h3>
                            </div>
                            <div className="card-body">
                                {deductions.length > 0 ? (
                                    <div className="component-list">
                                        {deductions.map((deduction, idx) => (
                                            <div className="component-row" key={idx}>
                                                <span className="comp-name">{deduction.componentName}</span>
                                                <span className="comp-amount">₹{Number(deduction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-breakdown">No deductions configured.</div>
                                )}
                            </div>
                            <div className="card-footer-summary">
                                <span>Total Deductions</span>
                                <span className="footer-amount">₹{totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Redesigned CSS Styles with Full Dark Theme Support */}
            <style>
                {`
                    .view-ctc-wrapper {
                        font-family: 'Inter', sans-serif;
                        padding-bottom: 60px;
                        max-width: 1200px;
                        margin: 0 auto;
                    }

                    .view-ctc-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 32px;
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

                    .view-subtitle {
                        font-size: 13px;
                        color: var(--text-light);
                        margin: 4px 0 0 0;
                        font-weight: 500;
                    }

                    .badge-status-active {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        background: rgba(59, 100, 139, 0.1);
                        color: #3b648b;
                        padding: 8px 16px;
                        border-radius: 30px;
                        font-size: 13px;
                        font-weight: 700;
                        border: 1px solid rgba(59, 100, 139, 0.2);
                    }

                    .dot-glowing {
                        width: 8px;
                        height: 8px;
                        background-color: #3b648b;
                        border-radius: 50%;
                        display: inline-block;
                        animation: blink-dot 1.5s infinite ease-in-out;
                    }

                    @keyframes blink-dot {
                        0% { opacity: 0.4; transform: scale(0.9); }
                        50% { opacity: 1; transform: scale(1.2); }
                        100% { opacity: 0.4; transform: scale(0.9); }
                    }

                    /* Two Column Dashboard Layout */
                    .ctc-dashboard-layout {
                        display: grid;
                        grid-template-columns: 320px 1fr;
                        gap: 32px;
                        align-items: start;
                    }

                    @media (max-width: 992px) {
                        .ctc-dashboard-layout {
                            grid-template-columns: 1fr;
                            gap: 28px;
                        }
                    }

                    /* Left Sidebar Card */
                    .emp-profile-sidebar {
                        background: var(--card-bg);
                        border-radius: 20px;
                        border: 1px solid var(--border);
                        padding: 32px 24px;
                        box-shadow: var(--shadow);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }

                    .avatar-section {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        width: 100%;
                        text-align: center;
                    }

                    .initials-avatar {
                        width: 80px;
                        height: 80px;
                        border-radius: 24px;
                        background: linear-gradient(135deg, #0d9488 0%, #0ea5e9 100%);
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 28px;
                        font-weight: 900;
                        box-shadow: 0 8px 20px rgba(13, 148, 136, 0.25);
                        margin-bottom: 16px;
                    }

                    .emp-name {
                        font-size: 20px;
                        font-weight: 800;
                        color: var(--text-dark);
                        margin: 0 0 8px 0;
                        line-height: 1.2;
                    }

                    .badge-emp-code {
                        background: var(--bg-main);
                        color: var(--text-light);
                        font-size: 11px;
                        font-weight: 700;
                        padding: 4px 10px;
                        border-radius: 8px;
                        border: 1px solid var(--border);
                        letter-spacing: 0.5px;
                    }

                    .sidebar-divider {
                        width: 100%;
                        height: 1px;
                        background: var(--border);
                        margin: 24px 0;
                    }

                    .profile-metadata-list {
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                        width: 100%;
                    }

                    .metadata-item {
                        display: flex;
                        align-items: flex-start;
                        gap: 14px;
                    }

                    .metadata-icon {
                        color: var(--text-muted);
                        margin-top: 3px;
                        flex-shrink: 0;
                    }

                    .metadata-content {
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                    }

                    .metadata-label {
                        font-size: 10px;
                        font-weight: 700;
                        color: var(--text-light);
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 2px;
                    }

                    .metadata-value {
                        font-size: 13.5px;
                        font-weight: 600;
                        color: var(--text-dark);
                        line-height: 1.3;
                        word-break: break-all;
                    }

                    /* Right Panel Components */
                    .main-ctc-panel {
                        display: flex;
                        flex-direction: column;
                        gap: 28px;
                    }

                    /* Executive Summary Banner */
                    .executive-summary-banner {
                        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                        border-radius: 24px;
                        padding: 32px;
                        color: white;
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 32px;
                        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
                    }

                    body.dark-mode .executive-summary-banner {
                        background: linear-gradient(135deg, #1e293b 0%, #030712 100%);
                        border: 1px solid var(--border);
                    }

                    @media (max-width: 768px) {
                        .executive-summary-banner {
                            grid-template-columns: 1fr;
                            gap: 24px;
                        }
                        .divider-left {
                            border-left: none !important;
                            padding-left: 0 !important;
                            border-top: 1px solid rgba(255, 255, 255, 0.1);
                            padding-top: 24px;
                        }
                    }

                    .summary-col {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }

                    .divider-left {
                        border-left: 1px solid rgba(255, 255, 255, 0.1);
                        padding-left: 32px;
                    }

                    .summary-top {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }

                    .summary-icon-wrapper {
                        width: 36px;
                        height: 36px;
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .wallet-icon {
                        background: rgba(14, 165, 233, 0.2);
                        color: #38bdf8;
                    }

                    .ctc-icon {
                        background: rgba(99, 102, 241, 0.2);
                        color: #818cf8;
                    }

                    .summary-top h4 {
                        font-size: 11px;
                        font-weight: 700;
                        color: #94a3b8;
                        margin: 0;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .summary-main {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                    }

                    .summary-value {
                        font-size: 28px;
                        font-weight: 950;
                        margin: 0;
                        color: white;
                        letter-spacing: -0.5px;
                    }

                    .ctc-highlight {
                        color: #38bdf8;
                    }

                    .summary-words {
                        font-size: 12px;
                        font-style: italic;
                        color: #94a3b8;
                        margin: 0;
                        font-weight: 500;
                    }

                    /* Breakdown Cards */
                    .breakdown-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 28px;
                    }

                    @media (max-width: 768px) {
                        .breakdown-grid {
                            grid-template-columns: 1fr;
                        }
                    }

                    .breakdown-card {
                        background: var(--card-bg);
                        border-radius: 20px;
                        border: 1px solid var(--border);
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                        box-shadow: var(--shadow);
                        transition: transform 0.2s ease, box-shadow 0.2s ease;
                    }

                    .breakdown-card:hover {
                        transform: translateY(-2px);
                        box-shadow: var(--shadow-lg);
                    }

                    .breakdown-card.earnings-theme {
                        border-top: 4px solid #3B648B;
                    }

                    .breakdown-card.deductions-theme {
                        border-top: 4px solid #64748b;
                    }

                    .card-header {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 24px 24px 18px 24px;
                        border-bottom: 1px solid var(--border);
                    }

                    .earnings-theme .header-icon-box {
                        color: #3B648B;
                    }

                    .deductions-theme .header-icon-box {
                        color: #64748b;
                    }

                    .card-header h3 {
                        font-size: 15px;
                        font-weight: 800;
                        color: var(--text-dark);
                        margin: 0;
                    }

                    .card-body {
                        padding: 24px;
                        flex: 1;
                        background: transparent;
                    }

                    .component-list {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                    }

                    .component-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding-bottom: 12px;
                        border-bottom: 1px dashed var(--border);
                    }

                    .component-row:last-child {
                        border-bottom: none;
                        padding-bottom: 0;
                    }

                    .comp-name {
                        font-size: 13.5px;
                        font-weight: 600;
                        color: var(--text-secondary);
                    }

                    .comp-amount {
                        font-size: 14px;
                        font-weight: 700;
                        color: var(--text-dark);
                    }

                    .empty-breakdown {
                        padding: 30px 0;
                        text-align: center;
                        color: var(--text-muted);
                        font-size: 13.5px;
                        font-weight: 500;
                    }

                    .card-footer-summary {
                        background: var(--bg-main);
                        padding: 20px 24px;
                        border-top: 1px solid var(--border);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 14.5px;
                        font-weight: 800;
                        color: var(--text-dark);
                    }

                    .footer-amount {
                        font-size: 15.5px;
                        font-weight: 900;
                    }

                    .earnings-theme .footer-amount {
                        color: #3B648B;
                    }

                    .deductions-theme .footer-amount {
                        color: #64748b;
                    }
                `}
            </style>
        </div>
    );
};

export default ViewEmployeeCTC;
