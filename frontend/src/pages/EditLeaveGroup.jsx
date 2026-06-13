import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ArrowLeft, Mail, AlertTriangle, Calendar, Settings } from 'lucide-react';
import Swal from 'sweetalert2';
import SearchableSelect from '../components/SearchableSelect';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';

const EditLeaveGroup = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        leaveGroupName: '',
        leaveBalanceVisibility: 'Default (Multiple of 0.5)',
        leaveIntimationEmails: '',
        generatePenaltyOnLeaveRequestPending: 'No',
        isPaidLeave: false,
        leaveAllocationType: 'Yearly',
        noOfPaidLeaves: '',
        leaveAppliedFormula: 'Multiple of 0.5',
        maxUseInMonth: '',
        leaveFrequency: 'Annually',
        leaveCalculation: 'Manual Calculation',
        leaveRestrictions: 'No',
        leaveAccordingToPayrollCycle: 'No',
        takeLeaveDuringProbationPeriod: 'No',
        takeLeaveDuringNoticePeriod: 'No',
        addPaidLeaveBasedOnAttendance: 'No',
        restrictUnpaidLeaveToEmployeesMonthly: 'No',
        maxUnpaidLeaveInMonth: '',
        remark: '',
        yearEndLeaveBalancePolicy: 'Payout all (Manually)',
        maxCarryForward: '',
        minCarryForward: '',
        carryForwardIncludes: 'Yes',
        allowLeavePayoutRequest: 'No',
        status: 'Active'
    });

    useEffect(() => {
        const fetchLeaveGroup = async () => {
            try {
                const res = await authenticatedFetch(`${API_URL}/api/leave-groups/${id}`);
                const data = await res.json();
                if (data.success) {
                    const lg = data.leaveGroup;
                    setFormData({
                        leaveGroupName: lg.leaveGroupName || '',
                        leaveBalanceVisibility: lg.leaveBalanceVisibility || 'Default (Multiple of 0.5)',
                        leaveIntimationEmails: lg.leaveIntimationEmails ? lg.leaveIntimationEmails.join(', ') : '',
                        generatePenaltyOnLeaveRequestPending: lg.generatePenaltyOnLeaveRequestPending || 'No',
                        isPaidLeave: lg.isPaidLeave ?? false,
                        leaveAllocationType: lg.leaveAllocationType || 'Yearly',
                        noOfPaidLeaves: lg.noOfPaidLeaves ?? '',
                        leaveAppliedFormula: lg.leaveAppliedFormula || 'Multiple of 0.5',
                        maxUseInMonth: lg.maxUseInMonth ?? '',
                        leaveFrequency: lg.leaveFrequency || 'Annually',
                        leaveCalculation: lg.leaveCalculation || 'Manual Calculation',
                        leaveRestrictions: lg.leaveRestrictions || 'No',
                        leaveAccordingToPayrollCycle: lg.leaveAccordingToPayrollCycle || 'No',
                        takeLeaveDuringProbationPeriod: lg.takeLeaveDuringProbationPeriod || 'No',
                        takeLeaveDuringNoticePeriod: lg.takeLeaveDuringNoticePeriod || 'No',
                        addPaidLeaveBasedOnAttendance: lg.addPaidLeaveBasedOnAttendance || 'No',
                        restrictUnpaidLeaveToEmployeesMonthly: lg.restrictUnpaidLeaveToEmployeesMonthly || 'No',
                        maxUnpaidLeaveInMonth: lg.maxUnpaidLeaveInMonth ?? '',
                        remark: lg.remark || '',
                        yearEndLeaveBalancePolicy: lg.yearEndLeaveBalancePolicy || 'Payout all (Manually)',
                        maxCarryForward: lg.maxCarryForward ?? '',
                        minCarryForward: lg.minCarryForward ?? '',
                        carryForwardIncludes: lg.carryForwardIncludes || 'Yes',
                        allowLeavePayoutRequest: lg.allowLeavePayoutRequest || 'No',
                        status: lg.status || 'Active'
                    });
                } else {
                    Swal.fire('Error', 'Leave Group not found', 'error');
                    navigate('/admin/leave/group');
                }
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'Failed to load leave group', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchLeaveGroup();
    }, [id, navigate]);

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
                leaveIntimationEmails: formData.leaveIntimationEmails
                    ? formData.leaveIntimationEmails.split(',').map(e => e.trim()).filter(Boolean)
                    : [],
                noOfPaidLeaves: formData.noOfPaidLeaves !== '' ? Number(formData.noOfPaidLeaves) : 0,
                maxUseInMonth: formData.maxUseInMonth !== '' ? Number(formData.maxUseInMonth) : null,
                maxUnpaidLeaveInMonth: formData.maxUnpaidLeaveInMonth !== '' ? Number(formData.maxUnpaidLeaveInMonth) : null,
                maxCarryForward: formData.maxCarryForward !== '' ? Number(formData.maxCarryForward) : null,
                minCarryForward: formData.minCarryForward !== '' ? Number(formData.minCarryForward) : null,
            };

            const res = await authenticatedFetch(`${API_URL}/api/leave-groups/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({ 
                    title: 'Updated!', 
                    text: 'Leave Group updated successfully.', 
                    icon: 'success', 
                    timer: 1500, 
                    showConfirmButton: false 
                });
                navigate('/admin/leave/group');
            } else {
                Swal.fire('Error', data.message || 'Failed to update leave group', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Failed to update leave group', 'error');
        }
    };

    if (loading) return (
        <div className="hrm-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600 }}>Loading...</div>
        </div>
    );

    return (
        <div className="hrm-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
            <div className="hrm-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button type="button" className="icon-btn" onClick={() => navigate(-1)} style={{ background: 'white', border: '1px solid #E2E8F0', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="hrm-title" style={{ fontSize: '24px', fontWeight: 700 }}>Edit Leave Group</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* General Settings */}
                <div className="hrm-card" style={{ padding: '30px', marginBottom: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 24px 0', paddingBottom: '12px', borderBottom: '2px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings size={18} color="var(--primary-blue)" /> General Settings
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
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
                                    { label: 'Multiple of 0.25', value: 'Multiple of 0.25' },
                                ]}
                                value={formData.leaveBalanceVisibility}
                                onChange={(val) => handleSelect('leaveBalanceVisibility', val)}
                            />
                        </div>
                        <div className="hrm-form-group">
                            <SearchableSelect
                                label="Status"
                                options={[
                                    { label: 'Active', value: 'Active' },
                                    { label: 'Inactive', value: 'Inactive' },
                                ]}
                                value={formData.status}
                                onChange={(val) => handleSelect('status', val)}
                            />
                        </div>
                        <div className="hrm-form-group">
                            <label className="hrm-label">Leave Intimation Emails (Comma separated)</label>
                            <input type="text" name="leaveIntimationEmails" className="hrm-input" value={formData.leaveIntimationEmails} onChange={handleChange} placeholder="email1@example.com, email2@example.com" />
                        </div>
                        <div className="hrm-form-group">
                            <SearchableSelect
                                label="Generate Penalty On Leave Request Pending"
                                options={[
                                    { label: 'No', value: 'No' },
                                    { label: 'Yes', value: 'Yes' },
                                ]}
                                value={formData.generatePenaltyOnLeaveRequestPending}
                                onChange={(val) => handleSelect('generatePenaltyOnLeaveRequestPending', val)}
                            />
                        </div>
                    </div>
                </div>

                {/* Paid Leave Settings */}
                <div className="hrm-card" style={{ padding: '30px', marginBottom: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '12px', borderBottom: '2px solid #F1F5F9' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={18} color="var(--success)" /> Paid Leave Policy
                        </h3>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                            <input type="checkbox" name="isPaidLeave" checked={formData.isPaidLeave} onChange={handleChange} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                            Enable Paid Leaves
                        </label>
                    </div>

                    {formData.isPaidLeave && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                            <div className="hrm-form-group">
                                <SearchableSelect
                                    label="Leave Allocation Type"
                                    options={[
                                        { label: 'Yearly', value: 'Yearly' },
                                        { label: 'Monthly', value: 'Monthly' },
                                        { label: 'Quarterly', value: 'Quarterly' },
                                        { label: 'Half Yearly', value: 'Half Yearly' },
                                    ]}
                                    value={formData.leaveAllocationType}
                                    onChange={(val) => handleSelect('leaveAllocationType', val)}
                                />
                            </div>
                            <div className="hrm-form-group">
                                <label className="hrm-label">Number of Paid Leaves</label>
                                <input type="number" step="any" name="noOfPaidLeaves" className="hrm-input" value={formData.noOfPaidLeaves} onChange={handleChange} placeholder="e.g. 12" />
                            </div>
                            <div className="hrm-form-group">
                                <SearchableSelect
                                    label="Leave Applied Formula"
                                    options={[
                                        { label: 'Multiple of 0.5', value: 'Multiple of 0.5' },
                                        { label: 'Multiple of 1', value: 'Multiple of 1' },
                                        { label: 'Multiple of 0.25', value: 'Multiple of 0.25' },
                                    ]}
                                    value={formData.leaveAppliedFormula}
                                    onChange={(val) => handleSelect('leaveAppliedFormula', val)}
                                />
                            </div>
                            <div className="hrm-form-group">
                                <label className="hrm-label">Max Use In Month</label>
                                <input type="number" name="maxUseInMonth" className="hrm-input" value={formData.maxUseInMonth} onChange={handleChange} placeholder="e.g. 3" />
                            </div>
                            <div className="hrm-form-group">
                                <SearchableSelect
                                    label="Leave Frequency"
                                    options={[
                                        { label: 'Annually', value: 'Annually' },
                                        { label: 'Monthly', value: 'Monthly' },
                                        { label: 'Quarterly', value: 'Quarterly' },
                                    ]}
                                    value={formData.leaveFrequency}
                                    onChange={(val) => handleSelect('leaveFrequency', val)}
                                />
                            </div>
                            <div className="hrm-form-group">
                                <SearchableSelect
                                    label="Leave Calculation"
                                    options={[
                                        { label: 'Manual Calculation', value: 'Manual Calculation' },
                                        { label: 'Auto Calculation', value: 'Auto Calculation' },
                                    ]}
                                    value={formData.leaveCalculation}
                                    onChange={(val) => handleSelect('leaveCalculation', val)}
                                />
                            </div>
                            <div className="hrm-form-group">
                                <SearchableSelect
                                    label="Leave Restrictions"
                                    options={[
                                        { label: 'No', value: 'No' },
                                        { label: 'Yes', value: 'Yes' },
                                    ]}
                                    value={formData.leaveRestrictions}
                                    onChange={(val) => handleSelect('leaveRestrictions', val)}
                                />
                            </div>
                            <div className="hrm-form-group">
                                <SearchableSelect
                                    label="Leave According to Payroll Cycle"
                                    options={[
                                        { label: 'No', value: 'No' },
                                        { label: 'Yes', value: 'Yes' },
                                    ]}
                                    value={formData.leaveAccordingToPayrollCycle}
                                    onChange={(val) => handleSelect('leaveAccordingToPayrollCycle', val)}
                                />
                            </div>
                            <div className="hrm-form-group">
                                <SearchableSelect
                                    label="Take Leave During Probation Period"
                                    options={[
                                        { label: 'No', value: 'No' },
                                        { label: 'Yes', value: 'Yes' },
                                    ]}
                                    value={formData.takeLeaveDuringProbationPeriod}
                                    onChange={(val) => handleSelect('takeLeaveDuringProbationPeriod', val)}
                                />
                            </div>
                            <div className="hrm-form-group">
                                <SearchableSelect
                                    label="Take Leave During Notice Period"
                                    options={[
                                        { label: 'No', value: 'No' },
                                        { label: 'Yes', value: 'Yes' },
                                    ]}
                                    value={formData.takeLeaveDuringNoticePeriod}
                                    onChange={(val) => handleSelect('takeLeaveDuringNoticePeriod', val)}
                                />
                            </div>
                            <div className="hrm-form-group">
                                <SearchableSelect
                                    label="Add Paid Leave Based On Attendance"
                                    options={[
                                        { label: 'No', value: 'No' },
                                        { label: 'Yes', value: 'Yes' },
                                    ]}
                                    value={formData.addPaidLeaveBasedOnAttendance}
                                    onChange={(val) => handleSelect('addPaidLeaveBasedOnAttendance', val)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Unpaid Leave Settings */}
                <div className="hrm-card" style={{ padding: '30px', marginBottom: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 24px 0', paddingBottom: '12px', borderBottom: '2px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={18} color="var(--primary-blue)" /> Unpaid Leave Policy
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                        <div className="hrm-form-group">
                            <SearchableSelect
                                label="Restrict Unpaid Leave to Employees Monthly"
                                options={[
                                    { label: 'No', value: 'No' },
                                    { label: 'Yes', value: 'Yes' },
                                ]}
                                value={formData.restrictUnpaidLeaveToEmployeesMonthly}
                                onChange={(val) => handleSelect('restrictUnpaidLeaveToEmployeesMonthly', val)}
                            />
                        </div>
                        <div className="hrm-form-group">
                            <label className="hrm-label">Max Unpaid Leave In Month</label>
                            <input type="number" name="maxUnpaidLeaveInMonth" className="hrm-input" value={formData.maxUnpaidLeaveInMonth} onChange={handleChange} placeholder="e.g. 5" />
                        </div>
                    </div>
                </div>

                {/* Year End & Carry Forward Policy */}
                <div className="hrm-card" style={{ padding: '30px', marginBottom: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 24px 0', paddingBottom: '12px', borderBottom: '2px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={18} color="var(--primary-blue)" /> Year End & Carry Forward Settings
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                        <div className="hrm-form-group">
                            <SearchableSelect
                                label="Year End Leave Balance Policy"
                                options={[
                                    { label: 'Payout all (Manually)', value: 'Payout all (Manually)' },
                                    { label: 'Payout or Carry forward (Manually)', value: 'Payout or Carry forward (Manually)' },
                                    { label: 'Reset to zero', value: 'Reset to zero' },
                                    { label: 'Carry forward all (Manually)', value: 'Carry forward all (Manually)' },
                                ]}
                                value={formData.yearEndLeaveBalancePolicy}
                                onChange={(val) => handleSelect('yearEndLeaveBalancePolicy', val)}
                            />
                        </div>
                        <div className="hrm-form-group">
                            <label className="hrm-label">Min Carry Forward Limit</label>
                            <input type="number" name="minCarryForward" className="hrm-input" value={formData.minCarryForward} onChange={handleChange} placeholder="e.g. 0" />
                        </div>
                        <div className="hrm-form-group">
                            <label className="hrm-label">Max Carry Forward Limit</label>
                            <input type="number" name="maxCarryForward" className="hrm-input" value={formData.maxCarryForward} onChange={handleChange} placeholder="e.g. 10" />
                        </div>
                        <div className="hrm-form-group">
                            <SearchableSelect
                                label="Carry Forward Includes Future Accrual"
                                options={[
                                    { label: 'Yes', value: 'Yes' },
                                    { label: 'No', value: 'No' },
                                ]}
                                value={formData.carryForwardIncludes}
                                onChange={(val) => handleSelect('carryForwardIncludes', val)}
                            />
                        </div>
                        <div className="hrm-form-group">
                            <SearchableSelect
                                label="Allow Leave Payout Request"
                                options={[
                                    { label: 'No', value: 'No' },
                                    { label: 'Yes', value: 'Yes' },
                                ]}
                                value={formData.allowLeavePayoutRequest}
                                onChange={(val) => handleSelect('allowLeavePayoutRequest', val)}
                            />
                        </div>
                    </div>
                </div>

                {/* Remark Section */}
                <div className="hrm-card" style={{ padding: '30px', marginBottom: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <div className="hrm-form-group" style={{ margin: 0 }}>
                        <label className="hrm-label">Remarks</label>
                        <textarea name="remark" className="hrm-input" value={formData.remark} onChange={handleChange} placeholder="Enter any extra description or notes" style={{ minHeight: '100px', resize: 'vertical' }} />
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #F1F5F9' }}>
                    <button type="button" className="btn-hrm btn-hrm-secondary" onClick={() => navigate('/admin/leave/group')} style={{ cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button type="submit" className="btn-hrm btn-hrm-primary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Check size={16} /> Update Leave Group
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditLeaveGroup;
