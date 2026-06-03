import React, { useState, useEffect } from 'react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import { Search, Calendar, CheckSquare, Square, Send, Eye, Download, X } from 'lucide-react';
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

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredPayouts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredPayouts.map(p => p._id));
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
            confirmButtonColor: '#2563eb'
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
                    Swal.fire('Published!', `Slips have been sent to employees successfully.`, 'success');
                    fetchGeneratedPayouts();
                    setSelectedIds([]);
                }
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'Failed to publish slips', 'error');
            }
        }
    };

    const getPdfUrl = (payoutId, download = false) => {
        const token = localStorage.getItem('token');
        return `${API_URL}/api/payroll/download-slip/${payoutId}?token=${token}${download ? '&download=true' : ''}`;
    };

    const handleDownload = (payoutId) => {
        window.open(getPdfUrl(payoutId, true), '_blank');
    };

    const filteredPayouts = payouts.filter(p => 
        p.employeeId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.employeeId?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Publish Salary Slips</h1>
                    </div>
                
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="hrm-search-container" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        <Search size={18} className="hrm-search-icon" style={{ color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            className="hrm-search-input" 
                            placeholder="Find employee..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', outline: 'none' }}
                        />
                    </div>
                    <div className="hrm-date-filter" style={{ minWidth: '180px', background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', borderRadius: '12px' }}>
                        <Calendar size={18} style={{ color: 'var(--primary-blue)' }} />
                        <input 
                            type="month" 
                            className="hrm-date-input"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', outline: 'none', height: '42px', cursor: 'pointer', colorScheme: 'dark' }}
                        />
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {selectedIds.length > 0 && <span>Ready to publish: <strong>{selectedIds.length}</strong> slips</span>}
                </div>
                <button 
                    className="btn-hrm btn-hrm-primary" 
                    onClick={handlePublish}
                    disabled={selectedIds.length === 0}
                    style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Send size={18} /> Publish to Mobile App
                </button>
            </div>

            <div className="hrm-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="hrm-table-container">
                    <table className="hrm-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>
                                    <div style={{ cursor: 'pointer' }} onClick={toggleSelectAll}>
                                        {selectedIds.length === filteredPayouts.length && filteredPayouts.length > 0 ? <CheckSquare size={20} color="#059669" /> : <Square size={20} color="var(--border)" />}
                                    </div>
                                </th>
                                <th>Employee Details</th>
                                <th>Generated Period</th>
                                <th>Final Net</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Loading generated slips...</td></tr>
                            ) : filteredPayouts.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No generated slips waiting to be published for this month.</td></tr>
                            ) : filteredPayouts.map((p, i) => (
                                <tr key={i} onClick={() => toggleSelect(p._id)} style={{ cursor: 'pointer' }}>
                                    <td onClick={(e) => { e.stopPropagation(); toggleSelect(p._id); }}>
                                        {selectedIds.includes(p._id) ? <CheckSquare size={20} color="#059669" /> : <Square size={20} color="var(--border)" />}
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{p.employeeId?.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.employeeId?.employeeId}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{p.month}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Slip Prepared</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{p.finalPayout.toLocaleString()}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <button 
                                                className="btn-hrm-icon" 
                                                onClick={(e) => { e.stopPropagation(); setPreviewUrl(getPdfUrl(p._id)); }}
                                                title="Quick View Payslip"
                                                style={{ padding: '6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid var(--border)' }}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button 
                                                className="btn-hrm-icon" 
                                                onClick={(e) => { e.stopPropagation(); handleDownload(p._id); }}
                                                title="Download Payslip"
                                                style={{ padding: '6px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', border: '1px solid var(--border)' }}
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {previewUrl && (
                <div className="hrm-modal-overlay" onClick={() => setPreviewUrl(null)}>
                    <div className="hrm-modal-content" style={{ width: '800px', maxWidth: '95%', height: '85vh', display: 'flex', flexDirection: 'column', padding: '15px', background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Payslip Quick View</h2>
                            <button 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} 
                                onClick={() => setPreviewUrl(null)}
                            >
                                <X size={20}/>
                            </button>
                        </div>
                        <iframe 
                            src={previewUrl} 
                            style={{ flex: 1, width: '100%', border: '1px solid var(--border)', borderRadius: '8px' }} 
                            title="Payslip Preview" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublishSalarySlip;
