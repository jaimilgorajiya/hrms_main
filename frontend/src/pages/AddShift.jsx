import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, RotateCcw } from 'lucide-react';
import ShiftTimePicker from '../components/ShiftTimePicker';
import HourMinutePicker from '../components/HourMinutePicker';
import HourDurationSelect from '../components/HourDurationSelect';
import SearchableSelect from '../components/SearchableSelect';
import Swal from 'sweetalert2';
import '../styles/AddShift.css';

const AddShift = () => {
    const navigate = useNavigate();
    

    const initialFormData = {
        shiftName: '',
        shiftCode: '',
        multiplePunchAllowed: false,
        requireOutOfRangeReason: false,
        hoursType: 'Full Shift Hours',
        attendanceOnProductiveHours: false,
        deductBreakIfNotTaken: false,
        deductFullBreakIfLessTaken: false,
        attendanceRequestRemarkPolicy: 'None',
        missingPunchRemarkPolicy: 'None',
        outOfRangeRemarkPolicy: 'None',
        missingPunchRequestDays: 0,
        pastAttendanceRequestDays: 0,
        autoSelectAlternateShift: false,
        allowAttendanceModification: false,
        weekOffType: 'Selected Weekdays',
        weekOffDays: [],
        weekOffsPerWeek: 0,
        weekOffsPerMonth: 0,
        hasAlternateWeekOff: false,
        lateEarlyType: 'Combined',
        maxLateInMinutes: 0,
        maxEarlyOutMinutes: 0,
        applyLeaveIfLimitExceeded: false,
        leaveTypeIfExceeded: 'Half Day',
        requireLateReason: false,
        requireEarlyOutReason: false,
        lateEarlyApplyOnExtraDay: false,
        deductLatePenaltyFromWorkHours: false,
        removeLateEarlyAfterFullHours: false,
        allowShortLeave: false,
        monthlyShortLeaves: 0,
        shortLeaveMinutes: 0,
        shortLeaveType: 'Default',
        shortLeaveBufferMinutes: 0,
        shortLeaveDays: '',
        applySandwichLeave: false,
        applyHalfDayBeforeFixedTimeout: false,
        applyLeaveOnHoliday: false,
        applyLeaveOnWeekOff: false,
        generatePenaltyOnAbsent: false,
        penaltyType: 'Flat',
        penaltyValue: 0,
        extraDayApprovalPolicy: 'None',
        needApprovalExtraHoursWeekdays: false,
        needOTRequestSameDay: false,
        otRequestType: 'Get approval before overtime work',
        extraPayoutMultiplier: 'Default',
        compOffOnExtraDay: false,
        compOffOnExtraHoursWorkingDay: false,
        compOffExpiryType: 'None',
        compOffExpireDays: 0,
        maxCompOffInMonth: 0,
        applyCompOffOnPastDate: false,
        excludeCompOffWithAutoLeave: false,
        breakMode: 'Defined Minutes',
        breakApprovalFaceApp: false,
        breakApprovalEmployeeApp: false,
        sameRulesForAllDays: false,
        flexibleShiftHours: false,
        schedule: {
            monday: {}, tuesday: {}, wednesday: {}, thursday: {}, 
            friday: {}, saturday: {}, sunday: {}
        }
    };

    const [formData, setFormData] = useState(initialFormData);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        let finalValue = value;
        if (type === 'checkbox') {
            finalValue = checked;
        } else if (type === 'number') {
            finalValue = Number(value);
        } else if (value === 'true') {
            finalValue = true;
        } else if (value === 'false') {
            finalValue = false;
        }

        setFormData(prev => {
            const updates = { [name]: finalValue };
            
            // Mutual exclusivity for shift rules
            if (name === 'sameRulesForAllDays' && finalValue === true) {
                updates.flexibleShiftHours = false;
            } else if (name === 'flexibleShiftHours' && finalValue === true) {
                updates.sameRulesForAllDays = false;
                // Optional: clear the table or reset when flexible is chosen
            }

            return {
                ...prev,
                ...updates
            };
        });
    };

    const handleWeekOffDaysChange = (day) => {
        setFormData(prev => ({
            ...prev,
            weekOffDays: prev.weekOffDays.includes(day)
                ? prev.weekOffDays.filter(d => d !== day)
                : [...prev.weekOffDays, day]
        }));
    };

    const handleScheduleChange = (day, field, value) => {
        setFormData(prev => {
            if (prev.sameRulesForAllDays) {
                const newSchedule = { ...prev.schedule };
                days.forEach(d => {
                    newSchedule[d] = {
                        ...newSchedule[d],
                        [field]: value
                    };
                });
                return {
                    ...prev,
                    schedule: newSchedule
                };
            }

            return {
                ...prev,
                schedule: {
                    ...prev.schedule,
                    [day]: {
                        ...prev.schedule[day],
                        [field]: value
                    }
                }
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await authenticatedFetch(`${API_URL}/api/shifts/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                Swal.fire({
                    title: 'Success!',
                    text: 'Shift created successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                navigate('/admin/shift/manage');
            } else {
                Swal.fire('Error', data.message || 'Failed to create shift', 'error');
            }
        } catch (error) {
            console.error('Error creating shift:', error);
            Swal.fire('Error', 'Failed to create shift', 'error');
        }
    };

    const handleReset = () => {
        setFormData(initialFormData);
    };

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
        <div className="add-shift-container">
            <div className="shift-header">
                <h1 className="profile-title">Add Shift</h1>
            </div>

            <form onSubmit={handleSubmit}>
                {/* SECTION 1 - BASIC SHIFT DETAILS */}
                <div className="shift-card">
                    <h2 className="card-title">Basic Shift Details</h2>
                    <div className="form-grid">
                        <div className="form-group-shift">
                            <label>Shift Name <span className="required">*</span></label>
                            <input
                                type="text"
                                name="shiftName"
                                value={formData.shiftName}
                                onChange={handleInputChange}
                                placeholder="Enter shift name"
                                required
                            />
                        </div>

                        <div className="form-group-shift">
                            <label>Shift Code</label>
                            <input
                                type="text"
                                name="shiftCode"
                                value={formData.shiftCode}
                                onChange={handleInputChange}
                                placeholder="e.g. S1, S2"
                            />
                        </div>

                        <div className="form-group-shift">
                            <SearchableSelect 
                                label="Required Out Of Range Reason"
                                options={[{ label: 'No', value: false }, { label: 'Yes', value: true }]}
                                value={formData.requireOutOfRangeReason}
                                onChange={(val) => handleInputChange({ target: { name: 'requireOutOfRangeReason', value: val, type: 'select' }})}
                            />
                        </div>

                  

                    

                    </div>
                </div>

                {/* SECTION 2 - WEEK OFF SETTINGS */}
                <div className="shift-card">
                    <h2 className="card-title">Week Off Settings</h2>
                    <div className="form-grid">
                        <div className="form-group-shift">
                            <SearchableSelect 
                                label="Week Off Type"
                                options={[
                                    { label: 'Selected Weekdays', value: 'Selected Weekdays' },
                                    { label: 'Manual Week Off', value: 'Manual Week Off' }
                                ]}
                                value={formData.weekOffType}
                                onChange={(val) => handleInputChange({ target: { name: 'weekOffType', value: val, type: 'select' }})}
                            />
                        </div>

                        {/* Show different fields based on Week Off Type */}
                        {formData.weekOffType === 'Selected Weekdays' && (
                            <>
                                <div className="form-group-shift full-width">
                                    <label>Week off Days</label>
                                    <div className="checkbox-group">
                                        {weekDays.map(day => (
                                            <label key={day} className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.weekOffDays.includes(day)}
                                                    onChange={() => handleWeekOffDaysChange(day)}
                                                />
                                                <span>{day}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                              
                            </>
                        )}

                        {formData.weekOffType === 'Manual Week Off' && (
                            <>
                                <div className="form-group-shift">
                                    <label>Number of week-offs allowed in a week <span className="required">*</span></label>
                                    <input
                                        type="number"
                                        name="weekOffsPerWeek"
                                        value={formData.weekOffsPerWeek || ''}
                                        onChange={handleInputChange}
                                        min="0"
                                        max="7"
                                        placeholder="Enter number"
                                    />
                                </div>

                                <div className="form-group-shift">
                                    <label>Number of week-offs allowed in a month</label>
                                    <input
                                        type="number"
                                        name="weekOffsPerMonth"
                                        value={formData.weekOffsPerMonth || ''}
                                        onChange={handleInputChange}
                                        min="0"
                                        placeholder="0 for no limit"
                                    />
                                    <small style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                        0 for no limit, possible week-offs are allowed
                                    </small>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* SECTION 3 - LATE IN / EARLY OUT SETTINGS */}
                <div className="shift-card">
                    <h2 className="card-title">Late In / Early Out Settings</h2>
                    <div className="form-grid">
                        <div className="form-group-shift">
                            <SearchableSelect 
                                label="Late In Early Out Type"
                                options={[{ label: 'Combined', value: 'Combined' }, { label: 'Separate', value: 'Separate' }]}
                                value={formData.lateEarlyType}
                                onChange={(val) => handleInputChange({ target: { name: 'lateEarlyType', value: val, type: 'select' }})}
                            />
                        </div>

                        {formData.lateEarlyType === 'Combined' ? (
                            <div className="form-group-shift">
                                <label>Maximum Combined Minutes (Late In + Early Out)</label>
                                <input
                                    type="number"
                                    name="maxLateInMinutes"
                                    value={formData.maxLateInMinutes}
                                    onChange={handleInputChange}
                                    min="0"
                                    placeholder="e.g. 30"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="form-group-shift">
                                    <label>Maximum Late In (Minutes)</label>
                                    <input
                                        type="number"
                                        name="maxLateInMinutes"
                                        value={formData.maxLateInMinutes}
                                        onChange={handleInputChange}
                                        min="0"
                                    />
                                </div>
                                <div className="form-group-shift">
                                    <label>Maximum Early Out (Minutes)</label>
                                    <input
                                        type="number"
                                        name="maxEarlyOutMinutes"
                                        value={formData.maxEarlyOutMinutes}
                                        onChange={handleInputChange}
                                        min="0"
                                    />
                                </div>
                            </>
                        )}


                       

                        {formData.lateEarlyType === 'Combined' ? (
                            <div className="form-group-shift">
                                <SearchableSelect 
                                    label="Required Reason For Late In / Early Out"
                                    options={[{ label: 'No', value: false }, { label: 'Yes', value: true }]}
                                    value={formData.requireLateReason}
                                    onChange={(val) => {
                                        handleInputChange({ target: { name: 'requireLateReason', value: val, type: 'select' }});
                                        handleInputChange({ target: { name: 'requireEarlyOutReason', value: val, type: 'select' }});
                                    }}
                                />
                            </div>
                        ) : (
                            <>
                                <div className="form-group-shift">
                                    <SearchableSelect 
                                        label="Required Reason Of Late In"
                                        options={[{ label: 'No', value: false }, { label: 'Yes', value: true }]}
                                        value={formData.requireLateReason}
                                        onChange={(val) => handleInputChange({ target: { name: 'requireLateReason', value: val, type: 'select' }})}
                                    />
                                </div>
                                <div className="form-group-shift">
                                    <SearchableSelect 
                                        label="Required Reason Of Early Out"
                                        options={[{ label: 'No', value: false }, { label: 'Yes', value: true }]}
                                        value={formData.requireEarlyOutReason}
                                        onChange={(val) => handleInputChange({ target: { name: 'requireEarlyOutReason', value: val, type: 'select' }})}
                                    />
                                </div>
                            </>
                        )}


                    </div>
                </div>


                {/* SECTION 8 - BREAK SETTINGS */}
                <div className="shift-card">
                    <h2 className="card-title">Break Settings</h2>
                    <div className="form-grid">
                        <div className="form-group-shift">
                            <SearchableSelect 
                                label="Take Breaks Setting"
                                options={[
                                    { label: 'Defined Minutes', value: 'Defined Minutes' },
                                    { label: 'Anytime Between Shift', value: 'Anytime Between Shift' }
                                ]}
                                value={formData.breakMode}
                                onChange={(val) => handleInputChange({ target: { name: 'breakMode', value: val, type: 'select' }})}
                            />
                        </div>

                  

                       
                    </div>
                </div>

                {/* SECTION 9 - WEEKLY SHIFT TIME TABLE */}
                <div className="shift-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h2 className="card-title" style={{ marginBottom: 0 }}>Weekly Shift Time Table</h2>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#1E293B', fontWeight: '500' }}>
                                <input 
                                    type="checkbox" 
                                    name="sameRulesForAllDays" 
                                    checked={formData.sameRulesForAllDays} 
                                    onChange={handleInputChange} 
                                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#E11D48' }}
                                />
                                Same Rules for All days
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#1E293B', fontWeight: '500' }}>
                                <input 
                                    type="checkbox" 
                                    name="flexibleShiftHours" 
                                    checked={formData.flexibleShiftHours} 
                                    onChange={handleInputChange} 
                                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#E11D48' }}
                                />
                                Flexible Shift Hours
                            </label>
                        </div>
                    </div>
                    <div className="table-wrapper">
                        <table className="shift-schedule-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    {weekDays.map(day => <th key={day}>{day}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="row-label">Shift Start Time</td>
                                    {days.map(day => (
                                        <td key={day}>
                                            <ShiftTimePicker
                                                value={formData.schedule[day]?.shiftStart || ''}
                                                onChange={(val) => handleScheduleChange(day, 'shiftStart', val)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="row-label">Shift End Time</td>
                                    {days.map(day => (
                                        <td key={day}>
                                            <ShiftTimePicker
                                                value={formData.schedule[day]?.shiftEnd || ''}
                                                onChange={(val) => handleScheduleChange(day, 'shiftEnd', val)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="row-label">Lunch Break Start Time</td>
                                    {days.map(day => (
                                        <td key={day}>
                                            <ShiftTimePicker
                                                value={formData.schedule[day]?.lunchStart || ''}
                                                onChange={(val) => handleScheduleChange(day, 'lunchStart', val)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="row-label">Lunch Break End Time</td>
                                    {days.map(day => (
                                        <td key={day}>
                                            <ShiftTimePicker
                                                value={formData.schedule[day]?.lunchEnd || ''}
                                                onChange={(val) => handleScheduleChange(day, 'lunchEnd', val)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="row-label">Tea Break Start Time</td>
                                    {days.map(day => (
                                        <td key={day}>
                                            <ShiftTimePicker
                                                value={formData.schedule[day]?.teaStart || ''}
                                                onChange={(val) => handleScheduleChange(day, 'teaStart', val)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="row-label">Tea Break End Time</td>
                                    {days.map(day => (
                                        <td key={day}>
                                            <ShiftTimePicker
                                                value={formData.schedule[day]?.teaEnd || ''}
                                                onChange={(val) => handleScheduleChange(day, 'teaEnd', val)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="form-actions">
                    <button type="submit" className="btn-theme btn-theme-primary">
                        <Check size={18} /> ADD
                    </button>
                    <button type="button" className="btn-theme btn-theme-secondary" onClick={handleReset}>
                        <RotateCcw size={18} /> RESET
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddShift;
