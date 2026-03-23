import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, Edit2, AlertCircle, Check, Search } from 'lucide-react';
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
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#64748B',
            confirmButtonText: 'Yes, delete it!'
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
        <div style={{ padding: '0px', width: '100%', minHeight: '100vh', background: '#F8FAFC' }}>
            <div style={{ padding: '24px 30px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1E293B', margin: 0 }}>
                    Add Next Day Grace Time
                </h1>
            </div>

            <div style={{ padding: '0 30px 40px' }}>
                {/* Form Card */}
                <div style={{ 
                    background: 'white', 
                    borderRadius: '12px', 
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
                    border: '1px solid #E2E8F0',
                    marginBottom: '30px'
                }}>
                    <form onSubmit={handleSave}>
                        <div style={{ padding: '30px' }}>
                            <div style={{ marginBottom: '30px', maxWidth: '500px' }}>
                                <SearchableSelect 
                                    label="Shift Name"
                                    required={true}
                                    options={shifts.map(s => ({ label: s.shiftName, value: s._id }))}
                                    value={selectedShifts}
                                    onChange={(val) => setSelectedShifts(val)}
                                    placeholder="Select Shifts"
                                    searchable={true}
                                    multiple={true}
                                />
                            </div>

                            <div className="slabs-container">
                                {slabs.map((slab, index) => (
                                    <div key={index} style={{ 
                                        display: 'flex', 
                                        gap: '20px', 
                                        alignItems: 'flex-start', 
                                        marginBottom: '15px'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ color: '#475569', fontWeight: '600', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                                                Extra Working Time (Minutes) <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <input 
                                                type="number" 
                                                className="form-control-hrm"
                                                style={{ height: '45px', borderRadius: '8px', border: '1.5px solid #E2E8F0', padding: '0 15px', width: '100%' }}
                                                value={slab.extraWorkingMinutes}
                                                onChange={(e) => handleSlabChange(index, 'extraWorkingMinutes', e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <label style={{ color: '#475569', fontWeight: '600', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                                                Next Day Grace Time (Minutes) <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            <input 
                                                type="number" 
                                                className="form-control-hrm"
                                                style={{ height: '45px', borderRadius: '8px', border: '1.5px solid #E2E8F0', padding: '0 15px', width: '100%' }}
                                                value={slab.graceMinutes}
                                                onChange={(e) => handleSlabChange(index, 'graceMinutes', e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div style={{ width: '45px', marginTop: '30px' }}>
                                            {slabs.length > 1 && (
                                                <button 
                                                    type="button"
                                                    onClick={() => handleRemoveSlab(index)}
                                                    style={{ 
                                                        height: '45px', width: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        background: '#FEF2F2', border: '1px solid #FEE2E2', color: '#EF4444', borderRadius: '8px', cursor: 'pointer'
                                                    }}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button 
                                type="button"
                                onClick={handleAddSlab}
                                style={{ 
                                    background: 'transparent', border: 'none', color: '#2563EB', fontWeight: '700', fontSize: '13px',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px'
                                }}
                            >
                                <Plus size={16} /> ADD MORE GRACE TIME SLAB
                            </button>
                        </div>

                        <div style={{ 
                            padding: '20px 30px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '15px',
                            background: '#fff', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px'
                        }}>
                            <button 
                                type="submit" 
                                style={{ 
                                    height: '45px', padding: '0 25px', background: '#3B648B', color: 'white', border: 'none',
                                    borderRadius: '8px', fontWeight: '600', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                                }}
                                disabled={loading}
                            >
                                {loading ? 'SAVING...' : <><Save size={18} /> SAVE</>}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => { setSelectedShifts([]); setSlabs([{ extraWorkingMinutes: '', graceMinutes: '' }]); }}
                                style={{ 
                                    height: '45px', padding: '0 20px', background: '#F1F5F9', color: '#475569', border: 'none',
                                    borderRadius: '8px', fontWeight: '600', fontSize: '15px', cursor: 'pointer'
                                }}
                            >
                                CLEAR
                            </button>
                        </div>
                    </form>
                </div>

                {/* Management Section */}
                <div style={{ 
                    background: 'white', 
                    borderRadius: '12px', 
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '20px 30px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1E293B', margin: 0 }}>Manage Grace Time Rules</h2>
                        <div style={{ position: 'relative', width: '300px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                            <input 
                                type="text"
                                placeholder="Search shift..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', height: '40px', padding: '0 15px 0 40px', border: '1.5px solid #E2E8F0', borderRadius: '8px', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: '#F8FAFC' }}>
                                    <th style={{ padding: '15px 30px', color: '#64748B', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase' }}>Shift Name</th>
                                    <th style={{ padding: '15px 30px', color: '#64748B', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase' }}>Grace Time Details</th>
                                    <th style={{ padding: '15px 30px', color: '#64748B', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRules.length > 0 ? filteredRules.map((rule) => (
                                    <tr key={rule._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                        <td style={{ padding: '20px 30px', color: '#1E293B', fontWeight: '600' }}>{rule.shiftName}</td>
                                        <td style={{ padding: '20px 30px' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {rule.slabs.map((s, idx) => (
                                                    <span key={idx} style={{ 
                                                        background: '#EFF6FF', color: '#2563EB', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', border: '1px solid #DBEAFE'
                                                    }}>
                                                        Ex: {s.extraWorkingMinutes}m → Grace: {s.graceMinutes}m
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 30px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                                <button 
                                                    onClick={() => handleEdit(rule)}
                                                    className="btn-action-edit"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(rule._id)}
                                                    className="btn-action-delete"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="3" style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No grace time rules found</td>
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

