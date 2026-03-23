import { useState, useEffect } from 'react';
import { Save, RotateCcw, Plus, X, Settings } from 'lucide-react';
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
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <div
            onClick={() => onChange(!checked)}
            style={{
                width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
                background: checked ? '#2563EB' : '#CBD5E1', transition: 'background 0.2s'
            }}
        >
            <div style={{
                position: 'absolute', top: 3, left: checked ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
        </div>
        <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{label}</span>
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

    if (loading) return <div className="hrm-container"><p style={{ color: '#94A3B8', padding: 40 }}>Loading...</p></div>;

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h1 className="hrm-title">Retirement Settings</h1>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-hrm btn-hrm-secondary" onClick={handleReset}>
                        <RotateCcw size={15} /> RESET
                    </button>
                    <button className="btn-hrm btn-hrm-primary" onClick={handleSave} disabled={saving}>
                        <Save size={15} /> {saving ? 'SAVING...' : 'SAVE SETTINGS'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                {/* Basic Settings */}
                <div className="hrm-card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #F1F5F9' }}>
                        Basic Configuration
                    </h3>

                    <div style={{ marginBottom: 20 }}>
                        <label className="hrm-label">Default Retirement Age <span style={{ color: '#EF4444' }}>*</span></label>
                        <input
                            type="number" min={40} max={80}
                            value={form.defaultRetirementAge}
                            onChange={e => set('defaultRetirementAge', Number(e.target.value))}
                            className="hrm-input"
                            placeholder="e.g. 60"
                        />
                        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Must be between 40 and 80 years</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Toggle checked={form.enableRoleBasedAge} onChange={v => set('enableRoleBasedAge', v)} label="Enable Role-Based Retirement Age" />
                        <Toggle checked={form.enableDepartmentBasedAge} onChange={v => set('enableDepartmentBasedAge', v)} label="Enable Department-Based Retirement Age" />
                        <Toggle checked={form.autoInitiateExit} onChange={v => set('autoInitiateExit', v)} label="Auto Initiate Exit Process" />
                    </div>
                </div>

                {/* Notification Settings */}
                <div className="hrm-card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #F1F5F9' }}>
                        Notification Before Retirement
                    </h3>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                        {form.notificationDays.map(d => (
                            <span key={d} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EFF6FF', color: '#2563EB', fontSize: 13, fontWeight: 700, padding: '5px 12px', borderRadius: 20, border: '1px solid #BFDBFE' }}>
                                {d} days
                                <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeNotificationDay(d)} />
                            </span>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                        {PRESET_DAYS.filter(d => !form.notificationDays.includes(d)).map(d => (
                            <button key={d} onClick={() => addNotificationDay(d)}
                                style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '1px dashed #CBD5E1', background: 'transparent', color: '#64748B', cursor: 'pointer' }}>
                                + {d}d
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            type="number" min={1} placeholder="Custom days..."
                            value={dayInput} onChange={e => setDayInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addNotificationDay(dayInput)}
                            className="hrm-input" style={{ flex: 1 }}
                        />
                        <button className="btn-hrm btn-hrm-primary" onClick={() => addNotificationDay(dayInput)}>
                            <Plus size={14} />
                        </button>
                    </div>
                    <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>HR will be notified at each configured interval before retirement</p>
                </div>

                {/* Extension Settings */}
                <div className="hrm-card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #F1F5F9' }}>
                        Extension Policy
                    </h3>

                    <div style={{ marginBottom: 20 }}>
                        <Toggle checked={form.allowExtension} onChange={v => set('allowExtension', v)} label="Allow Retirement Extension" />
                    </div>

                    {form.allowExtension && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 16, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', alignItems: 'end' }}>
                            <div>
                                <label className="hrm-label">Max Extension Duration (months) <span style={{ color: '#EF4444' }}>*</span></label>
                                <input type="number" min={1} max={60} value={form.maxExtensionMonths}
                                    onChange={e => set('maxExtensionMonths', Number(e.target.value))}
                                    className="hrm-input" />
                            </div>
                            <div>
                                <label className="hrm-label" style={{ whiteSpace: 'nowrap' }}>Notice Period (days)</label>
                                <input type="number" min={0} value={form.noticePeriodDays}
                                    onChange={e => set('noticePeriodDays', Number(e.target.value))}
                                    className="hrm-input" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Department Overrides */}
                {form.enableDepartmentBasedAge && (
                    <div className="hrm-card" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #F1F5F9' }}>
                            Department-Based Age Overrides
                        </h3>
                        {form.departmentAgeOverrides.map((o, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <SearchableSelect
                                        options={[{ value: '', label: 'Select Department' }, ...departments.map(d => ({ value: d.name, label: d.name }))]}
                                        value={o.departmentName}
                                        onChange={val => {
                                            const arr = [...form.departmentAgeOverrides];
                                            arr[i] = { ...arr[i], departmentName: val };
                                            set('departmentAgeOverrides', arr);
                                        }}
                                        placeholder="Select Department"
                                    />
                                </div>
                                <input type="number" min={40} max={80} placeholder="Age" value={o.retirementAge}
                                    onChange={e => {
                                        const arr = [...form.departmentAgeOverrides];
                                        arr[i].retirementAge = Number(e.target.value);
                                        set('departmentAgeOverrides', arr);
                                    }}
                                    style={{ width: 80, minHeight: 48, padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 14, textAlign: 'center', flexShrink: 0, boxSizing: 'border-box' }} />
                                <button onClick={() => set('departmentAgeOverrides', form.departmentAgeOverrides.filter((_, j) => j !== i))}
                                    style={{ background: '#FEF2F2', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: '#EF4444' }}>
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        <button className="btn-hrm btn-hrm-secondary" onClick={() => set('departmentAgeOverrides', [...form.departmentAgeOverrides, { departmentName: '', retirementAge: 60 }])}>
                            <Plus size={14} /> Add Override
                        </button>
                    </div>
                )}

                {/* Role/Designation Overrides */}
                {form.enableRoleBasedAge && (
                    <div className="hrm-card" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #F1F5F9' }}>
                            Role/Designation-Based Age Overrides
                        </h3>
                        {form.roleAgeOverrides.map((o, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <SearchableSelect
                                        options={[{ value: '', label: 'Select Designation' }, ...designations.map(d => ({ value: d.designationName, label: d.designationName }))]}
                                        value={o.roleName}
                                        onChange={val => {
                                            const arr = [...form.roleAgeOverrides];
                                            arr[i] = { ...arr[i], roleName: val };
                                            set('roleAgeOverrides', arr);
                                        }}
                                        placeholder="Select Designation"
                                    />
                                </div>
                                <input type="number" min={40} max={80} placeholder="Age" value={o.retirementAge}
                                    onChange={e => {
                                        const arr = [...form.roleAgeOverrides];
                                        arr[i].retirementAge = Number(e.target.value);
                                        set('roleAgeOverrides', arr);
                                    }}
                                    style={{ width: 80, minHeight: 48, padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 14, textAlign: 'center', flexShrink: 0, boxSizing: 'border-box' }} />
                                <button onClick={() => set('roleAgeOverrides', form.roleAgeOverrides.filter((_, j) => j !== i))}
                                    style={{ background: '#FEF2F2', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: '#EF4444' }}>
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        <button className="btn-hrm btn-hrm-secondary" onClick={() => set('roleAgeOverrides', [...form.roleAgeOverrides, { roleName: '', retirementAge: 60 }])}>
                            <Plus size={14} /> Add Override
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RetirementSettings;
