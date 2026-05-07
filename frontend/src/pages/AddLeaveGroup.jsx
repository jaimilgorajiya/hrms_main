import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, RotateCcw, ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';

const initialFormData = {
    leaveGroupName: '',
    leaveBalanceVisibility: 'Default (Multiple of 0.5)',
    isPaidLeave: true,
    leaveAllocationType: 'Yearly',
    noOfPaidLeaves: '',
    maxUseInMonth: '',
};

const AddLeaveGroup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState(initialFormData);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSelect = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                noOfPaidLeaves: formData.noOfPaidLeaves !== '' ? Number(formData.noOfPaidLeaves) : 0,
                maxUseInMonth: formData.maxUseInMonth !== '' ? Number(formData.maxUseInMonth) : null,
                maxUnpaidLeaveInMonth: formData.maxUnpaidLeaveInMonth !== '' ? Number(formData.maxUnpaidLeaveInMonth) : null,
                maxCarryForward: formData.maxCarryForward !== '' ? Number(formData.maxCarryForward) : null,
                minCarryForward: formData.minCarryForward !== '' ? Number(formData.minCarryForward) : null,
            };
            const res = await authenticatedFetch(`${API_URL}/api/leave-groups`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({ title: 'Success!', text: 'Leave Group created successfully.', icon: 'success', timer: 1500, showConfirmButton: false });
                navigate('/admin/leave/group');
            } else {
                Swal.fire('Error', data.message || 'Failed to create leave group', 'error');
            }
        } catch {
            Swal.fire('Error', 'Failed to create leave group', 'error');
        }
    };

    const handleReset = () => setFormData(initialFormData);

    return (
        <div className="hrm-container">
            <div className="hrm-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button className="icon-btn" onClick={() => navigate(-1)} style={{ background: 'white', border: '1px solid #E2E8F0' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="hrm-title">Add Leave Group</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="hrm-card" style={{ padding: '30px', overflow: 'visible' }}>
                    {/* Section: General Settings */}
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 24px 0', paddingBottom: '12px', borderBottom: '2px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        General Settings
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                        <div className="hrm-form-group">
                            <label className="hrm-label">Leave Group Name <span className="req">*</span></label>
                            <input type="text" name="leaveGroupName" className="hrm-input" value={formData.leaveGroupName} onChange={handleChange} placeholder="Enter leave group name" required />
                        </div>
                        <div className="hrm-form-group">
                            <SearchableSelect
                                label="Leave Balance Visibility"
                                options={[
                                    { label: 'Default (Multiple of 0.5)', value: 'Default (Multiple of 0.5)' },
                                    { label: 'Multiple of 1', value: 'Multiple of 1' },
                                ]}
                                value={formData.leaveBalanceVisibility}
                                onChange={(val) => handleSelect('leaveBalanceVisibility', val)}
                            />
                        </div>

                      

                        {/* Paid Leave Checkbox */}
                        <div className="hrm-form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '30px' }}>
                            <input
                                type="checkbox"
                                id="isPaidLeave"
                                name="isPaidLeave"
                                checked={formData.isPaidLeave}
                                onChange={handleChange}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3B648B' }}
                            />
                            <label htmlFor="isPaidLeave" style={{ marginBottom: 0, cursor: 'pointer', fontWeight: 600, fontSize: '14px', color: 'var(--text-secondary)' }}>Paid Leave</label>
                        </div>
                    </div>

                    {/* Paid Leave Expanded Fields */}
                    {formData.isPaidLeave && (
                        <>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '32px 0 24px 0', paddingBottom: '12px', borderBottom: '2px solid #F1F5F9' }}>
                                Paid Leave Configuration
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                                <div className="hrm-form-group">
                                    <SearchableSelect label="Leave Allocation Type" options={[
                                        { label: 'Yearly', value: 'Yearly' }, { label: 'Monthly', value: 'Monthly' },
                                        { label: 'Quarterly', value: 'Quarterly' }, { label: 'Half Yearly', value: 'Half Yearly' },
                                    ]} value={formData.leaveAllocationType} onChange={(val) => handleSelect('leaveAllocationType', val)} />
                                </div>
                                <div className="hrm-form-group">
                                    <label className="hrm-label">No. of Paid Leaves (Total)</label>
                                    <input type="number" name="noOfPaidLeaves" className="hrm-input" value={formData.noOfPaidLeaves} onChange={handleChange} placeholder="e.g. 12" min="0" />
                                </div>
                                <div className="hrm-form-group">
                                    <label className="hrm-label">Max Usage In Single Month</label>
                                    <input type="number" name="maxUseInMonth" className="hrm-input" value={formData.maxUseInMonth} onChange={handleChange} placeholder="e.g. 2" min="0" />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #F1F5F9' }}>
                        <button type="button" className="btn-hrm btn-hrm-secondary" onClick={handleReset}>
                            <RotateCcw size={16} /> Reset
                        </button>
                        <button type="submit" className="btn-hrm btn-hrm-primary">
                            <Check size={16} /> Add Leave Group
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddLeaveGroup;
