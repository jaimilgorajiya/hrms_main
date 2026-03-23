import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, AlertCircle, Minus } from 'lucide-react';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const PenaltyRules = () => {
    const [shifts, setShifts] = useState([]);
    const [selectedShift, setSelectedShift] = useState('');
    const [slabs, setSlabs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingShifts, setFetchingShifts] = useState(true);

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchShifts();
    }, []);

    useEffect(() => {
        if (selectedShift) {
            fetchPenaltyRules(selectedShift);
        } else {
            setSlabs([]);
        }
    }, [selectedShift]);

    const fetchShifts = async () => {
        try {
            setFetchingShifts(true);
            const response = await authenticatedFetch(`${API_URL}/api/shifts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setShifts(data.shifts);
            }
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
            if (data.success) {
                setSlabs(data.penaltyRule.slabs || []);
            }
        } catch (error) {
            console.error("Error fetching penalty rules:", error);
            Swal.fire('Error', 'Failed to fetch penalty rules', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getTypeOptions = (penaltyType) => {
        switch(penaltyType) {
            case 'Late In Minutes':
            case 'Break Penalty':
                return [
                    { label: 'Flat', value: 'Flat' },
                    { label: 'Percentage', value: 'Percentage' },
                    { label: 'Per Minute (Flat Amount)', value: 'Per Minute (Flat Amount)' },
                    { label: 'Per Minute (As Per Salary)', value: 'Per Minute (As Per Salary)' },
                    { label: 'Half Day Salary', value: 'Half Day Salary' },
                    { label: 'Full Day Salary', value: 'Full Day Salary' }
                ];
            case 'Auto Leave':
                return [
                    { label: 'Half Day Salary', value: 'Half Day Salary' },
                    { label: 'Full Day Salary', value: 'Full Day Salary' }
                ];
            default:
                return [{ label: 'Flat', value: 'Flat' }];
        }
    };

    const handleAddSlab = () => {
        setSlabs([...slabs, {
            penaltyType: 'Auto Leave',
            minTime: '',
            maxTime: '',
            type: 'Flat',
            value: ''
        }]);
    };

    const handleRemoveSlab = (index) => {
        const newSlabs = slabs.filter((_, i) => i !== index);
        setSlabs(newSlabs);
    };

    const handleSlabChange = (index, field, value) => {
        const newSlabs = [...slabs];
        newSlabs[index][field] = value;

        if (field === 'type' && ['Half Day Salary', 'Full Day Salary'].includes(value)) {
            newSlabs[index].value = value === 'Half Day Salary' ? '0.5' : '1';
        }

        setSlabs(newSlabs);
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
            const needsMaxTime = ['Late In Minutes', 'Break Penalty'].includes(slab.penaltyType);
            if (!slab.minTime || (needsMaxTime && !slab.maxTime) || !slab.value) {
                Swal.fire('Validation Error', 'Please fill all required fields in each slab', 'error');
                return;
            }
        }

        try {
            setLoading(true);
            const response = await authenticatedFetch(`${API_URL}/api/penalty-rules/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    shiftId: selectedShift,
                    slabs
                })
            });

            const data = await response.json();
            if (data.success) {
                Swal.fire('Success', 'Penalty rules saved successfully', 'success');
            } else {
                Swal.fire('Error', data.message || 'Failed to save penalty rules', 'error');
            }
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
                                            alignItems: 'flex-end'
                                        }}>
                                            <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                <SearchableSelect 
                                                    label="Penalty Type"
                                                    options={[
                                                        { label: 'Auto Leave', value: 'Auto Leave' },
                                                        { label: 'Late In Minutes', value: 'Late In Minutes' },
                                                        { label: 'Break Penalty', value: 'Break Penalty' }
                                                    ]}
                                                    value={slab.penaltyType}
                                                    onChange={(val) => handleSlabChange(index, 'penaltyType', val)}
                                                />
                                            </div>

                                            <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                <label className="hrm-label">
                                                    {slab.penaltyType === 'Auto Leave' ? 'No of Attendance/Leave' : 'Min Time (Min)'} <span className="req">*</span>
                                                </label>
                                                <input type="number" className="hrm-input" placeholder="05" value={slab.minTime} onChange={(e) => handleSlabChange(index, 'minTime', e.target.value)} />
                                            </div>

                                            {['Late In Minutes', 'Break Penalty'].includes(slab.penaltyType) && (
                                                <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                    <label className="hrm-label">Max Time (Min) <span className="req">*</span></label>
                                                    <input type="number" className="hrm-input" placeholder="45" value={slab.maxTime} onChange={(e) => handleSlabChange(index, 'maxTime', e.target.value)} />
                                                </div>
                                            )}

                                            <div className="hrm-form-group" style={{ marginBottom: 0 }}>
                                                <label className="hrm-label">Penalty Value <span className="req">*</span></label>
                                                <input 
                                                    type="number" 
                                                    className="hrm-input"
                                                    placeholder="150"
                                                    value={slab.value}
                                                    onChange={(e) => handleSlabChange(index, 'value', e.target.value)}
                                                />
                                            </div>

                                            <button className="btn-hrm btn-hrm-danger" style={{ padding: '12px', minWidth: '48px', height: '48px' }} onClick={() => handleRemoveSlab(index)}>
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
