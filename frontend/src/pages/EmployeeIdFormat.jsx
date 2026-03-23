import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Eye } from 'lucide-react';
import Swal from 'sweetalert2';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import SearchableSelect from '../components/SearchableSelect';

const SEPARATOR_OPTIONS = [
    { label: 'None', value: '' },
    { label: 'Hyphen ( - )', value: '-' },
    { label: 'Underscore ( _ )', value: '_' },
    { label: 'Slash ( / )', value: '/' },
    { label: 'Dot ( . )', value: '.' },
];

const EmployeeIdFormat = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [format, setFormat] = useState({
        prefix: 'EMP',
        includeYear: true,
        digitCount: 4,
        separator: '',
    });
    const [preview, setPreview] = useState('');

    useEffect(() => {
        fetchFormat();
    }, []);

    useEffect(() => {
        generatePreview();
    }, [format]);

    const fetchFormat = async () => {
        try {
            const res = await authenticatedFetch(`${API_URL}/api/company`);
            const data = await res.json();
            if (data?.employeeIdFormat) {
                setFormat({
                    prefix: data.employeeIdFormat.prefix ?? 'EMP',
                    includeYear: data.employeeIdFormat.includeYear ?? true,
                    digitCount: data.employeeIdFormat.digitCount ?? 4,
                    separator: data.employeeIdFormat.separator ?? '',
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const generatePreview = () => {
        const { prefix, includeYear, digitCount, separator } = format;
        const year = new Date().getFullYear();
        const numPart = '1'.padStart(digitCount, '0');
        const yearPart = includeYear ? `${separator}${year}${separator}` : separator;
        setPreview(`${prefix}${yearPart}${numPart}`);
    };

    const handleChange = (field, value) => {
        setFormat(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/company`, {
                method: 'PUT',
                body: JSON.stringify({ employeeIdFormat: format }),
            });
            const data = await res.json();
            if (data.message?.includes('success') || data.data) {
                Swal.fire({ title: 'Saved!', text: 'Employee ID format updated.', icon: 'success', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire('Error', 'Failed to save format', 'error');
            }
        } catch {
            Swal.fire('Error', 'Failed to save format', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <h1 className="hrm-title">Employee ID Format</h1>
            </div>

            <div className="hrm-card" style={{ maxWidth: 700, padding: '36px', margin: '0 auto' }}>
                {/* Live Preview */}
                <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', borderRadius: 16, padding: '24px 32px', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #BFDBFE' }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Eye size={13} /> Live Preview
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#1E40AF', letterSpacing: 2, fontFamily: 'monospace' }}>{preview}</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', textAlign: 'right' }}>
                        <div>Next employee will get</div>
                        <div style={{ fontWeight: 700, color: '#3B82F6' }}>this ID automatically</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    {/* Prefix */}
                    <div className="hrm-form-group">
                        <label className="hrm-label">Prefix <span className="req">*</span></label>
                        <input
                            type="text"
                            className="hrm-input"
                            value={format.prefix}
                            onChange={e => handleChange('prefix', e.target.value.toUpperCase())}
                            placeholder="e.g. EMP, IIPL, HR"
                            maxLength={10}
                        />
                        <small style={{ color: '#94A3B8', fontSize: 11 }}>Letters only, max 10 chars</small>
                    </div>

                    {/* Separator */}
                    <div className="hrm-form-group">
                        <label className="hrm-label">Separator</label>
                        <SearchableSelect
                            options={SEPARATOR_OPTIONS}
                            value={format.separator}
                            onChange={(val) => handleChange('separator', val)}
                        />
                    </div>

                    {/* Include Year */}
                    <div className="hrm-form-group">
                        <label className="hrm-label">Include Year</label>
                        <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                            {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
                                <label key={String(opt.value)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                                    <input
                                        type="radio"
                                        checked={format.includeYear === opt.value}
                                        onChange={() => handleChange('includeYear', opt.value)}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Digit Count */}
                    <div className="hrm-form-group">
                        <label className="hrm-label">Number of Digits <span className="req">*</span></label>
                        <SearchableSelect
                            options={[3, 4, 5, 6].map(n => ({ value: n, label: `${n} digits (e.g. ${'0'.padStart(n, '0')})` }))}
                            value={format.digitCount}
                            onChange={(val) => handleChange('digitCount', Number(val))}
                        />
                    </div>
                </div>

                {/* Format breakdown */}
                <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '16px 20px', margin: '24px 0', border: '1px solid #E2E8F0', fontSize: 13, color: '#64748B' }}>
                    <strong style={{ color: '#334155' }}>Format: </strong>
                    <span style={{ fontFamily: 'monospace', color: '#3B82F6' }}>{format.prefix}</span>
                    {format.separator && <span style={{ fontFamily: 'monospace', color: '#F59E0B' }}>{format.separator}</span>}
                    {format.includeYear && <span style={{ fontFamily: 'monospace', color: '#10B981' }}>{new Date().getFullYear()}</span>}
                    {format.separator && <span style={{ fontFamily: 'monospace', color: '#F59E0B' }}>{format.separator}</span>}
                    <span style={{ fontFamily: 'monospace', color: '#8B5CF6' }}>{'N'.repeat(format.digitCount)}</span>
                    <span style={{ marginLeft: 12, fontSize: 12 }}>
                        (prefix{format.separator ? ' + separator' : ''}{format.includeYear ? ' + year' : ''}{format.separator ? ' + separator' : ''} + number)
                    </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button className="btn-hrm btn-hrm-secondary" onClick={fetchFormat} disabled={saving}>
                        <RefreshCw size={16} /> RESET
                    </button>
                    <button className="btn-hrm btn-hrm-primary" onClick={handleSave} disabled={saving}>
                        {saving ? <><RefreshCw size={16} className="animate-spin" /> SAVING...</> : <><Save size={16} /> SAVE FORMAT</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeIdFormat;
