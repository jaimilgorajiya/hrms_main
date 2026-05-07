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

            <div className="hrm-card" style={{ maxWidth: 800, margin: '0 auto' }}>
                <div style={{ padding: '32px' }}>
                    {/* Live Preview */}
                    <div style={{ 
                        background: 'linear-gradient(135deg, var(--primary-light), #DBEAFE)', 
                        borderRadius: 'var(--radius-md)', 
                        padding: '28px 32px', 
                        marginBottom: '32px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        border: '1px solid #BFDBFE',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-blue)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Eye size={14} /> Live Preview
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--primary-dark)', letterSpacing: '2px', fontFamily: '"JetBrains Mono", monospace' }}>{preview}</div>
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', textAlign: 'right', opacity: 0.8 }}>
                            <div>Next employee will get</div>
                            <div style={{ fontWeight: '700', color: 'var(--primary-blue)' }}>this ID automatically</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
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
                            <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px', display: 'block' }}>Letters only, max 10 chars</small>
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
                            <div style={{ display: 'flex', gap: '24px', height: '44px', alignItems: 'center' }}>
                                {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
                                    <label key={String(opt.value)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>
                                        <input
                                            type="radio"
                                            checked={format.includeYear === opt.value}
                                            onChange={() => handleChange('includeYear', opt.value)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary-blue)' }}
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
                    <div style={{ background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', padding: '20px 24px', margin: '32px 0', border: '1px solid var(--border)', fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px 12px', background: '#fff', borderRadius: '6px', border: '1px solid var(--border)', fontWeight: '700', fontSize: '12px', color: 'var(--text-dark)' }}>PATTERN</div>
                        <div>
                            <span style={{ fontFamily: 'monospace', color: 'var(--primary-blue)', fontWeight: '700' }}>{format.prefix}</span>
                            {format.separator && <span style={{ fontFamily: 'monospace', color: 'var(--warning)', fontWeight: '700' }}>{format.separator}</span>}
                            {format.includeYear && <span style={{ fontFamily: 'monospace', color: 'var(--success)', fontWeight: '700' }}>{new Date().getFullYear()}</span>}
                            {format.separator && <span style={{ fontFamily: 'monospace', color: 'var(--warning)', fontWeight: '700' }}>{format.separator}</span>}
                            <span style={{ fontFamily: 'monospace', color: '#8B5CF6', fontWeight: '700' }}>{'N'.repeat(format.digitCount)}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
                        <button className="btn-hrm btn-hrm-secondary" onClick={fetchFormat} disabled={saving}>
                            <RefreshCw size={18} /> RESET
                        </button>
                        <button className="btn-hrm btn-hrm-primary" onClick={handleSave} disabled={saving}>
                            {saving ? <><RefreshCw size={18} className="animate-spin" /> SAVING...</> : <><Save size={18} /> SAVE FORMAT</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeIdFormat;
