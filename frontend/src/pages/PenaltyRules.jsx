import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, AlertCircle, Minus, ShieldAlert, Clock, Zap, Info } from 'lucide-react';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const h = String(i).padStart(2, '0');
    return { label: h, value: h };
});
const minuteOptions = Array.from({ length: 60 }, (_, i) => {
    const m = String(i).padStart(2, '0');
    return { label: m, value: m };
});

const getHour = (time) => (time || '').split(':')[0] || '';
const getMinute = (time) => (time || '').split(':')[1] || '';
const buildTime = (h, m) => (h && m ? `${h}:${m}` : '');

const PenaltyRules = () => {
    const [shifts, setShifts] = useState([]);
    const [selectedShift, setSelectedShift] = useState('');
    const [slabs, setSlabs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingShifts, setFetchingShifts] = useState(true);

    const token = localStorage.getItem('token');

    useEffect(() => { fetchShifts(); }, []);

    useEffect(() => {
        if (selectedShift) fetchPenaltyRules(selectedShift);
        else setSlabs([]);
    }, [selectedShift]);

    const fetchShifts = async () => {
        try {
            setFetchingShifts(true);
            const response = await authenticatedFetch(`${API_URL}/api/shifts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) setShifts(data.shifts);
        } catch (error) {
            console.error("Error fetching shifts:", error);
            Swal.fire('Error', 'Failed to fetch shifts', 'error');
        } finally {
            setFetchingShifts(false);
        }
    };

    const fetchPenaltyRules = async (shiftId) => {
        try {
            setLoading(true);
            const response = await authenticatedFetch(`${API_URL}/api/penalty-rules/${shiftId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) setSlabs(data.penaltyRule.slabs || []);
        } catch (error) {
            console.error("Error fetching penalty rules:", error);
            Swal.fire('Error', 'Failed to fetch penalty rules', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSlab = () => {
        setSlabs([...slabs, {
            penaltyType: 'Late In Minutes',
            minTime: '', maxTime: '', type: 'Flat', value: '', grace_count: 0, threshold_time: ''
        }]);
    };

    const handleRemoveSlab = (index) => setSlabs(slabs.filter((_, i) => i !== index));

    const handleSlabChange = (index, field, value) => {
        const newSlabs = [...slabs];
        newSlabs[index][field] = value;
        if (field === 'penaltyType') {
            newSlabs[index].minTime = '';
            newSlabs[index].maxTime = '';
            newSlabs[index].value = '';
            newSlabs[index].grace_count = 0;
            newSlabs[index].threshold_time = '';
            newSlabs[index].type = 'Flat';
        }
        if (field === 'type' && ['Half Day Salary', 'Full Day Salary'].includes(value)) {
            newSlabs[index].value = value === 'Half Day Salary' ? '0.5' : '1';
        }
        setSlabs(newSlabs);
    };

    const handleTimeChange = (index, part, val) => {
        const current = slabs[index].threshold_time || '';
        const h = part === 'h' ? val : getHour(current);
        const m = part === 'm' ? val : getMinute(current);
        handleSlabChange(index, 'threshold_time', buildTime(h, m));
    };

    const handleRemoveAllSlabs = async () => {
        const result = await Swal.fire({
            title: 'Wipe all rules?',
            text: "This will remove all slabs for this shift. This cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff4d4f',
            cancelButtonColor: 'var(--text-secondary)',
            confirmButtonText: 'Yes, wipe rules'
        });
        if (result.isConfirmed) {
            try {
                const response = await authenticatedFetch(`${API_URL}/api/penalty-rules/${selectedShift}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    setSlabs([]);
                    Swal.fire('Removed!', 'All penalty rules removed for this shift.', 'success');
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to remove penalty rules', 'error');
            }
        }
    };

    const handleSave = async () => {
        if (!selectedShift) {
            Swal.fire('Warning', 'Please select a shift first', 'warning');
            return;
        }
        for (let slab of slabs) {
            if (slab.penaltyType === 'Half-Day') {
                if (!slab.threshold_time) {
                    Swal.fire('Validation Error', 'Please set "Late After Time" for Half-Day penalty', 'error');
                    return;
                }
            } else {
                if (!slab.minTime || !slab.maxTime || !slab.value) {
                    Swal.fire('Validation Error', 'Please fill all required fields in each slab', 'error');
                    return;
                }
                const gc = parseInt(slab.grace_count, 10);
                if (isNaN(gc) || gc < 0) {
                    Swal.fire('Validation Error', 'Grace Count must be a non-negative integer', 'error');
                    return;
                }
            }
        }
        try {
            setLoading(true);
            const response = await authenticatedFetch(`${API_URL}/api/penalty-rules/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    shiftId: selectedShift,
                    slabs: slabs.map(s => {
                        if (s.penaltyType === 'Half-Day') {
                            return { penaltyType: s.penaltyType, penalty_type: 'HALF_DAY', condition_type: 'LATE_IN', threshold_time: s.threshold_time };
                        }
                        return { ...s, grace_count: parseInt(s.grace_count, 10) || 0 };
                    })
                })
            });
            const data = await response.json();
            if (data.success) Swal.fire('Success', 'Penalty rules saved successfully', 'success');
            else Swal.fire('Error', data.message || 'Failed to save penalty rules', 'error');
        } catch (error) {
            console.error("Error saving penalty rules:", error);
            Swal.fire('Error', 'Failed to save penalty rules', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (fetchingShifts) return (
        <div className="hrm-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="animate-spin" style={{ color: 'var(--primary-blue)' }}><ShieldAlert size={40} /></div>
        </div>
    );

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Attendance Penalty Rules</h1>
                    <p className="hrm-subtitle">Configure late-in and early-out deductions per shift</p>
                </div>
            </div>

            <div className="hrm-card" style={{ overflow: 'visible' }}>
                <div style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
                        <div className="hrm-form-group" style={{ flex: 1, maxWidth: '400px', marginBottom: 0 }}>
                            <SearchableSelect
                                label="Target Shift"
                                options={shifts.map(shift => ({ label: shift.shiftName, value: shift._id }))}
                                value={selectedShift}
                                onChange={(val) => setSelectedShift(val)}
                                placeholder="Select a shift to manage rules"
                            />
                        </div>
                        {selectedShift && slabs.length > 0 && (
                            <button className="btn-hrm btn-hrm-secondary" onClick={handleRemoveAllSlabs} style={{ color: 'var(--danger)' }}>
                                <Trash2 size={18} /> Clear All Rules
                            </button>
                        )}
                    </div>

                    {selectedShift ? (
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
                            <div className="slabs-container">
                                {slabs.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '24px' }}>
                                        <Zap size={40} style={{ opacity: 0.1, margin: '0 auto 16px' }} />
                                        <p style={{ fontWeight: '600', color: 'var(--text-muted)' }}>No penalty rules defined for this shift.</p>
                                        <button className="btn-hrm btn-hrm-primary" style={{ marginTop: '16px' }} onClick={handleAddSlab}>
                                            <Plus size={18} /> Create First Slab
                                        </button>
                                    </div>
                                ) : (
                                    slabs.map((slab, index) => (
                                        <div key={index} style={{
                                            padding: '28px',
                                            background: 'var(--bg-main)',
                                            borderRadius: '16px',
                                            border: '1px solid var(--border)',
                                            marginBottom: '24px',
                                            position: 'relative',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                        }}>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                                gap: '24px',
                                                alignItems: 'flex-start',
                                                paddingRight: '60px'
                                            }}>
                                                <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                    <SearchableSelect
                                                        label="Penalty Category"
                                                        options={[
                                                            { label: 'Late In (Minutes)', value: 'Late In Minutes' },
                                                            { label: 'Early Out (Minutes)', value: 'Early Out Minutes' },
                                                            { label: 'Auto Half-Day', value: 'Half-Day' },
                                                        ]}
                                                        value={slab.penaltyType}
                                                        onChange={(val) => handleSlabChange(index, 'penaltyType', val)}
                                                    />
                                                </div>

                                                {slab.penaltyType === 'Half-Day' ? (
                                                    <div style={{ gridColumn: 'span 2', display: 'flex', gap: '20px' }}>
                                                        <div className="hrm-form-group" style={{ flex: 1, marginBottom: 0 }}>
                                                            <SearchableSelect
                                                                label="Trigger Hour"
                                                                options={hourOptions}
                                                                value={getHour(slab.threshold_time)}
                                                                onChange={(val) => handleTimeChange(index, 'h', val)}
                                                                placeholder="HH"
                                                                searchable={true}
                                                            />
                                                        </div>
                                                        <div className="hrm-form-group" style={{ flex: 1, marginBottom: 0 }}>
                                                            <SearchableSelect
                                                                label="Trigger Minute"
                                                                options={minuteOptions}
                                                                value={getMinute(slab.threshold_time)}
                                                                onChange={(val) => handleTimeChange(index, 'm', val)}
                                                                placeholder="MM"
                                                                searchable={true}
                                                            />
                                                        </div>
                                                        <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', background: 'var(--primary-light)', padding: '0 16px', borderRadius: '12px', border: '1px solid var(--primary-light)' }}>
                                                            <Info size={16} style={{ color: 'var(--primary-blue)', flexShrink: 0 }} />
                                                            <p style={{ fontSize: '11px', color: 'var(--primary-blue)', marginLeft: '12px', lineHeight: '1.4', fontWeight: '500' }}>
                                                                Employees checking in after {slab.threshold_time || 'HH:MM'} will be marked as Half-Day automatically.
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                            <label className="hrm-label">Range: Min Minutes</label>
                                                            <div style={{ position: 'relative' }}>
                                                                <input type="number" className="hrm-input" placeholder="e.g. 5" value={slab.minTime} onChange={(e) => handleSlabChange(index, 'minTime', e.target.value)} />
                                                                <Clock size={16} style={{ position: 'absolute', right: '12px', top: '13px', color: 'var(--text-muted)' }} />
                                                            </div>
                                                        </div>

                                                        <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                            <label className="hrm-label">Range: Max Minutes</label>
                                                            <div style={{ position: 'relative' }}>
                                                                <input type="number" className="hrm-input" placeholder="e.g. 30" value={slab.maxTime} onChange={(e) => handleSlabChange(index, 'maxTime', e.target.value)} />
                                                                <Clock size={16} style={{ position: 'absolute', right: '12px', top: '13px', color: 'var(--text-muted)' }} />
                                                            </div>
                                                        </div>

                                                        <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                            <label className="hrm-label">Penalty Amount (₹)</label>
                                                            <div style={{ position: 'relative' }}>
                                                                <input type="number" className="hrm-input" placeholder="0.00" value={slab.value} onChange={(e) => handleSlabChange(index, 'value', e.target.value)} />
                                                            </div>
                                                        </div>

                                                        <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                            <label className="hrm-label">Grace Occurrences</label>
                                                            <input
                                                                type="number"
                                                                className="hrm-input"
                                                                placeholder="0"
                                                                min="0"
                                                                value={slab.grace_count ?? 0}
                                                                onChange={(e) => handleSlabChange(index, 'grace_count', e.target.value)}
                                                            />
                                                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Free entries per month</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <button
                                                className="icon-btn"
                                                style={{ color: 'var(--danger)', position: 'absolute', right: '20px', top: '28px', background: 'white' }}
                                                onClick={() => handleRemoveSlab(index)}
                                                title="Remove Slab"
                                            >
                                                <Minus size={20} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {slabs.length > 0 && (
                                <>
                                    <button className="btn-hrm btn-hrm-secondary" style={{ borderStyle: 'dashed', width: '100%', marginBottom: '32px', justifyContent: 'center', background: 'transparent' }} onClick={handleAddSlab}>
                                        <Plus size={18} /> Add Another Penalty Slab
                                    </button>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                        <button className="btn-hrm btn-hrm-secondary" onClick={() => setSelectedShift('')}>CANCEL</button>
                                        <button className="btn-hrm btn-hrm-primary" style={{ padding: '12px 40px' }} onClick={handleSave} disabled={loading}>
                                            <Save size={18} /> {loading ? 'SAVING...' : 'SAVE CONFIGURATION'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <ShieldAlert size={40} style={{ opacity: 0.2 }} />
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '8px' }}>No Shift Selected</h3>
                            <p style={{ fontSize: '14px', maxWidth: '300px', margin: '0 auto' }}>Select a shift from the dropdown above to manage its attendance penalty rules.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PenaltyRules;
