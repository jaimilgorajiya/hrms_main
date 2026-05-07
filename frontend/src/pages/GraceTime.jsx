import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, Edit2, AlertCircle, Check, Search, Clock, Zap } from 'lucide-react';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const GraceTime = () => {
    const [shifts, setShifts] = useState([]);
    const [allRules, setAllRules] = useState([]);
    const [selectedShifts, setSelectedShifts] = useState([]); 
    const [slabs, setSlabs] = useState([{ extraWorkingMinutes: '', graceMinutes: '' }]);
    const [loading, setLoading] = useState(false);
    const [fetchingShifts, setFetchingShifts] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchShifts();
        fetchAllRules();
    }, []);

    // When exactly one shift is selected, load its existing rules into the form
    useEffect(() => {
        if (selectedShifts.length === 1) {
            const rule = allRules.find(r => r.shiftId === selectedShifts[0]);
            if (rule) {
                setSlabs(rule.slabs.length > 0 ? rule.slabs : [{ extraWorkingMinutes: '', graceMinutes: '' }]);
            } else {
                setSlabs([{ extraWorkingMinutes: '', graceMinutes: '' }]);
            }
        } else if (selectedShifts.length === 0) {
            setSlabs([{ extraWorkingMinutes: '', graceMinutes: '' }]);
        }
    }, [selectedShifts, allRules]);

    const fetchShifts = async () => {
        try {
            setFetchingShifts(true);
            const response = await authenticatedFetch(`${API_URL}/api/shifts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setShifts(data.shifts || []);
            }
        } catch (error) {
            console.error("Error fetching shifts:", error);
        } finally {
            setFetchingShifts(false);
        }
    };

    const fetchAllRules = async () => {
        try {
            const response = await authenticatedFetch(`${API_URL}/api/grace-times`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                setAllRules(data);
            }
        } catch (error) {
            console.error("Error fetching rules:", error);
        }
    };

    const handleAddSlab = () => {
        setSlabs([...slabs, { extraWorkingMinutes: '', graceMinutes: '' }]);
    };

    const handleRemoveSlab = (index) => {
        if (slabs.length === 1) {
            setSlabs([{ extraWorkingMinutes: '', graceMinutes: '' }]);
            return;
        }
        setSlabs(slabs.filter((_, i) => i !== index));
    };

    const handleSlabChange = (index, field, value) => {
        const newSlabs = [...slabs];
        newSlabs[index] = { ...newSlabs[index], [field]: value };
        setSlabs(newSlabs);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        if (selectedShifts.length === 0) {
            Swal.fire('Error', 'Please select at least one shift', 'error');
            return;
        }

        const isValid = slabs.every(s => s.extraWorkingMinutes !== '' && s.graceMinutes !== '');
        if (!isValid) {
            Swal.fire('Error', 'Please fill all slab details', 'error');
            return;
        }

        try {
            setLoading(true);
            const response = await authenticatedFetch(`${API_URL}/api/grace-times`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ shiftIds: selectedShifts, slabs })
            });

            const data = await response.json();
            if (response.ok) {
                Swal.fire('Success', data.message || 'Grace time rules saved successfully', 'success');
                setSelectedShifts([]);
                setSlabs([{ extraWorkingMinutes: '', graceMinutes: '' }]);
                fetchAllRules();
            } else {
                Swal.fire('Error', data.message || 'Failed to save grace time rules', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'An error occurred while saving', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Rule?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: 'var(--text-secondary)',
            confirmButtonText: 'Yes, delete it'
        });

        if (result.isConfirmed) {
            try {
                const response = await authenticatedFetch(`${API_URL}/api/grace-times/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    Swal.fire('Deleted!', 'Rule has been deleted.', 'success');
                    fetchAllRules();
                    if (selectedShifts.length === 1 && allRules.find(r => r._id === id)?.shiftId === selectedShifts[0]) {
                        setSelectedShifts([]);
                    }
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete rule', 'error');
            }
        }
    };

    const handleEdit = (rule) => {
        setSelectedShifts([rule.shiftId]);
        setSlabs(rule.slabs);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const filteredRules = allRules.filter(rule => 
        rule.shiftName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Grace Time Configuration</h1>
                    <p className="hrm-subtitle">Define next-day grace time based on extra working minutes</p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="hrm-card">
                    <div className="hrm-modal-header" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-main)', padding: '16px 24px' }}>
                        <h3 className="hrm-modal-title" style={{ fontSize: '15px' }}>Rule Configuration</h3>
                    </div>
                    <form onSubmit={handleSave}>
                        <div style={{ padding: '24px' }}>
                            <div className="hrm-form-group" style={{ maxWidth: '500px', marginBottom: '24px' }}>
                                <SearchableSelect 
                                    label="Target Shift(s)"
                                    required={true}
                                    options={shifts.map(s => ({ label: s.shiftName, value: s._id }))}
                                    value={selectedShifts}
                                    onChange={(val) => setSelectedShifts(val)}
                                    placeholder="Select one or more shifts"
                                    searchable={true}
                                    multiple={true}
                                />
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Select multiple shifts to apply same rules in bulk</p>
                            </div>

                            <div className="slabs-container">
                                {slabs.map((slab, index) => (
                                    <div key={index} style={{ 
                                        display: 'flex', 
                                        gap: '20px', 
                                        alignItems: 'flex-start', 
                                        marginBottom: '20px',
                                        background: 'var(--bg-main)',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <label className="hrm-label">Extra Working Time (Minutes) <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <div style={{ position: 'relative' }}>
                                                <input 
                                                    type="number" 
                                                    className="hrm-input"
                                                    value={slab.extraWorkingMinutes}
                                                    onChange={(e) => handleSlabChange(index, 'extraWorkingMinutes', e.target.value)}
                                                    required
                                                    placeholder="0"
                                                />
                                                <Clock size={16} style={{ position: 'absolute', right: '12px', top: '13px', color: 'var(--text-muted)' }} />
                                            </div>
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <label className="hrm-label">Next Day Grace Time (Minutes) <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <div style={{ position: 'relative' }}>
                                                <input 
                                                    type="number" 
                                                    className="hrm-input"
                                                    value={slab.graceMinutes}
                                                    onChange={(e) => handleSlabChange(index, 'graceMinutes', e.target.value)}
                                                    required
                                                    placeholder="0"
                                                />
                                                <Zap size={16} style={{ position: 'absolute', right: '12px', top: '13px', color: 'var(--primary-blue)' }} />
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '28px' }}>
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveSlab(index)}
                                                className="icon-btn"
                                                style={{ color: 'var(--danger)', height: '42px', width: '42px', background: 'white' }}
                                                disabled={slabs.length === 1}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button 
                                type="button"
                                onClick={handleAddSlab}
                                className="btn-hrm btn-hrm-secondary"
                                style={{ borderStyle: 'dashed', width: '100%', justifyContent: 'center', background: 'transparent' }}
                            >
                                <Plus size={16} /> Add Another Slab
                            </button>
                        </div>

                        <div className="hrm-modal-footer" style={{ borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                            <button 
                                type="button" 
                                className="btn-hrm btn-hrm-secondary"
                                onClick={() => { setSelectedShifts([]); setSlabs([{ extraWorkingMinutes: '', graceMinutes: '' }]); }}
                            >
                                DISCARD
                            </button>
                            <button type="submit" className="btn-hrm btn-hrm-primary" disabled={loading}>
                                <Save size={18} /> {loading ? 'SAVING...' : 'SAVE CONFIGURATION'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="hrm-card">
                    <div className="hrm-modal-header" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-main)', padding: '16px 24px' }}>
                        <h3 className="hrm-modal-title" style={{ fontSize: '15px' }}>Existing Rules</h3>
                        <div className="hrm-search-wrapper" style={{ maxWidth: '300px', marginLeft: 'auto' }}>
                            <Search size={16} className="hrm-search-icon" />
                            <input 
                                type="text"
                                className="hrm-input hrm-search-input"
                                placeholder="Search shift..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ height: '36px' }}
                            />
                        </div>
                    </div>

                    <div className="hrm-table-container">
                        <table className="hrm-table">
                            <thead>
                                <tr>
                                    <th>Shift Name</th>
                                    <th>Grace Time Policy Details</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRules.length > 0 ? filteredRules.map((rule) => (
                                    <tr key={rule._id}>
                                        <td>
                                            <div style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{rule.shiftName}</div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {rule.slabs.map((s, idx) => (
                                                    <span key={idx} className="hrm-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary-blue)', border: '1px solid var(--primary-light)' }}>
                                                        {s.extraWorkingMinutes}m Work → {s.graceMinutes}m Grace
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button onClick={() => handleEdit(rule)} className="icon-btn" title="Edit"><Edit2 size={16} /></button>
                                                <button onClick={() => handleDelete(rule._id)} className="icon-btn" style={{ color: 'var(--danger)' }} title="Delete"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                                            <AlertCircle size={32} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
                                            <div>No grace time rules found</div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GraceTime;
