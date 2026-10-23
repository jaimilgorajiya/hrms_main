import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authenticatedFetch from '../../utils/apiHandler';
import API_URL from '../../config/api';
import { FileText, Download, Eye, Calendar, AlertCircle, X, ExternalLink } from 'lucide-react';
import Swal from 'sweetalert2';

const EmployeePayslips = () => {
    const navigate = useNavigate();
    const [slips, setSlips] = useState([]);
    const [loading, setLoading] = useState(false);
    const [company, setCompany] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [slipsRes, companyRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/payroll/my-slips`),
                authenticatedFetch(`${API_URL}/api/company`)
            ]);
            
            const slipsData = await slipsRes.json();
            const companyData = await companyRes.json();

            if (slipsData.success) setSlips(slipsData.history || []);
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
        if (!monthStr) return '';
        const [year, month] = monthStr.split('-');
        return new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    };

    const handlePreview = async (slipId) => {
        try {
            Swal.showLoading();
            const res = await authenticatedFetch(`${API_URL}/api/payroll/download-slip/${slipId}`);
            if (!res.ok) throw new Error("Failed to load PDF preview");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            Swal.close();
            setPreviewUrl(url);
        } catch (err) {
            Swal.close();
            console.error(err);
            Swal.fire('Error', 'Failed to generate PDF preview', 'error');
        }
    };

    const handleDownload = async (slip) => {
        try {
            setDownloadingId(slip._id);
            const res = await authenticatedFetch(`${API_URL}/api/payroll/download-slip/${slip._id}?download=true`);
            if (!res.ok) throw new Error("Failed to download slip");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Payslip_${slip.month}_${slip.employeeId?.name ? slip.employeeId.name.replace(/\s+/g, '_') : 'Statement'}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to download payslip', 'error');
        } finally {
            setDownloadingId(null);
        }
    };

    const closePreview = () => {
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
    };

    return (
        <div className="ep-page">
            <div className="ep-page-header">
                <div>
                    <h2>My Payslips</h2>
                    <p>View and download your monthly salary statements</p>
                </div>
            </div>

            {loading ? (
                <div className="dashboard-loading">
                    <div className="loader"></div>
                    <span>Fetching your earnings statement...</span>
                </div>
            ) : slips.length === 0 ? (
                <div className="ep-card" style={{ textAlign: 'center', padding: '60px', borderRadius: '20px' }}>
                    <div style={{ background: 'var(--ep-surface-elevated)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid var(--ep-border)' }}>
                        <FileText size={40} color="var(--ep-text-muted)" />
                    </div>
                    <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--ep-text-main)' }}>No Payslips Found</h2>
                    <p style={{ color: 'var(--ep-text-secondary)', maxWidth: '300px', margin: '10px auto', fontSize: '14px' }}>Your payslips will appear here once they are published by the payroll administrator.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                    {slips.map((slip, i) => (
                        <div key={i} className="ep-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '14px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                    <Calendar size={22} color="var(--ep-accent-primary-hover)" />
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '11px', color: 'var(--ep-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Net Salary</div>
                                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: 800, color: 'var(--ep-accent-primary-hover)' }}>₹{slip.finalPayout?.toLocaleString()}</div>
                                </div>
                            </div>
                            
                            <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '17px', fontWeight: 700, color: 'var(--ep-text-main)', marginBottom: '6px' }}>
                                {getMonthName(slip.month)}
                            </h3>
                            <p style={{ fontSize: '13px', color: 'var(--ep-text-secondary)', marginBottom: '20px', fontWeight: 500 }}>
                                Reference ID: #{slip._id?.toString().slice(-6).toUpperCase()}
                            </p>

                            <div style={{ borderTop: '1px solid var(--ep-border)', paddingTop: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button 
                                        className="ep-btn-primary" 
                                        style={{ flex: 1, justifyContent: 'center', padding: '10px 14px', fontSize: '13px' }}
                                        onClick={() => handlePreview(slip._id)}
                                        title="Preview Official Payslip"
                                    >
                                        <Eye size={16} /> View PDF
                                    </button>
                                    <button 
                                        className="ep-btn-outline" 
                                        style={{ padding: '10px 14px', width: 'auto' }}
                                        onClick={() => handleDownload(slip)}
                                        disabled={downloadingId === slip._id}
                                        title="Download PDF file"
                                    >
                                        <Download size={16} />
                                    </button>
                                </div>

                                <button
                                    onClick={() => navigate(`/employee/payslips/${slip._id}/daywise`)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '9px 12px',
                                        background: 'var(--ep-surface-elevated)',
                                        border: '1px solid var(--ep-border)',
                                        borderRadius: '10px',
                                        color: 'var(--ep-text-main)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--ep-accent-primary)'}
                                    onMouseOut={e => e.currentTarget.style.borderColor = 'var(--ep-border)'}
                                >
                                    <ExternalLink size={14} color="var(--ep-accent-primary)" /> Day-wise Breakdown
                                </button>
                            </div>

                            {/* Decorative element */}
                            <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.03, pointerEvents: 'none' }}>
                                <FileText size={120} color="var(--ep-text-main)" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ marginTop: '32px', padding: '20px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <AlertCircle size={24} color="var(--ep-accent-orange)" style={{ flexShrink: 0 }} />
                <div>
                    <h4 style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: 700, color: 'var(--ep-accent-orange)', margin: '0 0 4px 0' }}>Payroll Support</h4>
                    <p style={{ fontSize: '13px', color: 'var(--ep-text-secondary)', margin: 0 }}>If you find any discrepancy in your payslip, please contact the HR department or raise a query through the support module.</p>
                </div>
            </div>

            {/* In-App Payslip Preview Modal (bypasses browser popup blockers) */}
            {previewUrl && (
                <div 
                    onClick={closePreview}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 3000 }}
                >
                    <div 
                        onClick={e => e.stopPropagation()}
                        style={{ background: 'var(--ep-surface)', border: '1px solid var(--ep-border)', borderRadius: '20px', width: '900px', maxWidth: '95%', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)', padding: '20px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ep-text-main)', fontFamily: 'Sora, sans-serif' }}>Official Payslip Statement</h3>
                            <button 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ep-text-secondary)', display: 'flex', alignItems: 'center', padding: '4px' }} 
                                onClick={closePreview}
                            >
                                <X size={22}/>
                            </button>
                        </div>
                        <iframe 
                            src={previewUrl} 
                            style={{ flex: 1, width: '100%', border: '1px solid var(--ep-border)', borderRadius: '12px', background: '#FFFFFF' }} 
                            title="Payslip Preview" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeePayslips;
