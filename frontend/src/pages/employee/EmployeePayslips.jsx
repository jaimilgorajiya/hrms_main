import React, { useState, useEffect } from 'react';
import authenticatedFetch from '../../utils/apiHandler';
import API_URL from '../../config/api';
import { FileText, Download, Eye, Calendar, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import generatePayslipPDF from '../../utils/payslipPDF';

const EmployeePayslips = () => {
    const [slips, setSlips] = useState([]);
    const [loading, setLoading] = useState(false);
    const [company, setCompany] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [slipsRes, companyRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/payroll/my-slips`),
                authenticatedFetch(`${API_URL}/api/company`)
            ]);
            
            const slipsData = await slipsRes.json();
            const companyData = await companyRes.json();

            if (slipsData.success) setSlips(slipsData.history);
            if (companyData) setCompany(companyData);
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Failed to load payslips', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getMonthName = (monthStr) => {
        const [year, month] = monthStr.split('-');
        return new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">My Payslips</h1>
                    <p className="hrm-subtitle">View and download your monthly salary statements</p>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px' }}>
                    <div className="loading-spinner"></div>
                    <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>Fetching your earnings statement...</p>
                </div>
            ) : slips.length === 0 ? (
                <div className="hrm-card" style={{ textAlign: 'center', padding: '60px', borderRadius: '15px' }}>
                    <div style={{ background: '#f8fafc', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <FileText size={40} color="#cbd5e1" />
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>No Payslips Found</h2>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '300px', margin: '10px auto' }}>Your payslips will appear here once they are published by the payroll administrator.</p>
                </div>
            ) : (
                <div className="hrm-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {slips.map((slip, i) => (
                        <div key={i} className="hrm-card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '12px' }}>
                                    <Calendar size={24} color="#2563eb" />
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Salary</div>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>₹{slip.finalPayout.toLocaleString()}</div>
                                </div>
                            </div>
                            
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
                                {getMonthName(slip.month)}
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                                Reference ID: #{slip._id.toString().slice(-6).toUpperCase()}
                            </p>

                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px', display: 'flex', gap: '10px' }}>
                                <button 
                                    className="btn-hrm btn-hrm-primary" 
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px' }}
                                    onClick={() => generatePayslipPDF(slip, company)}
                                >
                                    <Eye size={18} /> View PDF
                                </button>
                                <button 
                                    className="btn-hrm btn-hrm-secondary" 
                                    style={{ padding: '8px 12px' }}
                                    onClick={() => generatePayslipPDF(slip, company)}
                                    title="Download PDF"
                                >
                                    <Download size={18} />
                                </button>
                            </div>

                            {/* Decorative element */}
                            <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05 }}>
                                <FileText size={100} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ marginTop: '30px', padding: '20px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', display: 'flex', gap: '15px' }}>
                <AlertCircle size={24} color="#d97706" />
                <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#92400e' }}>Payroll Support</h4>
                    <p style={{ fontSize: '13px', color: '#b45309' }}>If you find any discrepancy in your payslip, please contact the HR department or raise a query through the support module.</p>
                </div>
            </div>
        </div>
    );
};

export default EmployeePayslips;
