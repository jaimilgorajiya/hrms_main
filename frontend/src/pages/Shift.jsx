import authenticatedFetch from '../utils/apiHandler';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Users, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import '../styles/ManageShift.css';
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
            cancelButtonColor: '#64748b',
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
            cancelButtonColor: '#64748b',
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

    if (loading) return <div className="loading-container">Loading shift records...</div>;

    return (
        <div className="designation-container">
            <div className="designation-header">
                <h1 className="profile-title">Manage Shift</h1>
                <div className="header-actions">
                    <button className="btn-theme btn-theme-primary" onClick={() => navigate('/admin/shift/add')}>
                        <Plus size={16} /> ADD
                    </button>
                    <button
                        className="btn-theme btn-theme-danger"
                        onClick={handleBulkDelete}
                        disabled={selectedShifts.length === 0}
                        style={{ opacity: selectedShifts.length === 0 ? 0.6 : 1 }}
                    >
                        <Trash2 size={16} /> DELETE
                    </button>
                </div>
            </div>

            <div className="designation-card">
                <div className="table-controls">
                    <div className="search-control">
                        <div className="search-wrapper">
                            <Search size={18} color="var(--text-light)" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name or code..."
                                style={{ fontSize: '15px' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="table-wrapper">
                    <table className="designation-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'center', width: '60px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedShifts.length === filteredShifts.length && filteredShifts.length > 0}
                                        onChange={handleSelectAll}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                </th>
                                <th style={{ textAlign: 'center', width: '80px' }}>Sr. No</th>
                                <th style={{ textAlign: 'center', width: '100px' }}>Action</th>
                                <th style={{ width: '150px' }}>Shift Code</th>
                                <th>Shift Name</th>
                                <th style={{ textAlign: 'center', width: '120px' }}>Employees</th>
                                <th>Week Off</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredShifts.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-light)', fontSize: '16px' }}>
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
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: '500', color: 'var(--text-light)' }}>
                                            {index + 1}
                                        </td>
                                        <td>
                                            <div className="action-buttons-cell">
                                                <button
                                                    className="btn-action-edit"
                                                    onClick={() => navigate(`/admin/shift/edit/${shift._id}`)}
                                                    title="Edit Shift"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="btn-action-delete"
                                                    onClick={() => handleDelete(shift._id)}
                                                    title="Delete Shift"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="percentage" style={{ background: '#F1F5F9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: '700', border: '1px solid #E2E8F0' }}>
                                                {shift.shiftCode || `S${index + 1}`}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: '700', color: 'var(--text-dark)', fontSize: '18px' }}>
                                            {shift.shiftName}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#2563EB', fontWeight: '600' }}>
                                                <Users size={16} />
                                                {shift.employeeCount || 0}
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--text-main)', fontSize: '15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Calendar size={15} color="#64748B" />
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
