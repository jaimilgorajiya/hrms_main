import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, AlertCircle, Minus } from 'lucide-react';
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
            title: 'Are you sure?',
            text: "This will remove all slabs for this shift. This cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff4d4f',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, remove all!'
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

    if (fetchingShifts) return <div className="loading-container">Loading Shifts...</div>;

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <h1 className="hrm-title">Penalty Rules</h1>
            </div>

            <div className="hrm-card" style={{ overflow: 'visible' }}>
                <div className="hrm-card-body">
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
                        <div className="hrm-form-group" style={{ flex: 1, maxWidth: '400px', marginBottom: 0 }}>
                            <SearchableSelect
                                label="Shift Name"
                                options={shifts.map(shift => ({ label: shift.shiftName, value: shift._id }))}
                                value={selectedShift}
                                onChange={(val) => setSelectedShift(val)}
                                placeholder="-- Select Shift --"
                            />
                        </div>
                        {selectedShift && slabs.length > 0 && (
                            <button className="btn-hrm btn-hrm-danger" onClick={handleRemoveAllSlabs}>
                                <Trash2 size={18} /> REMOVE ALL SLABS
                            </button>
                        )}
                    </div>

                    {selectedShift && (
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '30px' }}>
                            <div>
                                {slabs.map((slab, index) => (
                                    <div key={index} style={{
                                        padding: '25px',
                                        background: '#f8fafc',
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        marginBottom: '30px',
                                        position: 'relative'
                                    }}>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                            gap: '25px',
                                            alignItems: 'flex-end',
                                            position: 'relative',
                                            paddingRight: '64px'
                                        }}>
                                            <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                <SearchableSelect
                                                    label="Penalty Type"
                                                    options={[
                                                        { label: 'Late In Minutes', value: 'Late In Minutes' },
                                                        { label: 'Half-Day', value: 'Half-Day' },
                                                    ]}
                                                    value={slab.penaltyType}
                                                    onChange={(val) => handleSlabChange(index, 'penaltyType', val)}
                                                />
                                            </div>

                                            {slab.penaltyType === 'Half-Day' ? (
                                                <>
                                                    <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                        <SearchableSelect
                                                            label="Hour"
                                                            options={hourOptions}
                                                            value={getHour(slab.threshold_time)}
                                                            onChange={(val) => handleTimeChange(index, 'h', val)}
                                                            placeholder="HH"
                                                            searchable={true}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                        <SearchableSelect
                                                            label="Minute"
                                                            options={minuteOptions}
                                                            value={getMinute(slab.threshold_time)}
                                                            onChange={(val) => handleTimeChange(index, 'm', val)}
                                                            placeholder="MM"
                                                            searchable={true}
                                                            required
                                                        />
                                                        <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                                                            If employee logs in after this time, they will be marked as Half-Day
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                        <label className="hrm-label">Min Time (Min) <span className="req">*</span></label>
                                                        <input type="number" className="hrm-input" placeholder="05" value={slab.minTime} onChange={(e) => handleSlabChange(index, 'minTime', e.target.value)} />
                                                    </div>

                                                    <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                        <label className="hrm-label">Max Time (Min) <span className="req">*</span></label>
                                                        <input type="number" className="hrm-input" placeholder="45" value={slab.maxTime} onChange={(e) => handleSlabChange(index, 'maxTime', e.target.value)} />
                                                    </div>

                                                    <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                        <label className="hrm-label">Penalty Value <span className="req">*</span></label>
                                                        <input type="number" className="hrm-input" placeholder="150" value={slab.value} onChange={(e) => handleSlabChange(index, 'value', e.target.value)} />
                                                    </div>

                                                    <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                        <label className="hrm-label">Grace Count <span className="req">*</span></label>
                                                        <input
                                                            type="number"
                                                            className="hrm-input"
                                                            placeholder="0"
                                                            min="0"
                                                            value={slab.grace_count ?? 0}
                                                            onChange={(e) => handleSlabChange(index, 'grace_count', e.target.value)}
                                                        />
                                                        <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                                                            Number of allowed late entries without penalty per month
                                                        </span>
                                                    </div>
                                                </>
                                            )}

                                            <button
                                                className="btn-hrm btn-hrm-danger"
                                                style={{ padding: '12px', width: '48px', height: '48px', position: 'absolute', right: 0, bottom: 0 }}
                                                onClick={() => handleRemoveSlab(index)}
                                            >
                                                <Minus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button className="btn-hrm btn-hrm-secondary" style={{ borderStyle: 'dashed', width: '100%', marginBottom: '30px' }} onClick={handleAddSlab}>
                                <Plus size={18} /> ADD MORE PENALTY SLAB
                            </button>

                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <button className="btn-hrm btn-hrm-primary" style={{ padding: '12px 60px' }} onClick={handleSave} disabled={loading}>
                                    <Save size={20} /> {loading ? 'SAVING...' : 'SAVE'}
                                </button>
                            </div>
                        </div>
                    )}

                    {!selectedShift && !loading && (
                        <div style={{ textAlign: 'center', padding: '100px 0', color: '#94a3b8' }}>
                            <AlertCircle size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
                            <p style={{ fontSize: '16px' }}>Please select a shift to view or manage penalty rules.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PenaltyRules;
