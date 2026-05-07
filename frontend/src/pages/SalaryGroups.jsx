import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Calculator, X, Save } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';

const SalaryGroups = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        groupName: '',
        payrollFrequency: 'Monthly Pay',
        workingDaysType: 'Calendar days (Paid Week Off & Holiday)',
        salaryCycleStartDate: 1,
        fixedDays: 26,
        roundedSalary: 'No',
        status: 'Active'
    });

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/salary-groups/all`);
            const json = await res.json();
            if (json.success) setGroups(json.groups);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const resetForm = () => {
        setForm({
            groupName: '',
            payrollFrequency: 'Monthly Pay',
            workingDaysType: 'Calendar days (Paid Week Off & Holiday)',
            salaryCycleStartDate: 1,
            fixedDays: 26,
            roundedSalary: 'No',
            status: 'Active'
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (g) => {
        setForm({ ...g });
        setEditingId(g._id);
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingId
                ? `${API_URL}/api/salary-groups/update/${editingId}`
                : `${API_URL}/api/salary-groups/add`;
            const res = await authenticatedFetch(url, {
                method: editingId ? 'PUT' : 'POST',
                body: JSON.stringify(form)
            });
            const json = await res.json();
            if (json.success) {
                Swal.fire({
                    title: 'Success',
                    text: json.message,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                resetForm();
                fetchGroups();
            } else {
                Swal.fire('Error', json.message, 'error');
            }
        } catch (e) {
            Swal.fire('Error', 'Something went wrong', 'error');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Salary Group?',
            text: 'This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: 'var(--text-secondary)',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const res = await authenticatedFetch(`${API_URL}/api/salary-groups/delete/${id}`, {
                    method: 'DELETE'
                });
                const json = await res.json();
                if (json.success) {
                    Swal.fire('Deleted!', 'Salary Group removed.', 'success');
                    fetchGroups();
                } else {
                    Swal.fire('Error', json.message, 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Deletion failed', 'error');
            }
        }
    };

    const freqOptions = [
        { value: 'Monthly Pay', label: 'Monthly Pay' },
        { value: 'Weekly Pay', label: 'Weekly Pay' }
    ];

    const wdOptions = [
        { value: 'Calendar days (Paid Week Off & Holiday)', label: 'Calendar days (Paid Week Off & Holiday)' },
        { value: 'Fixed Working Days', label: 'Fixed Working Days' }
    ];

    const yesNoOptions = [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' }
    ];

    const statusOptions = [
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' }
    ];

    const dateOptions = Array.from({ length: 30 }, (_, i) => {
        const day = i + 1;
        const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
        return { value: day, label: `${day}${suffix} of Month` };
    });

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Salary Groups</h1>
                    <p className="hrm-subtitle">Core payroll configuration and working days policy</p>
                </div>
                <button className="btn-hrm btn-hrm-primary" onClick={() => setShowForm(true)}>
                    <Plus size={18} /> ADD SALARY GROUP
                </button>
            </div>

            <div className="hrm-card">
                {loading ? (
                    <div style={{ padding: '100px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div className="animate-spin" style={{ display: 'inline-block' }}><Calculator size={32} /></div>
                        <p style={{ marginTop: '16px', fontWeight: '600' }}>Loading salary groups...</p>
                    </div>
                ) : groups.length === 0 ? (
                    <div style={{ padding: '100px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Calculator size={48} style={{ marginBottom: '15px', opacity: 0.3, margin: '0 auto' }} />
                        <p style={{ fontWeight: '600' }}>No salary groups found. Add your first group.</p>
                    </div>
                ) : (
                    <div className="hrm-table-container">
                        <table className="hrm-table">
                            <thead>
                                <tr>
                                    <th>Salary Group</th>
                                    <th>Frequency</th>
                                    <th>Working Days Policy</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map(g => (
                                    <tr key={g._id}>
                                        <td>
                                            <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-dark)' }}>
                                                {g.groupName}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                Cycle Start: Day {g.salaryCycleStartDate}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{g.payrollFrequency}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
                                                {g.workingDaysType}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`hrm-badge ${g.status === 'Active' ? 'hrm-badge-success' : 'hrm-badge-danger'}`}>
                                                {g.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button className="icon-btn" onClick={() => handleEdit(g)} title="Edit">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(g._id)} title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="hrm-modal-overlay">
                    <div className="hrm-modal-content" style={{ maxWidth: '750px', width: '100%' }}>
                        <div className="hrm-modal-header" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)', borderBottom: '1px solid #E2E8F0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ 
                                    background: 'var(--primary-gradient)', 
                                    padding: '10px', 
                                    borderRadius: '12px', 
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                                }}>
                                    <Calculator size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1E293B' }}>
                                        {editingId ? 'Update Salary Group' : 'Create New Salary Group'}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                                        Configure payroll cycles and working day policies
                                    </p>
                                </div>
                            </div>
                            <button className="icon-btn" onClick={resetForm} style={{ background: 'white', border: '1px solid #E2E8F0' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="hrm-modal-body" style={{ padding: '32px' }}>
                                {/* Group Name Section */}
                                <div className="hrm-form-group" style={{ marginBottom: '32px' }}>
                                    <label className="hrm-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Salary Group Name <span style={{ color: 'var(--danger)' }}>*</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            className="hrm-input"
                                            required
                                            placeholder="e.g. General Staff, Senior Management, etc."
                                            value={form.groupName}
                                            onChange={e => setForm({ ...form, groupName: e.target.value })}
                                            style={{ paddingLeft: '44px', height: '52px', fontSize: '15px' }}
                                        />
                                        <Edit2 size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                                    <div className="hrm-form-group" style={{ margin: 0 }}>
                                        <SearchableSelect
                                            label="Payroll Frequency"
                                            required
                                            options={freqOptions}
                                            value={form.payrollFrequency}
                                            onChange={v => setForm({ ...form, payrollFrequency: v })}
                                        />
                                    </div>

                                    <div className="hrm-form-group" style={{ margin: 0 }}>
                                        <SearchableSelect
                                            label="Working Days Policy"
                                            required
                                            options={wdOptions}
                                            value={form.workingDaysType}
                                            onChange={v => setForm({ ...form, workingDaysType: v })}
                                        />
                                    </div>
                                </div>

                                {form.workingDaysType === 'Fixed Working Days' && (
                                    <div className="hrm-form-group" style={{ marginBottom: '32px', animation: 'fadeIn 0.3s ease' }}>
                                        <label className="hrm-label">Fixed Days / Month <span style={{ color: 'var(--danger)' }}>*</span></label>
                                        <input
                                            type="number"
                                            className="hrm-input"
                                            min="1"
                                            max="31"
                                            value={form.fixedDays}
                                            onChange={e => setForm({ ...form, fixedDays: parseInt(e.target.value) })}
                                            style={{ height: '52px' }}
                                        />
                                    </div>
                                )}

                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '1fr 1fr', 
                                    gap: '24px', 
                                    padding: '24px', 
                                    background: '#F8FAFC', 
                                    borderRadius: '16px', 
                                    border: '1px solid #E2E8F5',
                                    marginBottom: '32px'
                                }}>
                                    <div className="hrm-form-group" style={{ margin: 0 }}>
                                        <SearchableSelect
                                            label="Salary Cycle Start Date"
                                            options={dateOptions}
                                            value={form.salaryCycleStartDate}
                                            onChange={v => setForm({ ...form, salaryCycleStartDate: v })}
                                        />
                                    </div>

                                    <div className="hrm-form-group" style={{ margin: 0 }}>
                                        <SearchableSelect
                                            label="Round Off Salary?"
                                            options={yesNoOptions}
                                            value={form.roundedSalary}
                                            onChange={v => setForm({ ...form, roundedSalary: v })}
                                        />
                                    </div>
                                </div>
                                
                                <div className="hrm-form-group" style={{ margin: 0 }}>
                                    <SearchableSelect
                                        label="Group Status"
                                        options={statusOptions}
                                        value={form.status}
                                        onChange={v => setForm({ ...form, status: v })}
                                    />
                                </div>
                            </div>

                            <div className="hrm-modal-footer" style={{ background: '#F8FAFC', padding: '24px 32px' }}>
                                <button type="button" className="btn-hrm btn-hrm-secondary" onClick={resetForm} style={{ padding: '12px 28px' }}>
                                    DISCARD
                                </button>
                                <button type="submit" className="btn-hrm btn-hrm-primary" style={{ padding: '12px 32px' }}>
                                    <Save size={18} /> {editingId ? 'UPDATE GROUP' : 'SAVE GROUP'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalaryGroups;
