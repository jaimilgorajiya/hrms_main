import React, { useState, useEffect } from 'react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import { 
    Search, Calendar, CheckSquare, Square, Send, Eye, 
    Download, X, Wallet, Briefcase, RefreshCw, Layers 
} from 'lucide-react';
import Swal from 'sweetalert2';

const PublishSalarySlip = () => {
    const today = new Date();
    const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [previewUrl, setPreviewUrl] = useState(null);

    const fetchGeneratedPayouts = async () => {
        try {
            setLoading(true);
            const res = await authenticatedFetch(`${API_URL}/api/payroll/history?month=${month}`);
            const data = await res.json();
            if (data.success) {
                // Filter only 'Generated' ones
                setPayouts(data.history.filter(p => p.status === 'Generated'));
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Failed to fetch slips', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGeneratedPayouts();
        setSelectedIds([]);
    }, [month]);

    const toggleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = (filteredList) => {
        if (selectedIds.length === filteredList.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredList.map(p => p._id));
        }
    };

    const handlePublish = async () => {
        if (!selectedIds.length) return Swal.fire('Wait', 'Please select at least one employee', 'info');

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `This will make ${selectedIds.length} salary slips visible in the employee mobile app.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Publish!',
            confirmButtonColor: '#10B981',
            cancelButtonColor: 'var(--border)',
            customClass: {
                popup: 'premium-swal-popup',
                title: 'premium-swal-title',
                confirmButton: 'premium-swal-button'
            }
        });

        if (result.isConfirmed) {
            try {
                const res = await authenticatedFetch(`${API_URL}/api/payroll/publish-slip`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payoutIds: selectedIds })
                });
                const data = await res.json();
                if (data.success) {
                    Swal.fire({
                        title: 'Published!',
                        text: `Salary slips have been made visible to employees.`,
                        icon: 'success',
                        customClass: {
                            popup: 'premium-swal-popup',
                            title: 'premium-swal-title',
                            confirmButton: 'premium-swal-button'
                        }
                    });
                    fetchGeneratedPayouts();
                    setSelectedIds([]);
                }
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'Failed to publish slips', 'error');
            }
        }
    };

    const handlePreview = async (payoutId) => {
        try {
            Swal.showLoading();
            const res = await authenticatedFetch(`${API_URL}/api/payroll/download-slip/${payoutId}`);
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

    const handleDownload = async (payoutId) => {
        try {
            Swal.showLoading();
            const res = await authenticatedFetch(`${API_URL}/api/payroll/download-slip/${payoutId}`);
            if (!res.ok) throw new Error("Failed to download slip");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `payslip_${payoutId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            Swal.close();
        } catch (err) {
            Swal.close();
            console.error(err);
            Swal.fire('Error', 'Failed to download payslip', 'error');
        }
    };

    const closePreview = () => {
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
    };

    // Filter payouts based on search and sort alphabetically by employee name
    const filteredPayouts = payouts.filter(p => 
        p.employeeId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.employeeId?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => (a.employeeId?.name || '').localeCompare(b.employeeId?.name || ''));

    const formatCurrency = (val) => {
        return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const monthLabel = () => {
        const [y, m] = month.split('-').map(Number);
        return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="hrm-container" style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 16px' }}>
            
            {/* ── Page Header ── */}
            <div className="hrm-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
                <div>
                    <h1 className="hrm-title" style={{ fontSize: '28px', marginBottom: '4px' }}>
                        Publish Salary Slips
                    </h1>
                    
                </div>

            </div>

            {/* ── Filters & Controls Toolbar Card ── */}
            <div className="hrm-card" style={{ padding: '20px', marginBottom: '28px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', borderRadius: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', flex: 1, minWidth: '320px' }}>
                        {/* Search bar */}
                        <div style={{ position: 'relative', flex: 2, minWidth: '240px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input 
                                type="text" 
                                placeholder="Search by employee name or ID..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ 
                                    width: '100%', 
                                    height: '46px', 
                                    paddingLeft: '42px', 
                                    paddingRight: '16px', 
                                    background: 'var(--bg-base)', 
                                    border: '1.5px solid var(--border)', 
                                    borderRadius: '12px',
                                    outline: 'none', 
                                    fontSize: '13px', 
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    boxSizing: 'border-box',
                                    transition: 'all 0.2s'
                                }}
                            />
                        </div>

                        {/* Month input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-base)', border: '1.5px solid var(--border)', padding: '0 14px', borderRadius: '12px', height: '46px', boxSizing: 'border-box', minWidth: '180px', flex: 1 }}>
                            <Calendar size={16} style={{ color: 'var(--primary-blue)' }} />
                            <input 
                                type="month" 
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                onClick={e => { try { e.target.showPicker(); } catch (err) {} }}
                                style={{ 
                                    background: 'transparent', 
                                    color: 'var(--text-primary)', 
                                    border: 'none', 
                                    outline: 'none', 
                                    height: '100%', 
                                    cursor: 'pointer', 
                                    flex: 1, 
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    colorScheme: 'dark' 
                                }}
                            />
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button 
                            className="btn-hrm btn-hrm-primary" 
                            onClick={handlePublish}
                            disabled={selectedIds.length === 0}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                padding: '0 24px', 
                                height: '46px', 
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: 700,
                                opacity: selectedIds.length === 0 ? 0.6 : 1,
                                cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
                                background: '#10B981',
                                borderColor: '#10B981',
                                boxShadow: selectedIds.length > 0 ? '0 4px 14px 0 rgba(16, 185, 129, 0.4)' : 'none'
                            }}
                        >
                            <Send size={16} /> Publish Slips ({selectedIds.length})
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Table Container ── */}
            <div className="hrm-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elevated)', borderRadius: '20px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="hrm-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border)' }}>
                                <th style={{ width: '50px', padding: '20px', textAlign: 'left' }}>
                                    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => toggleSelectAll(filteredPayouts)}>
                                        {selectedIds.length === filteredPayouts.length && filteredPayouts.length > 0 ? (
                                            <CheckSquare size={19} color="var(--primary-blue)" style={{ transition: 'transform 0.1s ease' }} />
                                        ) : (
                                            <Square size={19} color="var(--text-muted)" style={{ transition: 'transform 0.1s ease' }} />
                                        )}
                                    </div>
                                </th>
                                <th style={{ padding: '20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Employee Details</th>
                                <th style={{ padding: '20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Generated Period</th>
                                <th style={{ padding: '20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Net Payable Amount</th>
                                <th style={{ padding: '20px', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '80px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <RefreshCw className="animate-spin" size={26} style={{ color: 'var(--primary-blue)' }} />
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Loading generated slips...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPayouts.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <Layers size={44} style={{ opacity: 0.25, color: 'var(--primary-blue)' }} />
                                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>No Generated Slips Found</span>
                                            <span style={{ fontSize: '12px' }}>All slips for this period have either been published or not generated yet.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPayouts.map((p, idx) => {
                                const isSelected = selectedIds.includes(p._id);
                                return (
                                    <tr 
                                        key={p._id} 
                                        onClick={() => toggleSelect(p._id)} 
                                        style={{ 
                                            cursor: 'pointer', 
                                            borderBottom: idx < filteredPayouts.length - 1 ? '1px solid var(--border)' : 'none',
                                            transition: 'background 0.25s ease',
                                            background: isSelected ? 'rgba(195, 192, 255, 0.04)' : 'transparent'
                                        }}
                                        onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                                        onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <td style={{ padding: '20px' }} onClick={(e) => { e.stopPropagation(); toggleSelect(p._id); }}>
                                            {isSelected ? (
                                                <CheckSquare size={19} color="var(--primary-blue)" />
                                            ) : (
                                                <Square size={19} color="var(--border)" />
                                            )}
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                {/* Profile Photo */}
                                                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1.5px solid var(--border)', flexShrink: 0 }}>
                                                    {p.employeeId?.profilePhoto ? (
                                                        <img src={`${API_URL}/uploads/${p.employeeId.profilePhoto}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                                                            {p.employeeId?.name ? p.employeeId.name.charAt(0) : '?'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{p.employeeId?.name}</p>
                                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>{p.employeeId?.employeeId || 'N/A'}</span>
                                                        <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--text-muted)' }}></span>
                                                        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--primary-blue)', background: 'rgba(195,192,255,0.12)', padding: '1px 6px', borderRadius: '4px' }}>{p.employeeId?.department || 'Staff'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{p.month}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>Slip Prepared</div>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Wallet size={14} color="var(--success)" />
                                                <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--success)' }}>
                                                    ₹{formatCurrency(p.finalPayout || 0)}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px' }} onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                                {/* Preview */}
                                                <button 
                                                    onClick={() => handlePreview(p._id)}
                                                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary-blue)'; e.currentTarget.style.color = 'var(--primary-blue)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                                    title="Quick View payslip"
                                                >
                                                    <Eye size={16} />
                                                </button>

                                                {/* Download */}
                                                <button 
                                                    onClick={() => handleDownload(p._id)}
                                                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                                    title="Download payslip"
                                                >
                                                    <Download size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Stitch Premium Payslip Preview Modal ── */}
            {previewUrl && (
                <div 
                    onClick={closePreview}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 3000, animation: 'fadeIn 0.2s ease' }}
                >
                    <div 
                        onClick={e => e.stopPropagation()}
                        className="modal-content-premium"
                        style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', borderRadius: '24px', width: '900px', maxWidth: '95%', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)', animation: 'zoomIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)', padding: '24px' }}
                    >
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>Payslip Quick View</h2>
                            <button 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '4px' }} 
                                onClick={closePreview}
                            >
                                <X size={22}/>
                            </button>
                        </div>
                        {/* Modal Body (Iframe) */}
                        <iframe 
                            src={previewUrl} 
                            style={{ flex: 1, width: '100%', border: '1px solid var(--border)', borderRadius: '14px', background: '#FFFFFF' }} 
                            title="Payslip Preview" 
                        />
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default PublishSalarySlip;
