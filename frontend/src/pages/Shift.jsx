import authenticatedFetch from '../utils/apiHandler';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Users, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import API_URL from '../config/api';

const Shift = () => {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedShifts, setSelectedShifts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchShifts();
    }, []);

    const fetchShifts = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await authenticatedFetch(`${API_URL}/api/shifts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setShifts(data.shifts);
            }
        } catch (error) {
            console.error("Error fetching shifts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Shift?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'var(--text-secondary)',
            confirmButtonText: 'Yes, delete it'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                const response = await authenticatedFetch(`${API_URL}/api/shifts/delete/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.success) {
                    Swal.fire({
                        title: 'Deleted!',
                        text: 'Shift has been removed.',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    fetchShifts();
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to delete shift', 'error');
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedShifts.length === 0) {
            Swal.fire({
                title: 'No Selection',
                text: 'Please select at least one shift to delete.',
                icon: 'info',
                confirmButtonColor: '#2563EB'
            });
            return;
        }

        const result = await Swal.fire({
            title: `Delete ${selectedShifts.length} Shift(s)?`,
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'var(--text-secondary)',
            confirmButtonText: 'Yes, delete all'
        });

        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                await Promise.all(
                    selectedShifts.map(id =>
                        authenticatedFetch(`${API_URL}/api/shifts/delete/${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        })
                    )
                );
                Swal.fire({
                    title: 'Deleted!',
                    text: 'Selected shifts removed.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                setSelectedShifts([]);
                fetchShifts();
            } catch (error) {
                Swal.fire('Error', 'Failed to delete shifts', 'error');
            }
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedShifts(filteredShifts.map(shift => shift._id));
        } else {
            setSelectedShifts([]);
        }
    };

    const handleSelectShift = (id) => {
        setSelectedShifts(prev =>
            prev.includes(id) ? prev.filter(shiftId => shiftId !== id) : [...prev, id]
        );
    };

    // Filter shifts
    const filteredShifts = shifts.filter(shift =>
        shift.shiftName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shift.shiftCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="hrm-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="animate-spin" style={{ color: 'var(--primary-blue)' }}><Plus size={40} /></div>
        </div>
    );

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Shift Management</h1>
                    <p className="hrm-subtitle">Configure working hours and weekly off patterns</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        className="btn-hrm btn-hrm-secondary"
                        onClick={handleBulkDelete}
                        disabled={selectedShifts.length === 0}
                        style={{ color: 'var(--danger)', opacity: selectedShifts.length === 0 ? 0.5 : 1 }}
                    >
                        <Trash2 size={16} /> Delete Selected ({selectedShifts.length})
                    </button>
                    <button className="btn-hrm btn-hrm-primary" onClick={() => navigate('/admin/shift/add')}>
                        <Plus size={16} /> Add Shift
                    </button>
                </div>
            </div>

            <div className="hrm-card" style={{ marginBottom: '24px' }}>
                <div style={{ padding: '24px' }}>
                    <div className="hrm-search-wrapper" style={{ maxWidth: '400px' }}>
                        <Search size={18} className="hrm-search-icon" />
                        <input
                            type="text"
                            className="hrm-input hrm-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by shift name or code..."
                        />
                    </div>
                </div>
            </div>

            <div className="hrm-card">
                <div className="hrm-table-container">
                    <table className="hrm-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'center', width: '60px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedShifts.length === filteredShifts.length && filteredShifts.length > 0}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th style={{ textAlign: 'center', width: '100px' }}>Action</th>
                                <th>Shift Code</th>
                                <th>Shift Name</th>
                                <th style={{ textAlign: 'center' }}>Active Employees</th>
                                <th>Week Off Pattern</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredShifts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
                                        No shift configurations found.
                                    </td>
                                </tr>
                            ) : (
                                filteredShifts.map((shift, index) => (
                                    <tr key={shift._id}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedShifts.includes(shift._id)}
                                                onChange={() => handleSelectShift(shift._id)}
                                            />
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => navigate(`/admin/shift/edit/${shift._id}`)}
                                                    title="Edit Shift"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="icon-btn"
                                                    style={{ color: 'var(--danger)' }}
                                                    onClick={() => handleDelete(shift._id)}
                                                    title="Delete Shift"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="hrm-badge" style={{ background: 'var(--bg-main)', color: 'var(--text-dark)', border: '1px solid var(--border)' }}>
                                                {shift.shiftCode || `S${index + 1}`}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '700', color: 'var(--text-dark)', fontSize: '15px' }}>{shift.shiftName}</div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary-blue)', fontWeight: '800', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: '10px' }}>
                                                <Users size={14} />
                                                {shift.employeeCount || 0}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>
                                                <Calendar size={14} />
                                                {shift.weekOffDays?.length > 0 ? shift.weekOffDays.join(', ') : shift.weekOffType}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Shift;
