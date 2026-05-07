import { useState, useEffect } from 'react';
import { Save, RotateCcw, Plus, X, Settings, Clock, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import SearchableSelect from '../components/SearchableSelect';

const DEFAULT = {
    defaultRetirementAge: 60,
    enableRoleBasedAge: false,
    enableDepartmentBasedAge: false,
    notificationDays: [30, 90, 180],
    autoInitiateExit: false,
    allowExtension: false,
    maxExtensionMonths: 12,
    noticePeriodDays: 30,
    roleAgeOverrides: [],
    departmentAgeOverrides: []
};

const PRESET_DAYS = [30, 60, 90, 180, 365];

const Toggle = ({ checked, onChange, label }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '4px 0' }}>
        <div
            onClick={(e) => { e.preventDefault(); onChange(!checked); }}
            style={{
                width: 44, height: 24, borderRadius: 20, position: 'relative', cursor: 'pointer',
                background: checked ? 'var(--primary-gradient)' : '#E2E8F0', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: checked ? '0 2px 6px rgba(37, 99, 235, 0.2)' : 'none'
            }}
        >
            <div style={{
                position: 'absolute', top: 3, left: checked ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%', background: '#FFFFFF',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600 }}>{label}</span>
    </label>
);

const RetirementSettings = () => {
    const [form, setForm] = useState(DEFAULT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dayInput, setDayInput] = useState('');
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            const [sRes, dRes, desRes] = await Promise.all([
                authenticatedFetch(`${API_URL}/api/retirement/settings`),
                authenticatedFetch(`${API_URL}/api/departments`),
                authenticatedFetch(`${API_URL}/api/designations`),
            ]);
            const sData = await sRes.json();
            const dData = await dRes.json();
            const desData = await desRes.json();
            if (sData.success && sData.setting) setForm({ ...DEFAULT, ...sData.setting });
            if (dData.success) setDepartments(dData.departments || []);
            if (desData.success) setDesignations(desData.designations || []);
        } catch (e) {
            Swal.fire('Error', 'Failed to load settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const addNotificationDay = (day) => {
        const d = Number(day);
        if (!d || d <= 0) return;
        if (form.notificationDays.includes(d)) return;
        set('notificationDays', [...form.notificationDays, d].sort((a, b) => a - b));
        setDayInput('');
    };

    const removeNotificationDay = (day) => {
        set('notificationDays', form.notificationDays.filter(d => d !== day));
    };

    const handleSave = async () => {
        if (!form.defaultRetirementAge || form.defaultRetirementAge < 40 || form.defaultRetirementAge > 80) {
            return Swal.fire('Validation', 'Retirement age must be between 40 and 80', 'warning');
        }
        if (!form.notificationDays.length) {
            return Swal.fire('Validation', 'At least one notification day is required', 'warning');
        }
        if (form.allowExtension && (!form.maxExtensionMonths || form.maxExtensionMonths <= 0)) {
            return Swal.fire('Validation', 'Maximum extension duration is required when extension is enabled', 'warning');
        }

        setSaving(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/retirement/settings`, {
                method: 'PUT',
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({ title: 'Saved', text: 'Retirement settings updated', icon: 'success', timer: 1800, showConfirmButton: false });
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        } catch {
            Swal.fire('Error', 'Failed to save', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        Swal.fire({ title: 'Reset?', text: 'Discard unsaved changes?', icon: 'question', showCancelButton: true, confirmButtonColor: '#2563EB' })
            .then(r => { if (r.isConfirmed) fetchAll(); });
    };

    if (loading) return <div className="loading-container">Loading Settings...</div>;

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <h1 className="hrm-title">Retirement Settings</h1>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn-hrm btn-hrm-secondary" onClick={handleReset}>
                        <RotateCcw size={16} /> RESET
                    </button>
                    <button className="btn-hrm btn-hrm-primary" onClick={handleSave} disabled={saving}>
                        {saving ? <><RefreshCw size={16} className="animate-spin" /> SAVING...</> : <><Save size={16} /> SAVE SETTINGS</>}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>

                {/* Basic Settings */}
                <div className="hrm-card">
                    <div style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Settings size={18} className="text-primary-blue" />
                            BASIC CONFIGURATION
                        </h3>

                        <div className="hrm-form-group">
                            <label className="hrm-label">Default Retirement Age <span className="req">*</span></label>
                            <input
                                type="number" min={40} max={80}
                                className="hrm-input"
                                value={form.defaultRetirementAge}
                                onChange={e => set('defaultRetirementAge', Number(e.target.value))}
                                placeholder="e.g. 60"
                            />
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Must be between 40 and 80 years</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0' }}>
                            <Toggle checked={form.enableRoleBasedAge} onChange={v => set('enableRoleBasedAge', v)} label="Enable Role-Based Age" />
                            <Toggle checked={form.enableDepartmentBasedAge} onChange={v => set('enableDepartmentBasedAge', v)} label="Enable Department-Based Age" />
                            <Toggle checked={form.autoInitiateExit} onChange={v => set('autoInitiateExit', v)} label="Auto Initiate Exit Process" />
                        </div>
                    </div>
                </div>

                {/* Notification Settings */}
                <div className="hrm-card">
                    <div style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Clock size={18} className="text-primary-blue" />
                            NOTIFICATIONS
                        </h3>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                            {form.notificationDays.map(d => (
                                <span key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--primary-light)', color: 'var(--primary-blue)', fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                                    {d} days
                                    <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeNotificationDay(d)} />
                                </span>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                            {PRESET_DAYS.filter(d => !form.notificationDays.includes(d)).map(d => (
                                <button key={d} onClick={() => addNotificationDay(d)}
                                    style={{ fontSize: 12, padding: '5px 14px', borderRadius: 20, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    + {d}d
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <input
                                type="number" min={1} placeholder="Add custom days..."
                                className="hrm-input"
                                value={dayInput} onChange={e => setDayInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addNotificationDay(dayInput)}
                                style={{ flex: 1 }}
                            />
                            <button className="btn-hrm btn-hrm-primary" onClick={() => addNotificationDay(dayInput)} style={{ width: 44, padding: 0 }}>
                                <Plus size={20} />
                            </button>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>HR will be notified at each configured interval before retirement</p>
                    </div>
                </div>

                {/* Extension Settings */}
                <div className="hrm-card">
                    <div style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 24 }}>EXTENSION POLICY</h3>

                        <div style={{ marginBottom: 24 }}>
                            <Toggle checked={form.allowExtension} onChange={v => set('allowExtension', v)} label="Allow Retirement Extension" />
                        </div>

                        {form.allowExtension && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, padding: 20, background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                    <label className="hrm-label">Max Months <span className="req">*</span></label>
                                    <input type="number" className="hrm-input" min={1} max={60} value={form.maxExtensionMonths}
                                        onChange={e => set('maxExtensionMonths', Number(e.target.value))} />
                                </div>
                                <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                    <label className="hrm-label">Notice Days</label>
                                    <input type="number" className="hrm-input" min={0} value={form.noticePeriodDays}
                                        onChange={e => set('noticePeriodDays', Number(e.target.value))} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Overrides */}
                {(form.enableDepartmentBasedAge || form.enableRoleBasedAge) && (
                    <div className="hrm-card" style={{ gridColumn: 'span 2' }}>
                        <div style={{ padding: 24 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 24 }}>AGE OVERRIDES</h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                                {form.enableDepartmentBasedAge && (
                                    <div>
                                        <label className="hrm-label" style={{ marginBottom: 16 }}>Department Overrides</label>
                                        {form.departmentAgeOverrides.map((o, i) => (
                                            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                                                <div style={{ flex: 1 }}>
                                                    <SearchableSelect
                                                        options={[{ value: '', label: 'Select Department' }, ...departments.map(d => ({ value: d.name, label: d.name }))]}
                                                        value={o.departmentName}
                                                        onChange={val => {
                                                            const arr = [...form.departmentAgeOverrides];
                                                            arr[i] = { ...arr[i], departmentName: val };
                                                            set('departmentAgeOverrides', arr);
                                                        }}
                                                    />
                                                </div>
                                                <input type="number" className="hrm-input" style={{ width: 80 }} value={o.retirementAge}
                                                    onChange={e => {
                                                        const arr = [...form.departmentAgeOverrides];
                                                        arr[i].retirementAge = Number(e.target.value);
                                                        set('departmentAgeOverrides', arr);
                                                    }} />
                                                <button onClick={() => set('departmentAgeOverrides', form.departmentAgeOverrides.filter((_, j) => j !== i))}
                                                    style={{ background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer' }}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        <button className="btn-hrm btn-hrm-secondary" style={{ width: '100%', borderStyle: 'dashed' }} onClick={() => set('departmentAgeOverrides', [...form.departmentAgeOverrides, { departmentName: '', retirementAge: 60 }])}>
                                            <Plus size={16} /> ADD DEPARTMENT OVERRIDE
                                        </button>
                                    </div>
                                )}

                                {form.enableRoleBasedAge && (
                                    <div>
                                        <label className="hrm-label" style={{ marginBottom: 16 }}>Role Overrides</label>
                                        {form.roleAgeOverrides.map((o, i) => (
                                            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                                                <div style={{ flex: 1 }}>
                                                    <SearchableSelect
                                                        options={[{ value: '', label: 'Select Designation' }, ...designations.map(d => ({ value: d.designationName, label: d.designationName }))]}
                                                        value={o.roleName}
                                                        onChange={val => {
                                                            const arr = [...form.roleAgeOverrides];
                                                            arr[i] = { ...arr[i], roleName: val };
                                                            set('roleAgeOverrides', arr);
                                                        }}
                                                    />
                                                </div>
                                                <input type="number" className="hrm-input" style={{ width: 80 }} value={o.retirementAge}
                                                    onChange={e => {
                                                        const arr = [...form.roleAgeOverrides];
                                                        arr[i].retirementAge = Number(e.target.value);
                                                        set('roleAgeOverrides', arr);
                                                    }} />
                                                <button onClick={() => set('roleAgeOverrides', form.roleAgeOverrides.filter((_, j) => j !== i))}
                                                    style={{ background: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer' }}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        <button className="btn-hrm btn-hrm-secondary" style={{ width: '100%', borderStyle: 'dashed' }} onClick={() => set('roleAgeOverrides', [...form.roleAgeOverrides, { roleName: '', retirementAge: 60 }])}>
                                            <Plus size={16} /> ADD ROLE OVERRIDE
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RetirementSettings;
